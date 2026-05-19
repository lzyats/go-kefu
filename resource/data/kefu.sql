SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;
SET collation_connection = 'utf8mb4_0900_ai_ci';
SET FOREIGN_KEY_CHECKS = 0;

-- 客服系统数据库结构与后台菜单汇总
-- 由 migrations 目录内的客服 SQL 合并生成，便于 GFast 初始化时统一导入。

-- ============================================================
-- Source: 001_init.sql
-- ============================================================
CREATE TABLE IF NOT EXISTS cs_tenant (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'enabled',
  agent_limit INT NOT NULL DEFAULT 3,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS cs_agent_group_rel (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id VARCHAR(64) NOT NULL,
  agent_id VARCHAR(64) NOT NULL,
  group_id VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_tenant_agent_group (tenant_id, agent_id, group_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================
-- Source: 002_admin_extensions.sql
-- ============================================================
CREATE TABLE IF NOT EXISTS cs_sensitive_word (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id VARCHAR(64) NOT NULL,
  word VARCHAR(128) NOT NULL,
  level VARCHAR(32) NOT NULL DEFAULT 'medium',
  action VARCHAR(32) NOT NULL DEFAULT 'review',
  status VARCHAR(32) NOT NULL DEFAULT 'enabled',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  UNIQUE KEY uk_tenant_word (tenant_id, word),
  KEY idx_tenant_status (tenant_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS cs_blacklist (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id VARCHAR(64) NOT NULL,
  target_type VARCHAR(32) NOT NULL,
  target_value VARCHAR(128) NOT NULL,
  reason VARCHAR(255) NOT NULL DEFAULT '',
  status VARCHAR(32) NOT NULL DEFAULT 'enabled',
  expire_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  UNIQUE KEY uk_tenant_target (tenant_id, target_type, target_value),
  KEY idx_tenant_status (tenant_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS cs_risk_event (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id VARCHAR(64) NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  target_type VARCHAR(32) NOT NULL,
  target_value VARCHAR(128) NOT NULL,
  level VARCHAR(32) NOT NULL DEFAULT 'medium',
  description VARCHAR(512) NOT NULL DEFAULT '',
  status VARCHAR(32) NOT NULL DEFAULT 'open',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_tenant_created (tenant_id, created_at),
  KEY idx_tenant_status (tenant_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS cs_config (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id VARCHAR(64) NOT NULL,
  config_key VARCHAR(128) NOT NULL,
  config_value TEXT NOT NULL,
  value_type VARCHAR(32) NOT NULL DEFAULT 'string',
  remark VARCHAR(255) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  UNIQUE KEY uk_tenant_config (tenant_id, config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS cs_faq (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  tenant_id VARCHAR(64) NOT NULL DEFAULT '' COMMENT '租户ID，通用库使用__common__',
  faq_id VARCHAR(64) NOT NULL COMMENT '常见问题ID',
  question VARCHAR(255) NOT NULL COMMENT '问题简述',
  answer TEXT NOT NULL COMMENT '答案内容',
  is_common TINYINT NOT NULL DEFAULT 0 COMMENT '是否通用库：0否，1是',
  status VARCHAR(32) NOT NULL DEFAULT 'enabled' COMMENT '状态：enabled启用，disabled禁用',
  sort INT NOT NULL DEFAULT 0 COMMENT '排序值，越大越靠前',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at DATETIME NULL COMMENT '删除时间，空表示未删除',
  UNIQUE KEY uk_tenant_faq (tenant_id, faq_id),
  KEY idx_tenant_status_sort (tenant_id, status, sort),
  KEY idx_common_status_sort (is_common, status, sort)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='客服常见问题表';

-- ============================================================
-- Source: 003_channel_default_group.sql
-- ============================================================
SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cs_channel'
    AND COLUMN_NAME = 'default_group_id'
);

SET @sql := IF(
  @column_exists = 0,
  'ALTER TABLE cs_channel ADD COLUMN default_group_id VARCHAR(64) NOT NULL DEFAULT '''' COMMENT ''默认坐席组ID，用于渠道进线时默认分配'' AFTER secret',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cs_channel'
    AND INDEX_NAME = 'idx_tenant_app_group'
);

SET @sql := IF(
  @index_exists = 0,
  'ALTER TABLE cs_channel ADD KEY idx_tenant_app_group (tenant_id, app_id, default_group_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================
-- Source: 004_table_comments.sql
-- ============================================================
SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;
SET collation_connection = 'utf8mb4_0900_ai_ci';

ALTER TABLE cs_tenant COMMENT = '租户表';

-- ============================================================
-- Source: 009_tenant_agent_limit.sql
-- ============================================================
SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cs_tenant'
    AND COLUMN_NAME = 'agent_limit'
);
SET @sql := IF(
  @column_exists = 0,
  'ALTER TABLE cs_tenant ADD COLUMN agent_limit INT NOT NULL DEFAULT 3 COMMENT ''租户可自助创建坐席数量上限'' AFTER status',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE cs_tenant COMMENT = '租户表';
ALTER TABLE cs_tenant
  MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  MODIFY COLUMN tenant_id VARCHAR(64) NOT NULL COMMENT '租户ID',
  MODIFY COLUMN name VARCHAR(128) NOT NULL COMMENT '租户名称',
  MODIFY COLUMN status VARCHAR(32) NOT NULL DEFAULT 'enabled' COMMENT '租户状态：enabled启用，disabled禁用',
  MODIFY COLUMN agent_limit INT NOT NULL DEFAULT 3 COMMENT '租户可自助创建坐席数量上限',
  MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  MODIFY COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  MODIFY COLUMN deleted_at DATETIME NULL COMMENT '删除时间，空表示未删除';

ALTER TABLE cs_channel COMMENT = '渠道表';
ALTER TABLE cs_channel
  MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  MODIFY COLUMN tenant_id VARCHAR(64) NOT NULL COMMENT '租户ID',
  MODIFY COLUMN app_id VARCHAR(64) NOT NULL DEFAULT 'default' COMMENT '应用ID',
  MODIFY COLUMN channel_type VARCHAR(32) NOT NULL COMMENT '渠道类型：web、h5、app、wechat等',
  MODIFY COLUMN channel_name VARCHAR(128) NOT NULL COMMENT '渠道名称',
  MODIFY COLUMN app_key VARCHAR(128) NOT NULL COMMENT '渠道接入Key',
  MODIFY COLUMN secret VARCHAR(255) NOT NULL COMMENT '渠道接入密钥',
  MODIFY COLUMN default_group_id VARCHAR(64) NOT NULL DEFAULT '' COMMENT '默认坐席组ID，用于渠道进线时默认分配',
  MODIFY COLUMN status VARCHAR(32) NOT NULL DEFAULT 'enabled' COMMENT '渠道状态：enabled启用，disabled禁用',
  MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  MODIFY COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  MODIFY COLUMN deleted_at DATETIME NULL COMMENT '删除时间，空表示未删除';

ALTER TABLE cs_user COMMENT = '客户用户表';
ALTER TABLE cs_user
  MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  MODIFY COLUMN tenant_id VARCHAR(64) NOT NULL COMMENT '租户ID',
  MODIFY COLUMN app_id VARCHAR(64) NOT NULL DEFAULT 'default' COMMENT '应用ID',
  MODIFY COLUMN user_id VARCHAR(64) NOT NULL COMMENT '客户用户ID',
  MODIFY COLUMN nickname VARCHAR(128) NOT NULL DEFAULT '' COMMENT '客户昵称',
  MODIFY COLUMN avatar VARCHAR(512) NOT NULL DEFAULT '' COMMENT '客户头像地址',
  MODIFY COLUMN phone VARCHAR(32) NOT NULL DEFAULT '' COMMENT '客户手机号',
  MODIFY COLUMN email VARCHAR(128) NOT NULL DEFAULT '' COMMENT '客户邮箱',
  MODIFY COLUMN level VARCHAR(32) NOT NULL DEFAULT 'normal' COMMENT '客户等级：normal普通，vip贵宾等',
  MODIFY COLUMN status VARCHAR(32) NOT NULL DEFAULT 'enabled' COMMENT '客户状态：enabled启用，disabled禁用',
  MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  MODIFY COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  MODIFY COLUMN deleted_at DATETIME NULL COMMENT '删除时间，空表示未删除';

ALTER TABLE cs_agent COMMENT = '客服坐席表';
ALTER TABLE cs_agent
  MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  MODIFY COLUMN tenant_id VARCHAR(64) NOT NULL COMMENT '租户ID',
  MODIFY COLUMN agent_id VARCHAR(64) NOT NULL COMMENT '坐席ID',
  MODIFY COLUMN username VARCHAR(128) NOT NULL COMMENT '坐席登录账号',
  MODIFY COLUMN display_name VARCHAR(128) NOT NULL COMMENT '坐席显示名称',
  MODIFY COLUMN max_sessions INT NOT NULL DEFAULT 5 COMMENT '最大同时接待会话数',
  MODIFY COLUMN status VARCHAR(32) NOT NULL DEFAULT 'enabled' COMMENT '坐席状态：enabled启用，disabled禁用',
  MODIFY COLUMN online_status VARCHAR(32) NOT NULL DEFAULT 'offline' COMMENT '在线状态：online在线，offline离线，busy忙碌',
  MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  MODIFY COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  MODIFY COLUMN deleted_at DATETIME NULL COMMENT '删除时间，空表示未删除';

ALTER TABLE cs_agent_group COMMENT = '客服坐席组表';
ALTER TABLE cs_agent_group
  MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  MODIFY COLUMN tenant_id VARCHAR(64) NOT NULL COMMENT '租户ID',
  MODIFY COLUMN group_id VARCHAR(64) NOT NULL COMMENT '坐席组ID',
  MODIFY COLUMN name VARCHAR(128) NOT NULL COMMENT '坐席组名称',
  MODIFY COLUMN status VARCHAR(32) NOT NULL DEFAULT 'enabled' COMMENT '坐席组状态：enabled启用，disabled禁用',
  MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  MODIFY COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  MODIFY COLUMN deleted_at DATETIME NULL COMMENT '删除时间，空表示未删除';

ALTER TABLE cs_agent_group_rel COMMENT = '坐席与坐席组关系表';
ALTER TABLE cs_agent_group_rel
  MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  MODIFY COLUMN tenant_id VARCHAR(64) NOT NULL COMMENT '租户ID',
  MODIFY COLUMN agent_id VARCHAR(64) NOT NULL COMMENT '坐席ID',
  MODIFY COLUMN group_id VARCHAR(64) NOT NULL COMMENT '坐席组ID',
  MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间';

ALTER TABLE cs_session COMMENT = '客服会话表';
ALTER TABLE cs_session
  MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  MODIFY COLUMN tenant_id VARCHAR(64) NOT NULL COMMENT '租户ID',
  MODIFY COLUMN app_id VARCHAR(64) NOT NULL DEFAULT 'default' COMMENT '应用ID',
  MODIFY COLUMN session_id VARCHAR(64) NOT NULL COMMENT '会话ID',
  MODIFY COLUMN channel_id VARCHAR(64) NOT NULL DEFAULT '' COMMENT '渠道ID或渠道接入Key',
  MODIFY COLUMN user_id VARCHAR(64) NOT NULL COMMENT '客户用户ID',
  MODIFY COLUMN agent_id VARCHAR(64) NOT NULL DEFAULT '' COMMENT '当前分配坐席ID',
  MODIFY COLUMN group_id VARCHAR(64) NOT NULL DEFAULT '' COMMENT '当前分配坐席组ID',
  MODIFY COLUMN status VARCHAR(32) NOT NULL COMMENT '会话状态：waiting等待中，serving服务中，closed已关闭等',
  MODIFY COLUMN priority INT NOT NULL DEFAULT 0 COMMENT '会话优先级，数值越大优先级越高',
  MODIFY COLUMN last_seq BIGINT NOT NULL DEFAULT 0 COMMENT '会话最新消息序号',
  MODIFY COLUMN user_read_seq BIGINT NOT NULL DEFAULT 0 COMMENT '客户已读消息序号',
  MODIFY COLUMN agent_read_seq BIGINT NOT NULL DEFAULT 0 COMMENT '坐席已读消息序号',
  MODIFY COLUMN last_msg_time DATETIME NULL COMMENT '最后消息时间',
  MODIFY COLUMN source_ip VARCHAR(64) NOT NULL DEFAULT '' COMMENT '客户来源IP',
  MODIFY COLUMN user_agent VARCHAR(512) NOT NULL DEFAULT '' COMMENT '客户浏览器或客户端标识',
  MODIFY COLUMN login_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '客户进入会话时间',
  MODIFY COLUMN close_time DATETIME NULL COMMENT '会话关闭时间',
  MODIFY COLUMN close_reason VARCHAR(255) NOT NULL DEFAULT '' COMMENT '会话关闭原因',
  MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  MODIFY COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  MODIFY COLUMN deleted_at DATETIME NULL COMMENT '删除时间，空表示未删除';

ALTER TABLE cs_message COMMENT = '聊天消息表';
ALTER TABLE cs_message
  MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  MODIFY COLUMN tenant_id VARCHAR(64) NOT NULL COMMENT '租户ID',
  MODIFY COLUMN app_id VARCHAR(64) NOT NULL DEFAULT 'default' COMMENT '应用ID',
  MODIFY COLUMN channel_id VARCHAR(64) NOT NULL DEFAULT '' COMMENT '渠道ID或渠道接入Key',
  MODIFY COLUMN msg_id VARCHAR(64) NOT NULL COMMENT '消息ID',
  MODIFY COLUMN session_id VARCHAR(64) NOT NULL COMMENT '会话ID',
  MODIFY COLUMN client_msg_id VARCHAR(128) NOT NULL COMMENT '客户端消息ID，用于幂等去重',
  MODIFY COLUMN sender_id VARCHAR(64) NOT NULL COMMENT '发送方ID',
  MODIFY COLUMN sender_type VARCHAR(32) NOT NULL COMMENT '发送方类型：customer客户，agent坐席，system系统',
  MODIFY COLUMN receiver_id VARCHAR(64) NOT NULL DEFAULT '' COMMENT '接收方ID',
  MODIFY COLUMN msg_type VARCHAR(32) NOT NULL DEFAULT 'text' COMMENT '消息类型：text文本，image图片，file文件等',
  MODIFY COLUMN content TEXT NOT NULL COMMENT '消息内容，文本内容或结构化JSON字符串',
  MODIFY COLUMN seq BIGINT NOT NULL COMMENT '会话内递增消息序号',
  MODIFY COLUMN status VARCHAR(32) NOT NULL DEFAULT 'sent' COMMENT '消息状态：sending发送中，sent已发送，read已读，failed失败等',
  MODIFY COLUMN send_time DATETIME NOT NULL COMMENT '消息发送时间',
  MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  MODIFY COLUMN deleted_at DATETIME NULL COMMENT '删除时间，空表示未删除';

ALTER TABLE cs_outbox COMMENT = '消息事务发件箱表';
ALTER TABLE cs_outbox
  MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  MODIFY COLUMN tenant_id VARCHAR(64) NOT NULL COMMENT '租户ID',
  MODIFY COLUMN aggregate_type VARCHAR(64) NOT NULL COMMENT '聚合类型，如message、session',
  MODIFY COLUMN aggregate_id VARCHAR(64) NOT NULL COMMENT '聚合ID',
  MODIFY COLUMN event_type VARCHAR(64) NOT NULL COMMENT '事件类型',
  MODIFY COLUMN payload JSON NOT NULL COMMENT '事件载荷JSON',
  MODIFY COLUMN status VARCHAR(32) NOT NULL DEFAULT 'pending' COMMENT '投递状态：pending待投递，sent已投递，failed失败',
  MODIFY COLUMN retry_count INT NOT NULL DEFAULT 0 COMMENT '重试次数',
  MODIFY COLUMN next_retry_time DATETIME NULL COMMENT '下次重试时间',
  MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  MODIFY COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间';

ALTER TABLE cs_audit_log COMMENT = '审计日志表';
ALTER TABLE cs_audit_log
  MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  MODIFY COLUMN tenant_id VARCHAR(64) NOT NULL COMMENT '租户ID',
  MODIFY COLUMN operator_id VARCHAR(64) NOT NULL COMMENT '操作人ID',
  MODIFY COLUMN operator_type VARCHAR(32) NOT NULL COMMENT '操作人类型：admin管理员，agent坐席，system系统',
  MODIFY COLUMN action VARCHAR(64) NOT NULL COMMENT '操作动作',
  MODIFY COLUMN resource_type VARCHAR(64) NOT NULL COMMENT '资源类型',
  MODIFY COLUMN resource_id VARCHAR(64) NOT NULL COMMENT '资源ID',
  MODIFY COLUMN ip VARCHAR(64) NOT NULL DEFAULT '' COMMENT '操作来源IP',
  MODIFY COLUMN user_agent VARCHAR(512) NOT NULL DEFAULT '' COMMENT '浏览器或客户端标识',
  MODIFY COLUMN detail JSON NULL COMMENT '操作详情JSON',
  MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间';

ALTER TABLE cs_sensitive_word COMMENT = '敏感词表';
ALTER TABLE cs_sensitive_word
  MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  MODIFY COLUMN tenant_id VARCHAR(64) NOT NULL COMMENT '租户ID',
  MODIFY COLUMN word VARCHAR(128) NOT NULL COMMENT '敏感词内容',
  MODIFY COLUMN level VARCHAR(32) NOT NULL DEFAULT 'medium' COMMENT '风险等级：low低，medium中，high高',
  MODIFY COLUMN action VARCHAR(32) NOT NULL DEFAULT 'review' COMMENT '处理动作：review审核，block拦截，replace替换',
  MODIFY COLUMN status VARCHAR(32) NOT NULL DEFAULT 'enabled' COMMENT '状态：enabled启用，disabled禁用',
  MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  MODIFY COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  MODIFY COLUMN deleted_at DATETIME NULL COMMENT '删除时间，空表示未删除';

ALTER TABLE cs_blacklist COMMENT = '风控黑名单表';
ALTER TABLE cs_blacklist
  MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  MODIFY COLUMN tenant_id VARCHAR(64) NOT NULL COMMENT '租户ID',
  MODIFY COLUMN target_type VARCHAR(32) NOT NULL COMMENT '黑名单对象类型：user客户，ip地址，phone手机号等',
  MODIFY COLUMN target_value VARCHAR(128) NOT NULL COMMENT '黑名单对象值',
  MODIFY COLUMN reason VARCHAR(255) NOT NULL DEFAULT '' COMMENT '加入黑名单原因',
  MODIFY COLUMN status VARCHAR(32) NOT NULL DEFAULT 'enabled' COMMENT '状态：enabled启用，disabled禁用',
  MODIFY COLUMN expire_at DATETIME NULL COMMENT '过期时间，空表示长期有效',
  MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  MODIFY COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  MODIFY COLUMN deleted_at DATETIME NULL COMMENT '删除时间，空表示未删除';

ALTER TABLE cs_risk_event COMMENT = '风控事件表';
ALTER TABLE cs_risk_event
  MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  MODIFY COLUMN tenant_id VARCHAR(64) NOT NULL COMMENT '租户ID',
  MODIFY COLUMN event_type VARCHAR(64) NOT NULL COMMENT '事件类型',
  MODIFY COLUMN target_type VARCHAR(32) NOT NULL COMMENT '风控对象类型：user客户，ip地址，message消息等',
  MODIFY COLUMN target_value VARCHAR(128) NOT NULL COMMENT '风控对象值',
  MODIFY COLUMN level VARCHAR(32) NOT NULL DEFAULT 'medium' COMMENT '风险等级：low低，medium中，high高',
  MODIFY COLUMN description VARCHAR(512) NOT NULL DEFAULT '' COMMENT '事件描述',
  MODIFY COLUMN status VARCHAR(32) NOT NULL DEFAULT 'open' COMMENT '处理状态：open待处理，processing处理中，closed已关闭',
  MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间';

ALTER TABLE cs_config COMMENT = '租户系统配置表';
ALTER TABLE cs_config
  MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  MODIFY COLUMN tenant_id VARCHAR(64) NOT NULL COMMENT '租户ID',
  MODIFY COLUMN config_key VARCHAR(128) NOT NULL COMMENT '配置键',
  MODIFY COLUMN config_value TEXT NOT NULL COMMENT '配置值',
  MODIFY COLUMN value_type VARCHAR(32) NOT NULL DEFAULT 'string' COMMENT '配置值类型：string字符串，number数字，bool布尔，json对象',
  MODIFY COLUMN remark VARCHAR(255) NOT NULL DEFAULT '' COMMENT '配置说明',
  MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  MODIFY COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  MODIFY COLUMN deleted_at DATETIME NULL COMMENT '删除时间，空表示未删除';

-- ============================================================
-- Source: 005_tenant_admin.sql
-- ============================================================
CREATE TABLE IF NOT EXISTS cs_tenant_admin (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '自增主键',
  tenant_id VARCHAR(64) NOT NULL COMMENT '租户ID',
  gfast_user_id BIGINT NOT NULL COMMENT 'GFast后台用户ID',
  gfast_username VARCHAR(128) NOT NULL DEFAULT '' COMMENT 'GFast后台用户名或昵称',
  role_type VARCHAR(32) NOT NULL DEFAULT 'tenant_admin' COMMENT '租户内角色：tenant_admin租户管理员，operator运营人员',
  status VARCHAR(32) NOT NULL DEFAULT 'enabled' COMMENT '状态：enabled启用，disabled禁用',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at DATETIME NULL COMMENT '删除时间，空表示未删除',
  UNIQUE KEY uk_tenant_user (tenant_id, gfast_user_id),
  KEY idx_user (gfast_user_id),
  KEY idx_tenant_status (tenant_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='租户后台用户绑定表';

-- ============================================================
-- Source: 006_session_client_meta.sql
-- ============================================================
SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cs_session'
    AND COLUMN_NAME = 'source_ip'
);

SET @sql := IF(
  @column_exists = 0,
  'ALTER TABLE cs_session ADD COLUMN source_ip VARCHAR(64) NOT NULL DEFAULT '''' COMMENT ''客户来源IP'' AFTER last_msg_time',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cs_session'
    AND COLUMN_NAME = 'user_agent'
);

SET @sql := IF(
  @column_exists = 0,
  'ALTER TABLE cs_session ADD COLUMN user_agent VARCHAR(512) NOT NULL DEFAULT '''' COMMENT ''客户浏览器或客户端标识'' AFTER source_ip',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cs_session'
    AND COLUMN_NAME = 'login_time'
);

SET @sql := IF(
  @column_exists = 0,
  'ALTER TABLE cs_session ADD COLUMN login_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT ''客户进入会话时间'' AFTER user_agent',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE cs_session
SET login_time = created_at
WHERE login_time IS NULL;

-- ============================================================
-- Source: 007_agent_user_binding.sql
-- ============================================================
SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cs_agent'
    AND COLUMN_NAME = 'gfast_user_id'
);

SET @sql := IF(
  @column_exists = 0,
  'ALTER TABLE cs_agent ADD COLUMN gfast_user_id BIGINT NOT NULL DEFAULT 0 COMMENT ''绑定的GFast用户ID，0表示未绑定'' AFTER agent_id',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cs_agent'
    AND INDEX_NAME = 'idx_tenant_gfast_user'
);

SET @sql := IF(
  @index_exists = 0,
  'ALTER TABLE cs_agent ADD KEY idx_tenant_gfast_user (tenant_id, gfast_user_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================
-- Source: 008_sys_user_user_type.sql
-- ============================================================
SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'sys_user'
    AND COLUMN_NAME = 'user_type'
);

SET @sql := IF(
  @column_exists = 0,
  'ALTER TABLE sys_user ADD COLUMN user_type TINYINT NOT NULL DEFAULT 1 COMMENT ''用户类型：0客户用户，1租户管理员，2客服坐席'' AFTER is_admin',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET FOREIGN_KEY_CHECKS = 1;
