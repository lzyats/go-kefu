package wsapp

import "encoding/json"

const (
	EventPing        = "ping"
	EventPong        = "pong"
	EventSendMessage = "send_message"
	EventMessage     = "message"
	EventAck         = "ack"
	EventError       = "error"
)

type Envelope struct {
	Event string          `json:"event"`
	Data  json.RawMessage `json:"data,omitempty"`
}

type SendMessageData struct {
	SessionID   string `json:"session_id"`
	ClientMsgID string `json:"client_msg_id"`
	Content     string `json:"content"`
	MsgType     string `json:"msg_type"`
}

type ErrorData struct {
	Message string `json:"message"`
}
