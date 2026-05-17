package mq

import (
	"context"
	"time"

	"github.com/tiger1103/gfast/v3/internal/customer/config"
	"github.com/tiger1103/gfast/v3/internal/customer/store"

	"go.uber.org/zap"
)

type OutboxWorker struct {
	log       *zap.Logger
	store     store.OutboxStore
	publisher Publisher
	interval  time.Duration
	batchSize int
}

func NewOutboxWorker(cfg config.OutboxConfig, log *zap.Logger, store store.OutboxStore, publisher Publisher) *OutboxWorker {
	interval := time.Duration(cfg.PollInterval) * time.Second
	if interval <= 0 {
		interval = 2 * time.Second
	}
	batchSize := cfg.BatchSize
	if batchSize <= 0 {
		batchSize = 50
	}
	return &OutboxWorker{
		log:       log,
		store:     store,
		publisher: publisher,
		interval:  interval,
		batchSize: batchSize,
	}
}

func (w *OutboxWorker) Run(ctx context.Context) {
	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()

	for {
		w.flush(ctx)
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}

func (w *OutboxWorker) flush(ctx context.Context) {
	events, err := w.store.ListPendingOutbox(ctx, w.batchSize)
	if err != nil {
		w.log.Sugar().Warnw("list pending outbox failed", "error", err)
		return
	}
	for _, event := range events {
		if ctx.Err() != nil {
			return
		}
		if err := w.publisher.PublishOutbox(ctx, event); err != nil {
			nextRetry := time.Now().Add(backoff(event.RetryCount))
			_ = w.store.MarkOutboxRetry(ctx, event.ID, nextRetry, err.Error())
			w.log.Sugar().Warnw("publish outbox failed",
				"outbox_id", event.ID,
				"retry_count", event.RetryCount,
				"next_retry", nextRetry,
				"error", err,
			)
			continue
		}
		if err := w.store.MarkOutboxSent(ctx, event.ID); err != nil {
			w.log.Sugar().Warnw("mark outbox sent failed", "outbox_id", event.ID, "error", err)
		}
	}
}

func backoff(retryCount int) time.Duration {
	if retryCount < 1 {
		return 5 * time.Second
	}
	if retryCount > 6 {
		retryCount = 6
	}
	return time.Duration(1<<retryCount) * 5 * time.Second
}
