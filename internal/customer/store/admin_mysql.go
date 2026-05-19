package store

import (
	"context"
	"crypto/rand"
	"database/sql"
	"errors"
	"math/big"
	"strconv"
	"time"

	"github.com/tiger1103/gfast/v3/internal/customer/domain"
	"github.com/tiger1103/gfast/v3/library/libUtils"

	"github.com/google/uuid"
)

const (
	gfastUserIDMin         = 200000000000
	gfastUserIDRandomRange = 800000000000
	gfastUserIDRetryLimit  = 20
)

type sqlExecutor interface {
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
	QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
}

func (s *MySQLStore) ListTenants(ctx context.Context, limit, offset int) ([]domain.Tenant, error) {
	limit, offset = normalizePage(limit, offset)
	rows, err := s.db.QueryContext(ctx, `
		SELECT tenant_id, name, status, agent_limit, created_at, updated_at
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
		if err := rows.Scan(&item.ID, &item.Name, &item.Status, &item.AgentLimit, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *MySQLStore) ListTenantsByAdmin(ctx context.Context, gfastUserID int64) ([]domain.Tenant, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT t.tenant_id, t.name, t.status, t.agent_limit, t.created_at, t.updated_at
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
		if err := rows.Scan(&item.ID, &item.Name, &item.Status, &item.AgentLimit, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *MySQLStore) UpsertTenant(ctx context.Context, tenant domain.Tenant) (domain.Tenant, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return domain.Tenant{}, err
	}
	defer tx.Rollback()

	if tenant.ID == "" {
		tenantID, err := s.generateTenantSystemID(ctx, tx)
		if err != nil {
			return domain.Tenant{}, err
		}
		tenant.ID = strconv.FormatInt(tenantID, 10)
	}
	if tenant.Status == "" {
		tenant.Status = "enabled"
	}
	if tenant.AgentLimit <= 0 {
		tenant.AgentLimit = 3
	}
	var existing int
	if err := tx.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM cs_tenant
		WHERE tenant_id = ? AND deleted_at IS NULL`, tenant.ID).Scan(&existing); err != nil {
		return domain.Tenant{}, err
	}
	if existing == 0 && tenant.AdminUsername == "" {
		return domain.Tenant{}, errors.New("admin_username is required when creating tenant")
	}
	if existing == 0 && tenant.AdminPassword == "" {
		return domain.Tenant{}, errors.New("admin_password is required when creating tenant")
	}
	now := time.Now()
	_, err = tx.ExecContext(ctx, `
		INSERT INTO cs_tenant (tenant_id, name, status, agent_limit, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?)
		ON DUPLICATE KEY UPDATE
			name = VALUES(name),
			status = VALUES(status),
			agent_limit = VALUES(agent_limit),
			updated_at = VALUES(updated_at)`,
		tenant.ID, tenant.Name, tenant.Status, tenant.AgentLimit, now, now)
	if err != nil {
		return domain.Tenant{}, err
	}
	if tenant.AdminPassword != "" {
		userID, err := s.createGFastTenantUser(ctx, tx, tenant)
		if err != nil {
			return domain.Tenant{}, err
		}
		tenant.GFastUserID = userID
		if _, err := s.bindTenantAdminWithExecutor(ctx, tx, domain.TenantAdmin{
			TenantID:      tenant.ID,
			GFastUserID:   userID,
			GFastUsername: tenant.AdminUsername,
			RoleType:      "tenant_admin",
			Status:        "enabled",
		}); err != nil {
			return domain.Tenant{}, err
		}
		if err := s.assignTenantRole(ctx, tx, userID); err != nil {
			return domain.Tenant{}, err
		}
	}
	if err := tx.Commit(); err != nil {
		return domain.Tenant{}, err
	}
	return tenant, nil
}

func (s *MySQLStore) GetTenantAgentLimit(ctx context.Context, tenantID string) (int, error) {
	var limit int
	err := s.db.QueryRowContext(ctx, `
		SELECT agent_limit
		FROM cs_tenant
		WHERE tenant_id = ? AND deleted_at IS NULL
		LIMIT 1`, tenantID).Scan(&limit)
	if errors.Is(err, sql.ErrNoRows) {
		return 3, nil
	}
	if err != nil {
		return 0, err
	}
	if limit <= 0 {
		return 3, nil
	}
	return limit, nil
}

func (s *MySQLStore) DeleteTenant(ctx context.Context, tenantID string) error {
	now := time.Now()
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	result, err := tx.ExecContext(ctx, `
		UPDATE cs_tenant
		SET deleted_at = ?, updated_at = ?, status = 'disabled'
		WHERE tenant_id = ? AND deleted_at IS NULL`,
		now, now, tenantID)
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

	if _, err := tx.ExecContext(ctx, `
		UPDATE cs_tenant_admin
		SET deleted_at = ?, updated_at = ?, status = 'disabled'
		WHERE tenant_id = ? AND deleted_at IS NULL`,
		now, now, tenantID); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `
		UPDATE cs_channel
		SET deleted_at = ?, updated_at = ?, status = 'disabled'
		WHERE tenant_id = ? AND deleted_at IS NULL`,
		now, now, tenantID); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `
		UPDATE cs_agent
		SET deleted_at = ?, updated_at = ?, status = 'disabled', online_status = 'offline'
		WHERE tenant_id = ? AND deleted_at IS NULL`,
		now, now, tenantID); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `
		UPDATE cs_agent_group
		SET deleted_at = ?, updated_at = ?, status = 'disabled'
		WHERE tenant_id = ? AND deleted_at IS NULL`,
		now, now, tenantID); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `DELETE FROM cs_agent_group_rel WHERE tenant_id = ?`, tenantID); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `
		UPDATE cs_config
		SET deleted_at = ?, updated_at = ?
		WHERE tenant_id = ? AND deleted_at IS NULL`,
		now, now, tenantID); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `
		UPDATE cs_sensitive_word
		SET deleted_at = ?, updated_at = ?, status = 'disabled'
		WHERE tenant_id = ? AND deleted_at IS NULL`,
		now, now, tenantID); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `
		UPDATE cs_blacklist
		SET deleted_at = ?, updated_at = ?, status = 'disabled'
		WHERE tenant_id = ? AND deleted_at IS NULL`,
		now, now, tenantID); err != nil {
		return err
	}

	if userID, err := strconv.ParseInt(tenantID, 10, 64); err == nil {
		if _, err := tx.ExecContext(ctx, `
			UPDATE sys_user
			SET deleted_at = ?, updated_at = ?, user_status = 0
			WHERE id = ? AND user_type = 1 AND deleted_at IS NULL`,
			now, now, userID); err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, `
			DELETE FROM casbin_rule
			WHERE ptype = 'g' AND v0 = ?`,
			"u_"+strconv.FormatInt(userID, 10)); err != nil {
			return err
		}
	}

	return tx.Commit()
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

func (s *MySQLStore) DeleteChannel(ctx context.Context, tenantID, appKey string) error {
	result, err := s.db.ExecContext(ctx, `
		UPDATE cs_channel
		SET deleted_at = ?, updated_at = ?
		WHERE tenant_id = ? AND app_key = ? AND deleted_at IS NULL`,
		time.Now(), time.Now(), tenantID, appKey)
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
		SELECT id, tenant_id, agent_id, gfast_user_id, username, display_name, max_sessions, status, online_status, created_at, updated_at
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
		if err := rows.Scan(&id, &item.TenantID, &item.AgentID, &item.GFastUserID, &item.Username, &item.DisplayName, &item.MaxSessions, &item.Status, &item.OnlineStatus, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		item.ID = strconv.FormatInt(id, 10)
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *MySQLStore) CountAgents(ctx context.Context, tenantID string) (int64, error) {
	var total int64
	err := s.db.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM cs_agent
		WHERE tenant_id = ? AND deleted_at IS NULL`, tenantID).Scan(&total)
	return total, err
}

func (s *MySQLStore) IsGFastAdmin(ctx context.Context, gfastUserID int64) (bool, error) {
	if gfastUserID <= 0 {
		return false, nil
	}
	var isAdmin int
	err := s.db.QueryRowContext(ctx, `
		SELECT is_admin
		FROM sys_user
		WHERE id = ? AND deleted_at IS NULL
		LIMIT 1`, gfastUserID).Scan(&isAdmin)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return isAdmin == 1, nil
}

func (s *MySQLStore) GetAgentByGFastUser(ctx context.Context, tenantID string, gfastUserID int64) (domain.Agent, error) {
	var item domain.Agent
	var id int64
	err := s.db.QueryRowContext(ctx, `
		SELECT id, tenant_id, agent_id, gfast_user_id, username, display_name, max_sessions, status, online_status, created_at, updated_at
		FROM cs_agent
		WHERE tenant_id = ? AND gfast_user_id = ? AND status = 'enabled' AND deleted_at IS NULL
		LIMIT 1`, tenantID, gfastUserID).
		Scan(&id, &item.TenantID, &item.AgentID, &item.GFastUserID, &item.Username, &item.DisplayName, &item.MaxSessions, &item.Status, &item.OnlineStatus, &item.CreatedAt, &item.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return domain.Agent{}, ErrNotFound
	}
	if err != nil {
		return domain.Agent{}, err
	}
	item.ID = strconv.FormatInt(id, 10)
	return item, nil
}

func (s *MySQLStore) UpsertAgent(ctx context.Context, agent domain.Agent) (domain.Agent, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return domain.Agent{}, err
	}
	defer tx.Rollback()

	if agent.AgentID != "" {
		var existingGFastUserID int64
		var existingUsername string
		err := tx.QueryRowContext(ctx, `
			SELECT gfast_user_id, username
			FROM cs_agent
			WHERE tenant_id = ? AND agent_id = ? AND deleted_at IS NULL
			LIMIT 1`, agent.TenantID, agent.AgentID).Scan(&existingGFastUserID, &existingUsername)
		if errors.Is(err, sql.ErrNoRows) {
			return domain.Agent{}, ErrNotFound
		}
		if err != nil {
			return domain.Agent{}, err
		}
		agent.GFastUserID = existingGFastUserID
		agent.Username = existingUsername
	}
	if agent.AgentID == "" {
		agent.AgentID = uuid.NewString()
	}
	if agent.GFastUserID == 0 {
		userID, err := s.createGFastAgentUser(ctx, tx, agent)
		if err != nil {
			return domain.Agent{}, err
		}
		agent.GFastUserID = userID
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
	_, err = tx.ExecContext(ctx, `
		INSERT INTO cs_agent (
			tenant_id, agent_id, gfast_user_id, username, display_name, max_sessions, status, online_status, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON DUPLICATE KEY UPDATE
			gfast_user_id = VALUES(gfast_user_id),
			username = VALUES(username),
			display_name = VALUES(display_name),
			max_sessions = VALUES(max_sessions),
			status = VALUES(status),
			online_status = VALUES(online_status),
			updated_at = VALUES(updated_at)`,
		agent.TenantID, agent.AgentID, agent.GFastUserID, agent.Username, agent.DisplayName, agent.MaxSessions,
		agent.Status, agent.OnlineStatus, now, now)
	if err != nil {
		return domain.Agent{}, err
	}
	if err := tx.Commit(); err != nil {
		return domain.Agent{}, err
	}
	return agent, nil
}

func (s *MySQLStore) createGFastAgentUser(ctx context.Context, db sqlExecutor, agent domain.Agent) (int64, error) {
	if agent.Username == "" {
		return 0, errors.New("username is required")
	}
	if agent.Password == "" {
		return 0, errors.New("password is required when creating agent user")
	}
	var exists int
	if err := db.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM sys_user
		WHERE user_name = ? AND deleted_at IS NULL`, agent.Username).Scan(&exists); err != nil {
		return 0, err
	}
	if exists > 0 {
		return 0, errors.New("用户名已存在")
	}
	userID, err := s.generateGFastUserID(ctx, db)
	if err != nil {
		return 0, err
	}
	salt := uuid.NewString()
	if len(salt) > 10 {
		salt = salt[:10]
	}
	status := 1
	if agent.Status == "disabled" {
		status = 0
	}
	now := time.Now()
	_, err = db.ExecContext(ctx, `
		INSERT INTO sys_user (
			id, user_name, mobile, user_nickname, birthday, user_password, user_salt, user_status,
			user_email, google_secret, google_status, sex, avatar, dept_id, remark, is_admin,
			user_type, address, `+"`describe`"+`, created_at, updated_at
		) VALUES (?, ?, '', ?, 0, ?, ?, ?, '', '', 0, 0, '', 0, '', 0, 2, '', '', ?, ?)`,
		userID, agent.Username, agent.DisplayName, libUtils.EncryptPassword(agent.Password, salt), salt, status, now, now)
	if err != nil {
		return 0, err
	}
	return userID, nil
}

func (s *MySQLStore) createGFastTenantUser(ctx context.Context, db sqlExecutor, tenant domain.Tenant) (int64, error) {
	username := tenant.AdminUsername
	if username == "" {
		return 0, errors.New("admin_username is required")
	}
	if tenant.AdminPassword == "" {
		return 0, errors.New("admin_password is required when creating tenant user")
	}
	var exists int
	if err := db.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM sys_user
		WHERE user_name = ? AND deleted_at IS NULL`, username).Scan(&exists); err != nil {
		return 0, err
	}
	if exists > 0 {
		return 0, errors.New("用户名已存在")
	}
	userID, err := strconv.ParseInt(tenant.ID, 10, 64)
	if err != nil {
		return 0, errors.New("tenant_id must be a 12-digit number when creating tenant user")
	}
	if userID < gfastUserIDMin || userID >= gfastUserIDMin+gfastUserIDRandomRange {
		return 0, errors.New("tenant_id must be a 12-digit number when creating tenant user")
	}
	var idExists int
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM sys_user WHERE id = ?`, userID).Scan(&idExists); err != nil {
		return 0, err
	}
	if idExists > 0 {
		return 0, errors.New("gfast user id already exists")
	}
	salt := uuid.NewString()
	if len(salt) > 10 {
		salt = salt[:10]
	}
	status := 1
	if tenant.Status == "disabled" {
		status = 0
	}
	now := time.Now()
	_, err = db.ExecContext(ctx, `
		INSERT INTO sys_user (
			id, user_name, mobile, user_nickname, birthday, user_password, user_salt, user_status,
			user_email, google_secret, google_status, sex, avatar, dept_id, remark, is_admin,
			user_type, address, `+"`describe`"+`, created_at, updated_at
		) VALUES (?, ?, '', ?, 0, ?, ?, ?, '', '', 0, 0, '', 0, '', 0, 1, '', '', ?, ?)`,
		userID, username, tenant.Name, libUtils.EncryptPassword(tenant.AdminPassword, salt), salt, status, now, now)
	if err != nil {
		return 0, err
	}
	return userID, nil
}

func (s *MySQLStore) generateTenantSystemID(ctx context.Context, db sqlExecutor) (int64, error) {
	for i := 0; i < gfastUserIDRetryLimit; i++ {
		userID, err := randomGFastUserID()
		if err != nil {
			return 0, err
		}
		var userCount int
		if err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM sys_user WHERE id = ?`, userID).Scan(&userCount); err != nil {
			return 0, err
		}
		if userCount > 0 {
			continue
		}
		var tenantCount int
		if err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM cs_tenant WHERE tenant_id = ?`, strconv.FormatInt(userID, 10)).Scan(&tenantCount); err != nil {
			return 0, err
		}
		if tenantCount == 0 {
			return userID, nil
		}
	}
	return 0, errors.New("generate tenant id failed")
}

func (s *MySQLStore) assignTenantRole(ctx context.Context, db sqlExecutor, userID int64) error {
	var roleID int64
	err := db.QueryRowContext(ctx, `
		SELECT id
		FROM sys_role
		WHERE name = '客服租户' AND status = 1
		ORDER BY id ASC
		LIMIT 1`).Scan(&roleID)
	if errors.Is(err, sql.ErrNoRows) {
		return nil
	}
	if err != nil {
		return err
	}
	var exists int
	if err := db.QueryRowContext(ctx, `
		SELECT COUNT(*)
		FROM casbin_rule
		WHERE ptype = 'g' AND v0 = ? AND v1 = ?`,
		"u_"+strconv.FormatInt(userID, 10), strconv.FormatInt(roleID, 10)).Scan(&exists); err != nil {
		return err
	}
	if exists > 0 {
		return nil
	}
	_, err = db.ExecContext(ctx, `
		INSERT INTO casbin_rule (ptype, v0, v1, v2, v3, v4, v5)
		VALUES ('g', ?, ?, '', '', '', '')`,
		"u_"+strconv.FormatInt(userID, 10), strconv.FormatInt(roleID, 10))
	return err
}

func (s *MySQLStore) generateGFastUserID(ctx context.Context, db sqlExecutor) (int64, error) {
	for i := 0; i < gfastUserIDRetryLimit; i++ {
		userID, err := randomGFastUserID()
		if err != nil {
			return 0, err
		}
		var count int
		if err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM sys_user WHERE id = ?`, userID).Scan(&count); err != nil {
			return 0, err
		}
		if count == 0 {
			return userID, nil
		}
	}
	return 0, errors.New("generate gfast user id failed")
}

func randomGFastUserID() (int64, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(gfastUserIDRandomRange))
	if err != nil {
		return 0, err
	}
	return gfastUserIDMin + n.Int64(), nil
}

func (s *MySQLStore) DeleteAgent(ctx context.Context, tenantID, agentID string) error {
	now := time.Now()
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	result, err := tx.ExecContext(ctx, `
		UPDATE cs_agent
		SET deleted_at = ?, updated_at = ?, online_status = 'offline'
		WHERE tenant_id = ? AND agent_id = ? AND deleted_at IS NULL`,
		now, now, tenantID, agentID)
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
	if _, err := tx.ExecContext(ctx, `DELETE FROM cs_agent_group_rel WHERE tenant_id = ? AND agent_id = ?`, tenantID, agentID); err != nil {
		return err
	}
	return tx.Commit()
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

func (s *MySQLStore) DeleteAgentGroup(ctx context.Context, tenantID, groupID string) error {
	now := time.Now()
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	result, err := tx.ExecContext(ctx, `
		UPDATE cs_agent_group
		SET deleted_at = ?, updated_at = ?
		WHERE tenant_id = ? AND group_id = ? AND deleted_at IS NULL`,
		now, now, tenantID, groupID)
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
	if _, err := tx.ExecContext(ctx, `DELETE FROM cs_agent_group_rel WHERE tenant_id = ? AND group_id = ?`, tenantID, groupID); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `
		UPDATE cs_channel
		SET default_group_id = '', updated_at = ?
		WHERE tenant_id = ? AND default_group_id = ? AND deleted_at IS NULL`,
		now, tenantID, groupID); err != nil {
		return err
	}
	return tx.Commit()
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
	return s.bindTenantAdminWithExecutor(ctx, s.db, item)
}

func (s *MySQLStore) bindTenantAdminWithExecutor(ctx context.Context, db sqlExecutor, item domain.TenantAdmin) (domain.TenantAdmin, error) {
	if item.RoleType == "" {
		item.RoleType = "tenant_admin"
	}
	if item.Status == "" {
		item.Status = "enabled"
	}
	now := time.Now()
	_, err := db.ExecContext(ctx, `
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
		SELECT s.tenant_id, s.app_id, s.session_id, s.channel_id, s.user_id, COALESCE(u.nickname, ''), COALESCE(u.avatar, ''),
			s.agent_id, s.group_id, s.status, s.priority, s.last_seq, s.last_msg_time, s.source_ip,
			s.user_agent, s.login_time, s.created_at, s.updated_at
		FROM cs_session s
		LEFT JOIN cs_user u ON u.tenant_id = s.tenant_id AND u.app_id = s.app_id AND u.user_id = s.user_id AND u.deleted_at IS NULL
		WHERE s.tenant_id = ? AND s.deleted_at IS NULL`
	args := []any{tenantID}
	if status != "" {
		query += " AND s.status = ?"
		args = append(args, status)
	}
	query += " ORDER BY s.updated_at DESC LIMIT ? OFFSET ?"
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
			&item.UserName, &item.UserAvatar, &item.AgentID, &item.GroupID, &item.Status, &item.Priority, &item.LastSeq,
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
