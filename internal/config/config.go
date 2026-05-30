package config

import (
	"errors"
	"net/url"
	"os"
	"regexp"
	"strings"
)

var appSlugPattern = regexp.MustCompile(`^[a-z][a-z0-9-]{0,79}$`)

type Config struct {
	Addr           string
	OhmeshBaseURL  string
	OhmeshAppSlug  string
	LoginOnStartup bool
}

func Load() Config {
	return Config{
		Addr:           envString("HOMI_ADDR", ":8080"),
		OhmeshBaseURL:  strings.TrimRight(envString("HOMI_OHMESH_BASE_URL", "https://ohmesh.jjgo.io"), "/"),
		OhmeshAppSlug:  envString("HOMI_OHMESH_APP_SLUG", "homi"),
		LoginOnStartup: envBool("HOMI_LOGIN_ON_STARTUP", true),
	}
}

func (c Config) Validate() error {
	if strings.TrimSpace(c.Addr) == "" {
		return errors.New("HOMI_ADDR is required")
	}
	if strings.TrimSpace(c.OhmeshBaseURL) == "" {
		return errors.New("HOMI_OHMESH_BASE_URL is required")
	}
	parsed, err := url.Parse(c.OhmeshBaseURL)
	if err != nil {
		return err
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return errors.New("HOMI_OHMESH_BASE_URL must use http or https")
	}
	if parsed.Host == "" {
		return errors.New("HOMI_OHMESH_BASE_URL must include a host")
	}
	if !appSlugPattern.MatchString(c.OhmeshAppSlug) {
		return errors.New("HOMI_OHMESH_APP_SLUG must be a lowercase app slug")
	}
	return nil
}

func (c Config) LoginURL(redirectURL string) string {
	base := strings.TrimRight(c.OhmeshBaseURL, "/")
	values := url.Values{}
	values.Set("app", c.OhmeshAppSlug)
	values.Set("redirect_url", redirectURL)
	return base + "/login?" + values.Encode()
}

func (c Config) LogoutURL(redirectURL string) string {
	base := strings.TrimRight(c.OhmeshBaseURL, "/")
	values := url.Values{}
	values.Set("app", c.OhmeshAppSlug)
	values.Set("redirect_url", redirectURL)
	return base + "/logout?" + values.Encode()
}

func envString(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func envBool(key string, fallback bool) bool {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	switch strings.ToLower(value) {
	case "1", "t", "true", "yes", "y", "on":
		return true
	case "0", "f", "false", "no", "n", "off":
		return false
	default:
		return fallback
	}
}
