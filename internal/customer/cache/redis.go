package cache

import (
	"context"
	"errors"
	"strconv"
	"time"

	"github.com/tiger1103/gfast/v3/internal/customer/config"

	"github.com/redis/go-redis/v9"
)

var ErrNoOnlineAgent = errors.New("no online agent")

type RedisCache struct {
	client *redis.Client
}

type AgentPresence struct {
	TenantID       string
	GroupID        string
	AgentID        string
	MaxSessions    int
	ActiveSessions int
}

func NewRedisCache(cfg config.RedisConfig) *RedisCache {
	return &RedisCache{
		client: redis.NewClient(&redis.Options{
			Addr:     cfg.Addr,
			Password: cfg.Password,
			DB:       cfg.DB,
		}),
	}
}

func (r *RedisCache) Close() error {
	return r.client.Close()
}

func (r *RedisCache) Ping(ctx context.Context) error {
	return r.client.Ping(ctx).Err()
}

func (r *RedisCache) SetAgentOnline(ctx context.Context, p AgentPresence) error {
	if p.GroupID == "" {
		p.GroupID = "default"
	}
	if p.MaxSessions <= 0 {
		p.MaxSessions = 5
	}
	active := p.ActiveSessions
	if active < 0 {
		active = 0
	}

	pipe := r.client.TxPipeline()
	pipe.HSet(ctx, agentInfoKey(p.TenantID, p.AgentID), map[string]any{
		"tenant_id":       p.TenantID,
		"group_id":        p.GroupID,
		"agent_id":        p.AgentID,
		"max_sessions":    p.MaxSessions,
		"active_sessions": active,
		"online_at":       time.Now().Unix(),
		"heartbeat_at":    time.Now().Unix(),
	})
	pipe.Expire(ctx, agentInfoKey(p.TenantID, p.AgentID), 2*time.Hour)
	pipe.ZAdd(ctx, agentZSetKey(p.TenantID, p.GroupID), redis.Z{
		Score:  float64(active),
		Member: p.AgentID,
	})
	_, err := pipe.Exec(ctx)
	return err
}

func (r *RedisCache) HeartbeatAgent(ctx context.Context, tenantID, agentID string) error {
	return r.client.HSet(ctx, agentInfoKey(tenantID, agentID), "heartbeat_at", time.Now().Unix()).Err()
}

func (r *RedisCache) SetAgentOffline(ctx context.Context, tenantID, groupID, agentID string) error {
	if groupID == "" {
		groupID = "default"
	}
	pipe := r.client.TxPipeline()
	pipe.ZRem(ctx, agentZSetKey(tenantID, groupID), agentID)
	pipe.Del(ctx, agentInfoKey(tenantID, agentID))
	_, err := pipe.Exec(ctx)
	return err
}

func (r *RedisCache) AssignLeastBusyAgent(ctx context.Context, tenantID, groupID string) (AgentPresence, error) {
	if groupID == "" {
		groupID = "default"
	}
	key := agentZSetKey(tenantID, groupID)
	candidates, err := r.client.ZRangeWithScores(ctx, key, 0, 20).Result()
	if err != nil {
		return AgentPresence{}, err
	}
	for _, candidate := range candidates {
		agentID, ok := candidate.Member.(string)
		if !ok {
			continue
		}
		info, err := r.client.HGetAll(ctx, agentInfoKey(tenantID, agentID)).Result()
		if err != nil || len(info) == 0 {
			_ = r.client.ZRem(ctx, key, agentID).Err()
			continue
		}
		maxSessions, _ := strconv.Atoi(info["max_sessions"])
		activeSessions := int(candidate.Score)
		if maxSessions <= 0 {
			maxSessions = 5
		}
		if activeSessions >= maxSessions {
			continue
		}
		if _, err := r.client.ZIncrBy(ctx, key, 1, agentID).Result(); err != nil {
			return AgentPresence{}, err
		}
		_ = r.client.HIncrBy(ctx, agentInfoKey(tenantID, agentID), "active_sessions", 1).Err()
		return AgentPresence{
			TenantID:       tenantID,
			GroupID:        groupID,
			AgentID:        agentID,
			MaxSessions:    maxSessions,
			ActiveSessions: activeSessions + 1,
		}, nil
	}
	return AgentPresence{}, ErrNoOnlineAgent
}

func (r *RedisCache) DecrementAgentSession(ctx context.Context, tenantID, groupID, agentID string) error {
	if groupID == "" {
		groupID = "default"
	}
	pipe := r.client.TxPipeline()
	pipe.ZIncrBy(ctx, agentZSetKey(tenantID, groupID), -1, agentID)
	pipe.HIncrBy(ctx, agentInfoKey(tenantID, agentID), "active_sessions", -1)
	_, err := pipe.Exec(ctx)
	return err
}

func (r *RedisCache) RegisterConnection(ctx context.Context, tenantID, userType, userID, deviceID, nodeID string) error {
	if deviceID == "" {
		deviceID = "default"
	}
	key := connectionKey(tenantID, userType, userID, deviceID)
	return r.client.Set(ctx, key, nodeID, 2*time.Hour).Err()
}

func (r *RedisCache) RemoveConnection(ctx context.Context, tenantID, userType, userID, deviceID string) error {
	if deviceID == "" {
		deviceID = "default"
	}
	return r.client.Del(ctx, connectionKey(tenantID, userType, userID, deviceID)).Err()
}

func (r *RedisCache) RefreshConnection(ctx context.Context, tenantID, userType, userID, deviceID string) error {
	if deviceID == "" {
		deviceID = "default"
	}
	return r.client.Expire(ctx, connectionKey(tenantID, userType, userID, deviceID), 2*time.Hour).Err()
}

func (r *RedisCache) HasConnection(ctx context.Context, tenantID, userType, userID string) (bool, error) {
	if userID == "" {
		return false, nil
	}
	var cursor uint64
	pattern := connectionKey(tenantID, userType, userID, "*")
	for {
		keys, next, err := r.client.Scan(ctx, cursor, pattern, 20).Result()
		if err != nil {
			return false, err
		}
		if len(keys) > 0 {
			return true, nil
		}
		if next == 0 {
			return false, nil
		}
		cursor = next
	}
}

func agentZSetKey(tenantID, groupID string) string {
	return "cs:agent:zset:" + tenantID + ":" + groupID
}

func agentInfoKey(tenantID, agentID string) string {
	return "cs:online:agent:" + tenantID + ":" + agentID
}

func connectionKey(tenantID, userType, userID, deviceID string) string {
	return "cs:conn:" + tenantID + ":" + userType + ":" + userID + ":" + deviceID
}
