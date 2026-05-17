package api

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/tiger1103/gfast/v3/internal/customer/cache"
	"github.com/tiger1103/gfast/v3/internal/customer/config"
	"github.com/tiger1103/gfast/v3/internal/customer/domain"
	"github.com/tiger1103/gfast/v3/internal/customer/store"
	"github.com/tiger1103/gfast/v3/internal/customer/tenant"
	"github.com/tiger1103/gfast/v3/internal/customer/upload"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

type Server struct {
	cfg   config.Config
	log   *zap.Logger
	store store.Store
	cache *cache.RedisCache
}

func NewRouter(cfg config.Config, log *zap.Logger, dataStore store.Store, redisCache *cache.RedisCache) http.Handler {
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Recovery())

	s := &Server{
		cfg:   cfg,
		log:   log,
		store: dataStore,
		cache: redisCache,
	}

	r.GET("/health", s.health)
	localUploadPath := cfg.Upload.Local.Path
	if localUploadPath == "" {
		localUploadPath = "uploads"
	}
	r.Static("/uploads", localUploadPath)

	v1 := r.Group("/api/v1")
	v1.Use(tenant.Middleware())
	{
		v1.POST("/sessions", s.createSession)
		v1.GET("/sessions/:session_id/messages", s.listMessages)
		v1.POST("/messages", s.sendMessage)
		v1.POST("/uploads/images", s.uploadImage)
		v1.GET("/agents/:agent_id", s.getAgent)
		v1.POST("/agents/:agent_id/online", s.agentOnline)
		v1.POST("/agents/:agent_id/offline", s.agentOffline)
	}
	s.registerAdminRoutes(r)

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
	status := domain.SessionWaiting
	agentID := ""
	groupID := req.GroupID
	if groupID == "" {
		resolvedGroupID, err := s.store.GetChannelDefaultGroupID(c.Request.Context(), tc.TenantID, tc.AppID, req.ChannelID)
		if err == nil {
			groupID = resolvedGroupID
		} else if !errors.Is(err, store.ErrNotFound) {
			s.log.Sugar().Warnw("resolve channel group failed", "tenant_id", tc.TenantID, "app_id", tc.AppID, "channel_id", req.ChannelID, "error", err)
		}
	}
	if groupID == "" {
		groupID = "default"
	}
	assigned, err := s.cache.AssignLeastBusyAgent(c.Request.Context(), tc.TenantID, groupID)
	if err == nil {
		agentID = assigned.AgentID
		status = domain.SessionServing
	} else if !errors.Is(err, cache.ErrNoOnlineAgent) {
		s.log.Sugar().Warnw("assign agent failed", "tenant_id", tc.TenantID, "group_id", groupID, "error", err)
	}

	session, err := s.store.CreateSession(c.Request.Context(), domain.Session{
		TenantID:  tc.TenantID,
		AppID:     tc.AppID,
		ChannelID: req.ChannelID,
		UserID:    req.UserID,
		AgentID:   agentID,
		GroupID:   groupID,
		Priority:  req.Priority,
		Status:    status,
		SourceIP:  c.ClientIP(),
		UserAgent: c.Request.UserAgent(),
	})
	if err != nil {
		if agentID != "" {
			_ = s.cache.DecrementAgentSession(c.Request.Context(), tc.TenantID, groupID, agentID)
		}
		s.log.Sugar().Errorw("create session failed", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "create session failed"})
		return
	}

	c.JSON(http.StatusCreated, session)
}

type agentOnlineRequest struct {
	GroupID        string `json:"group_id"`
	MaxSessions    int    `json:"max_sessions"`
	ActiveSessions int    `json:"active_sessions"`
}

func (s *Server) agentOnline(c *gin.Context) {
	var req agentOnlineRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	tc := tenant.FromContext(c.Request.Context())
	agentID := c.Param("agent_id")
	if req.GroupID == "" {
		req.GroupID = "default"
	}
	if err := s.cache.SetAgentOnline(c.Request.Context(), cache.AgentPresence{
		TenantID:       tc.TenantID,
		GroupID:        req.GroupID,
		AgentID:        agentID,
		MaxSessions:    req.MaxSessions,
		ActiveSessions: req.ActiveSessions,
	}); err != nil {
		s.log.Sugar().Errorw("set agent online failed", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "set agent online failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"agent_id": agentID, "group_id": req.GroupID, "status": "online"})
}

func (s *Server) agentOffline(c *gin.Context) {
	tc := tenant.FromContext(c.Request.Context())
	agentID := c.Param("agent_id")
	groupID := c.DefaultQuery("group_id", "default")
	if err := s.cache.SetAgentOffline(c.Request.Context(), tc.TenantID, groupID, agentID); err != nil {
		s.log.Sugar().Errorw("set agent offline failed", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "set agent offline failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"agent_id": agentID, "group_id": groupID, "status": "offline"})
}

func (s *Server) getAgent(c *gin.Context) {
	tc := tenant.FromContext(c.Request.Context())
	agentID := c.Param("agent_id")
	items, err := s.store.ListAgents(c.Request.Context(), tc.TenantID, 200, 0)
	if err != nil {
		s.log.Sugar().Errorw("list agents failed", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "list agents failed"})
		return
	}
	for _, item := range items {
		if item.AgentID == agentID {
			c.JSON(http.StatusOK, item)
			return
		}
	}
	c.JSON(http.StatusNotFound, gin.H{"error": "agent not found"})
}

func (s *Server) uploadImage(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file is required"})
		return
	}

	tc := tenant.FromContext(c.Request.Context())
	result, err := upload.SaveImage(c.Request.Context(), s.cfg.Upload, tc.TenantID, file)
	if err != nil {
		s.log.Sugar().Errorw("save upload failed", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "save upload failed"})
		return
	}
	c.JSON(http.StatusCreated, result)
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
