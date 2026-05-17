package customerapp

import (
	"context"
	"net/http"

	"github.com/tiger1103/gfast/v3/internal/customer/api"
	"github.com/tiger1103/gfast/v3/internal/customer/cache"
	"github.com/tiger1103/gfast/v3/internal/customer/config"
	"github.com/tiger1103/gfast/v3/internal/customer/logger"
	"github.com/tiger1103/gfast/v3/internal/customer/mq"
	"github.com/tiger1103/gfast/v3/internal/customer/store"
	"github.com/tiger1103/gfast/v3/internal/customer/wsapp"

	"go.uber.org/zap"
)

type Options struct {
	APIAddr string
	WSAddr  string
	Log     LogOptions
	MySQL   MySQLOptions
	Redis   RedisOptions
	Rocket  RocketMQOptions
	Outbox  OutboxOptions
	JWT     JWTOptions
	Upload  UploadOptions
}

type LogOptions struct {
	Level string
	Mode  string
}

type MySQLOptions struct {
	DSN string
}

type RedisOptions struct {
	Addr     string
	Password string
	DB       int
}

type RocketMQOptions struct {
	NameServers   []string
	Group         string
	AccessKey     string
	SecretKey     string
	SecurityToken string
	MessageTopic  string
	PushTopic     string
	NotifyTopic   string
	AuditTopic    string
}

type OutboxOptions struct {
	Enabled      bool
	PollInterval int
	BatchSize    int
}

type JWTOptions struct {
	Secret string
	Issuer string
}

type UploadOptions struct {
	Default int
	Local   LocalUploadOptions
	S3      S3UploadOptions
}

type LocalUploadOptions struct {
	Path    string
	BaseURL string
}

type S3UploadOptions struct {
	Endpoint        string
	Region          string
	Bucket          string
	AccessKeyID     string
	SecretAccessKey string
	BaseURL         string
	ForcePathStyle  bool
}

type Runtime struct {
	Config    config.Config
	Log       *zap.Logger
	Store     *store.MySQLStore
	Cache     *cache.RedisCache
	API       http.Handler
	WSHandler http.HandlerFunc
}

func NewRuntime(ctx context.Context, opts Options) (*Runtime, error) {
	cfg := toInternalConfig(opts)
	log := logger.MustNew(cfg.Log)

	db, err := store.OpenMySQL(ctx, cfg.MySQL.DSN)
	if err != nil {
		return nil, err
	}

	redisCache := cache.NewRedisCache(cfg.Redis)
	if err := redisCache.Ping(ctx); err != nil {
		_ = db.Close()
		return nil, err
	}

	dataStore := store.NewMySQLStore(db)
	rt := &Runtime{
		Config: cfg,
		Log:    log,
		Store:  dataStore,
		Cache:  redisCache,
	}

	if cfg.Outbox.Enabled {
		publisher, err := mq.NewRocketPublisher(cfg.RocketMQ, log)
		if err == nil && publisher.Start() == nil {
			go mq.NewOutboxWorker(cfg.Outbox, log, dataStore, publisher).Run(ctx)
		} else if err != nil {
			log.Sugar().Warnw("create rocketmq publisher failed, outbox will keep pending", "error", err)
		}
	}

	rt.API = api.NewRouter(cfg, log, dataStore, redisCache)
	hub := wsapp.NewHub(log)
	go hub.Run()
	rt.WSHandler = wsapp.NewHandler(cfg, log, hub, redisCache, dataStore)
	return rt, nil
}

func toInternalConfig(opts Options) config.Config {
	cfg := config.Config{
		API: config.ServerConfig{Addr: opts.APIAddr},
		WS:  config.ServerConfig{Addr: opts.WSAddr},
		Log: config.LogConfig{Level: opts.Log.Level, Mode: opts.Log.Mode},
		MySQL: config.MySQLConfig{
			DSN: opts.MySQL.DSN,
		},
		Redis: config.RedisConfig{
			Addr:     opts.Redis.Addr,
			Password: opts.Redis.Password,
			DB:       opts.Redis.DB,
		},
		RocketMQ: config.RocketMQConfig{
			NameServers:   opts.Rocket.NameServers,
			Group:         opts.Rocket.Group,
			AccessKey:     opts.Rocket.AccessKey,
			SecretKey:     opts.Rocket.SecretKey,
			SecurityToken: opts.Rocket.SecurityToken,
			MessageTopic:  opts.Rocket.MessageTopic,
			PushTopic:     opts.Rocket.PushTopic,
			NotifyTopic:   opts.Rocket.NotifyTopic,
			AuditTopic:    opts.Rocket.AuditTopic,
		},
		Outbox: config.OutboxConfig{
			Enabled:      opts.Outbox.Enabled,
			PollInterval: opts.Outbox.PollInterval,
			BatchSize:    opts.Outbox.BatchSize,
		},
		JWT: config.JWTConfig{
			Secret: opts.JWT.Secret,
			Issuer: opts.JWT.Issuer,
		},
		Upload: config.UploadConfig{
			Default: opts.Upload.Default,
			Local: config.LocalUpload{
				Path:    opts.Upload.Local.Path,
				BaseURL: opts.Upload.Local.BaseURL,
			},
			S3: config.S3UploadConfig{
				Endpoint:        opts.Upload.S3.Endpoint,
				Region:          opts.Upload.S3.Region,
				Bucket:          opts.Upload.S3.Bucket,
				AccessKeyID:     opts.Upload.S3.AccessKeyID,
				SecretAccessKey: opts.Upload.S3.SecretAccessKey,
				BaseURL:         opts.Upload.S3.BaseURL,
				ForcePathStyle:  opts.Upload.S3.ForcePathStyle,
			},
		},
	}
	if cfg.API.Addr == "" {
		cfg.API.Addr = ":8101"
	}
	if cfg.WS.Addr == "" {
		cfg.WS.Addr = ":8102"
	}
	if cfg.Log.Level == "" {
		cfg.Log.Level = "info"
	}
	if cfg.Log.Mode == "" {
		cfg.Log.Mode = "dev"
	}
	if cfg.Outbox.PollInterval <= 0 {
		cfg.Outbox.PollInterval = 2
	}
	if cfg.Outbox.BatchSize <= 0 {
		cfg.Outbox.BatchSize = 50
	}
	if cfg.Upload.Local.Path == "" {
		cfg.Upload.Local.Path = "uploads"
	}
	return cfg
}
