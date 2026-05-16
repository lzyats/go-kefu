package wsapp

import (
	"net/http"

	"customer-service/internal/config"
	"customer-service/internal/tenant"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"go.uber.org/zap"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(_ *http.Request) bool {
		return true
	},
}

func NewHandler(_ config.Config, log *zap.Logger, hub *Hub) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantID := r.Header.Get(tenant.HeaderTenantID)
		if tenantID == "" {
			tenantID = r.URL.Query().Get("tenant_id")
		}
		if tenantID == "" {
			http.Error(w, "missing tenant_id", http.StatusBadRequest)
			return
		}

		userType := r.URL.Query().Get("user_type")
		userID := r.URL.Query().Get("user_id")
		if userType == "" || userID == "" {
			http.Error(w, "missing user_type or user_id", http.StatusBadRequest)
			return
		}

		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Sugar().Warnw("ws upgrade failed", "error", err)
			return
		}

		client := &Client{
			hub:      hub,
			log:      log,
			conn:     conn,
			send:     make(chan []byte, 256),
			connID:   uuid.NewString(),
			tenantID: tenantID,
			userType: userType,
			userID:   userID,
			deviceID: r.URL.Query().Get("device_id"),
		}

		hub.register <- client
		go client.WritePump()
		go client.ReadPump()
	}
}
