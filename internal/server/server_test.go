package server

import (
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"homi/internal/config"
)

func newTestHandler(t *testing.T) http.Handler {
	t.Helper()
	handler, err := New(config.Config{
		Addr:           ":0",
		OhmeshBaseURL:  "https://ohmesh.jjgo.io",
		OhmeshAppSlug:  "homi",
		LoginOnStartup: true,
	})
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}
	return handler
}

func TestRoutesRender(t *testing.T) {
	// scenarioTag: test.p0.server.routes
	handler := newTestHandler(t)
	for _, path := range []string{"/", "/brain", "/engines/schedule", "/engines/dictation"} {
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, path, nil))
		if rec.Code != http.StatusOK {
			t.Fatalf("%s status = %d, want 200", path, rec.Code)
		}
		if !strings.Contains(rec.Body.String(), "window.HOMI_CONFIG") {
			t.Fatalf("%s body missing config", path)
		}
	}
}

func TestPreviewBundle(t *testing.T) {
	// scenarioTag: test.p0.import.preview
	handler := newTestHandler(t)
	body := `{"format":"homi","version":1,"bundleType":"import","datasets":[{"engineId":"dictation","engineSchemaVersion":1,"title":"Words","items":[{"word":"apple"}]}]}`
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/bundles/preview", strings.NewReader(body)))
	if rec.Code != http.StatusOK {
		t.Fatalf("preview status = %d, body=%s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), `"ok":true`) {
		t.Fatalf("preview response missing ok: %s", rec.Body.String())
	}
}

func TestPreviewBundleRejectsInvalid(t *testing.T) {
	// scenarioTag: test.p0.import.preview
	handler := newTestHandler(t)
	body := `{"format":"homi","version":1,"bundleType":"import","datasets":[{"engineId":"dictation","engineSchemaVersion":1,"title":"Words","items":[{}]}]}`
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/bundles/preview", strings.NewReader(body)))
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("preview status = %d, want 400", rec.Code)
	}
}

func TestDictationRunnerContract(t *testing.T) {
	// scenarioTag: test.p0.dictation.start_sets_mode
	handler := newTestHandler(t)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/engines/dictation", nil))
	body := rec.Body.String()
	for _, want := range []string{"dictation-root", "dictation-next", "dictation-exit"} {
		if !strings.Contains(body, want) {
			t.Fatalf("dictation route missing %q", want)
		}
	}
	client, err := os.ReadFile("static/app.js")
	if err != nil {
		t.Fatalf("read app.js: %v", err)
	}
	if !strings.Contains(string(client), "10_000") {
		t.Fatal("dictation client should keep 10 second auto advance")
	}
}
