package store

import (
	"context"
	"errors"
	"sync"
	"time"

	"customer-service/internal/domain"

	"github.com/google/uuid"
)

var ErrNotFound = errors.New("not found")

type SessionStore interface {
	CreateSession(ctx context.Context, session domain.Session) (domain.Session, error)
	GetSession(ctx context.Context, tenantID, sessionID string) (domain.Session, error)
	UpdateSession(ctx context.Context, session domain.Session) error
}

type MessageStore interface {
	SaveMessage(ctx context.Context, message domain.Message) (domain.Message, error)
	ListMessagesAfterSeq(ctx context.Context, tenantID, sessionID string, afterSeq int64, limit int) ([]domain.Message, error)
}

type Store interface {
	SessionStore
	MessageStore
}

type MemoryStore struct {
	mu              sync.RWMutex
	sessions        map[string]domain.Session
	messages        map[string][]domain.Message
	clientMsgIDToID map[string]string
}

func NewMemoryStore() *MemoryStore {
	return &MemoryStore{
		sessions:        make(map[string]domain.Session),
		messages:        make(map[string][]domain.Message),
		clientMsgIDToID: make(map[string]string),
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
