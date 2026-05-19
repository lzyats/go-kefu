package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"strconv"
	"time"

	"github.com/tiger1103/gfast/v3/internal/customer/domain"

	"github.com/go-sql-driver/mysql"
	"github.com/google/uuid"
)

type MySQLStore struct {
	db *sql.DB
}

func NewMySQLStore(db *sql.DB) *MySQLStore {
	return &MySQLStore{db: db}
}

func OpenMySQL(ctx context.Context, dsn string) (*sql.DB, error) {
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(80)
	db.SetMaxIdleConns(20)
	db.SetConnMaxLifetime(30 * time.Minute)
	if err := db.PingContext(ctx); err != nil {
		_ = db.Close()
		return nil, err
	}
	return db, nil
}

func (s *MySQLStore) CreateSession(ctx context.Context, session domain.Session) (domain.Session, error) {
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
	if err := s.SaveCustomerProfile(ctx, session.TenantID, session.AppID, session.UserID, session.UserName, session.UserAvatar); err != nil {
		return domain.Session{}, err
	}

	_, err := s.db.ExecContext(ctx, `
		INSERT INTO cs_session (
			tenant_id, app_id, session_id, channel_id, user_id, agent_id, group_id,
			status, priority, last_seq, last_msg_time, source_ip, user_agent, login_time,
			created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		session.TenantID, session.AppID, session.ID, session.ChannelID, session.UserID,
		session.AgentID, session.GroupID, session.Status, session.Priority, session.LastSeq,
		nullableTime(session.LastMsgTime), session.SourceIP, session.UserAgent,
		session.LoginTime, session.CreatedAt, session.UpdatedAt,
	)
	if err != nil {
		return domain.Session{}, err
	}
	return session, nil
}

func (s *MySQLStore) GetSession(ctx context.Context, tenantID, sessionID string) (domain.Session, error) {
	var session domain.Session
	var lastMsgTime sql.NullTime
	var createdAt, updatedAt time.Time
	err := s.db.QueryRowContext(ctx, `
		SELECT s.tenant_id, s.app_id, s.session_id, s.channel_id, s.user_id, COALESCE(u.nickname, ''), COALESCE(u.avatar, ''),
			s.agent_id, s.group_id, s.status, s.priority, s.last_seq, s.last_msg_time, s.source_ip,
			s.user_agent, s.login_time, s.created_at, s.updated_at
		FROM cs_session s
		LEFT JOIN cs_user u ON u.tenant_id = s.tenant_id AND u.app_id = s.app_id AND u.user_id = s.user_id AND u.deleted_at IS NULL
		WHERE s.tenant_id = ? AND s.session_id = ? AND s.deleted_at IS NULL`,
		tenantID, sessionID,
	).Scan(
		&session.TenantID, &session.AppID, &session.ID, &session.ChannelID, &session.UserID,
		&session.UserName, &session.UserAvatar, &session.AgentID, &session.GroupID, &session.Status, &session.Priority, &session.LastSeq,
		&lastMsgTime, &session.SourceIP, &session.UserAgent, &session.LoginTime, &createdAt, &updatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return domain.Session{}, ErrNotFound
	}
	if err != nil {
		return domain.Session{}, err
	}
	if lastMsgTime.Valid {
		session.LastMsgTime = lastMsgTime.Time
	}
	session.CreatedAt = createdAt
	session.UpdatedAt = updatedAt
	return session, nil
}

func (s *MySQLStore) FindActiveSessionByUser(ctx context.Context, tenantID, appID, channelID, userID string) (domain.Session, error) {
	var session domain.Session
	var lastMsgTime sql.NullTime
	var createdAt, updatedAt time.Time
	query := `
		SELECT s.tenant_id, s.app_id, s.session_id, s.channel_id, s.user_id, COALESCE(u.nickname, ''), COALESCE(u.avatar, ''),
			s.agent_id, s.group_id, s.status, s.priority, s.last_seq, s.last_msg_time, s.source_ip,
			s.user_agent, s.login_time, s.created_at, s.updated_at
		FROM cs_session s
		LEFT JOIN cs_user u ON u.tenant_id = s.tenant_id AND u.app_id = s.app_id AND u.user_id = s.user_id AND u.deleted_at IS NULL
		WHERE s.tenant_id = ? AND s.app_id = ? AND s.user_id = ?
			AND s.status NOT IN ('closed', 'rated', 'timeout')
			AND s.deleted_at IS NULL`
	args := []any{tenantID, appID, userID}
	if channelID != "" {
		query += " AND s.channel_id = ?"
		args = append(args, channelID)
	}
	query += " ORDER BY s.updated_at DESC LIMIT 1"

	err := s.db.QueryRowContext(ctx, query, args...).Scan(
		&session.TenantID, &session.AppID, &session.ID, &session.ChannelID, &session.UserID,
		&session.UserName, &session.UserAvatar, &session.AgentID, &session.GroupID, &session.Status, &session.Priority, &session.LastSeq,
		&lastMsgTime, &session.SourceIP, &session.UserAgent, &session.LoginTime, &createdAt, &updatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return domain.Session{}, ErrNotFound
	}
	if err != nil {
		return domain.Session{}, err
	}
	if lastMsgTime.Valid {
		session.LastMsgTime = lastMsgTime.Time
	}
	session.CreatedAt = createdAt
	session.UpdatedAt = updatedAt
	return session, nil
}

func (s *MySQLStore) SaveCustomerProfile(ctx context.Context, tenantID, appID, userID, userName, avatar string) error {
	if tenantID == "" || appID == "" || userID == "" || (userName == "" && avatar == "") {
		return nil
	}
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO cs_user (tenant_id, app_id, user_id, nickname, avatar, status, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, 'enabled', NOW(), NOW())
		ON DUPLICATE KEY UPDATE
			nickname = IF(VALUES(nickname) <> '', VALUES(nickname), nickname),
			avatar = IF(VALUES(avatar) <> '', VALUES(avatar), avatar),
			status = IF(status = '', 'enabled', status),
			deleted_at = NULL,
			updated_at = NOW()`,
		tenantID, appID, userID, userName, avatar,
	)
	return err
}

func (s *MySQLStore) GetCustomerTags(ctx context.Context, tenantID, appID, userID string) ([]string, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT tag_name
		FROM cs_customer_tag
		WHERE tenant_id = ? AND app_id = ? AND user_id = ? AND deleted_at IS NULL
		ORDER BY id ASC`,
		tenantID, appID, userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tags []string
	for rows.Next() {
		var tag string
		if err := rows.Scan(&tag); err != nil {
			return nil, err
		}
		tags = append(tags, tag)
	}
	return tags, rows.Err()
}

func (s *MySQLStore) ReplaceCustomerTags(ctx context.Context, tenantID, appID, userID string, tags []string) ([]string, error) {
	normalized := normalizeTags(tags)
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	now := time.Now()
	if _, err := tx.ExecContext(ctx, `
		UPDATE cs_customer_tag
		SET deleted_at = ?, updated_at = ?
		WHERE tenant_id = ? AND app_id = ? AND user_id = ? AND deleted_at IS NULL`,
		now, now, tenantID, appID, userID,
	); err != nil {
		return nil, err
	}
	for _, tag := range normalized {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO cs_customer_tag (tenant_id, app_id, user_id, tag_name, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?)
			ON DUPLICATE KEY UPDATE deleted_at = NULL, updated_at = VALUES(updated_at)`,
			tenantID, appID, userID, tag, now, now,
		); err != nil {
			return nil, err
		}
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return normalized, nil
}

func (s *MySQLStore) UpdateSession(ctx context.Context, session domain.Session) error {
	result, err := s.db.ExecContext(ctx, `
		UPDATE cs_session
		SET agent_id = ?, group_id = ?, status = ?, priority = ?, last_seq = ?,
			last_msg_time = ?, updated_at = ?
		WHERE tenant_id = ? AND session_id = ? AND deleted_at IS NULL`,
		session.AgentID, session.GroupID, session.Status, session.Priority, session.LastSeq,
		nullableTime(session.LastMsgTime), time.Now(), session.TenantID, session.ID,
	)
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

func (s *MySQLStore) SaveMessage(ctx context.Context, message domain.Message) (domain.Message, error) {
	tx, err := s.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelReadCommitted})
	if err != nil {
		return domain.Message{}, err
	}
	defer tx.Rollback()

	existing, ok, err := getMessageByClientID(ctx, tx, message.TenantID, message.SessionID, message.ClientMsgID)
	if err != nil {
		return domain.Message{}, err
	}
	if ok {
		return existing, tx.Commit()
	}

	session, err := getSessionForUpdate(ctx, tx, message.TenantID, message.SessionID)
	if err != nil {
		return domain.Message{}, err
	}
	if message.SenderType == domain.UserTypeAgent {
		if session.AgentID == "" {
			session.AgentID = message.SenderID
		}
		if session.Status == domain.SessionWaiting || session.Status == domain.SessionTransferring {
			session.Status = domain.SessionServing
		}
	}

	now := time.Now()
	if message.ID == "" {
		message.ID = uuid.NewString()
	}
	if message.ClientMsgID == "" {
		message.ClientMsgID = uuid.NewString()
	}
	if message.MsgType == "" {
		message.MsgType = "text"
	}
	message.AppID = session.AppID
	message.ChannelID = session.ChannelID
	message.Seq = session.LastSeq + 1
	message.Status = domain.MessageSent
	message.SendTime = now

	_, err = tx.ExecContext(ctx, `
		INSERT INTO cs_message (
			tenant_id, app_id, channel_id, msg_id, session_id, client_msg_id,
			sender_id, sender_type, receiver_id, msg_type, content, seq, status, send_time
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		message.TenantID, message.AppID, message.ChannelID, message.ID, message.SessionID,
		message.ClientMsgID, message.SenderID, message.SenderType, message.ReceiverID,
		message.MsgType, message.Content, message.Seq, message.Status, message.SendTime,
	)
	if err != nil {
		if isDuplicate(err) {
			existing, ok, findErr := getMessageByClientID(ctx, tx, message.TenantID, message.SessionID, message.ClientMsgID)
			if findErr != nil {
				return domain.Message{}, findErr
			}
			if ok {
				return existing, tx.Commit()
			}
		}
		return domain.Message{}, err
	}

	_, err = tx.ExecContext(ctx, `
		UPDATE cs_session
		SET agent_id = ?, status = ?, last_seq = ?, last_msg_time = ?, updated_at = ?
		WHERE tenant_id = ? AND session_id = ?`,
		session.AgentID, session.Status, message.Seq, now, now, message.TenantID, message.SessionID,
	)
	if err != nil {
		return domain.Message{}, err
	}

	payload, err := json.Marshal(message)
	if err != nil {
		return domain.Message{}, err
	}
	_, err = tx.ExecContext(ctx, `
		INSERT INTO cs_outbox (
			tenant_id, aggregate_type, aggregate_id, event_type, payload,
			status, retry_count, next_retry_time, created_at, updated_at
		) VALUES (?, 'message', ?, 'message.created', ?, 'pending', 0, ?, ?, ?)`,
		message.TenantID, message.ID, payload, now, now, now,
	)
	if err != nil {
		return domain.Message{}, err
	}

	return message, tx.Commit()
}

func (s *MySQLStore) ListMessagesAfterSeq(ctx context.Context, tenantID, sessionID string, afterSeq int64, limit int) ([]domain.Message, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	rows, err := s.db.QueryContext(ctx, `
		SELECT tenant_id, app_id, channel_id, msg_id, session_id, client_msg_id,
			sender_id, sender_type, receiver_id, msg_type, content, seq, status, send_time
		FROM cs_message
		WHERE tenant_id = ? AND session_id = ? AND seq > ? AND deleted_at IS NULL
		ORDER BY seq ASC
		LIMIT ?`,
		tenantID, sessionID, afterSeq, limit,
	)
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

func (s *MySQLStore) ListPendingOutbox(ctx context.Context, limit int) ([]domain.OutboxEvent, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, tenant_id, aggregate_type, aggregate_id, event_type, payload,
			status, retry_count, COALESCE(next_retry_time, created_at), created_at, updated_at
		FROM cs_outbox
		WHERE status IN ('pending', 'retry') AND (next_retry_time IS NULL OR next_retry_time <= NOW())
		ORDER BY id ASC
		LIMIT ?`,
		limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []domain.OutboxEvent
	for rows.Next() {
		var dbID int64
		var event domain.OutboxEvent
		if err := rows.Scan(
			&dbID, &event.TenantID, &event.AggregateType, &event.AggregateID,
			&event.EventType, &event.Payload, &event.Status, &event.RetryCount,
			&event.NextRetryTime, &event.CreatedAt, &event.UpdatedAt,
		); err != nil {
			return nil, err
		}
		event.ID = strconv.FormatInt(dbID, 10)
		events = append(events, event)
	}
	return events, rows.Err()
}

func (s *MySQLStore) MarkOutboxSent(ctx context.Context, id string) error {
	_, err := s.db.ExecContext(ctx, `
		UPDATE cs_outbox
		SET status = 'sent', updated_at = NOW()
		WHERE id = ?`,
		id,
	)
	return err
}

func (s *MySQLStore) MarkOutboxRetry(ctx context.Context, id string, nextRetry time.Time, reason string) error {
	_, err := s.db.ExecContext(ctx, `
		UPDATE cs_outbox
		SET status = 'retry', retry_count = retry_count + 1, next_retry_time = ?, updated_at = NOW()
		WHERE id = ?`,
		nextRetry, id,
	)
	_ = reason
	return err
}

func getSessionForUpdate(ctx context.Context, tx *sql.Tx, tenantID, sessionID string) (domain.Session, error) {
	var session domain.Session
	var lastMsgTime sql.NullTime
	err := tx.QueryRowContext(ctx, `
		SELECT tenant_id, app_id, session_id, channel_id, user_id, agent_id,
			group_id, status, priority, last_seq, last_msg_time
		FROM cs_session
		WHERE tenant_id = ? AND session_id = ? AND deleted_at IS NULL
		FOR UPDATE`,
		tenantID, sessionID,
	).Scan(
		&session.TenantID, &session.AppID, &session.ID, &session.ChannelID, &session.UserID,
		&session.AgentID, &session.GroupID, &session.Status, &session.Priority,
		&session.LastSeq, &lastMsgTime,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return domain.Session{}, ErrNotFound
	}
	if err != nil {
		return domain.Session{}, err
	}
	if lastMsgTime.Valid {
		session.LastMsgTime = lastMsgTime.Time
	}
	return session, nil
}

func getMessageByClientID(ctx context.Context, tx *sql.Tx, tenantID, sessionID, clientMsgID string) (domain.Message, bool, error) {
	if clientMsgID == "" {
		return domain.Message{}, false, nil
	}
	var message domain.Message
	err := tx.QueryRowContext(ctx, `
		SELECT tenant_id, app_id, channel_id, msg_id, session_id, client_msg_id,
			sender_id, sender_type, receiver_id, msg_type, content, seq, status, send_time
		FROM cs_message
		WHERE tenant_id = ? AND session_id = ? AND client_msg_id = ? AND deleted_at IS NULL`,
		tenantID, sessionID, clientMsgID,
	).Scan(
		&message.TenantID, &message.AppID, &message.ChannelID, &message.ID, &message.SessionID,
		&message.ClientMsgID, &message.SenderID, &message.SenderType, &message.ReceiverID,
		&message.MsgType, &message.Content, &message.Seq, &message.Status, &message.SendTime,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return domain.Message{}, false, nil
	}
	if err != nil {
		return domain.Message{}, false, err
	}
	return message, true, nil
}

func nullableTime(t time.Time) any {
	if t.IsZero() {
		return nil
	}
	return t
}

func isDuplicate(err error) bool {
	var mysqlErr *mysql.MySQLError
	return errors.As(err, &mysqlErr) && mysqlErr.Number == 1062
}
