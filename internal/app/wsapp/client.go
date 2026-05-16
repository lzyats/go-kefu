package wsapp

import (
	"encoding/json"
	"time"

	"github.com/gorilla/websocket"
	"go.uber.org/zap"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 16 * 1024
)

type Client struct {
	hub      *Hub
	log      *zap.Logger
	conn     *websocket.Conn
	send     chan []byte
	connID   string
	tenantID string
	userType string
	userID   string
	deviceID string
}

func (c *Client) RouteKey() string {
	return c.tenantID + ":" + c.userType + ":" + c.userID
}

func (c *Client) ReadPump() {
	defer func() {
		c.hub.unregister <- c
		_ = c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		return c.conn.SetReadDeadline(time.Now().Add(pongWait))
	})

	for {
		_, body, err := c.conn.ReadMessage()
		if err != nil {
			return
		}
		c.handle(body)
	}
}

func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		_ = c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}
		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (c *Client) handle(body []byte) {
	var envelope Envelope
	if err := json.Unmarshal(body, &envelope); err != nil {
		c.writeJSON(EventError, ErrorData{Message: "invalid envelope"})
		return
	}

	switch envelope.Event {
	case EventPing:
		c.writeJSON(EventPong, map[string]any{"ts": time.Now().UnixMilli()})
	case EventSendMessage:
		var data SendMessageData
		if err := json.Unmarshal(envelope.Data, &data); err != nil {
			c.writeJSON(EventError, ErrorData{Message: "invalid send_message data"})
			return
		}
		c.writeJSON(EventAck, map[string]any{
			"client_msg_id": data.ClientMsgID,
			"session_id":    data.SessionID,
			"status":        "received",
		})
	default:
		c.writeJSON(EventError, ErrorData{Message: "unsupported event"})
	}
}

func (c *Client) writeJSON(event string, data any) {
	body, err := json.Marshal(data)
	if err != nil {
		c.log.Sugar().Warnw("marshal ws response failed", "error", err)
		return
	}
	envelope, _ := json.Marshal(Envelope{Event: event, Data: body})
	select {
	case c.send <- envelope:
	default:
		c.hub.unregister <- c
	}
}
