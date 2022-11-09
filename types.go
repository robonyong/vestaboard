package main

import (
	"bytes"
	"encoding/json"
)

type UpcomingTrain struct {
	Minutes   string `json:"minutes"`
	Direction string `json:"direction"`
	Color     string `json:"color"`
}
type Destination struct {
	Destination  string          `json:"destination"`
	Abbreviation string          `json:"abbreviation"`
	Estimate     []UpcomingTrain `json:"estimate"`
}
type BartApiMessage struct {
	Error   string `json:"error,omitempty"`
	Warning string `json:"warning,omitempty"`
}
type BartApiMessageWrapper struct {
	BartApiMessage
	IsValid bool
}
type Station struct {
	Name    string                 `json:"name"`
	Abbr    string                 `json:"abbr"`
	Etds    []Destination          `json:"etd"`
	Message *BartApiMessageWrapper `json:"message,omitempty"`
}
type BartRootMessage struct {
	Stations []Station              `json:"station"`
	Message  *BartApiMessageWrapper `json:"message,omitempty"`
}
type BartEtdMessage struct {
	Root BartRootMessage `json:"root"`
}

type BusStatus struct {
	LineRef       string
	DirectionRef  string
	Occupancy     string
	MonitoredCall struct {
		ExpectedArrivalTime string
	}
}
type UpcomingBus struct {
	RecordedAtTime          string
	MonitoredVehicleJourney BusStatus
}
type StopMonitorMessage struct {
	Status        bool
	UpcomingBuses []UpcomingBus `json:"MonitoredStopVisit"`
}
type ACTransitEtdMessage struct {
	Status                 bool
	StopMonitoringDelivery StopMonitorMessage
}
type ACTransitEtdMessageWrapper struct {
	ServiceDelivery ACTransitEtdMessage
}

type SubscriptionSetting struct {
	Name            string `json:"name" db:"name"`
	TransitStart    string `json:"transitStart" db:"transit_start"`
	TransitEnd      string `json:"transitEnd" db:"transit_end"`
	TransitEnabled  bool   `json:"transitEnabled" db:"transit_enabled"`
	CalendarEnabled bool   `json:"calendarEnabled" db:"calendar_enabled"`
	// LastCatIncidentDate string `json:"lastCatIncidentDate"`
}

type NewBoardReq struct {
	ReqType   string
	CharBoard *[BOARD_HEIGHT][BOARD_WIDTH]uint8
	Text      string
}

type VBCharReq *[BOARD_HEIGHT][BOARD_WIDTH]uint8

type VBTextReq struct {
	Text string `json:"text"`
}

func (m *BartApiMessageWrapper) UnmarshalJSON(data []byte) error {
	if bytes.Equal(data, []byte(`""`)) {
		m.IsValid = false
		return nil
	}
	m.IsValid = true
	return json.Unmarshal(data, &m.BartApiMessage)
}

func isSFBoundTrain(color string) bool {
	return color == "RED" || color == "YELLOW"
}
