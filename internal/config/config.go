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
	JWT      JWTConfig      `yaml:"jwt"`
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
	NameServers []string `yaml:"name_servers"`
	Group       string   `yaml:"group"`
}

type JWTConfig struct {
	Secret string `yaml:"secret"`
	Issuer string `yaml:"issuer"`
}

func MustLoad(path string) Config {
	cfg := Config{
		API: ServerConfig{Addr: ":8080"},
		WS:  ServerConfig{Addr: ":8081"},
		Log: LogConfig{Level: "info", Mode: "dev"},
	}

	body, err := os.ReadFile(path)
	if err != nil {
		return cfg
	}
	if err := yaml.Unmarshal(body, &cfg); err != nil {
		panic(err)
	}
	return cfg
}
