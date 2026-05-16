package main

import (
	"context"
	"errors"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"customer-service/internal/app/wsapp"
	"customer-service/internal/config"
	"customer-service/internal/logger"
)

func main() {
	cfg := config.MustLoad("configs/config.yaml")
	log := logger.MustNew(cfg.Log)
	defer log.Sync()

	hub := wsapp.NewHub(log)
	go hub.Run()

	mux := http.NewServeMux()
	mux.HandleFunc("/ws", wsapp.NewHandler(cfg, log, hub))
	mux.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	server := &http.Server{
		Addr:              cfg.WS.Addr,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		log.Sugar().Infow("customer-ws started", "addr", cfg.WS.Addr)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Sugar().Fatalw("customer-ws stopped unexpectedly", "error", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil {
		log.Sugar().Errorw("customer-ws shutdown failed", "error", err)
	}
}
