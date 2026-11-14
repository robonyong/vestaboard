package main

import (
	"context"
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

type CalendarSource struct {
	Email string
	Color string
}

func isDeclinedByCalendar(e *calendar.Event) bool {
	for _, attendee := range e.Attendees {
		if attendee.Self && attendee.ResponseStatus == "declined" {
			return true
		}
	}
	return false
}

func hasNotEnded(e *calendar.Event, now time.Time) bool {
	if e.End == nil {
		return false
	}

	if e.End.DateTime != "" {
		end, err := time.Parse(time.RFC3339, e.End.DateTime)
		if err != nil {
			log.Error().Err(err).Msg("Failed to parse end time")
			return false
		}
		return end.After(now)
	}

	if e.End.Date != "" {
		end, err := time.ParseInLocation("2006-01-02", e.End.Date, now.Location())
		if err != nil {
			log.Error().Err(err).Msg("Failed to parse end date")
			return false
		}
		return end.After(now)
	}

	return false
}

func getCalendarLines(ctx context.Context, s *calendar.Service, calendars []CalendarSource, dayStart time.Time, dayEnd time.Time) [][]string {
	log.Info().
		Str("start", dayStart.Format(time.RFC3339)).
		Str("end", dayEnd.Format(time.RFC3339)).
		Msg("Fetching Events")

	now := time.Now().In(dayStart.Location())
	validEvents := []*EventWithColor{}
	for _, calendar := range calendars {
		events, err := s.Events.List(calendar.Email).
			SingleEvents(true).
			TimeMin(dayStart.Format(time.RFC3339)).
			TimeMax(dayEnd.Format(time.RFC3339)).
			Context(ctx).Do()
		if err != nil {
			log.Error().Err(err).Str("calendar", calendar.Email).Msg("Failed to fetch calendar")
			continue
		}
		for _, e := range events.Items {
			if e.EventType == "default" && e.Status != "cancelled" && !isDeclinedByCalendar(e) && e.Start != nil && e.Summary != "" && hasNotEnded(e, now) {
				validEvents = append(validEvents, &EventWithColor{e, calendar.Color})
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

		title := []string{}
		for _, char := range strings.Split(event.Summary, "") {
			_, isValid := getVestaboardChar(char)
			if isValid {
				title = append(title, char)
			} else if len(title) > 0 && title[len(title)-1] != " " {
				title = append(title, " ")
			}
		}

		firstWordEnd := len(title)
		for i, char := range title {
			if char == " " {
				firstWordEnd = i
				break
			}
		}
		if len(line)+firstWordEnd > BOARD_WIDTH {
			eventLines = append(eventLines, append(line, title[:BOARD_WIDTH-len(line)]...))
			continue
		}

		eventLines = append(eventLines, trimLine(append(line, title...)))
	}

	return eventLines
}
