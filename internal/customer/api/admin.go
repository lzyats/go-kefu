package api

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/tiger1103/gfast/v3/internal/customer/domain"
	"github.com/tiger1103/gfast/v3/internal/customer/store"
	"github.com/tiger1103/gfast/v3/internal/customer/tenant"

	"github.com/gin-gonic/gin"
)

const tenantDisplayNameConfigKey = "display_name"
const tenantFAQsConfigKey = "faqs"
const tenantChatThemeConfigKey = "chat_theme"
const commonFAQTenantID = "__common__"

func (s *Server) registerAdminRoutes(r gin.IRouter) {
	admin := r.Group("/admin/v1")
	admin.Use(tenant.Middleware())
	{
		admin.GET("/dashboard", s.adminDashboard)
		admin.GET("/my/tenants", s.adminMyTenants)
		admin.GET("/tenants", s.adminListTenants)
		admin.POST("/tenants", s.adminSaveTenant)
		admin.DELETE("/tenants/:tenant_id", s.adminDeleteTenant)
		admin.GET("/tenants/:tenant_id/admins", s.adminListTenantAdmins)
		admin.POST("/tenants/:tenant_id/admins", s.adminBindTenantAdmin)
		admin.DELETE("/tenants/:tenant_id/admins/:gfast_user_id", s.adminUnbindTenantAdmin)
		admin.GET("/channels", s.adminListChannels)
		admin.POST("/channels", s.adminSaveChannel)
		admin.DELETE("/channels/:app_key", s.adminDeleteChannel)
		admin.GET("/my/agent", s.adminMyAgent)
		admin.GET("/agents", s.adminListAgents)
		admin.POST("/agents", s.adminSaveAgent)
		admin.DELETE("/agents/:agent_id", s.adminDeleteAgent)
		admin.GET("/agent-groups", s.adminListAgentGroups)
		admin.POST("/agent-groups", s.adminSaveAgentGroup)
		admin.DELETE("/agent-groups/:group_id", s.adminDeleteAgentGroup)
		admin.POST("/agent-groups/:group_id/agents/:agent_id", s.adminAddAgentToGroup)
		admin.GET("/sessions", s.adminListSessions)
		admin.POST("/sessions/:session_id/accept", s.adminAcceptSession)
		admin.GET("/customers/:user_id/tags", s.adminGetCustomerTags)
		admin.PUT("/customers/:user_id/tags", s.adminSaveCustomerTags)
		admin.GET("/messages", s.adminListMessages)
		admin.GET("/sensitive-words", s.adminListSensitiveWords)
		admin.POST("/sensitive-words", s.adminSaveSensitiveWord)
		admin.GET("/blacklists", s.adminListBlacklists)
		admin.POST("/blacklists", s.adminSaveBlacklist)
		admin.GET("/risk-events", s.adminListRiskEvents)
		admin.GET("/reports/daily", s.adminDailyReports)
		admin.GET("/configs", s.adminListConfigs)
		admin.POST("/configs", s.adminSaveConfig)
		admin.GET("/faqs", s.adminListFAQs)
		admin.POST("/faqs", s.adminSaveFAQs)
		admin.GET("/faqs/common", s.adminListCommonFAQs)
		admin.POST("/faqs/common", s.adminSaveCommonFAQs)
	}
}

func (s *Server) adminDashboard(c *gin.Context) {
	tc := tenant.FromContext(c.Request.Context())
	stats, err := s.store.GetAdminStats(c.Request.Context(), tc.TenantID)
	if err != nil {
		s.adminError(c, err)
		return
	}
	c.JSON(http.StatusOK, stats)
}

func (s *Server) adminMyTenants(c *gin.Context) {
	gfastUserID, err := strconv.ParseInt(c.GetHeader("X-Admin-ID"), 10, 64)
	if err != nil || gfastUserID <= 0 {
		c.JSON(http.StatusOK, gin.H{"items": []domain.Tenant{}, "locked": false})
		return
	}
	items, err := s.store.ListTenantsByAdmin(c.Request.Context(), gfastUserID)
	if err != nil {
		s.adminError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items, "locked": len(items) > 0})
}

func (s *Server) adminListTenants(c *gin.Context) {
	items, err := s.store.ListTenants(c.Request.Context(), pageLimit(c), pageOffset(c))
	if err != nil {
		s.adminError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (s *Server) adminSaveTenant(c *gin.Context) {
	var req domain.Tenant
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	item, err := s.store.UpsertTenant(c.Request.Context(), req)
	if err != nil {
		s.adminError(c, err)
		return
	}
	c.JSON(http.StatusOK, item)
}

func (s *Server) adminDeleteTenant(c *gin.Context) {
	tenantID := c.Param("tenant_id")
	if tenantID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenant_id is required"})
		return
	}
	if err := s.store.DeleteTenant(c.Request.Context(), tenantID); err != nil {
		if err == store.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "tenant not found"})
			return
		}
		s.adminError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func (s *Server) adminListTenantAdmins(c *gin.Context) {
	items, err := s.store.ListTenantAdmins(c.Request.Context(), c.Param("tenant_id"), pageLimit(c), pageOffset(c))
	if err != nil {
		s.adminError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (s *Server) adminBindTenantAdmin(c *gin.Context) {
	var req domain.TenantAdmin
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	req.TenantID = c.Param("tenant_id")
	if req.GFastUserID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "gfast_user_id is required"})
		return
	}
	item, err := s.store.BindTenantAdmin(c.Request.Context(), req)
	if err != nil {
		s.adminError(c, err)
		return
	}
	c.JSON(http.StatusOK, item)
}

func (s *Server) adminUnbindTenantAdmin(c *gin.Context) {
	gfastUserID, err := strconv.ParseInt(c.Param("gfast_user_id"), 10, 64)
	if err != nil || gfastUserID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid gfast_user_id"})
		return
	}
	if err := s.store.UnbindTenantAdmin(c.Request.Context(), c.Param("tenant_id"), gfastUserID); err != nil {
		if err == store.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "tenant admin binding not found"})
			return
		}
		s.adminError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func (s *Server) adminListChannels(c *gin.Context) {
	tc := tenant.FromContext(c.Request.Context())
	items, err := s.store.ListChannels(c.Request.Context(), tc.TenantID, pageLimit(c), pageOffset(c))
	if err != nil {
		s.adminError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (s *Server) adminSaveChannel(c *gin.Context) {
	var req domain.Channel
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	tc := tenant.FromContext(c.Request.Context())
	req.TenantID = tc.TenantID
	item, err := s.store.UpsertChannel(c.Request.Context(), req)
	if err != nil {
		s.adminError(c, err)
		return
	}
	c.JSON(http.StatusOK, item)
}

func (s *Server) adminDeleteChannel(c *gin.Context) {
	tc := tenant.FromContext(c.Request.Context())
	if err := s.store.DeleteChannel(c.Request.Context(), tc.TenantID, c.Param("app_key")); err != nil {
		if err == store.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "channel not found"})
			return
		}
		s.adminError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func (s *Server) adminListAgents(c *gin.Context) {
	tc := tenant.FromContext(c.Request.Context())
	items, err := s.store.ListAgents(c.Request.Context(), tc.TenantID, pageLimit(c), pageOffset(c))
	if err != nil {
		s.adminError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (s *Server) adminMyAgent(c *gin.Context) {
	gfastUserID, err := strconv.ParseInt(c.GetHeader("X-Admin-ID"), 10, 64)
	if err != nil || gfastUserID <= 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "agent binding not found"})
		return
	}
	tc := tenant.FromContext(c.Request.Context())
	item, err := s.store.GetAgentByGFastUser(c.Request.Context(), tc.TenantID, gfastUserID)
	if err != nil {
		if err == store.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "agent binding not found"})
			return
		}
		s.adminError(c, err)
		return
	}
	c.JSON(http.StatusOK, item)
}

func (s *Server) adminSaveAgent(c *gin.Context) {
	var req domain.Agent
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	tc := tenant.FromContext(c.Request.Context())
	req.TenantID = tc.TenantID
	if req.AgentID == "" {
		req.GFastUserID = 0
	}
	if req.AgentID == "" && req.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "password is required when creating agent user"})
		return
	}
	if req.AgentID == "" {
		allowed, err := s.canCreateAgent(c.Request.Context(), c.GetHeader("X-Admin-ID"), tc.TenantID)
		if err != nil {
			s.adminError(c, err)
			return
		}
		if !allowed {
			limit, _ := s.store.GetTenantAgentLimit(c.Request.Context(), tc.TenantID)
			c.JSON(http.StatusForbidden, gin.H{"error": "当前租户最多只能自助添加" + strconv.Itoa(limit) + "个坐席，超过后请联系后台管理员添加"})
			return
		}
	}
	item, err := s.store.UpsertAgent(c.Request.Context(), req)
	if err != nil {
		s.adminError(c, err)
		return
	}
	c.JSON(http.StatusOK, item)
}

func (s *Server) canCreateAgent(ctx context.Context, adminID, tenantID string) (bool, error) {
	gfastUserID, _ := strconv.ParseInt(adminID, 10, 64)
	isAdmin, err := s.store.IsGFastAdmin(ctx, gfastUserID)
	if err != nil {
		return false, err
	}
	if isAdmin {
		return true, nil
	}
	total, err := s.store.CountAgents(ctx, tenantID)
	if err != nil {
		return false, err
	}
	limit, err := s.store.GetTenantAgentLimit(ctx, tenantID)
	if err != nil {
		return false, err
	}
	return total < int64(limit), nil
}

func (s *Server) adminDeleteAgent(c *gin.Context) {
	tc := tenant.FromContext(c.Request.Context())
	if err := s.store.DeleteAgent(c.Request.Context(), tc.TenantID, c.Param("agent_id")); err != nil {
		if err == store.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "agent not found"})
			return
		}
		s.adminError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func (s *Server) adminListAgentGroups(c *gin.Context) {
	tc := tenant.FromContext(c.Request.Context())
	items, err := s.store.ListAgentGroups(c.Request.Context(), tc.TenantID, pageLimit(c), pageOffset(c))
	if err != nil {
		s.adminError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (s *Server) adminSaveAgentGroup(c *gin.Context) {
	var req domain.AgentGroup
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	tc := tenant.FromContext(c.Request.Context())
	req.TenantID = tc.TenantID
	item, err := s.store.UpsertAgentGroup(c.Request.Context(), req)
	if err != nil {
		s.adminError(c, err)
		return
	}
	c.JSON(http.StatusOK, item)
}

func (s *Server) adminDeleteAgentGroup(c *gin.Context) {
	tc := tenant.FromContext(c.Request.Context())
	if err := s.store.DeleteAgentGroup(c.Request.Context(), tc.TenantID, c.Param("group_id")); err != nil {
		if err == store.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "agent group not found"})
			return
		}
		s.adminError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func (s *Server) adminAddAgentToGroup(c *gin.Context) {
	tc := tenant.FromContext(c.Request.Context())
	if err := s.store.AddAgentToGroup(c.Request.Context(), tc.TenantID, c.Param("agent_id"), c.Param("group_id")); err != nil {
		if err == store.ErrNotFound {
			c.JSON(http.StatusBadRequest, gin.H{"error": "agent or agent group not found in current tenant"})
			return
		}
		s.adminError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func (s *Server) adminListSessions(c *gin.Context) {
	tc := tenant.FromContext(c.Request.Context())
	items, err := s.store.ListSessions(c.Request.Context(), tc.TenantID, c.Query("status"), pageLimit(c), pageOffset(c))
	if err != nil {
		s.adminError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": s.enrichSessions(c.Request.Context(), items)})
}

func (s *Server) adminAcceptSession(c *gin.Context) {
	var req struct {
		AgentID string `json:"agent_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.AgentID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "agent_id is required"})
		return
	}
	tc := tenant.FromContext(c.Request.Context())
	session, err := s.store.GetSession(c.Request.Context(), tc.TenantID, c.Param("session_id"))
	if err != nil {
		if err == store.ErrNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "session not found"})
			return
		}
		s.adminError(c, err)
		return
	}
	if session.AgentID != "" && session.AgentID != req.AgentID {
		c.JSON(http.StatusConflict, gin.H{"error": "session already accepted by another agent"})
		return
	}
	session.AgentID = req.AgentID
	session.Status = domain.SessionServing
	if err := s.store.UpdateSession(c.Request.Context(), session); err != nil {
		s.adminError(c, err)
		return
	}
	c.JSON(http.StatusOK, s.enrichSession(c.Request.Context(), session))
}

type customerTagsRequest struct {
	AppID string   `json:"app_id"`
	Tags  []string `json:"tags"`
}

func (s *Server) adminGetCustomerTags(c *gin.Context) {
	tc := tenant.FromContext(c.Request.Context())
	appID := c.Query("app_id")
	if appID == "" {
		appID = tc.AppID
	}
	tags, err := s.store.GetCustomerTags(c.Request.Context(), tc.TenantID, appID, c.Param("user_id"))
	if err != nil {
		s.adminError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": tags})
}

func (s *Server) adminSaveCustomerTags(c *gin.Context) {
	var req customerTagsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	tc := tenant.FromContext(c.Request.Context())
	appID := req.AppID
	if appID == "" {
		appID = tc.AppID
	}
	tags, err := s.store.ReplaceCustomerTags(c.Request.Context(), tc.TenantID, appID, c.Param("user_id"), req.Tags)
	if err != nil {
		s.adminError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": tags})
}

func (s *Server) adminListMessages(c *gin.Context) {
	tc := tenant.FromContext(c.Request.Context())
	items, err := s.store.ListAdminMessages(
		c.Request.Context(),
		tc.TenantID,
		c.Query("session_id"),
		c.Query("sender_id"),
		c.Query("keyword"),
		pageLimit(c),
		pageOffset(c),
	)
	if err != nil {
		s.adminError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (s *Server) adminListSensitiveWords(c *gin.Context) {
	tc := tenant.FromContext(c.Request.Context())
	items, err := s.store.ListSensitiveWords(c.Request.Context(), tc.TenantID, pageLimit(c), pageOffset(c))
	if err != nil {
		s.adminError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (s *Server) adminSaveSensitiveWord(c *gin.Context) {
	var req domain.SensitiveWord
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	req.TenantID = tenant.FromContext(c.Request.Context()).TenantID
	item, err := s.store.UpsertSensitiveWord(c.Request.Context(), req)
	if err != nil {
		s.adminError(c, err)
		return
	}
	c.JSON(http.StatusOK, item)
}

func (s *Server) adminListBlacklists(c *gin.Context) {
	tc := tenant.FromContext(c.Request.Context())
	items, err := s.store.ListBlacklists(c.Request.Context(), tc.TenantID, pageLimit(c), pageOffset(c))
	if err != nil {
		s.adminError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (s *Server) adminSaveBlacklist(c *gin.Context) {
	var req domain.Blacklist
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	req.TenantID = tenant.FromContext(c.Request.Context()).TenantID
	item, err := s.store.UpsertBlacklist(c.Request.Context(), req)
	if err != nil {
		s.adminError(c, err)
		return
	}
	c.JSON(http.StatusOK, item)
}

func (s *Server) adminListRiskEvents(c *gin.Context) {
	tc := tenant.FromContext(c.Request.Context())
	items, err := s.store.ListRiskEvents(c.Request.Context(), tc.TenantID, pageLimit(c), pageOffset(c))
	if err != nil {
		s.adminError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (s *Server) adminDailyReports(c *gin.Context) {
	tc := tenant.FromContext(c.Request.Context())
	days, _ := strconv.Atoi(c.DefaultQuery("days", "7"))
	items, err := s.store.ListDailyReports(c.Request.Context(), tc.TenantID, days)
	if err != nil {
		s.adminError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (s *Server) adminListConfigs(c *gin.Context) {
	tc := tenant.FromContext(c.Request.Context())
	items, err := s.store.ListTenantConfigs(c.Request.Context(), tc.TenantID, pageLimit(c), pageOffset(c))
	if err != nil {
		s.adminError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (s *Server) adminSaveConfig(c *gin.Context) {
	var req domain.TenantConfig
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	req.TenantID = tenant.FromContext(c.Request.Context()).TenantID
	item, err := s.store.UpsertTenantConfig(c.Request.Context(), req)
	if err != nil {
		s.adminError(c, err)
		return
	}
	c.JSON(http.StatusOK, item)
}

func (s *Server) adminListCommonFAQs(c *gin.Context) {
	s.adminListFAQsByScope(c, commonFAQTenantID, true)
}

func (s *Server) adminListFAQs(c *gin.Context) {
	tc := tenant.FromContext(c.Request.Context())
	s.adminListFAQsByScope(c, tc.TenantID, false)
}

func (s *Server) adminSaveFAQs(c *gin.Context) {
	tc := tenant.FromContext(c.Request.Context())
	s.adminSaveFAQsByScope(c, tc.TenantID, false)
}

func (s *Server) adminListFAQsByScope(c *gin.Context, tenantID string, common bool) {
	items, err := s.store.ListFAQs(c.Request.Context(), tenantID, common, pageLimit(c), pageOffset(c))
	if err != nil {
		s.adminError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (s *Server) adminSaveCommonFAQs(c *gin.Context) {
	s.adminSaveFAQsByScope(c, commonFAQTenantID, true)
}

func (s *Server) adminSaveFAQsByScope(c *gin.Context, tenantID string, common bool) {
	if strings.TrimSpace(tenantID) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenant_id is required"})
		return
	}
	var req struct {
		Items []domain.FAQ `json:"items"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	items, err := s.store.ReplaceFAQs(c.Request.Context(), tenantID, common, req.Items)
	if err != nil {
		s.adminError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (s *Server) publicConfigs(c *gin.Context) {
	tc := tenant.FromContext(c.Request.Context())
	items, err := s.store.ListTenantConfigs(c.Request.Context(), tc.TenantID, 200, 0)
	if err != nil {
		s.adminError(c, err)
		return
	}
	data := gin.H{
		"display_name": "ChatFlow",
		"faqs":         []gin.H{},
		"chat_theme":   "fresh",
		"tenant_id":    tc.TenantID,
		"app_id":       tc.AppID,
	}
	for _, item := range items {
		if item.ConfigKey == tenantDisplayNameConfigKey && item.ConfigValue != "" {
			data["display_name"] = item.ConfigValue
		}
		if item.ConfigKey == tenantChatThemeConfigKey && item.ConfigValue != "" {
			data["chat_theme"] = item.ConfigValue
		}
		if item.ConfigKey == tenantFAQsConfigKey && item.ConfigValue != "" {
			var faqs []gin.H
			if err := json.Unmarshal([]byte(item.ConfigValue), &faqs); err == nil {
				data["faqs"] = faqs
			}
		}
	}
	faqs, err := s.store.ListFAQs(c.Request.Context(), tc.TenantID, false, 100, 0)
	if err == nil && len(faqs) > 0 {
		data["faqs"] = faqs
	}
	c.JSON(http.StatusOK, data)
}

func (s *Server) adminError(c *gin.Context, err error) {
	s.log.Sugar().Errorw("admin api failed", "path", c.Request.URL.Path, "error", err)
	message := err.Error()
	if errors.Is(err, store.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": message})
		return
	}
	if strings.Contains(message, "cs_faq") && (strings.Contains(message, "doesn't exist") || strings.Contains(message, "Unknown column")) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "常见问题表结构不存在或未更新，请先执行 cs_faq 相关迁移 SQL"})
		return
	}
	if message == "用户名已存在" {
		c.JSON(http.StatusConflict, gin.H{"error": message})
		return
	}
	if isAdminBusinessError(message) {
		c.JSON(http.StatusBadRequest, gin.H{"error": message})
		return
	}
	c.JSON(http.StatusInternalServerError, gin.H{"error": "admin api failed"})
}

func isAdminBusinessError(message string) bool {
	keywords := []string{
		"is required",
		"already exists",
		"must be",
		"新增",
		"必填",
		"不能为空",
		"已存在",
	}
	for _, keyword := range keywords {
		if strings.Contains(message, keyword) {
			return true
		}
	}
	return false
}

func pageLimit(c *gin.Context) int {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	return limit
}

func pageOffset(c *gin.Context) int {
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	return offset
}
