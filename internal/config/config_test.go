package config

import (
	"strings"
	"testing"
)

func TestConfigValidateDefaults(t *testing.T) {
	cfg := Config{
		Addr:           ":8080",
		OhmeshBaseURL:  "https://ohmesh.jjgo.io",
		OhmeshAppSlug:  "homi",
		LoginOnStartup: true,
	}
	if err := cfg.Validate(); err != nil {
		t.Fatalf("Validate() error = %v", err)
	}
}

func TestConfigLoginURL(t *testing.T) {
	cfg := Config{OhmeshBaseURL: "https://ohmesh.jjgo.io", OhmeshAppSlug: "homi"}
	got := cfg.LoginURL("https://homi.example/brain?x=1")
	if !strings.HasPrefix(got, "https://ohmesh.jjgo.io/login?") {
		t.Fatalf("LoginURL prefix = %q", got)
	}
	if !strings.Contains(got, "app=homi") {
		t.Fatalf("LoginURL missing app: %q", got)
	}
	if !strings.Contains(got, "redirect_url=https%3A%2F%2Fhomi.example%2Fbrain%3Fx%3D1") {
		t.Fatalf("LoginURL missing encoded redirect: %q", got)
	}
}
