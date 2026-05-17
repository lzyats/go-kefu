package config

import (
	"os"

	"gopkg.in/yaml.v3"
)

type Config struct {
	API      ServerConfig   `yaml:"api"`
	WS       ServerConfig   `yaml:"ws"`
	Log      LogConfig      `yaml:"log"`
	MySQL    MySQLConfig    `yaml:"mysql"`
	Redis    RedisConfig    `yaml:"redis"`
	RocketMQ RocketMQConfig `yaml:"rocketmq"`
	Outbox   OutboxConfig   `yaml:"outbox"`
	JWT      JWTConfig      `yaml:"jwt"`
	Upload   UploadConfig   `yaml:"upload"`
}

type ServerConfig struct {
	Addr string `yaml:"addr"`
}

type LogConfig struct {
	Level string `yaml:"level"`
	Mode  string `yaml:"mode"`
}

type MySQLConfig struct {
	DSN string `yaml:"dsn"`
}

type RedisConfig struct {
	Addr     string `yaml:"addr"`
	Password string `yaml:"password"`
	DB       int    `yaml:"db"`
}

type RocketMQConfig struct {
	NameServers   []string `yaml:"name_servers"`
	Group         string   `yaml:"group"`
	AccessKey     string   `yaml:"access_key"`
	SecretKey     string   `yaml:"secret_key"`
	SecurityToken string   `yaml:"security_token"`
	MessageTopic  string   `yaml:"message_topic"`
	PushTopic     string   `yaml:"push_topic"`
	NotifyTopic   string   `yaml:"notify_topic"`
	AuditTopic    string   `yaml:"audit_topic"`
}

type OutboxConfig struct {
	Enabled      bool `yaml:"enabled"`
	PollInterval int  `yaml:"poll_interval_seconds"`
	BatchSize    int  `yaml:"batch_size"`
}

type JWTConfig struct {
	Secret string `yaml:"secret"`
	Issuer string `yaml:"issuer"`
}

type UploadConfig struct {
	Default int            `yaml:"default"`
	Local   LocalUpload    `yaml:"local"`
	S3      S3UploadConfig `yaml:"s3"`
}

type LocalUpload struct {
	Path    string `yaml:"path"`
	BaseURL string `yaml:"base_url"`
}

type S3UploadConfig struct {
	Endpoint        string `yaml:"endpoint"`
	Region          string `yaml:"region"`
	Bucket          string `yaml:"bucket"`
	AccessKeyID     string `yaml:"accessKeyId"`
	SecretAccessKey string `yaml:"secretAccessKey"`
	BaseURL         string `yaml:"baseUrl"`
	ForcePathStyle  bool   `yaml:"forcePathStyle"`
}

func MustLoad(path string) Config {
	cfg := Config{
		API: ServerConfig{Addr: ":8080"},
		WS:  ServerConfig{Addr: ":8081"},
		Log: LogConfig{Level: "info", Mode: "dev"},
		RocketMQ: RocketMQConfig{
			MessageTopic: "cs_message",
			PushTopic:    "cs_push",
			NotifyTopic:  "cs_notify",
			AuditTopic:   "cs_audit",
		},
		Outbox: OutboxConfig{
			Enabled:      true,
			PollInterval: 2,
			BatchSize:    50,
		},
		Upload: UploadConfig{
			Local: LocalUpload{Path: "uploads"},
		},
	}

	body, err := os.ReadFile(path)
	if err != nil {
		return cfg
	}
	if err := yaml.Unmarshal(body, &cfg); err != nil {
		panic(err)
	}
	applyDefaults(&cfg)
	return cfg
}

func applyDefaults(cfg *Config) {
	if cfg.API.Addr == "" {
		cfg.API.Addr = ":8080"
	}
	if cfg.WS.Addr == "" {
		cfg.WS.Addr = ":8081"
	}
	if cfg.Log.Level == "" {
		cfg.Log.Level = "info"
	}
	if cfg.RocketMQ.MessageTopic == "" {
		cfg.RocketMQ.MessageTopic = "cs_message"
	}
	if cfg.RocketMQ.PushTopic == "" {
		cfg.RocketMQ.PushTopic = "cs_push"
	}
	if cfg.RocketMQ.NotifyTopic == "" {
		cfg.RocketMQ.NotifyTopic = "cs_notify"
	}
	if cfg.RocketMQ.AuditTopic == "" {
		cfg.RocketMQ.AuditTopic = "cs_audit"
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
}
