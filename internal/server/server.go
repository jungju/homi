package server

import (
	"embed"
	"encoding/json"
	"html/template"
	"io"
	"io/fs"
	"net/http"
	"strings"

	"homi/internal/config"
	"homi/internal/homi"
)

//go:embed templates static
var assets embed.FS

type Server struct {
	cfg       config.Config
	templates *template.Template
	static    http.Handler
	samples   http.Handler
}

type pageData struct {
	Title      string
	Page       string
	EngineID   string
	ConfigJSON template.JS
}

func New(cfg config.Config) (http.Handler, error) {
	if err := cfg.Validate(); err != nil {
		return nil, err
	}

	templates, err := template.ParseFS(assets, "templates/*.html")
	if err != nil {
		return nil, err
	}
	staticFS, err := fs.Sub(assets, "static")
	if err != nil {
		return nil, err
	}
	sampleFS, err := fs.Sub(assets, "static/samples")
	if err != nil {
		return nil, err
	}

	return &Server{
		cfg:       cfg,
		templates: templates,
		static:    http.FileServer(http.FS(staticFS)),
		samples:   http.FileServer(http.FS(sampleFS)),
	}, nil
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if strings.HasPrefix(r.URL.Path, "/static/") {
		http.StripPrefix("/static/", s.static).ServeHTTP(w, r)
		return
	}
	if strings.HasPrefix(r.URL.Path, "/samples/") {
		http.StripPrefix("/samples/", s.samples).ServeHTTP(w, r)
		return
	}

	switch {
	case isGetOrHead(r.Method) && r.URL.Path == "/healthz":
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	case r.Method == http.MethodPost && r.URL.Path == "/api/bundles/preview":
		s.previewBundle(w, r)
	case isGetOrHead(r.Method) && r.URL.Path == "/":
		s.render(w, r, "홈", "home", "")
	case isGetOrHead(r.Method) && r.URL.Path == "/brain":
		s.render(w, r, "브레인 설정", "brain", "")
	case isGetOrHead(r.Method) && r.URL.Path == "/engines/schedule":
		s.render(w, r, "스케줄", "engine", "schedule")
	case isGetOrHead(r.Method) && r.URL.Path == "/engines/dictation":
		s.render(w, r, "받아쓰기", "engine", "dictation")
	default:
		s.renderStatus(w, r, http.StatusNotFound, "페이지 없음", "not-found", "")
	}
}

func isGetOrHead(method string) bool {
	return method == http.MethodGet || method == http.MethodHead
}

func (s *Server) previewBundle(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(r.Body, homi.MaxBundleJSONBytes+1))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "errors": []string{"request body is invalid"}})
		return
	}
	result, errs := homi.ParseBundleText(string(raw))
	if len(errs) > 0 {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "errors": errs})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"ok":       true,
		"bundle":   result.Bundle,
		"datasets": result.Datasets,
	})
}

func (s *Server) render(w http.ResponseWriter, r *http.Request, title string, page string, engineID string) {
	s.renderStatus(w, r, http.StatusOK, title, page, engineID)
}

func (s *Server) renderStatus(w http.ResponseWriter, r *http.Request, status int, title string, page string, engineID string) {
	configJSON, err := json.Marshal(map[string]any{
		"ohmeshBaseUrl":  strings.TrimRight(s.cfg.OhmeshBaseURL, "/"),
		"ohmeshAppSlug":  s.cfg.OhmeshAppSlug,
		"loginOnStartup": s.cfg.LoginOnStartup,
		"recordTypes": map[string]string{
			"dataset": homi.RecordTypeDataset,
			"ui":      homi.RecordTypeUI,
		},
	})
	if err != nil {
		http.Error(w, "config error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(status)
	_ = s.templates.ExecuteTemplate(w, "page.html", pageData{
		Title:      title,
		Page:       page,
		EngineID:   engineID,
		ConfigJSON: template.JS(configJSON),
	})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
