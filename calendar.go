package main

import (
	"context"
	"os"
	"sort"
	"strings"
	"time"

	"github.com/rs/zerolog/log"
	"google.golang.org/api/calendar/v3"
)

type EventWithColor struct {
	*calendar.Event
	Color string
}

func getCalendarLines(ctx context.Context, s *calendar.Service, dayStart time.Time, dayEnd time.Time) [][]string {
	COLORS := [2]string{"RED", "BLUE"}
	log.Info().
		Str("start", dayStart.Format(time.RFC3339)).
		Str("end", dayEnd.Format(time.RFC3339)).
		Msg("Fetching Events")

	validEvents := []*EventWithColor{}
	cals := os.Getenv("CALENDARS")
	for i, cId := range strings.Split(cals, ",") {
		color := COLORS[i]
		events, err := s.Events.List(cId).
			SingleEvents(true).
			TimeMin(dayStart.Format(time.RFC3339)).
			TimeMax(dayEnd.Format(time.RFC3339)).
			Context(ctx).Do()
		if err != nil {
			log.Error().Err(err).Str("calendar", cId).Msg("Failed to fetch calendar")
			continue
		}
		for _, e := range events.Items {
			if e.Status != "cancelled" && e.Start != nil && e.Summary != "" {
				validEvents = append(validEvents, &EventWithColor{e, color})
			}
		}
	}

	sort.Slice(validEvents, func(i, j int) bool { return validEvents[i].Start.DateTime < validEvents[j].Start.DateTime })
	if len(validEvents) > 6 {
		validEvents = validEvents[:6]
	}

	eventLines := [][]string{}
	for _, event := range validEvents {
		line := []string{event.Color}

		if event.Start.DateTime != "" {
			startDateTime, err := time.Parse(time.RFC3339, event.Start.DateTime)
			if err != nil {
				log.Error().Err(err).Msg("Failed to parse start time")
				continue
			}
			startStr := startDateTime.Format("15:04:05")[:5]
			line = append(line, strings.Split(startStr, "")...)
			line = append(line, " ")
		}

		title := event.Summary

		for _, char := range strings.Split(title, "") {
			_, isValid := getVestaboardChar(char)
			if isValid {
				line = append(line, char)
			} else if line[len(line)-1] != " " {
				line = append(line, " ")
			}
		}

		eventLines = append(eventLines, trimLine(line))
	}

	return eventLines
}
