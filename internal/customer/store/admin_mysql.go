package store

import (
	"context"
	"database/sql"
	"errors"
	"strconv"
	"time"

	"github.com/tiger1103/gfast/v3/internal/customer/domain"

	"github.com/google/uuid"
)

func (s *MySQLStore) ListTenants(ctx context.Context, limit, offset int) ([]domain.Tenant, error) {
	limit, offset = normalizePage(limit, offset)
	rows, err := s.db.QueryContext(ctx, `
		SELECT tenant_id, name, status, created_at, updated_at
		FROM cs_tenant
		WHERE deleted_at IS NULL
		ORDER BY id DESC
		LIMIT ? OFFSET ?`, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []domain.Tenant
	for rows.Next() {
		var item domain.Tenant
		if err := rows.Scan(&item.ID, &item.Name, &item.Status, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *MySQLStore) ListTenantsByAdmin(ctx context.Context, gfastUserID int64) ([]domain.Tenant, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT t.tenant_id, t.name, t.status, t.created_at, t.updated_at
		FROM cs_tenant_admin a
		JOIN cs_tenant t ON t.tenant_id = a.tenant_id
		WHERE a.gfast_user_id = ?
			AND a.status = 'enabled'
			AND a.deleted_at IS NULL
			AND t.status = 'enabled'
			AND t.deleted_at IS NULL
		ORDER BY a.id ASC`, gfastUserID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []domain.Tenant
	for rows.Next() {
		var item domain.Tenant
		if err := rows.Scan(&item.ID, &item.Name, &item.Status, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *MySQLStore) UpsertTenant(ctx context.Context, tenant domain.Tenant) (domain.Tenant, error) {
	if tenant.ID == "" {
		tenant.ID = uuid.NewString()
	}
	if tenant.Status == "" {
		tenant.Status = "enabled"
	}
	now := time.Now()
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO cs_tenant (tenant_id, name, status, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?)
		ON DUPLICATE KEY UPDATE name = VALUES(name), status = VALUES(status), updated_at = VALUES(updated_at)`,
		tenant.ID, tenant.Name, tenant.Status, now, now)
	if err != nil {
		return domain.Tenant{}, err
	}
	return tenant, nil
}

func (s *MySQLStore) ListChannels(ctx context.Context, tenantID string, limit, offset int) ([]domain.Channel, error) {
	limit, offset = normalizePage(limit, offset)
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, tenant_id, app_id, channel_type, channel_name, app_key, default_group_id, status, created_at, updated_at
		FROM cs_channel
		WHERE tenant_id = ? AND deleted_at IS NULL
		ORDER BY id DESC
		LIMIT ? OFFSET ?`, tenantID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []domain.Channel
	for rows.Next() {
		var item domain.Channel
		var id int64
		if err := rows.Scan(&id, &item.TenantID, &item.AppID, &item.ChannelType, &item.ChannelName, &item.AppKey, &item.DefaultGroupID, &item.Status, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		item.ID = strconv.FormatInt(id, 10)
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *MySQLStore) UpsertChannel(ctx context.Context, channel domain.Channel) (domain.Channel, error) {
	if channel.AppID == "" {
		channel.AppID = "default"
	}
	if channel.AppKey == "" {
		channel.AppKey = uuid.NewString()
	}
	if channel.Secret == "" {
		channel.Secret = uuid.NewString()
	}
	if channel.Status == "" {
		channel.Status = "enabled"
	}
	now := time.Now()
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO cs_channel (
			tenant_id, app_id, channel_type, channel_name, app_key, secret, default_group_id, status, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON DUPLICATE KEY UPDATE
			channel_type = VALUES(channel_type),
			channel_name = VALUES(channel_name),
			secret = VALUES(secret),
			default_group_id = VALUES(default_group_id),
			status = VALUES(status),
			updated_at = VALUES(updated_at)`,
		channel.TenantID, channel.AppID, channel.ChannelType, channel.ChannelName, channel.AppKey,
		channel.Secret, channel.DefaultGroupID, channel.Status, now, now)
	if err != nil {
		return domain.Channel{}, err
	}
	channel.Secret = ""
	return channel, nil
}

func (s *MySQLStore) GetChannelDefaultGroupID(ctx context.Context, tenantID, appID, channelID string) (string, error) {
	if channelID == "" {
		return "", ErrNotFound
	}
	var groupID string
	err := s.db.QueryRowContext(ctx, `
		SELECT default_group_id
		FROM cs_channel
		WHERE tenant_id = ? AND app_id = ? AND app_key = ? AND status = 'enabled' AND deleted_at IS NULL
		LIMIT 1`, tenantID, appID, channelID).Scan(&groupID)
	if errors.Is(err, sql.ErrNoRows) || groupID == "" {
		return "", ErrNotFound
	}
	return groupID, err
}

func (s *MySQLStore) ListAgents(ctx context.Context, tenantID string, limit, offset int) ([]domain.Agent, error) {
	limit, offset = normalizePage(limit, offset)
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, tenant_id, agent_id, username, display_name, max_sessions, status, online_status, created_at, updated_at
		FROM cs_agent
		WHERE tenant_id = ? AND deleted_at IS NULL
		ORDER BY id DESC
		LIMIT ? OFFSET ?`, tenantID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []domain.Agent
	for rows.Next() {
		var item domain.Agent
		var id int64
		if err := rows.Scan(&id, &item.TenantID, &item.AgentID, &item.Username, &item.DisplayName, &item.MaxSessions, &item.Status, &item.OnlineStatus, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		item.ID = strconv.FormatInt(id, 10)
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *MySQLStore) UpsertAgent(ctx context.Context, agent domain.Agent) (domain.Agent, error) {
	if agent.AgentID == "" {
		agent.AgentID = uuid.NewString()
	}
	if agent.MaxSessions <= 0 {
		agent.MaxSessions = 5
	}
	if agent.Status == "" {
		agent.Status = "enabled"
	}
	if agent.OnlineStatus == "" {
		agent.OnlineStatus = "offline"
	}
	now := time.Now()
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO cs_agent (
			tenant_id, agent_id, username, display_name, max_sessions, status, online_status, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON DUPLICATE KEY UPDATE
			username = VALUES(username),
			display_name = VALUES(display_name),
			max_sessions = VALUES(max_sessions),
			status = VALUES(status),
			online_status = VALUES(online_status),
			updated_at = VALUES(updated_at)`,
		agent.TenantID, agent.AgentID, agent.Username, agent.DisplayName, agent.MaxSessions,
		agent.Status, agent.OnlineStatus, now, now)
	if err != nil {
		return domain.Agent{}, err
	}
	return agent, nil
}

func (s *MySQLStore) ListAgentGroups(ctx context.Context, tenantID string, limit, offset int) ([]domain.AgentGroup, error) {
	limit, offset = normalizePage(limit, offset)
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, tenant_id, group_id, name, status, created_at, updated_at
		FROM cs_agent_group
		WHERE tenant_id = ? AND deleted_at IS NULL
		ORDER BY id DESC
		LIMIT ? OFFSET ?`, tenantID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []domain.AgentGroup
	for rows.Next() {
		var item domain.AgentGroup
		var id int64
		if err := rows.Scan(&id, &item.TenantID, &item.GroupID, &item.Name, &item.Status, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		item.ID = strconv.FormatInt(id, 10)
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *MySQLStore) UpsertAgentGroup(ctx context.Context, group domain.AgentGroup) (domain.AgentGroup, error) {
	if group.GroupID == "" {
		group.GroupID = uuid.NewString()
	}
	if group.Status == "" {
		group.Status = "enabled"
	}
	now := time.Now()
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO cs_agent_group (tenant_id, group_id, name, status, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?)
		ON DUPLICATE KEY UPDATE name = VALUES(name), status = VALUES(status), updated_at = VALUES(updated_at)`,
		group.TenantID, group.GroupID, group.Name, group.Status, now, now)
	if err != nil {
		return domain.AgentGroup{}, err
	}
	return group, nil
}

func (s *MySQLStore) AddAgentToGroup(ctx context.Context, tenantID, agentID, groupID string) error {
	var exists int
	err := s.db.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM cs_agent a
		JOIN cs_agent_group g ON g.tenant_id = a.tenant_id
		WHERE a.tenant_id = ?
			AND a.agent_id = ?
			AND g.group_id = ?
			AND a.deleted_at IS NULL
			AND g.deleted_at IS NULL`, tenantID, agentID, groupID).Scan(&exists)
	if err != nil {
		return err
	}
	if exists == 0 {
		return ErrNotFound
	}
	_, err = s.db.ExecContext(ctx, `
		INSERT INTO cs_agent_group_rel (tenant_id, agent_id, group_id)
		VALUES (?, ?, ?)
		ON DUPLICATE KEY UPDATE group_id = VALUES(group_id)`,
		tenantID, agentID, groupID)
	return err
}

func (s *MySQLStore) ListTenantAdmins(ctx context.Context, tenantID string, limit, offset int) ([]domain.TenantAdmin, error) {
	limit, offset = normalizePage(limit, offset)
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, tenant_id, gfast_user_id, gfast_username, role_type, status, created_at, updated_at
		FROM cs_tenant_admin
		WHERE tenant_id = ? AND deleted_at IS NULL
		ORDER BY id DESC
		LIMIT ? OFFSET ?`, tenantID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []domain.TenantAdmin
	for rows.Next() {
		var item domain.TenantAdmin
		var id int64
		if err := rows.Scan(&id, &item.TenantID, &item.GFastUserID, &item.GFastUsername, &item.RoleType, &item.Status, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		item.ID = strconv.FormatInt(id, 10)
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *MySQLStore) BindTenantAdmin(ctx context.Context, item domain.TenantAdmin) (domain.TenantAdmin, error) {
	if item.RoleType == "" {
		item.RoleType = "tenant_admin"
	}
	if item.Status == "" {
		item.Status = "enabled"
	}
	now := time.Now()
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO cs_tenant_admin (
			tenant_id, gfast_user_id, gfast_username, role_type, status, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?)
		ON DUPLICATE KEY UPDATE
			gfast_username = VALUES(gfast_username),
			role_type = VALUES(role_type),
			status = VALUES(status),
			deleted_at = NULL,
			updated_at = VALUES(updated_at)`,
		item.TenantID, item.GFastUserID, item.GFastUsername, item.RoleType, item.Status, now, now)
	if err != nil {
		return domain.TenantAdmin{}, err
	}
	return item, nil
}

func (s *MySQLStore) UnbindTenantAdmin(ctx context.Context, tenantID string, gfastUserID int64) error {
	result, err := s.db.ExecContext(ctx, `
		UPDATE cs_tenant_admin
		SET deleted_at = ?, updated_at = ?
		WHERE tenant_id = ? AND gfast_user_id = ? AND deleted_at IS NULL`,
		time.Now(), time.Now(), tenantID, gfastUserID)
	if err != nil {
		return err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *MySQLStore) ListSessions(ctx context.Context, tenantID, status string, limit, offset int) ([]domain.Session, error) {
	limit, offset = normalizePage(limit, offset)
	query := `
		SELECT tenant_id, app_id, session_id, channel_id, user_id, agent_id, group_id,
			status, priority, last_seq, last_msg_time, source_ip, user_agent, login_time,
			created_at, updated_at
		FROM cs_session
		WHERE tenant_id = ? AND deleted_at IS NULL`
	args := []any{tenantID}
	if status != "" {
		query += " AND status = ?"
		args = append(args, status)
	}
	query += " ORDER BY updated_at DESC LIMIT ? OFFSET ?"
	args = append(args, limit, offset)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []domain.Session
	for rows.Next() {
		var item domain.Session
		var lastMsgTime sql.NullTime
		if err := rows.Scan(
			&item.TenantID, &item.AppID, &item.ID, &item.ChannelID, &item.UserID,
			&item.AgentID, &item.GroupID, &item.Status, &item.Priority, &item.LastSeq,
			&lastMsgTime, &item.SourceIP, &item.UserAgent, &item.LoginTime, &item.CreatedAt, &item.UpdatedAt,
		); err != nil {
			return nil, err
		}
		if lastMsgTime.Valid {
			item.LastMsgTime = lastMsgTime.Time
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *MySQLStore) GetAdminStats(ctx context.Context, tenantID string) (domain.AdminStats, error) {
	var stats domain.AdminStats
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM cs_agent WHERE tenant_id = ? AND online_status = 'online' AND deleted_at IS NULL`, tenantID).Scan(&stats.OnlineAgents); err != nil && !errors.Is(err, sql.ErrNoRows) {
		return domain.AdminStats{}, err
	}
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM cs_session WHERE tenant_id = ? AND status = 'waiting' AND deleted_at IS NULL`, tenantID).Scan(&stats.WaitingSessions); err != nil && !errors.Is(err, sql.ErrNoRows) {
		return domain.AdminStats{}, err
	}
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM cs_session WHERE tenant_id = ? AND status = 'serving' AND deleted_at IS NULL`, tenantID).Scan(&stats.ServingSessions); err != nil && !errors.Is(err, sql.ErrNoRows) {
		return domain.AdminStats{}, err
	}
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM cs_message WHERE tenant_id = ? AND send_time >= CURDATE() AND deleted_at IS NULL`, tenantID).Scan(&stats.TodayMessages); err != nil && !errors.Is(err, sql.ErrNoRows) {
		return domain.AdminStats{}, err
	}
	return stats, nil
}

func normalizePage(limit, offset int) (int, int) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}
	return limit, offset
}
