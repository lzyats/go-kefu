package store

import (
	"context"
	"database/sql"
	"strconv"
	"time"

	"github.com/tiger1103/gfast/v3/internal/customer/domain"

	"github.com/google/uuid"
)

func (s *MySQLStore) ListAdminMessages(ctx context.Context, tenantID, sessionID, senderID, keyword string, limit, offset int) ([]domain.Message, error) {
	limit, offset = normalizePage(limit, offset)
	query := `
		SELECT tenant_id, app_id, channel_id, msg_id, session_id, client_msg_id,
			sender_id, sender_type, receiver_id, msg_type, content, seq, status, send_time
		FROM cs_message
		WHERE tenant_id = ? AND deleted_at IS NULL`
	args := []any{tenantID}
	if sessionID != "" {
		query += " AND session_id = ?"
		args = append(args, sessionID)
	}
	if senderID != "" {
		query += " AND sender_id = ?"
		args = append(args, senderID)
	}
	if keyword != "" {
		query += " AND content LIKE ?"
		args = append(args, "%"+keyword+"%")
	}
	query += " ORDER BY send_time DESC, id DESC LIMIT ? OFFSET ?"
	args = append(args, limit, offset)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []domain.Message
	for rows.Next() {
		var item domain.Message
		if err := rows.Scan(
			&item.TenantID, &item.AppID, &item.ChannelID, &item.ID, &item.SessionID,
			&item.ClientMsgID, &item.SenderID, &item.SenderType, &item.ReceiverID,
			&item.MsgType, &item.Content, &item.Seq, &item.Status, &item.SendTime,
		); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *MySQLStore) ListSensitiveWords(ctx context.Context, tenantID string, limit, offset int) ([]domain.SensitiveWord, error) {
	limit, offset = normalizePage(limit, offset)
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, tenant_id, word, level, action, status, created_at, updated_at
		FROM cs_sensitive_word
		WHERE tenant_id = ? AND deleted_at IS NULL
		ORDER BY id DESC LIMIT ? OFFSET ?`, tenantID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []domain.SensitiveWord
	for rows.Next() {
		var item domain.SensitiveWord
		var id int64
		if err := rows.Scan(&id, &item.TenantID, &item.Word, &item.Level, &item.Action, &item.Status, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		item.ID = strconv.FormatInt(id, 10)
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *MySQLStore) UpsertSensitiveWord(ctx context.Context, item domain.SensitiveWord) (domain.SensitiveWord, error) {
	if item.Level == "" {
		item.Level = "medium"
	}
	if item.Action == "" {
		item.Action = "review"
	}
	if item.Status == "" {
		item.Status = "enabled"
	}
	now := time.Now()
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO cs_sensitive_word (tenant_id, word, level, action, status, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
		ON DUPLICATE KEY UPDATE level = VALUES(level), action = VALUES(action), status = VALUES(status), updated_at = VALUES(updated_at)`,
		item.TenantID, item.Word, item.Level, item.Action, item.Status, now, now)
	return item, err
}

func (s *MySQLStore) ListBlacklists(ctx context.Context, tenantID string, limit, offset int) ([]domain.Blacklist, error) {
	limit, offset = normalizePage(limit, offset)
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, tenant_id, target_type, target_value, reason, status, expire_at, created_at, updated_at
		FROM cs_blacklist
		WHERE tenant_id = ? AND deleted_at IS NULL
		ORDER BY id DESC LIMIT ? OFFSET ?`, tenantID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []domain.Blacklist
	for rows.Next() {
		var item domain.Blacklist
		var id int64
		var expireAt sql.NullTime
		if err := rows.Scan(&id, &item.TenantID, &item.TargetType, &item.TargetValue, &item.Reason, &item.Status, &expireAt, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		item.ID = strconv.FormatInt(id, 10)
		if expireAt.Valid {
			item.ExpireAt = expireAt.Time
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *MySQLStore) UpsertBlacklist(ctx context.Context, item domain.Blacklist) (domain.Blacklist, error) {
	if item.Status == "" {
		item.Status = "enabled"
	}
	now := time.Now()
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO cs_blacklist (tenant_id, target_type, target_value, reason, status, expire_at, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		ON DUPLICATE KEY UPDATE reason = VALUES(reason), status = VALUES(status), expire_at = VALUES(expire_at), updated_at = VALUES(updated_at)`,
		item.TenantID, item.TargetType, item.TargetValue, item.Reason, item.Status, nullableTime(item.ExpireAt), now, now)
	return item, err
}

func (s *MySQLStore) ListRiskEvents(ctx context.Context, tenantID string, limit, offset int) ([]domain.RiskEvent, error) {
	limit, offset = normalizePage(limit, offset)
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, tenant_id, event_type, target_type, target_value, level, description, status, created_at
		FROM cs_risk_event
		WHERE tenant_id = ?
		ORDER BY id DESC LIMIT ? OFFSET ?`, tenantID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []domain.RiskEvent
	for rows.Next() {
		var item domain.RiskEvent
		var id int64
		if err := rows.Scan(&id, &item.TenantID, &item.EventType, &item.TargetType, &item.TargetValue, &item.Level, &item.Description, &item.Status, &item.CreatedAt); err != nil {
			return nil, err
		}
		item.ID = strconv.FormatInt(id, 10)
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *MySQLStore) ListDailyReports(ctx context.Context, tenantID string, days int) ([]domain.DailyReport, error) {
	if days <= 0 || days > 90 {
		days = 7
	}
	rows, err := s.db.QueryContext(ctx, `
		SELECT d.day,
			COALESCE(s.new_sessions, 0),
			COALESCE(s.closed_sessions, 0),
			COALESCE(m.messages, 0),
			COALESCE(m.active_customers, 0)
		FROM (
			SELECT DATE(DATE_SUB(CURDATE(), INTERVAL seq DAY)) AS day
			FROM (
				SELECT 0 seq UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
				UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9
				UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14
				UNION ALL SELECT 15 UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19
				UNION ALL SELECT 20 UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23 UNION ALL SELECT 24
				UNION ALL SELECT 25 UNION ALL SELECT 26 UNION ALL SELECT 27 UNION ALL SELECT 28 UNION ALL SELECT 29
			) seqs
			WHERE seq < ?
		) d
		LEFT JOIN (
			SELECT DATE(created_at) day,
				COUNT(*) new_sessions,
				SUM(CASE WHEN status IN ('closed', 'rated') THEN 1 ELSE 0 END) closed_sessions
			FROM cs_session
			WHERE tenant_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY) AND deleted_at IS NULL
			GROUP BY DATE(created_at)
		) s ON s.day = d.day
		LEFT JOIN (
			SELECT DATE(send_time) day,
				COUNT(*) messages,
				COUNT(DISTINCT CASE WHEN sender_type = 'customer' THEN sender_id ELSE NULL END) active_customers
			FROM cs_message
			WHERE tenant_id = ? AND send_time >= DATE_SUB(CURDATE(), INTERVAL ? DAY) AND deleted_at IS NULL
			GROUP BY DATE(send_time)
		) m ON m.day = d.day
		ORDER BY d.day ASC`, days, tenantID, days, tenantID, days)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []domain.DailyReport
	for rows.Next() {
		var item domain.DailyReport
		if err := rows.Scan(&item.Date, &item.NewSessions, &item.ClosedSessions, &item.Messages, &item.ActiveCustomers); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *MySQLStore) ListTenantConfigs(ctx context.Context, tenantID string, limit, offset int) ([]domain.TenantConfig, error) {
	limit, offset = normalizePage(limit, offset)
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, tenant_id, config_key, config_value, value_type, remark, created_at, updated_at
		FROM cs_config
		WHERE tenant_id = ? AND deleted_at IS NULL
		ORDER BY id DESC LIMIT ? OFFSET ?`, tenantID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []domain.TenantConfig
	for rows.Next() {
		var item domain.TenantConfig
		var id int64
		if err := rows.Scan(&id, &item.TenantID, &item.ConfigKey, &item.ConfigValue, &item.ValueType, &item.Remark, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		item.ID = strconv.FormatInt(id, 10)
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *MySQLStore) UpsertTenantConfig(ctx context.Context, item domain.TenantConfig) (domain.TenantConfig, error) {
	if item.ID == "" {
		item.ID = uuid.NewString()
	}
	if item.ValueType == "" {
		item.ValueType = "string"
	}
	now := time.Now()
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO cs_config (tenant_id, config_key, config_value, value_type, remark, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
		ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), value_type = VALUES(value_type), remark = VALUES(remark), updated_at = VALUES(updated_at)`,
		item.TenantID, item.ConfigKey, item.ConfigValue, item.ValueType, item.Remark, now, now)
	return item, err
}
