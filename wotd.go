package main

import (
	"context"
	"encoding/json"
	"encoding/xml"
	"errors"
	"fmt"
	"html"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"unicode"
)

const WORDSMITH_WOTD_FEED_URL = "https://wordsmith.org/awad/rss1.xml"
const MERRIAM_WEBSTER_DICTIONARY_URL = "https://www.dictionaryapi.com/api/v3/references/collegiate/json/"
const DEFAULT_WOTD_CACHE_PATH = "/tmp/vestaboard-wotd-cache.json"

type wotdFeed struct {
	Channel struct {
		Items []struct {
			Title       string `xml:"title"`
			Link        string `xml:"link"`
			Description string `xml:"description"`
		} `xml:"item"`
	} `xml:"channel"`
}

type dictionaryEntry struct {
	Meta struct {
		ID string `json:"id"`
	} `json:"meta"`
	Headword struct {
		Pronunciations []struct {
			MW string `json:"mw"`
		} `json:"prs"`
	} `json:"hwi"`
	FunctionalLabel string   `json:"fl"`
	ShortDefs       []string `json:"shortdef"`
	RunOns          []struct {
		Entry          string `json:"ure"`
		Pronunciations []struct {
			MW string `json:"mw"`
		} `json:"prs"`
		FunctionalLabel string `json:"fl"`
	} `json:"uros"`
}

type wordOfTheDay struct {
	Word          string
	PartOfSpeech  string
	Pronunciation string
	Definitions   []string
}

type wotdFeedItem struct {
	Word        string
	Link        string
	Description string
}

type dictionaryMatch struct {
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
	feedItem, err := fetchWordOfTheDay(ctx, http.DefaultClient)
	if err != nil {
		return nil, err
	}

	match, err := fetchDictionaryEntry(ctx, http.DefaultClient, feedItem.Word)
	if err == nil {
		return &wordOfTheDay{
			Word:          feedItem.Word,
			PartOfSpeech:  abbreviatedPartOfSpeech(match.PartOfSpeech),
			Pronunciation: boardPronunciation(match.Pronunciation),
			Definitions:   match.Definitions,
		}, nil
	}

	return fetchWordsmithEntry(ctx, http.DefaultClient, feedItem)
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

func fetchWordOfTheDay(ctx context.Context, client *http.Client) (*wotdFeedItem, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, WORDSMITH_WOTD_FEED_URL, nil)
	if err != nil {
		return nil, err
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch word of the day feed: %s", resp.Status)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var feed wotdFeed
	if err := xml.Unmarshal(body, &feed); err != nil {
		return nil, err
	}
	if len(feed.Channel.Items) == 0 || strings.TrimSpace(feed.Channel.Items[0].Title) == "" {
		return nil, errors.New("word of the day feed did not include an item title")
	}

	item := feed.Channel.Items[0]
	return &wotdFeedItem{
		Word:        strings.TrimSpace(item.Title),
		Link:        strings.TrimSpace(item.Link),
		Description: strings.TrimSpace(item.Description),
	}, nil
}

func fetchDictionaryEntry(ctx context.Context, client *http.Client, word string) (*dictionaryMatch, error) {
	apiKey, ok := os.LookupEnv("MERRIAM_WEBSTER_API_KEY")
	if !ok || apiKey == "" {
		return nil, errors.New("MERRIAM_WEBSTER_API_KEY is not set")
	}

	endpoint, _ := url.Parse(MERRIAM_WEBSTER_DICTIONARY_URL)
	endpoint.Path += word
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

	var results []json.RawMessage
	if err := json.Unmarshal(body, &results); err != nil {
		return nil, err
	}

	for _, result := range results {
		var entry dictionaryEntry
		if err := json.Unmarshal(result, &entry); err != nil {
			continue
		}
		if normalizedWord(entry.Meta.ID) == normalizedWord(word) && len(entry.Headword.Pronunciations) > 0 && len(entry.ShortDefs) > 0 {
			return &dictionaryMatch{
				PartOfSpeech:  entry.FunctionalLabel,
				Pronunciation: entry.Headword.Pronunciations[0].MW,
				Definitions:   entry.ShortDefs,
			}, nil
		}

		for _, runOn := range entry.RunOns {
			if normalizedWord(runOn.Entry) == normalizedWord(word) && len(runOn.Pronunciations) > 0 && runOn.FunctionalLabel != "" && len(entry.ShortDefs) > 0 {
				return &dictionaryMatch{
					PartOfSpeech:  runOn.FunctionalLabel,
					Pronunciation: runOn.Pronunciations[0].MW,
					Definitions:   entry.ShortDefs,
				}, nil
			}
		}
	}

	return nil, fmt.Errorf("dictionary entry for %q did not include a matching headword", word)
}

func fetchWordsmithEntry(ctx context.Context, client *http.Client, feedItem *wotdFeedItem) (*wordOfTheDay, error) {
	if feedItem.Link == "" {
		return wordOfTheDayFromWordsmithDescription(feedItem)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, feedItem.Link, nil)
	if err != nil {
		return nil, err
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch Wordsmith entry: %s", resp.Status)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	page := string(body)
	pronunciation := htmlText(wordsmithPronunciationRE.FindStringSubmatch(page))
	partOfSpeech := htmlText(wordsmithPartOfSpeechRE.FindStringSubmatch(page))
	definition := htmlText(wordsmithDefinitionRE.FindStringSubmatch(page))
	if partOfSpeech == "" || definition == "" {
		return wordOfTheDayFromWordsmithDescription(feedItem)
	}

	return &wordOfTheDay{
		Word:          feedItem.Word,
		PartOfSpeech:  abbreviatedPartOfSpeech(partOfSpeech),
		Pronunciation: boardPronunciation(pronunciation),
		Definitions:   []string{definition},
	}, nil
}

func wordOfTheDayFromWordsmithDescription(feedItem *wotdFeedItem) (*wordOfTheDay, error) {
	description := strings.TrimSpace(feedItem.Description)
	idx := strings.Index(description, ":")
	if idx < 0 {
		return nil, fmt.Errorf("Wordsmith entry for %q did not include metadata", feedItem.Word)
	}

	return &wordOfTheDay{
		Word:          feedItem.Word,
		PartOfSpeech:  abbreviatedPartOfSpeech(description[:idx]),
		Pronunciation: "",
		Definitions:   []string{strings.TrimSpace(description[idx+1:])},
	}, nil
}

func htmlText(match []string) string {
	if len(match) < 2 {
		return ""
	}
	text := htmlTagRE.ReplaceAllString(match[1], " ")
	return whitespaceRE.ReplaceAllString(strings.TrimSpace(html.UnescapeString(text)), " ")
}

func normalizedWord(word string) string {
	word = htmlTagRE.ReplaceAllString(word, "")
	word = strings.ReplaceAll(word, "*", "")
	word = strings.TrimSuffix(word, ":g")
	return strings.ToLower(strings.TrimSpace(word))
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
	}
	if wotd.Pronunciation != "" {
		lines = append(lines, centerBoardLine(fitBoardLine(wotd.Pronunciation)))
	}

	for i, definition := range wotd.Definitions {
		if len(lines) == BOARD_HEIGHT {
			break
		}

		if wrapped := wrapBoardLine(shortDefinition(definition), BOARD_HEIGHT-len(lines), i == 0); len(wrapped) > 0 {
			lines = append(lines, wrapped...)
		}
	}

	return lines
}

func wrapBoardLine(line string, maxLines int, allowPartial bool) []string {
	line = strings.TrimSpace(sanitizeBoardText(line))
	if line == "" || maxLines == 0 {
		return nil
	}
	if len([]rune(line)) <= BOARD_WIDTH {
		line = strings.TrimRight(line, " :-;,")
		if line == "" {
			return nil
		}
		return []string{line}
	}

	lines := []string{}
	for line != "" && len(lines) < maxLines {
		indent := ""
		width := BOARD_WIDTH
		if len(lines) > 0 {
			indent = " "
			width--
		}

		next, consumed := fitWrappedBoardLine(line, width)
		if next == "" {
			break
		}

		lines = append(lines, indent+next)
		line = strings.TrimSpace(line[consumed:])
	}

	if line != "" && !allowPartial {
		return nil
	}
	return lines
}

func shortDefinition(definition string) string {
	end := len(definition)
	for _, marker := range []string{";", " : ", "—"} {
		if idx := strings.Index(definition, marker); idx >= 0 && idx < end {
			end = idx
		}
	}
	return definition[:end]
}

func fitWrappedBoardLine(line string, width int) (string, int) {
	line = strings.TrimSpace(line)
	consumed := len(line)
	if len([]rune(line)) > width {
		runes := []rune(line)
		line = string(runes[:width])
		if idx := strings.LastIndex(line, " "); idx > 0 {
			line = line[:idx]
		}
		consumed = len(line)
	}

	return strings.TrimRight(strings.TrimSpace(line), " :-;,"), consumed
}

func fitBoardLine(line string) string {
	line = strings.TrimSpace(sanitizeBoardText(line))
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
var htmlTagRE = regexp.MustCompile(`<[^>]+>`)
var whitespaceRE = regexp.MustCompile(`\s+`)
var wordsmithDefinitionRE = regexp.MustCompile(`(?is)<div[^>]*>\s*<i>[^<]+</i>:\s*(.*?)</div>`)
var wordsmithPartOfSpeechRE = regexp.MustCompile(`(?is)<div[^>]*>\s*<i>([^<]+)</i>:`)
var wordsmithPronunciationRE = regexp.MustCompile(`(?is)PRONUNCIATION:</div>\s*<div[^>]*>\s*\(([^)]+)\)`)
