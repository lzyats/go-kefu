package api

import (
	"errors"
	"net/http"
	"strconv"

	"customer-service/internal/config"
	"customer-service/internal/domain"
	"customer-service/internal/store"
	"customer-service/internal/tenant"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

type Server struct {
	cfg   config.Config
	log   *zap.Logger
	store store.Store
}

func NewRouter(cfg config.Config, log *zap.Logger) http.Handler {
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Recovery())

	s := &Server{
		cfg:   cfg,
		log:   log,
		store: store.NewMemoryStore(),
	}

	r.GET("/health", s.health)

	v1 := r.Group("/api/v1")
	v1.Use(tenant.Middleware())
	{
		v1.POST("/sessions", s.createSession)
		v1.GET("/sessions/:session_id/messages", s.listMessages)
		v1.POST("/messages", s.sendMessage)
	}

	return r
}

func (s *Server) health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "customer-api"})
}

type createSessionRequest struct {
	UserID    string `json:"user_id" binding:"required"`
	ChannelID string `json:"channel_id"`
	GroupID   string `json:"group_id"`
	Priority  int    `json:"priority"`
}

func (s *Server) createSession(c *gin.Context) {
	var req createSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tc := tenant.FromContext(c.Request.Context())
	session, err := s.store.CreateSession(c.Request.Context(), domain.Session{
		TenantID:  tc.TenantID,
		AppID:     tc.AppID,
		ChannelID: req.ChannelID,
		UserID:    req.UserID,
		GroupID:   req.GroupID,
		Priority:  req.Priority,
		Status:    domain.SessionWaiting,
	})
	if err != nil {
		s.log.Sugar().Errorw("create session failed", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "create session failed"})
		return
	}

	c.JSON(http.StatusCreated, session)
}

type sendMessageRequest struct {
	SessionID   string          `json:"session_id" binding:"required"`
	ClientMsgID string          `json:"client_msg_id"`
	SenderID    string          `json:"sender_id" binding:"required"`
	SenderType  domain.UserType `json:"sender_type" binding:"required"`
	ReceiverID  string          `json:"receiver_id"`
	MsgType     string          `json:"msg_type"`
	Content     string          `json:"content" binding:"required"`
}

func (s *Server) sendMessage(c *gin.Context) {
	var req sendMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.MsgType == "" {
		req.MsgType = "text"
	}
	if req.ClientMsgID == "" {
		req.ClientMsgID = uuid.NewString()
	}

	tc := tenant.FromContext(c.Request.Context())
	session, err := s.store.GetSession(c.Request.Context(), tc.TenantID, req.SessionID)
	if err != nil {
		status := http.StatusInternalServerError
		if errors.Is(err, store.ErrNotFound) {
			status = http.StatusNotFound
		}
		c.JSON(status, gin.H{"error": "session not found"})
		return
	}

	message, err := s.store.SaveMessage(c.Request.Context(), domain.Message{
		TenantID:    tc.TenantID,
		AppID:       tc.AppID,
		ChannelID:   session.ChannelID,
		SessionID:   req.SessionID,
		ClientMsgID: req.ClientMsgID,
		SenderID:    req.SenderID,
		SenderType:  req.SenderType,
		ReceiverID:  req.ReceiverID,
		MsgType:     req.MsgType,
		Content:     req.Content,
	})
	if err != nil {
		s.log.Sugar().Errorw("save message failed", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "save message failed"})
		return
	}

	c.JSON(http.StatusCreated, message)
}

func (s *Server) listMessages(c *gin.Context) {
	tc := tenant.FromContext(c.Request.Context())
	sessionID := c.Param("session_id")
	afterSeq, _ := strconv.ParseInt(c.DefaultQuery("after_seq", "0"), 10, 64)
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))

	items, err := s.store.ListMessagesAfterSeq(c.Request.Context(), tc.TenantID, sessionID, afterSeq, limit)
	if err != nil {
		s.log.Sugar().Errorw("list messages failed", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "list messages failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}
