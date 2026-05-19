package customer

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/gogf/gf/v2/frame/g"
	"github.com/gogf/gf/v2/net/ghttp"
	"github.com/tiger1103/gfast/v3/internal/app/customerapp"
)

// Bootstrap mounts customer-service HTTP APIs into the GFast server and starts
// the customer WebSocket listener in the same backend process.
func Bootstrap(ctx context.Context, s *ghttp.Server) {
	rt, err := customerapp.NewRuntime(ctx, loadOptions(ctx))
	if err != nil {
		g.Log().Fatalf(ctx, "init customer service failed: %v", err)
	}
	mountAPI(s, rt.API)
	startWS(ctx, rt.Config.WS.Addr, rt.WSHandler)
}

func mountAPI(s *ghttp.Server, handler http.Handler) {
	wrapped := ghttp.WrapH(handler)
	stripCustomerAPI := ghttp.WrapH(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		r2 := r.Clone(r.Context())
		r2.URL.Path = strings.TrimPrefix(r.URL.Path, "/customer-api")
		if r2.URL.Path == "" {
			r2.URL.Path = "/"
		}
		handler.ServeHTTP(w, r2)
	}))

	s.BindHandler("/customer-api/*any", stripCustomerAPI)
	s.BindHandler("GET:/health", wrapped)
	s.BindHandler("GET:/api/v1/configs/public", wrapped)
	s.BindHandler("POST:/api/v1/sessions", wrapped)
	s.BindHandler("GET:/api/v1/sessions/{session_id}/messages", wrapped)
	s.BindHandler("POST:/api/v1/messages", wrapped)
	s.BindHandler("POST:/api/v1/uploads/images", wrapped)
	s.BindHandler("GET:/api/v1/agents/{agent_id}", wrapped)
	s.BindHandler("POST:/api/v1/agents/{agent_id}/online", wrapped)
	s.BindHandler("POST:/api/v1/agents/{agent_id}/offline", wrapped)
	s.BindHandler("/admin/v1/*any", wrapped)
	s.BindHandler("/uploads/*any", wrapped)
}

func startWS(ctx context.Context, addr string, wsHandler http.HandlerFunc) {
	mux := http.NewServeMux()
	mux.HandleFunc("/ws", wsHandler)
	mux.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	server := &http.Server{
		Addr:              addr,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
	}
	go func() {
		g.Log().Infof(ctx, "customer ws started at %s", addr)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			g.Log().Fatalf(ctx, "customer ws stopped unexpectedly: %v", err)
		}
	}()
}

func loadOptions(ctx context.Context) customerapp.Options {
	return customerapp.Options{
		APIAddr: g.Cfg().MustGet(ctx, "server.address", ":8101").String(),
		WSAddr:  g.Cfg().MustGet(ctx, "customer.ws.addr", ":8102").String(),
		Log: customerapp.LogOptions{
			Level: "info",
			Mode:  "dev",
		},
		MySQL: customerapp.MySQLOptions{
			DSN: normalizeMySQLLink(g.Cfg().MustGet(ctx, "database.default.link").String()),
		},
		Redis: customerapp.RedisOptions{
			Addr:     g.Cfg().MustGet(ctx, "redis.default.address").String(),
			Password: g.Cfg().MustGet(ctx, "redis.default.pass").String(),
			DB:       g.Cfg().MustGet(ctx, "redis.default.db").Int(),
		},
		Rocket: customerapp.RocketMQOptions{
			NameServers:   g.Cfg().MustGet(ctx, "rocketmq.name_servers").Strings(),
			Group:         g.Cfg().MustGet(ctx, "rocketmq.group", "customer-service").String(),
			AccessKey:     g.Cfg().MustGet(ctx, "rocketmq.access_key").String(),
			SecretKey:     g.Cfg().MustGet(ctx, "rocketmq.secret_key").String(),
			SecurityToken: g.Cfg().MustGet(ctx, "rocketmq.security_token").String(),
			MessageTopic:  g.Cfg().MustGet(ctx, "rocketmq.message_topic", "cs_message").String(),
			PushTopic:     g.Cfg().MustGet(ctx, "rocketmq.push_topic", "cs_push").String(),
			NotifyTopic:   g.Cfg().MustGet(ctx, "rocketmq.notify_topic", "cs_notify").String(),
			AuditTopic:    g.Cfg().MustGet(ctx, "rocketmq.audit_topic", "cs_audit").String(),
		},
		Outbox: customerapp.OutboxOptions{
			Enabled:      g.Cfg().MustGet(ctx, "customer.outbox.enabled", true).Bool(),
			PollInterval: g.Cfg().MustGet(ctx, "customer.outbox.poll_interval_seconds", 2).Int(),
			BatchSize:    g.Cfg().MustGet(ctx, "customer.outbox.batch_size", 50).Int(),
		},
		JWT: customerapp.JWTOptions{
			Secret: g.Cfg().MustGet(ctx, "gfToken.encryptKey", "change-me").String(),
			Issuer: "gfast-customer",
		},
		Upload: customerapp.UploadOptions{
			Default: g.Cfg().MustGet(ctx, "upload.default").Int(),
			Local: customerapp.LocalUploadOptions{
				Path:    g.Cfg().MustGet(ctx, "upload.local.pathPrefix", "upload_file").String(),
				BaseURL: g.Cfg().MustGet(ctx, "upload.local.baseUrl").String(),
			},
			S3: customerapp.S3UploadOptions{
				Endpoint:        g.Cfg().MustGet(ctx, "upload.s3.endpoint").String(),
				Region:          g.Cfg().MustGet(ctx, "upload.s3.region").String(),
				Bucket:          g.Cfg().MustGet(ctx, "upload.s3.bucket").String(),
				AccessKeyID:     g.Cfg().MustGet(ctx, "upload.s3.accessKeyId").String(),
				SecretAccessKey: g.Cfg().MustGet(ctx, "upload.s3.secretAccessKey").String(),
				BaseURL:         g.Cfg().MustGet(ctx, "upload.s3.baseUrl").String(),
				ForcePathStyle:  g.Cfg().MustGet(ctx, "upload.s3.forcePathStyle").Bool(),
			},
		},
		IP2Region: customerapp.IP2RegionOptions{
			XDBPath:   g.Cfg().MustGet(ctx, "customer.ip2region.xdb_path", "resource/ip2region/ip2region.xdb").String(),
			V6XDBPath: g.Cfg().MustGet(ctx, "customer.ip2region.v6_xdb_path").String(),
		},
	}
}

func normalizeMySQLLink(link string) string {
	return strings.TrimPrefix(link, "mysql:")
}
