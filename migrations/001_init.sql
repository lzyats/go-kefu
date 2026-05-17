CREATE TABLE IF NOT EXISTS cs_tenant (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'enabled',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cs_channel (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id VARCHAR(64) NOT NULL,
  app_id VARCHAR(64) NOT NULL DEFAULT 'default',
  channel_type VARCHAR(32) NOT NULL,
  channel_name VARCHAR(128) NOT NULL,
  app_key VARCHAR(128) NOT NULL,
  secret VARCHAR(255) NOT NULL,
  default_group_id VARCHAR(64) NOT NULL DEFAULT '',
  status VARCHAR(32) NOT NULL DEFAULT 'enabled',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  UNIQUE KEY uk_tenant_app_key (tenant_id, app_key),
  KEY idx_tenant_channel (tenant_id, channel_type),
  KEY idx_tenant_app_group (tenant_id, app_id, default_group_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cs_user (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id VARCHAR(64) NOT NULL,
  app_id VARCHAR(64) NOT NULL DEFAULT 'default',
  user_id VARCHAR(64) NOT NULL,
  nickname VARCHAR(128) NOT NULL DEFAULT '',
  avatar VARCHAR(512) NOT NULL DEFAULT '',
  phone VARCHAR(32) NOT NULL DEFAULT '',
  email VARCHAR(128) NOT NULL DEFAULT '',
  level VARCHAR(32) NOT NULL DEFAULT 'normal',
  status VARCHAR(32) NOT NULL DEFAULT 'enabled',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  UNIQUE KEY uk_tenant_user (tenant_id, app_id, user_id),
  KEY idx_tenant_phone (tenant_id, phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cs_agent (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id VARCHAR(64) NOT NULL,
  agent_id VARCHAR(64) NOT NULL,
  username VARCHAR(128) NOT NULL,
  display_name VARCHAR(128) NOT NULL,
  max_sessions INT NOT NULL DEFAULT 5,
  status VARCHAR(32) NOT NULL DEFAULT 'enabled',
  online_status VARCHAR(32) NOT NULL DEFAULT 'offline',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  UNIQUE KEY uk_tenant_agent (tenant_id, agent_id),
  KEY idx_tenant_online (tenant_id, online_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cs_agent_group (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id VARCHAR(64) NOT NULL,
  group_id VARCHAR(64) NOT NULL,
  name VARCHAR(128) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'enabled',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  UNIQUE KEY uk_tenant_group (tenant_id, group_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cs_agent_group_rel (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id VARCHAR(64) NOT NULL,
  agent_id VARCHAR(64) NOT NULL,
  group_id VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_tenant_agent_group (tenant_id, agent_id, group_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cs_session (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id VARCHAR(64) NOT NULL,
  app_id VARCHAR(64) NOT NULL DEFAULT 'default',
  session_id VARCHAR(64) NOT NULL,
  channel_id VARCHAR(64) NOT NULL DEFAULT '',
  user_id VARCHAR(64) NOT NULL,
  agent_id VARCHAR(64) NOT NULL DEFAULT '',
  group_id VARCHAR(64) NOT NULL DEFAULT '',
  status VARCHAR(32) NOT NULL,
  priority INT NOT NULL DEFAULT 0,
  last_seq BIGINT NOT NULL DEFAULT 0,
  user_read_seq BIGINT NOT NULL DEFAULT 0,
  agent_read_seq BIGINT NOT NULL DEFAULT 0,
  last_msg_time DATETIME NULL,
  source_ip VARCHAR(64) NOT NULL DEFAULT '',
  user_agent VARCHAR(512) NOT NULL DEFAULT '',
  login_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  close_time DATETIME NULL,
  close_reason VARCHAR(255) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  UNIQUE KEY uk_tenant_session (tenant_id, session_id),
  KEY idx_tenant_user_status (tenant_id, user_id, status),
  KEY idx_tenant_agent_status (tenant_id, agent_id, status),
  KEY idx_tenant_last_msg (tenant_id, last_msg_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cs_message (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id VARCHAR(64) NOT NULL,
  app_id VARCHAR(64) NOT NULL DEFAULT 'default',
  channel_id VARCHAR(64) NOT NULL DEFAULT '',
  msg_id VARCHAR(64) NOT NULL,
  session_id VARCHAR(64) NOT NULL,
  client_msg_id VARCHAR(128) NOT NULL,
  sender_id VARCHAR(64) NOT NULL,
  sender_type VARCHAR(32) NOT NULL,
  receiver_id VARCHAR(64) NOT NULL DEFAULT '',
  msg_type VARCHAR(32) NOT NULL DEFAULT 'text',
  content TEXT NOT NULL,
  seq BIGINT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'sent',
  send_time DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  UNIQUE KEY uk_tenant_msg (tenant_id, msg_id),
  UNIQUE KEY uk_tenant_client_msg (tenant_id, session_id, client_msg_id),
  UNIQUE KEY uk_tenant_session_seq (tenant_id, session_id, seq),
  KEY idx_tenant_session_time (tenant_id, session_id, send_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cs_outbox (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id VARCHAR(64) NOT NULL,
  aggregate_type VARCHAR(64) NOT NULL,
  aggregate_id VARCHAR(64) NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  payload JSON NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  retry_count INT NOT NULL DEFAULT 0,
  next_retry_time DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_status_retry (status, next_retry_time),
  KEY idx_tenant_aggregate (tenant_id, aggregate_type, aggregate_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cs_audit_log (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id VARCHAR(64) NOT NULL,
  operator_id VARCHAR(64) NOT NULL,
  operator_type VARCHAR(32) NOT NULL,
  action VARCHAR(64) NOT NULL,
  resource_type VARCHAR(64) NOT NULL,
  resource_id VARCHAR(64) NOT NULL,
  ip VARCHAR(64) NOT NULL DEFAULT '',
  user_agent VARCHAR(512) NOT NULL DEFAULT '',
  detail JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_tenant_operator (tenant_id, operator_id, created_at),
  KEY idx_tenant_resource (tenant_id, resource_type, resource_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
