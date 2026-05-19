package store

import (
	"context"
	"errors"
	"strings"
	"sync"
	"time"

	"github.com/tiger1103/gfast/v3/internal/customer/domain"

	"github.com/google/uuid"
)

var ErrNotFound = errors.New("not found")

type SessionStore interface {
	CreateSession(ctx context.Context, session domain.Session) (domain.Session, error)
	GetSession(ctx context.Context, tenantID, sessionID string) (domain.Session, error)
	FindActiveSessionByUser(ctx context.Context, tenantID, appID, channelID, userID string) (domain.Session, error)
	SaveCustomerProfile(ctx context.Context, tenantID, appID, userID, userName, avatar string) error
	UpdateSession(ctx context.Context, session domain.Session) error
}

type MessageStore interface {
	SaveMessage(ctx context.Context, message domain.Message) (domain.Message, error)
	ListMessagesAfterSeq(ctx context.Context, tenantID, sessionID string, afterSeq int64, limit int) ([]domain.Message, error)
}

type Store interface {
	SessionStore
	MessageStore
	OutboxStore
	AdminStore
}

type OutboxStore interface {
	ListPendingOutbox(ctx context.Context, limit int) ([]domain.OutboxEvent, error)
	MarkOutboxSent(ctx context.Context, id string) error
	MarkOutboxRetry(ctx context.Context, id string, nextRetry time.Time, reason string) error
}

type AdminStore interface {
	ListTenants(ctx context.Context, limit, offset int) ([]domain.Tenant, error)
	ListTenantsByAdmin(ctx context.Context, gfastUserID int64) ([]domain.Tenant, error)
	UpsertTenant(ctx context.Context, tenant domain.Tenant) (domain.Tenant, error)
	DeleteTenant(ctx context.Context, tenantID string) error
	GetTenantAgentLimit(ctx context.Context, tenantID string) (int, error)
	ListChannels(ctx context.Context, tenantID string, limit, offset int) ([]domain.Channel, error)
	UpsertChannel(ctx context.Context, channel domain.Channel) (domain.Channel, error)
	DeleteChannel(ctx context.Context, tenantID, appKey string) error
	GetChannelDefaultGroupID(ctx context.Context, tenantID, appID, channelID string) (string, error)
	ListAgents(ctx context.Context, tenantID string, limit, offset int) ([]domain.Agent, error)
	CountAgents(ctx context.Context, tenantID string) (int64, error)
	IsGFastAdmin(ctx context.Context, gfastUserID int64) (bool, error)
	GetAgentByGFastUser(ctx context.Context, tenantID string, gfastUserID int64) (domain.Agent, error)
	UpsertAgent(ctx context.Context, agent domain.Agent) (domain.Agent, error)
	DeleteAgent(ctx context.Context, tenantID, agentID string) error
	ListAgentGroups(ctx context.Context, tenantID string, limit, offset int) ([]domain.AgentGroup, error)
	UpsertAgentGroup(ctx context.Context, group domain.AgentGroup) (domain.AgentGroup, error)
	DeleteAgentGroup(ctx context.Context, tenantID, groupID string) error
	AddAgentToGroup(ctx context.Context, tenantID, agentID, groupID string) error
	ListTenantAdmins(ctx context.Context, tenantID string, limit, offset int) ([]domain.TenantAdmin, error)
	BindTenantAdmin(ctx context.Context, item domain.TenantAdmin) (domain.TenantAdmin, error)
	UnbindTenantAdmin(ctx context.Context, tenantID string, gfastUserID int64) error
	ListSessions(ctx context.Context, tenantID, status string, limit, offset int) ([]domain.Session, error)
	GetAdminStats(ctx context.Context, tenantID string) (domain.AdminStats, error)
	ListAdminMessages(ctx context.Context, tenantID, sessionID, senderID, keyword string, limit, offset int) ([]domain.Message, error)
	ListSensitiveWords(ctx context.Context, tenantID string, limit, offset int) ([]domain.SensitiveWord, error)
	UpsertSensitiveWord(ctx context.Context, item domain.SensitiveWord) (domain.SensitiveWord, error)
	ListBlacklists(ctx context.Context, tenantID string, limit, offset int) ([]domain.Blacklist, error)
	UpsertBlacklist(ctx context.Context, item domain.Blacklist) (domain.Blacklist, error)
	ListRiskEvents(ctx context.Context, tenantID string, limit, offset int) ([]domain.RiskEvent, error)
	ListDailyReports(ctx context.Context, tenantID string, days int) ([]domain.DailyReport, error)
	ListTenantConfigs(ctx context.Context, tenantID string, limit, offset int) ([]domain.TenantConfig, error)
	UpsertTenantConfig(ctx context.Context, item domain.TenantConfig) (domain.TenantConfig, error)
	ListFAQs(ctx context.Context, tenantID string, common bool, limit, offset int) ([]domain.FAQ, error)
	ReplaceFAQs(ctx context.Context, tenantID string, common bool, items []domain.FAQ) ([]domain.FAQ, error)
	GetCustomerTags(ctx context.Context, tenantID, appID, userID string) ([]string, error)
	ReplaceCustomerTags(ctx context.Context, tenantID, appID, userID string, tags []string) ([]string, error)
}

type MemoryStore struct {
	mu              sync.RWMutex
	sessions        map[string]domain.Session
	messages        map[string][]domain.Message
	clientMsgIDToID map[string]string
	customerTags    map[string][]string
}

func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		sessions:        make(map[string]domain.Session),
		messages:        make(map[string][]domain.Message),
		clientMsgIDToID: make(map[string]string),
		customerTags:    make(map[string][]string),
	}
}

func (s *MemoryStore) CreateSession(_ context.Context, session domain.Session) (domain.Session, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now()
	if session.ID == "" {
		session.ID = uuid.NewString()
	}
	if session.Status == "" {
		session.Status = domain.SessionWaiting
	}
	session.CreatedAt = now
	session.UpdatedAt = now
	if session.LoginTime.IsZero() {
		session.LoginTime = now
	}
	s.sessions[session.TenantID+":"+session.ID] = session
	return session, nil
}

func (s *MemoryStore) GetSession(_ context.Context, tenantID, sessionID string) (domain.Session, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	session, ok := s.sessions[tenantID+":"+sessionID]
	if !ok {
		return domain.Session{}, ErrNotFound
	}
	return session, nil
}

func (s *MemoryStore) FindActiveSessionByUser(_ context.Context, tenantID, appID, channelID, userID string) (domain.Session, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var found domain.Session
	for _, session := range s.sessions {
		if session.TenantID != tenantID || session.AppID != appID || session.UserID != userID {
			continue
		}
		if channelID != "" && session.ChannelID != channelID {
			continue
		}
		if session.Status == domain.SessionClosed || session.Status == domain.SessionRated || session.Status == domain.SessionTimeout {
			continue
		}
		if found.ID == "" || session.UpdatedAt.After(found.UpdatedAt) {
			found = session
		}
	}
	if found.ID == "" {
		return domain.Session{}, ErrNotFound
	}
	return found, nil
}

func (s *MemoryStore) SaveCustomerProfile(_ context.Context, tenantID, appID, userID, userName, avatar string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if userName == "" && avatar == "" {
		return nil
	}
	for key, session := range s.sessions {
		if session.TenantID == tenantID && session.AppID == appID && session.UserID == userID {
			if userName != "" {
				session.UserName = userName
			}
			if avatar != "" {
				session.UserAvatar = avatar
			}
			s.sessions[key] = session
		}
	}
	return nil
}

func (s *MemoryStore) UpdateSession(_ context.Context, session domain.Session) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	key := session.TenantID + ":" + session.ID
	if _, ok := s.sessions[key]; !ok {
		return ErrNotFound
	}
	session.UpdatedAt = time.Now()
	s.sessions[key] = session
	return nil
}

func (s *MemoryStore) SaveMessage(_ context.Context, message domain.Message) (domain.Message, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	idempotentKey := message.TenantID + ":" + message.SessionID + ":" + message.ClientMsgID
	if existingID, ok := s.clientMsgIDToID[idempotentKey]; ok {
		for _, item := range s.messages[message.TenantID+":"+message.SessionID] {
			if item.ID == existingID {
				return item, nil
			}
		}
	}

	sessionKey := message.TenantID + ":" + message.SessionID
	session, ok := s.sessions[sessionKey]
	if !ok {
		return domain.Message{}, ErrNotFound
	}

	now := time.Now()
	if message.ID == "" {
		message.ID = uuid.NewString()
	}
	if message.SenderType == domain.UserTypeAgent {
		if session.AgentID == "" {
			session.AgentID = message.SenderID
		}
		if session.Status == domain.SessionWaiting || session.Status == domain.SessionTransferring {
			session.Status = domain.SessionServing
		}
	}
	session.LastSeq++
	message.Seq = session.LastSeq
	message.Status = domain.MessageSent
	message.SendTime = now
	session.LastMsgTime = now
	session.UpdatedAt = now

	s.messages[sessionKey] = append(s.messages[sessionKey], message)
	s.sessions[sessionKey] = session
	if message.ClientMsgID != "" {
		s.clientMsgIDToID[idempotentKey] = message.ID
	}
	return message, nil
}

func (s *MemoryStore) ListMessagesAfterSeq(_ context.Context, tenantID, sessionID string, afterSeq int64, limit int) ([]domain.Message, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if limit <= 0 || limit > 200 {
		limit = 50
	}
	var result []domain.Message
	for _, item := range s.messages[tenantID+":"+sessionID] {
		if item.Seq > afterSeq {
			result = append(result, item)
			if len(result) >= limit {
				break
			}
		}
	}
	return result, nil
}

func (s *MemoryStore) ListPendingOutbox(_ context.Context, _ int) ([]domain.OutboxEvent, error) {
	return nil, nil
}

func (s *MemoryStore) MarkOutboxSent(_ context.Context, _ string) error {
	return nil
}

func (s *MemoryStore) MarkOutboxRetry(_ context.Context, _ string, _ time.Time, _ string) error {
	return nil
}

func (s *MemoryStore) ListTenants(_ context.Context, _, _ int) ([]domain.Tenant, error) {
	return nil, nil
}

func (s *MemoryStore) ListTenantsByAdmin(_ context.Context, _ int64) ([]domain.Tenant, error) {
	return nil, nil
}

func (s *MemoryStore) UpsertTenant(_ context.Context, tenant domain.Tenant) (domain.Tenant, error) {
	return tenant, nil
}

func (s *MemoryStore) DeleteTenant(_ context.Context, _ string) error {
	return nil
}

func (s *MemoryStore) GetTenantAgentLimit(_ context.Context, _ string) (int, error) {
	return 3, nil
}

func (s *MemoryStore) ListChannels(_ context.Context, _ string, _, _ int) ([]domain.Channel, error) {
	return nil, nil
}

func (s *MemoryStore) UpsertChannel(_ context.Context, channel domain.Channel) (domain.Channel, error) {
	return channel, nil
}

func (s *MemoryStore) DeleteChannel(_ context.Context, _, _ string) error {
	return nil
}

func (s *MemoryStore) ListAgents(_ context.Context, _ string, _, _ int) ([]domain.Agent, error) {
	return nil, nil
}

func (s *MemoryStore) CountAgents(_ context.Context, _ string) (int64, error) {
	return 0, nil
}

func (s *MemoryStore) IsGFastAdmin(_ context.Context, _ int64) (bool, error) {
	return false, nil
}

func (s *MemoryStore) GetAgentByGFastUser(_ context.Context, _ string, _ int64) (domain.Agent, error) {
	return domain.Agent{}, ErrNotFound
}

func (s *MemoryStore) UpsertAgent(_ context.Context, agent domain.Agent) (domain.Agent, error) {
	return agent, nil
}

func (s *MemoryStore) DeleteAgent(_ context.Context, _, _ string) error {
	return nil
}

func (s *MemoryStore) GetChannelDefaultGroupID(_ context.Context, _, _, _ string) (string, error) {
	return "", ErrNotFound
}

func (s *MemoryStore) ListAgentGroups(_ context.Context, _ string, _, _ int) ([]domain.AgentGroup, error) {
	return nil, nil
}

func (s *MemoryStore) UpsertAgentGroup(_ context.Context, group domain.AgentGroup) (domain.AgentGroup, error) {
	return group, nil
}

func (s *MemoryStore) DeleteAgentGroup(_ context.Context, _, _ string) error {
	return nil
}

func (s *MemoryStore) AddAgentToGroup(_ context.Context, _, _, _ string) error {
	return nil
}

func (s *MemoryStore) ListTenantAdmins(_ context.Context, _ string, _, _ int) ([]domain.TenantAdmin, error) {
	return nil, nil
}

func (s *MemoryStore) BindTenantAdmin(_ context.Context, item domain.TenantAdmin) (domain.TenantAdmin, error) {
	return item, nil
}

func (s *MemoryStore) UnbindTenantAdmin(_ context.Context, _ string, _ int64) error {
	return nil
}

func (s *MemoryStore) ListSessions(_ context.Context, _, _ string, _, _ int) ([]domain.Session, error) {
	return nil, nil
}

func (s *MemoryStore) GetAdminStats(_ context.Context, _ string) (domain.AdminStats, error) {
	return domain.AdminStats{}, nil
}

func (s *MemoryStore) ListAdminMessages(_ context.Context, _, _, _, _ string, _, _ int) ([]domain.Message, error) {
	return nil, nil
}

func (s *MemoryStore) ListSensitiveWords(_ context.Context, _ string, _, _ int) ([]domain.SensitiveWord, error) {
	return nil, nil
}

func (s *MemoryStore) UpsertSensitiveWord(_ context.Context, item domain.SensitiveWord) (domain.SensitiveWord, error) {
	return item, nil
}

func (s *MemoryStore) ListBlacklists(_ context.Context, _ string, _, _ int) ([]domain.Blacklist, error) {
	return nil, nil
}

func (s *MemoryStore) UpsertBlacklist(_ context.Context, item domain.Blacklist) (domain.Blacklist, error) {
	return item, nil
}

func (s *MemoryStore) ListRiskEvents(_ context.Context, _ string, _, _ int) ([]domain.RiskEvent, error) {
	return nil, nil
}

func (s *MemoryStore) ListDailyReports(_ context.Context, _ string, _ int) ([]domain.DailyReport, error) {
	return nil, nil
}

func (s *MemoryStore) ListTenantConfigs(_ context.Context, _ string, _, _ int) ([]domain.TenantConfig, error) {
	return nil, nil
}

func (s *MemoryStore) UpsertTenantConfig(_ context.Context, item domain.TenantConfig) (domain.TenantConfig, error) {
	return item, nil
}

func (s *MemoryStore) ListFAQs(_ context.Context, _ string, _ bool, _, _ int) ([]domain.FAQ, error) {
	return nil, nil
}

func (s *MemoryStore) ReplaceFAQs(_ context.Context, tenantID string, common bool, items []domain.FAQ) ([]domain.FAQ, error) {
	for i := range items {
		if items[i].FAQID == "" {
			items[i].FAQID = uuid.NewString()
		}
		items[i].ID = items[i].FAQID
		items[i].TenantID = tenantID
		items[i].IsCommon = common
	}
	return items, nil
}

func (s *MemoryStore) GetCustomerTags(_ context.Context, tenantID, appID, userID string) ([]string, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	tags := s.customerTags[customerTagKey(tenantID, appID, userID)]
	return append([]string(nil), tags...), nil
}

func (s *MemoryStore) ReplaceCustomerTags(_ context.Context, tenantID, appID, userID string, tags []string) ([]string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	normalized := normalizeTags(tags)
	s.customerTags[customerTagKey(tenantID, appID, userID)] = normalized
	return append([]string(nil), normalized...), nil
}

func customerTagKey(tenantID, appID, userID string) string {
	return tenantID + ":" + appID + ":" + userID
}

func normalizeTags(tags []string) []string {
	seen := make(map[string]struct{}, len(tags))
	result := make([]string, 0, len(tags))
	for _, tag := range tags {
		value := strings.TrimSpace(tag)
		if value == "" {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		result = append(result, value)
	}
	return result
}
