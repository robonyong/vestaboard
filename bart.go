package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"sort"
	"strconv"
	"strings"

	"github.com/rs/zerolog/log"
)

func getBartTrainLine() []string {
	PUBLIC_BART_API_KEY := "MW9S-E7SL-26DU-VV8V"
	NO_TRAINS_STR := "NO TRAINS"
	BART_API_ERROR_STR := "BART API ERROR"
	BART_QUERY_ENDPOINT, is_set := os.LookupEnv("BART_QUERY_ENDPOINT")
	if !is_set {
		log.Error().Msg("BART_QUERY_ENDPOINT not set")
		return []string{}
	}

	trainsLine := []string{"RED", "YELLOW", " "}

	bartEndpoint := fmt.Sprintf("%s&key=%s", BART_QUERY_ENDPOINT, PUBLIC_BART_API_KEY)
	resp, err := http.Get(bartEndpoint)
	if err != nil {
		log.Error().Err(err).Msg("Failed to retrieve BART data")
		return append(trainsLine, strings.Split(BART_API_ERROR_STR, "")...)
	}

	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Error().Err(err).Msg("Failed to read BART body")
		return append(trainsLine, strings.Split(BART_API_ERROR_STR, "")...)
	}

	var result BartEtdMessage
	err = json.Unmarshal(body, &result)
	if err != nil {
		log.Error().Err(err).Msg("Failed to parse BART data")
		return append(trainsLine, strings.Split(BART_API_ERROR_STR, "")...)
	}
	if result.Root.Message != nil && result.Root.Message.IsValid {
		log.Error().
			Str("error", result.Root.Message.Error).
			Str("warning", result.Root.Message.Warning).
			Msg("BART query returned unexpected messages")
		return append(trainsLine, strings.Split(NO_TRAINS_STR, "")...)
	}

	origStation := result.Root.Stations[0]
	if origStation.Message != nil && origStation.Message.IsValid {
		log.Error().
			Str("error", origStation.Message.Error).
			Str("warning", origStation.Message.Warning).
			Msg("BART station query returned unexpected messages")
		return append(trainsLine, strings.Split(NO_TRAINS_STR, "")...)
	}

	log.Info().Int("num_destinations", len(origStation.Etds)).Msg("Processing BART destinations")

	flattenedEtds := []int{}
	for _, etd := range origStation.Etds {
		for _, train := range etd.Estimate {
			if isSFBoundTrain(strings.ToUpper(train.Color)) && strings.ToUpper(train.Direction) == "SOUTH" {
				intMinutes, err := strconv.Atoi(train.Minutes)
				if err == nil {
					flattenedEtds = append(flattenedEtds, intMinutes)
				}
			}
		}
	}
	log.Info().Int("num_trains", len(flattenedEtds)).Msg("Processing upcoming BART trains")

	sort.Slice(flattenedEtds, func(i, j int) bool { return flattenedEtds[i] < flattenedEtds[j] })
	etdAsStrings := []string{}
	for _, min := range flattenedEtds {
		etdAsStrings = append(etdAsStrings, fmt.Sprint(min))
	}
	etdsString := strings.Join(etdAsStrings, " ")

	if len(flattenedEtds) == 0 {
		trainsLine = append(trainsLine, strings.Split("NO TRAINS", "")...)
	} else {
		trainsLine = append(trainsLine, strings.Split(etdsString, "")...)
	}

	return trimLine(trainsLine)
}
