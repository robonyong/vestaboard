package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"sort"
	"strings"
	"time"

	"github.com/rs/zerolog/log"
)

func getOccupancyColor(occupancy string) string {
	switch occupancy {
	case "full":
		return "RED"
	case "standingAvailable":
		return "YELLOW"
	case "seatsAvailable":
		return "GREEN"
	default:
		return "WHITE"
	}
}

func getFBusLine() []string {
	AC_TRANSIT_KEY, is_set := os.LookupEnv("AC_TRANSIT_KEY")
	if !is_set {
		log.Fatal().Msg("AC_TRANSIT_KEY is not set")
	}
	AC_TRANSIT_QUERY_ENDPOINT, is_set := os.LookupEnv("AC_TRANSIT_QUERY_ENDPOINT")
	if !is_set {
		log.Fatal().Msg("AC_TRANSIT_QUERY_ENDPOINT not set")
	}

	NO_BUSES_STR := "NO BUSES"
	AC_TRANSIT_API_ERROR_STR := "AC TRANSIT API ERROR"

	acTransitEndpoint := fmt.Sprintf("%s&api_key=%s", AC_TRANSIT_QUERY_ENDPOINT, AC_TRANSIT_KEY)
	resp, err := http.Get(acTransitEndpoint)
	if err != nil {
		log.Error().Err(err).Msg("Failed to retrieve AC Transit data")
		return strings.Split(AC_TRANSIT_API_ERROR_STR, "")
	}

	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Error().Err(err).Msg("Failed to read AC Transit body")
		return strings.Split(AC_TRANSIT_API_ERROR_STR, "")
	}

	// trim byte order mark
	body = bytes.TrimPrefix(body, []byte{239, 187, 191})

	var stopInfoWrapper ACTransitEtdMessageWrapper
	err = json.Unmarshal(body, &stopInfoWrapper)
	if err != nil {
		log.Error().Err(err).Msg("Failed to parse AC Transit data")
		return strings.Split(AC_TRANSIT_API_ERROR_STR, "")
	}
	if !stopInfoWrapper.ServiceDelivery.Status || !stopInfoWrapper.ServiceDelivery.StopMonitoringDelivery.Status {
		log.Error().
			Msg("BART query returned unexpected error -- not sure of this shape so let's try it out")
		return strings.Split(AC_TRANSIT_API_ERROR_STR, "")
	}

	allBuses := stopInfoWrapper.ServiceDelivery.StopMonitoringDelivery.UpcomingBuses
	log.Info().Int("num_buses", len(allBuses)).Msg("Processing all upcoming buses")

	validBuses := []BusStatus{}
	for _, bus := range allBuses {
		if bus.MonitoredVehicleJourney.LineRef == "F" && bus.MonitoredVehicleJourney.DirectionRef == "W" {
			validBuses = append(validBuses, bus.MonitoredVehicleJourney)
		}
	}

	log.Info().Int("num_buses", len(validBuses)).Msg("Processing upcoming F buses")

	if len(validBuses) == 0 {
		return strings.Split(NO_BUSES_STR, "")
	}
	sort.Slice(validBuses, func(i, j int) bool {
		iTime, _ := time.Parse(time.RFC3339, validBuses[i].MonitoredCall.ExpectedArrivalTime)
		jTime, _ := time.Parse(time.RFC3339, validBuses[j].MonitoredCall.ExpectedArrivalTime)
		return iTime.Before(jTime)
	})

	now := time.Now()

	etdsAsStrings := []string{}
	for i, bus := range validBuses {
		if i > 0 {
			etdsAsStrings = append(etdsAsStrings, " ")
		}
		etdsAsStrings = append(etdsAsStrings, getOccupancyColor(bus.Occupancy))

		arrivalTime, _ := time.Parse(time.RFC3339, bus.MonitoredCall.ExpectedArrivalTime)
		diffDuration := arrivalTime.Sub(now)
		// take off 30 seconds to account for delay in display
		diffMinutes := fmt.Sprint(int(diffDuration.Minutes() - 0.5))
		etdsAsStrings = append(etdsAsStrings, strings.Split(diffMinutes, "")...)
	}

	return trimLine(etdsAsStrings)
}
