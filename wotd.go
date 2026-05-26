package main

import (
	"context"
	"encoding/json"
	"encoding/xml"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"unicode"
)

const MERRIAM_WEBSTER_WOTD_FEED_URL = "https://www.merriam-webster.com/wotd/feed/rss2"
const MERRIAM_WEBSTER_DICTIONARY_URL = "https://www.dictionaryapi.com/api/v3/references/collegiate/json/"
const DEFAULT_WOTD_CACHE_PATH = "/tmp/vestaboard-wotd-cache.json"

type wotdFeed struct {
	Channel struct {
		Items []struct {
			Title string `xml:"title"`
		} `xml:"item"`
	} `xml:"channel"`
}

type dictionaryEntry struct {
	Headword struct {
		Pronunciations []struct {
			MW string `json:"mw"`
		} `json:"prs"`
	} `json:"hwi"`
	FunctionalLabel string   `json:"fl"`
	ShortDefs       []string `json:"shortdef"`
}

type wordOfTheDay struct {
	Word          string
	PartOfSpeech  string
	Pronunciation string
	Definitions   []string
}

type wordOfTheDayCache struct {
	Date string `json:"date"`
	wordOfTheDay
}

func getWordOfTheDay(ctx context.Context, date string) (*wordOfTheDay, error) {
	if cached, ok := readCachedWordOfTheDay(date); ok {
		return cached, nil
	}

	wotd, err := fetchFreshWordOfTheDay(ctx)
	if err != nil {
		return nil, err
	}

	writeCachedWordOfTheDay(date, wotd)
	return wotd, nil
}

func fetchFreshWordOfTheDay(ctx context.Context) (*wordOfTheDay, error) {
	word, err := fetchWordOfTheDay(ctx, http.DefaultClient)
	if err != nil {
		return nil, err
	}

	entry, err := fetchDictionaryEntry(ctx, http.DefaultClient, word)
	if err != nil {
		return nil, err
	}

	return &wordOfTheDay{
		Word:          word,
		PartOfSpeech:  abbreviatedPartOfSpeech(entry.FunctionalLabel),
		Pronunciation: boardPronunciation(entry.Headword.Pronunciations[0].MW),
		Definitions:   entry.ShortDefs,
	}, nil
}

func wotdCachePath() string {
	if path, ok := os.LookupEnv("WOTD_CACHE_PATH"); ok && path != "" {
		return path
	}
	return DEFAULT_WOTD_CACHE_PATH
}

func readCachedWordOfTheDay(date string) (*wordOfTheDay, bool) {
	body, err := os.ReadFile(wotdCachePath())
	if err != nil {
		return nil, false
	}

	var cached wordOfTheDayCache
	if err := json.Unmarshal(body, &cached); err != nil {
		return nil, false
	}
	if cached.Date != date {
		return nil, false
	}

	return &cached.wordOfTheDay, true
}

func writeCachedWordOfTheDay(date string, wotd *wordOfTheDay) {
	cache := wordOfTheDayCache{
		Date:         date,
		wordOfTheDay: *wotd,
	}

	body, err := json.Marshal(cache)
	if err != nil {
		return
	}

	cachePath := wotdCachePath()
	if err := os.MkdirAll(filepath.Dir(cachePath), 0755); err != nil {
		return
	}

	tmpPath := cachePath + ".tmp"
	if err := os.WriteFile(tmpPath, body, 0644); err != nil {
		return
	}
	_ = os.Rename(tmpPath, cachePath)
}

func fetchWordOfTheDay(ctx context.Context, client *http.Client) (string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, MERRIAM_WEBSTER_WOTD_FEED_URL, nil)
	if err != nil {
		return "", err
	}

	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("failed to fetch word of the day feed: %s", resp.Status)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	var feed wotdFeed
	if err := xml.Unmarshal(body, &feed); err != nil {
		return "", err
	}
	if len(feed.Channel.Items) == 0 || strings.TrimSpace(feed.Channel.Items[0].Title) == "" {
		return "", errors.New("word of the day feed did not include an item title")
	}

	return strings.TrimSpace(feed.Channel.Items[0].Title), nil
}

func fetchDictionaryEntry(ctx context.Context, client *http.Client, word string) (*dictionaryEntry, error) {
	apiKey, ok := os.LookupEnv("MERRIAM_WEBSTER_API_KEY")
	if !ok || apiKey == "" {
		return nil, errors.New("MERRIAM_WEBSTER_API_KEY is not set")
	}

	endpoint, _ := url.Parse(MERRIAM_WEBSTER_DICTIONARY_URL)
	endpoint.Path += url.PathEscape(word)
	query := endpoint.Query()
	query.Set("key", apiKey)
	endpoint.RawQuery = query.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint.String(), nil)
	if err != nil {
		return nil, err
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch dictionary entry: %s", resp.Status)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var entries []dictionaryEntry
	if err := json.Unmarshal(body, &entries); err != nil {
		return nil, err
	}

	for _, entry := range entries {
		if len(entry.Headword.Pronunciations) > 0 && len(entry.ShortDefs) > 0 {
			return &entry, nil
		}
	}

	return nil, fmt.Errorf("dictionary entry for %q did not include pronunciation and short definitions", word)
}

func boardPronunciation(pronunciation string) string {
	pronunciation = strings.Trim(pronunciation, `\ /`)
	pronunciation = pronunciationReplacer.Replace(pronunciation)
	pronunciation = uppercaseStressRE.ReplaceAllStringFunc(pronunciation, func(match string) string {
		return "'" + strings.ToLower(match)
	})
	return sanitizeBoardText(pronunciation)
}

func sanitizeBoardText(text string) string {
	var builder strings.Builder
	for _, r := range text {
		char := string(r)
		if unicode.IsSpace(r) {
			char = " "
		}
		if _, ok := getVestaboardChar(char); ok {
			builder.WriteString(char)
		} else {
			builder.WriteString(" ")
		}
	}
	return whitespaceRE.ReplaceAllString(strings.TrimSpace(builder.String()), " ")
}

func formatWordOfTheDayBoard(wotd *wordOfTheDay) [BOARD_HEIGHT][BOARD_WIDTH]uint8 {
	nextBoard := [BOARD_HEIGHT][BOARD_WIDTH]uint8{}
	lines := wordOfTheDayLines(wotd)
	startRow := (BOARD_HEIGHT - len(lines)) / 2

	for i, line := range lines {
		for j, char := range strings.Split(line, "") {
			if j >= BOARD_WIDTH {
				break
			}
			charCode, _ := getVestaboardChar(char)
			nextBoard[startRow+i][j] = charCode
		}
	}

	return nextBoard
}

func wordOfTheDayLines(wotd *wordOfTheDay) []string {
	lines := []string{
		centerBoardLine(fitBoardLine(fmt.Sprintf("%s (%s)", wotd.Word, wotd.PartOfSpeech))),
		centerBoardLine(fitBoardLine(wotd.Pronunciation)),
	}

	for _, definition := range wotd.Definitions {
		if len(lines) == BOARD_HEIGHT {
			break
		}

		line := fitBoardLine(definition)
		if line != "" {
			lines = append(lines, line)
		}
	}

	return lines
}

func fitBoardLine(line string) string {
	line = sanitizeBoardText(line)
	if len([]rune(line)) <= BOARD_WIDTH {
		return strings.TrimRight(line, " :-;,")
	}

	runes := []rune(line)
	line = string(runes[:BOARD_WIDTH])
	if idx := strings.LastIndex(line, " "); idx > 0 {
		line = line[:idx]
	}
	return strings.TrimRight(strings.TrimSpace(line), " :-;,")
}

func centerBoardLine(line string) string {
	padding := (BOARD_WIDTH - len([]rune(line))) / 2
	if padding <= 0 {
		return line
	}
	return strings.Repeat(" ", padding) + line
}

func abbreviatedPartOfSpeech(partOfSpeech string) string {
	switch strings.ToLower(strings.TrimSpace(partOfSpeech)) {
	case "adjective":
		return "adj"
	case "adverb":
		return "adv"
	case "conjunction":
		return "conj"
	case "interjection":
		return "interj"
	case "noun":
		return "n"
	case "preposition":
		return "prep"
	case "pronoun":
		return "pron"
	case "verb", "intransitive verb", "transitive verb":
		return "v"
	default:
		return sanitizeBoardText(partOfSpeech)
	}
}

var pronunciationReplacer = strings.NewReplacer(
	"ˈ", "'",
	"ˌ", "'",
	"*", "'",
	"ər", "er",
	"ȯi", "oi",
	"ȯr", "or",
	"au̇", "ou",
	"ə", "uh",
	"ɚ", "er",
	"ɝ", "er",
	"ŋ", "ng",
	"ä", "ah",
	"ā", "ay",
	"ȧ", "ay",
	"ē", "ee",
	"ė", "ee",
	"ī", "i",
	"ō", "o",
	"ȯ", "o",
	"ü", "oo",
	"u̇", "oo",
)

var uppercaseStressRE = regexp.MustCompile(`[A-Z]+`)
var whitespaceRE = regexp.MustCompile(`\s+`)
