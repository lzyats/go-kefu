package domain

import "time"

type UserType string

const (
	UserTypeCustomer UserType = "customer"
	UserTypeAgent    UserType = "agent"
	UserTypeAdmin    UserType = "admin"
)

type SessionStatus string

const (
	SessionWaiting      SessionStatus = "waiting"
	SessionServing      SessionStatus = "serving"
	SessionTransferring SessionStatus = "transferring"
	SessionClosed       SessionStatus = "closed"
	SessionTimeout      SessionStatus = "timeout"
	SessionRated        SessionStatus = "rated"
)

type MessageStatus string

const (
	MessageSending   MessageStatus = "sending"
	MessageSent      MessageStatus = "sent"
	MessageDelivered MessageStatus = "delivered"
	MessageRead      MessageStatus = "read"
	MessageFailed    MessageStatus = "failed"
	MessageRecalled  MessageStatus = "recalled"
)

type Tenant struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Session struct {
	ID          string        `json:"id"`
	TenantID    string        `json:"tenant_id"`
	AppID       string        `json:"app_id"`
	ChannelID   string        `json:"channel_id"`
	UserID      string        `json:"user_id"`
	AgentID     string        `json:"agent_id"`
	GroupID     string        `json:"group_id"`
	Status      SessionStatus `json:"status"`
	Priority    int           `json:"priority"`
	LastSeq     int64         `json:"last_seq"`
	LastMsgTime time.Time     `json:"last_msg_time"`
	CreatedAt   time.Time     `json:"created_at"`
	UpdatedAt   time.Time     `json:"updated_at"`
}

type Message struct {
	ID          string        `json:"id"`
	TenantID    string        `json:"tenant_id"`
	AppID       string        `json:"app_id"`
	ChannelID   string        `json:"channel_id"`
	SessionID   string        `json:"session_id"`
	ClientMsgID string        `json:"client_msg_id"`
	SenderID    string        `json:"sender_id"`
	SenderType  UserType      `json:"sender_type"`
	ReceiverID  string        `json:"receiver_id"`
	MsgType     string        `json:"msg_type"`
	Content     string        `json:"content"`
	Seq         int64         `json:"seq"`
	Status      MessageStatus `json:"status"`
	SendTime    time.Time     `json:"send_time"`
}

type OutboxEvent struct {
	ID            string    `json:"id"`
	TenantID      string    `json:"tenant_id"`
	AggregateType string    `json:"aggregate_type"`
	AggregateID   string    `json:"aggregate_id"`
	EventType     string    `json:"event_type"`
	Payload       []byte    `json:"payload"`
	Status        string    `json:"status"`
	RetryCount    int       `json:"retry_count"`
	NextRetryTime time.Time `json:"next_retry_time"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}
