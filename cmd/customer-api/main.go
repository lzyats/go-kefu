package main

import (
	"context"
	"errors"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"customer-service/internal/app/api"
	"customer-service/internal/config"
	"customer-service/internal/logger"
)

func main() {
	cfg := config.MustLoad("configs/config.yaml")
	log := logger.MustNew(cfg.Log)
	defer log.Sync()

	router := api.NewRouter(cfg, log)
	server := &http.Server{
		Addr:              cfg.API.Addr,
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		log.Sugar().Infow("customer-api started", "addr", cfg.API.Addr)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Sugar().Fatalw("customer-api stopped unexpectedly", "error", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil {
		log.Sugar().Errorw("customer-api shutdown failed", "error", err)
	}
}
