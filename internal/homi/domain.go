package homi

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"regexp"
	"sort"
	"strings"
	"time"
	"unicode/utf8"
)

const (
	RecordTypeDataset = "homi.dataset.v1"
	RecordTypeUI      = "homi.ui.v1"

	MaxBundleJSONBytes       = 2_097_152
	MaxDatasetCountPerBundle = 50
	MaxItemsPerDataset       = 10_000
	MaxTextLength            = 10_000
)

var (
	engineIDPattern = regexp.MustCompile(`^[a-z][a-z0-9-]{0,39}$`)
	timePattern     = regexp.MustCompile(`^([01]\d|2[0-3]):[0-5]\d$`)
	monthDayPattern = regexp.MustCompile(`^(0[1-9]|1[0-2])-([0-2]\d|3[01])$`)
	datePattern     = regexp.MustCompile(`^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$`)
)

type DataSet map[string]any

type Bundle map[string]any

type ParseBundleResult struct {
	Bundle   Bundle    `json:"bundle"`
	Datasets []DataSet `json:"datasets"`
}

type OhmeshRecord struct {
	ID        uint            `json:"id"`
	Type      string          `json:"type"`
	Data      json.RawMessage `json:"data"`
	UpdatedAt time.Time       `json:"updated_at"`
}

type Store struct {
	StoreVersion     int                  `json:"storeVersion"`
	UpdatedAt        string               `json:"updatedAt"`
	DatasetsByEngine map[string][]DataSet `json:"datasetsByEngine"`
	UI               map[string]any       `json:"ui,omitempty"`
	RecordIDs        map[string]uint      `json:"recordIds,omitempty"`
	UIRecordID       uint                 `json:"uiRecordId,omitempty"`
}

func ParseBundleText(raw string) (ParseBundleResult, []string) {
	if len([]byte(raw)) > MaxBundleJSONBytes {
		return ParseBundleResult{}, []string{fmt.Sprintf("JSON size exceeds %d bytes", MaxBundleJSONBytes)}
	}

	decoder := json.NewDecoder(strings.NewReader(raw))
	decoder.UseNumber()
	var top map[string]any
	if err := decoder.Decode(&top); err != nil {
		return ParseBundleResult{}, []string{"JSON parse failed"}
	}

	errors := validateBundleTop(top)
	if len(errors) > 0 {
		return ParseBundleResult{}, errors
	}

	rawDatasets, _ := top["datasets"].([]any)
	if len(rawDatasets) > MaxDatasetCountPerBundle {
		errors = append(errors, fmt.Sprintf("datasets exceed %d entries", MaxDatasetCountPerBundle))
	}

	datasets := make([]DataSet, 0, len(rawDatasets))
	for index, rawDataset := range rawDatasets {
		dataset, ok := rawDataset.(map[string]any)
		if !ok {
			errors = append(errors, fmt.Sprintf("datasets[%d]: object is required", index))
			continue
		}
		if datasetErrors := validateDataset(dataset, index); len(datasetErrors) > 0 {
			errors = append(errors, datasetErrors...)
			continue
		}
		datasets = append(datasets, DataSet(dataset))
	}
	if len(errors) > 0 {
		return ParseBundleResult{}, errors
	}

	top["datasets"] = datasets
	return ParseBundleResult{
		Bundle:   Bundle(top),
		Datasets: datasets,
	}, nil
}

func NormalizeImportURL(raw string) (string, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return "", errors.New("URL is required")
	}
	if strings.HasPrefix(strings.ToLower(trimmed), "javascript:") {
		return "", errors.New("javascript scheme is not allowed")
	}

	parsed, err := url.Parse(trimmed)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return "", errors.New("URL is invalid")
	}
	if parsed.Scheme == "javascript" {
		return "", errors.New("javascript scheme is not allowed")
	}
	if parsed.Scheme == "https" {
		return parsed.String(), nil
	}
	if parsed.Scheme == "http" && parsed.Hostname() == "localhost" {
		return parsed.String(), nil
	}
	return "", errors.New("only https URLs are allowed")
}

func StoreFromRecords(records []OhmeshRecord) (Store, error) {
	store := Store{
		StoreVersion:     1,
		UpdatedAt:        time.Now().UTC().Format(time.RFC3339),
		DatasetsByEngine: map[string][]DataSet{},
		UI:               map[string]any{},
		RecordIDs:        map[string]uint{},
	}

	sort.SliceStable(records, func(i, j int) bool {
		return records[i].UpdatedAt.After(records[j].UpdatedAt)
	})

	for _, record := range records {
		switch record.Type {
		case RecordTypeDataset:
			var dataset map[string]any
			if err := decodeRecordData(record.Data, &dataset); err != nil {
				return Store{}, err
			}
			if errs := validateStoredDataset(dataset); len(errs) > 0 {
				return Store{}, errors.New(strings.Join(errs, "; "))
			}
			engineID, _ := dataset["engineId"].(string)
			datasetID, _ := dataset["id"].(string)
			store.DatasetsByEngine[engineID] = append(store.DatasetsByEngine[engineID], DataSet(dataset))
			if datasetID != "" {
				store.RecordIDs[datasetID] = record.ID
			}
			if !record.UpdatedAt.IsZero() {
				store.UpdatedAt = record.UpdatedAt.Format(time.RFC3339)
			}
		case RecordTypeUI:
			if store.UIRecordID != 0 {
				continue
			}
			var ui map[string]any
			if err := decodeRecordData(record.Data, &ui); err != nil {
				return Store{}, err
			}
			store.UI = ui
			store.UIRecordID = record.ID
			if !record.UpdatedAt.IsZero() {
				store.UpdatedAt = record.UpdatedAt.Format(time.RFC3339)
			}
		}
	}

	return store, nil
}

func validateBundleTop(top map[string]any) []string {
	var errors []string
	if getString(top, "format") != "homi" {
		errors = append(errors, "format must be homi")
	}
	if getInt(top, "version") != 1 {
		errors = append(errors, "version must be 1")
	}
	switch getString(top, "bundleType") {
	case "sample", "import", "backup":
	default:
		errors = append(errors, "bundleType is invalid")
	}
	datasets, ok := top["datasets"].([]any)
	if !ok || len(datasets) == 0 {
		errors = append(errors, "datasets are required")
	}
	for _, field := range []string{"bundleId", "title", "description"} {
		if value, exists := top[field]; exists {
			if text, ok := value.(string); !ok || tooLong(text, MaxTextLength) {
				errors = append(errors, field+" is invalid")
			}
		}
	}
	return errors
}

func validateDataset(dataset map[string]any, index int) []string {
	var errors []string
	prefix := fmt.Sprintf("datasets[%d]", index)

	engineID := getString(dataset, "engineId")
	if !isEngineID(engineID) {
		errors = append(errors, prefix+": engineId is unsupported")
	}
	if getInt(dataset, "engineSchemaVersion") != 1 {
		errors = append(errors, prefix+": engineSchemaVersion must be 1")
	}
	title := getString(dataset, "title")
	if strings.TrimSpace(title) == "" || tooLong(title, MaxTextLength) {
		errors = append(errors, prefix+": title is required")
	}

	items, ok := dataset["items"].([]any)
	if !ok {
		errors = append(errors, prefix+": items must be an array")
		return errors
	}
	if len(items) > MaxItemsPerDataset {
		errors = append(errors, fmt.Sprintf("%s: items exceed %d entries", prefix, MaxItemsPerDataset))
	}
	for itemIndex, raw := range items {
		item, ok := raw.(map[string]any)
		if !ok {
			errors = append(errors, fmt.Sprintf("%s.items[%d]: object is required", prefix, itemIndex))
			continue
		}
		if engineID == "dictation" {
			errors = append(errors, validateDictationItem(item, prefix, itemIndex)...)
		}
		if engineID == "schedule" {
			errors = append(errors, validateScheduleItem(item, prefix, itemIndex)...)
		}
	}
	return errors
}

func validateStoredDataset(dataset map[string]any) []string {
	errors := validateDataset(dataset, 0)
	if strings.TrimSpace(getString(dataset, "id")) == "" {
		errors = append(errors, "dataset id is required")
	}
	return errors
}

func validateDictationItem(item map[string]any, prefix string, itemIndex int) []string {
	var errors []string
	word := getString(item, "word")
	if strings.TrimSpace(word) == "" || tooLong(word, MaxTextLength) {
		errors = append(errors, fmt.Sprintf("%s.items[%d]: word is required", prefix, itemIndex))
	}
	for _, field := range []string{"meaning", "hint", "example"} {
		if value, exists := item[field]; exists {
			if text, ok := value.(string); !ok || tooLong(text, MaxTextLength) {
				errors = append(errors, fmt.Sprintf("%s.items[%d]: %s is invalid", prefix, itemIndex, field))
			}
		}
	}
	if audioURL := getString(item, "audioUrl"); audioURL != "" && !strings.HasPrefix(audioURL, "https://") {
		errors = append(errors, fmt.Sprintf("%s.items[%d]: audioUrl must be https", prefix, itemIndex))
	}
	return errors
}

func validateScheduleItem(item map[string]any, prefix string, itemIndex int) []string {
	var errors []string
	title := getString(item, "title")
	if strings.TrimSpace(title) == "" || tooLong(title, MaxTextLength) {
		errors = append(errors, fmt.Sprintf("%s.items[%d]: title is required", prefix, itemIndex))
	}
	if audioURL := getString(item, "audioUrl"); audioURL != "" && !strings.HasPrefix(audioURL, "https://") {
		errors = append(errors, fmt.Sprintf("%s.items[%d]: audioUrl must be https", prefix, itemIndex))
	}
	repeat := getString(item, "repeat")
	timeStart := getString(item, "timeStart")
	monthDay := getString(item, "monthDay")
	date := getString(item, "date")

	if repeatInterval, ok := item["repeatIntervalSec"]; ok && positiveInteger(repeatInterval) {
		return errors
	}

	switch repeat {
	case "daily":
		if !timePattern.MatchString(timeStart) {
			errors = append(errors, fmt.Sprintf("%s.items[%d]: daily requires timeStart", prefix, itemIndex))
		}
	case "yearly":
		if !monthDayPattern.MatchString(monthDay) {
			errors = append(errors, fmt.Sprintf("%s.items[%d]: yearly requires monthDay", prefix, itemIndex))
		}
		if !timePattern.MatchString(timeStart) {
			errors = append(errors, fmt.Sprintf("%s.items[%d]: yearly requires timeStart", prefix, itemIndex))
		}
	case "":
		switch {
		case datePattern.MatchString(date) && timePattern.MatchString(timeStart):
		case timePattern.MatchString(timeStart) && monthDay == "":
		case monthDayPattern.MatchString(monthDay) && timePattern.MatchString(timeStart):
		default:
			errors = append(errors, fmt.Sprintf("%s.items[%d]: schedule recurrence is required", prefix, itemIndex))
		}
	default:
		errors = append(errors, fmt.Sprintf("%s.items[%d]: repeat is invalid", prefix, itemIndex))
	}
	return errors
}

func decodeRecordData(raw json.RawMessage, out any) error {
	decoder := json.NewDecoder(bytes.NewReader(raw))
	decoder.UseNumber()
	return decoder.Decode(out)
}

func isEngineID(value string) bool {
	return engineIDPattern.MatchString(value) && (value == "schedule" || value == "dictation")
}

func getString(data map[string]any, key string) string {
	value, _ := data[key].(string)
	return value
}

func getInt(data map[string]any, key string) int {
	switch value := data[key].(type) {
	case json.Number:
		parsed, _ := value.Int64()
		return int(parsed)
	case float64:
		return int(value)
	case int:
		return value
	default:
		return 0
	}
}

func positiveInteger(value any) bool {
	switch typed := value.(type) {
	case json.Number:
		parsed, err := typed.Int64()
		return err == nil && parsed >= 1
	case float64:
		return typed >= 1 && typed == float64(int64(typed))
	default:
		return false
	}
}

func tooLong(value string, max int) bool {
	return utf8.RuneCountInString(value) > max
}
