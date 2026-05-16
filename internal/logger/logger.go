package logger

import (
	"customer-service/internal/config"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

func MustNew(cfg config.LogConfig) *zap.Logger {
	zapCfg := zap.NewProductionConfig()
	if cfg.Mode == "dev" {
		zapCfg = zap.NewDevelopmentConfig()
	}
	if cfg.Level != "" {
		level := zapcore.InfoLevel
		if err := level.Set(cfg.Level); err == nil {
			zapCfg.Level = zap.NewAtomicLevelAt(level)
		}
	}
	log, err := zapCfg.Build()
	if err != nil {
		panic(err)
	}
	return log
}
