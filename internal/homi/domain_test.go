package homi

import (
	"encoding/json"
	"os"
	"testing"
	"time"
)

func TestParseBundleTextSample(t *testing.T) {
	// scenarioTag: test.p0.domain.bundle_validation
	raw, err := os.ReadFile("../../public/samples/homi.sample.homi.json")
	if err != nil {
		t.Fatalf("read sample: %v", err)
	}
	result, errs := ParseBundleText(string(raw))
	if len(errs) > 0 {
		t.Fatalf("ParseBundleText errors = %v", errs)
	}
	if len(result.Datasets) != 3 {
		t.Fatalf("datasets = %d, want 3", len(result.Datasets))
	}
}

func TestParseBundleTextRejectsBadDictationItem(t *testing.T) {
	// scenarioTag: test.p0.domain.bundle_validation
	raw := `{"format":"homi","version":1,"bundleType":"import","datasets":[{"engineId":"dictation","engineSchemaVersion":1,"title":"Bad","items":[{"noword":true}]}]}`
	_, errs := ParseBundleText(raw)
	if len(errs) == 0 {
		t.Fatal("ParseBundleText accepted invalid dictation item")
	}
}

func TestNormalizeImportURL(t *testing.T) {
	// scenarioTag: test.p0.domain.bundle_validation
	if _, err := NormalizeImportURL("javascript:alert(1)"); err == nil {
		t.Fatal("NormalizeImportURL accepted javascript URL")
	}
	if got, err := NormalizeImportURL("https://example.com/homi.json"); err != nil || got != "https://example.com/homi.json" {
		t.Fatalf("NormalizeImportURL https = %q, %v", got, err)
	}
}

func TestStoreFromRecords(t *testing.T) {
	// scenarioTag: test.p0.ohmesh.record_shape
	dataset := json.RawMessage(`{"id":"ds1","engineId":"dictation","engineSchemaVersion":1,"title":"Words","items":[{"word":"apple"}]}`)
	ui := json.RawMessage(`{"themeMode":"dark","robotStyle":"mint"}`)
	store, err := StoreFromRecords([]OhmeshRecord{
		{ID: 7, Type: RecordTypeDataset, Data: dataset, UpdatedAt: time.Date(2026, 3, 10, 1, 2, 3, 0, time.UTC)},
		{ID: 8, Type: RecordTypeUI, Data: ui, UpdatedAt: time.Date(2026, 3, 10, 1, 2, 4, 0, time.UTC)},
	})
	if err != nil {
		t.Fatalf("StoreFromRecords error = %v", err)
	}
	if len(store.DatasetsByEngine["dictation"]) != 1 {
		t.Fatalf("dictation datasets = %d", len(store.DatasetsByEngine["dictation"]))
	}
	if store.RecordIDs["ds1"] != 7 {
		t.Fatalf("record id = %d, want 7", store.RecordIDs["ds1"])
	}
	if store.UI["themeMode"] != "dark" {
		t.Fatalf("ui theme = %v, want dark", store.UI["themeMode"])
	}
}
