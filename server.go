package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"google.golang.org/api/calendar/v3"
	"google.golang.org/api/option"

	_ "github.com/glebarez/go-sqlite"
	"github.com/rs/zerolog/log"
)

type makeBoardRunner struct {
	db  *sql.DB
	ctx context.Context
}

var (
	ErrDuplicate    = errors.New("record already exists")
	ErrNotExists    = errors.New("row not exists")
	ErrUpdateFailed = errors.New("update failed")
	ErrDeleteFailed = errors.New("delete failed")
)

const BOARD_WIDTH = 22
const BOARD_HEIGHT = 6
const BART_HEADING = "BART DEPARTURES"
const F_BUS_HEADING = "FBUS DEPARTURES"

func trimLine(line []string) []string {
	for len(line) > 22 {
		lastSpaceIdx := len(line) - 1
		found := false
		for !found {
			if line[lastSpaceIdx] == " " {
				found = true
			} else {
				lastSpaceIdx -= 1
			}
		}
		line = line[:lastSpaceIdx]
	}
	return line
}

func hasAnyEvents(ctx context.Context, s *calendar.Service, loc *time.Location) bool {
	cals := os.Getenv("CALENDARS")

	if len(cals) == 0 {
		return false
	}

	now := time.Now().In(loc)
	calEnd := time.Date(now.Year(), now.Month(), now.Day(), 17, 59, 59, 999999999, loc)
	for _, cId := range strings.Split(cals, ",") {
		events, err := s.Events.List(cId).
			SingleEvents(true).
			TimeMin(now.Format(time.RFC3339)).
			TimeMax(calEnd.Format(time.RFC3339)).
			Context(ctx).Do()
		if err != nil {
			log.Error().Err(err).Str("calendar", cId).Msg("Failed to fetch calendar")
			continue
		}

		for _, e := range events.Items {
			if e.Status != "cancelled" && e.Start != nil && e.Summary != "" {
				return true
			}
		}
	}

	return false
}

func runTransit(client *http.Client, loc *time.Location) error {
	_, is_set := os.LookupEnv("AC_TRANSIT_KEY")
	if !is_set {
		return fmt.Errorf("AC_TRANSIT_KEY is not set")
	}

	now := time.Now().In(loc)
	nextBoard := [BOARD_HEIGHT][BOARD_WIDTH]uint8{}

	nowStr := now.Format("15:04:05")
	bartHeading := fmt.Sprintf("%s @%s", BART_HEADING, nowStr[:5])
	for i, char := range strings.Split(bartHeading, "") {
		charCode, _ := getVestaboardChar(char)
		nextBoard[0][i] = charCode
	}

	trainsLine := getBartTrainLine()
	for i, char := range trainsLine {
		charCode, _ := getVestaboardChar(char)
		nextBoard[1][i] = charCode
	}

	now = time.Now().In(loc)
	nowStr = now.Format("15:04:05")
	fBusHeading := fmt.Sprintf("%s @%s", F_BUS_HEADING, nowStr[:5])
	for i, char := range strings.Split(fBusHeading, "") {
		charCode, _ := getVestaboardChar(char)
		nextBoard[3][i] = charCode
	}

	fBusLine := getFBusLine()
	for i, char := range fBusLine {
		charCode, _ := getVestaboardChar(char)
		nextBoard[4][i] = charCode
	}

	err := postNewBoard(&NewBoardReq{ReqType: "charBoard", CharBoard: &nextBoard}, client)
	return err
}

func runCalendar(ctx context.Context, s *calendar.Service, client *http.Client, loc *time.Location) error {
	cals := os.Getenv("CALENDARS")

	if len(cals) == 0 {
		return nil
	}

	now := time.Now().In(loc)
	dayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, loc)
	dayEnd := time.Date(now.Year(), now.Month(), now.Day(), 23, 59, 59, 999999999, loc)
	calendarLines := getCalendarLines(ctx, s, dayStart, dayEnd)
	nextBoard := [BOARD_HEIGHT][BOARD_WIDTH]uint8{}

	for i, line := range calendarLines {
		for j, char := range line {
			charCode, _ := getVestaboardChar(char)
			nextBoard[i][j] = charCode
		}
	}

	err := postNewBoard(&NewBoardReq{ReqType: "charBoard", CharBoard: &nextBoard}, client)
	return err
}

func runCatIncidentTracker(client *http.Client, loc *time.Location, lastDate string) error {
	// now := time.Now().In(loc)
	// nowDayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, loc)
	// lastCatIncident, _ := time.ParseInLocation("2006-01-02", lastDate, loc)
	// days := int(math.Round(nowDayStart.Sub(lastCatIncident).Hours() / 24))
	// line := fmt.Sprintf("Days Since Last Cat Incident: %v", days)
	nextBoard := [BOARD_HEIGHT][BOARD_WIDTH]uint8{}
	copyBoard := [BOARD_HEIGHT][BOARD_WIDTH]string{
		{" ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " "},
		{" ", " ", " ", " ", " ", " ", " ", " ", "/", "|", "-", "/", ")", " ", " ", " ", " ", " ", " ", " ", " ", " "},
		{" ", " ", " ", " ", " ", " ", " ", "(", " ", "O", ".", "O", " ", ")", " ", " ", " ", " ", " ", " ", " ", " "},
		{" ", " ", " ", " ", " ", " ", " ", " ", "#", "#", "$", "#", "#", " ", " ", " ", " ", " ", " ", " ", " ", " "},
		{" ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " "},
		{" ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " "},
	}

	for i, line := range copyBoard {
		for j, char := range line {
			charCode, _ := getVestaboardChar(char)
			nextBoard[i][j] = charCode
		}
	}

	err := postNewBoard(&NewBoardReq{ReqType: "charBoard", CharBoard: &nextBoard}, client)
	return err
}

func (br *makeBoardRunner) runBoard(w http.ResponseWriter, req *http.Request) {
	VB_BOARD_NAME, _ := os.LookupEnv("VB_BOARD_NAME")

	row := br.db.QueryRow(fmt.Sprintf("SELECT * FROM local_boards WHERE name = '%s'", VB_BOARD_NAME))
	var setting SubscriptionSetting
	if err := row.Scan(&setting.Name, &setting.TransitEnabled, &setting.CalendarEnabled, &setting.TransitStart, &setting.TransitEnd); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			http.Error(w, http.StatusText(http.StatusNotFound),
				http.StatusNotFound)
			return
		}
		log.Error().Err(err).Msg("Failed to marshal setting")
		http.Error(w, http.StatusText(http.StatusInternalServerError),
			http.StatusInternalServerError)
		return
	}

	loc, err := time.LoadLocation("America/Los_Angeles")
	if err != nil {
		log.Error().Err(err).Msg("Failed to set timezone")
		http.Error(w, http.StatusText(http.StatusInternalServerError),
			http.StatusInternalServerError)
		return
	}
	httpClient := &http.Client{}

	now := time.Now().In(loc)
	start := strings.Split(setting.TransitStart, ":")
	transitStartH, _ := strconv.Atoi(start[0])
	transitStartM, _ := strconv.Atoi(start[1])
	end := strings.Split(setting.TransitEnd, ":")
	transitEndH, _ := strconv.Atoi(end[0])
	transitEndM, _ := strconv.Atoi(end[1])

	transitStart := time.Date(now.Year(), now.Month(), now.Day(), transitStartH, transitStartM, 0, 0, loc)
	transitEnd := time.Date(now.Year(), now.Month(), now.Day(), transitEndH, transitEndM, 0, 0, loc)
	calendarStart := time.Date(now.Year(), now.Month(), now.Day(), 9, 0, 0, 0, loc)
	calendarEnd := time.Date(now.Year(), now.Month(), now.Day(), 18, 0, 0, 0, loc)

	calPath, is_set := os.LookupEnv("CALENDAR_CREDENTIALS_PATH")
	if !is_set {
		log.Error().Msg("CALENDAR_CREDENTIALS_PATH is not set")
		http.Error(w, http.StatusText(http.StatusInternalServerError),
			http.StatusInternalServerError)
		return
	}

	s, err := calendar.NewService(br.ctx, option.WithCredentialsFile(calPath))
	if err != nil {
		log.Error().Err(err).Msg("Failed to get calendar service")
		http.Error(w, http.StatusText(http.StatusInternalServerError),
			http.StatusInternalServerError)
		return
	}

	if setting.TransitEnabled && now.After(transitStart) && now.Before(transitEnd) {
		log.Info().Interface("transit_start", transitStart).Interface("transit_end", transitEnd).Msg("Running Transit")
		err = runTransit(httpClient, loc)
		if err != nil {
			log.Error().Err(err).Msg("Failed to run transit board")
			http.Error(w, http.StatusText(http.StatusInternalServerError),
				http.StatusInternalServerError)
			return
		}
	} else if now.After(calendarStart) && now.Before(calendarEnd) && setting.CalendarEnabled && hasAnyEvents(br.ctx, s, loc) {
		log.Info().Msg("Running Calendar")
		err = runCalendar(br.ctx, s, httpClient, loc)
		if err != nil {
			log.Error().Err(err).Msg("Failed to run calendar")
			http.Error(w, http.StatusText(http.StatusInternalServerError),
				http.StatusInternalServerError)
			return
		}
	} else {
		// log.Info().Str("from_date", setting.LastCatIncidentDate).Msg("Running Cat Incident Tracker")
		// runCatIncidentTracker(httpClient, loc, setting.LastCatIncidentDate)
		log.Info().Msg("Running Cat Incident Tracker")
		runCatIncidentTracker(httpClient, loc, "")
		if err != nil {
			http.Error(w, http.StatusText(http.StatusInternalServerError),
				http.StatusInternalServerError)
			return
		}
	}

	fmt.Fprintf(w, "success")
}

func main() {
	// zerolog.LevelFieldName = "severity" # I will absolutely forget that I need to do this for gcp logging. leave it in.
	_, is_set := os.LookupEnv("RW_KEY")
	if !is_set {
		log.Fatal().Msg("RW_KEY is not set")
	}

	_, is_set = os.LookupEnv("VB_BOARD_NAME")
	if !is_set {
		log.Fatal().Msg("VB_BOARD_NAME is not set")
	}

	db_url, is_set := os.LookupEnv("DATABASE_URL")
	if !is_set {
		log.Fatal().Msg("DATABASE_URL is not set")
	}

	db, err := sql.Open("sqlite", db_url)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to connect to db")
	}

	ctx := context.Background()
	runner := &makeBoardRunner{db: db, ctx: ctx}

	PORT, is_set := os.LookupEnv("BE_PORT")
	if !is_set {
		PORT = "8081"
	}

	http.HandleFunc("/run-board", runner.runBoard)

	http.ListenAndServe(fmt.Sprintf(":%s", PORT), nil)
	log.Info().Msg(fmt.Sprintf("Up and running on %s", PORT))
}
