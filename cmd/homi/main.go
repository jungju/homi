package main

import (
	"log"
	"net/http"

	"homi/internal/config"
	"homi/internal/server"
)

func main() {
	cfg := config.Load()
	if err := cfg.Validate(); err != nil {
		log.Fatalf("invalid configuration: %v", err)
	}

	handler, err := server.New(cfg)
	if err != nil {
		log.Fatalf("create server: %v", err)
	}

	log.Printf("homi listening on %s", cfg.Addr)
	if err := http.ListenAndServe(cfg.Addr, handler); err != nil {
		log.Fatalf("run server: %v", err)
	}
}
