package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"

	"github.com/rs/zerolog/log"
)

func getVestaboardChar(char string) (uint8, bool) {
	charCode := uint8(0)
	found := true
	switch upperChar := strings.ToUpper(char); upperChar {
	case "A":
		charCode = 1
	case "B":
		charCode = 2
	case "C":
		charCode = 3
	case "D":
		charCode = 4
	case "E":
		charCode = 5
	case "F":
		charCode = 6
	case "G":
		charCode = 7
	case "H":
		charCode = 8
	case "I":
		charCode = 9
	case "J":
		charCode = 10
	case "K":
		charCode = 11
	case "L":
		charCode = 12
	case "M":
		charCode = 13
	case "N":
		charCode = 14
	case "O":
		charCode = 15
	case "P":
		charCode = 16
	case "Q":
		charCode = 17
	case "R":
		charCode = 18
	case "S":
		charCode = 19
	case "T":
		charCode = 20
	case "U":
		charCode = 21
	case "V":
		charCode = 22
	case "W":
		charCode = 23
	case "X":
		charCode = 24
	case "Y":
		charCode = 25
	case "Z":
		charCode = 26
	case "1":
		charCode = 27
	case "2":
		charCode = 28
	case "3":
		charCode = 29
	case "4":
		charCode = 30
	case "5":
		charCode = 31
	case "6":
		charCode = 32
	case "7":
		charCode = 33
	case "8":
		charCode = 34
	case "9":
		charCode = 35
	case "0":
		charCode = 36
	case "!":
		charCode = 37
	case "@":
		charCode = 38
	case "#":
		charCode = 39
	case "$":
		charCode = 40
	case "(":
		charCode = 41
	case ")":
		charCode = 42
	case "-":
		charCode = 44
	case "+":
		charCode = 46
	case "&":
		charCode = 47
	case "=":
		charCode = 48
	case ";":
		charCode = 49
	case ":":
		charCode = 50
	case "'":
		charCode = 52
	case "\"":
		charCode = 53
	case "%":
		charCode = 54
	case ",":
		charCode = 55
	case ".":
		charCode = 56
	case "/":
		charCode = 59
	case "?":
		charCode = 60
	case "°":
		charCode = 62
	case "RED":
		charCode = 63
	case "ORANGE":
		charCode = 64
	case "YELLOW":
		charCode = 65
	case "GREEN":
		charCode = 66
	case "BLUE":
		charCode = 67
	case "PURPLE":
		charCode = 68
	case "WHITE":
		charCode = 69
	default:
		found = false
	}
	return charCode, found
}

func postNewBoard(postReq *NewBoardReq, client *http.Client) error {
	API_KEY, is_set := os.LookupEnv("API_KEY")
	if !is_set {
		log.Fatal().Msg("API_KEY is not set")
	}

	API_SECRET, is_set := os.LookupEnv("API_SECRET")
	if !is_set {
		log.Fatal().Msg("API_SECRET is not set")
	}

	VB_SUBSCRIPTION_ID, is_set := os.LookupEnv("VB_SUBSCRIPTION_ID")
	if !is_set {
		log.Fatal().Msg("VB_SUBSCRIPTION_ID is not set")
	}

	var serializedBody []byte
	if postReq.ReqType == "text" {
		reqBody := &VBTextReq{
			Text: postReq.Text,
		}
		serializedBody, _ = json.Marshal(reqBody)
	} else if postReq.ReqType == "charBoard" {
		reqBody := &VBCharReq{
			Characters: postReq.CharBoard,
		}
		serializedBody, _ = json.Marshal(reqBody)
	}

	vbUrl := fmt.Sprintf("https://platform.vestaboard.com/subscriptions/%s/message", VB_SUBSCRIPTION_ID)
	req, err := http.NewRequest("POST", vbUrl, bytes.NewBuffer(serializedBody))
	if err != nil {
		log.Error().Err(err).Msg("Failed to compose new board request")
		return err
	}

	req.Header.Set("X-Vestaboard-Api-Key", API_KEY)
	req.Header.Set("X-Vestaboard-Api-Secret", API_SECRET)

	resp, err := client.Do(req)
	if err != nil {
		log.Error().Err(err).Msg("Failed to post new board")
		return err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Error().Err(err).Msg("Failed to read VB response body")
		return err
	}
	if resp.StatusCode != 200 {
		var respBody map[string]interface{}
		json.Unmarshal([]byte(body), &respBody)

		log.Error().
			Int("response_code", resp.StatusCode).
			Interface("response_body", respBody).
			Msg("Received an error from posting to VB")
		return fmt.Errorf("couldn't post to board: %s", resp.Status)
	}
	return nil
}
