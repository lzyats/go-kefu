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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
  'ALTER TABLE cs_channel ADD COLUMN default_group_id VARCHAR(64) NOT NULL DEFAULT '''' COMMENT ''榛樿鍧愬腑缁処D锛岀敤浜庢笭閬撹繘绾挎椂榛樿鍒嗛厤'' AFTER secret',
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
ALTER TABLE cs_tenant COMMENT = '绉熸埛琛?;
ALTER TABLE cs_tenant
  MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '鑷涓婚敭',
  MODIFY COLUMN tenant_id VARCHAR(64) NOT NULL COMMENT '绉熸埛ID',
  MODIFY COLUMN name VARCHAR(128) NOT NULL COMMENT '绉熸埛鍚嶇О',
  MODIFY COLUMN status VARCHAR(32) NOT NULL DEFAULT 'enabled' COMMENT '绉熸埛鐘舵€侊細enabled鍚敤锛宒isabled绂佺敤',
  MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '鍒涘缓鏃堕棿',
  MODIFY COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '鏇存柊鏃堕棿',
  MODIFY COLUMN deleted_at DATETIME NULL COMMENT '鍒犻櫎鏃堕棿锛岀┖琛ㄧず鏈垹闄?;

ALTER TABLE cs_channel COMMENT = '娓犻亾琛?;
ALTER TABLE cs_channel
  MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '鑷涓婚敭',
  MODIFY COLUMN tenant_id VARCHAR(64) NOT NULL COMMENT '绉熸埛ID',
  MODIFY COLUMN app_id VARCHAR(64) NOT NULL DEFAULT 'default' COMMENT '搴旂敤ID',
  MODIFY COLUMN channel_type VARCHAR(32) NOT NULL COMMENT '娓犻亾绫诲瀷锛歸eb銆乭5銆乤pp銆亀echat绛?,
  MODIFY COLUMN channel_name VARCHAR(128) NOT NULL COMMENT '娓犻亾鍚嶇О',
  MODIFY COLUMN app_key VARCHAR(128) NOT NULL COMMENT '娓犻亾鎺ュ叆Key',
  MODIFY COLUMN secret VARCHAR(255) NOT NULL COMMENT '娓犻亾鎺ュ叆瀵嗛挜',
  MODIFY COLUMN default_group_id VARCHAR(64) NOT NULL DEFAULT '' COMMENT '榛樿鍧愬腑缁処D锛岀敤浜庢笭閬撹繘绾挎椂榛樿鍒嗛厤',
  MODIFY COLUMN status VARCHAR(32) NOT NULL DEFAULT 'enabled' COMMENT '娓犻亾鐘舵€侊細enabled鍚敤锛宒isabled绂佺敤',
  MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '鍒涘缓鏃堕棿',
  MODIFY COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '鏇存柊鏃堕棿',
  MODIFY COLUMN deleted_at DATETIME NULL COMMENT '鍒犻櫎鏃堕棿锛岀┖琛ㄧず鏈垹闄?;

ALTER TABLE cs_user COMMENT = '瀹㈡埛鐢ㄦ埛琛?;
ALTER TABLE cs_user
  MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '鑷涓婚敭',
  MODIFY COLUMN tenant_id VARCHAR(64) NOT NULL COMMENT '绉熸埛ID',
  MODIFY COLUMN app_id VARCHAR(64) NOT NULL DEFAULT 'default' COMMENT '搴旂敤ID',
  MODIFY COLUMN user_id VARCHAR(64) NOT NULL COMMENT '瀹㈡埛鐢ㄦ埛ID',
  MODIFY COLUMN nickname VARCHAR(128) NOT NULL DEFAULT '' COMMENT '瀹㈡埛鏄电О',
  MODIFY COLUMN avatar VARCHAR(512) NOT NULL DEFAULT '' COMMENT '瀹㈡埛澶村儚鍦板潃',
  MODIFY COLUMN phone VARCHAR(32) NOT NULL DEFAULT '' COMMENT '瀹㈡埛鎵嬫満鍙?,
  MODIFY COLUMN email VARCHAR(128) NOT NULL DEFAULT '' COMMENT '瀹㈡埛閭',
  MODIFY COLUMN level VARCHAR(32) NOT NULL DEFAULT 'normal' COMMENT '瀹㈡埛绛夌骇锛歯ormal鏅€氾紝vip璐靛绛?,
  MODIFY COLUMN status VARCHAR(32) NOT NULL DEFAULT 'enabled' COMMENT '瀹㈡埛鐘舵€侊細enabled鍚敤锛宒isabled绂佺敤',
  MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '鍒涘缓鏃堕棿',
  MODIFY COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '鏇存柊鏃堕棿',
  MODIFY COLUMN deleted_at DATETIME NULL COMMENT '鍒犻櫎鏃堕棿锛岀┖琛ㄧず鏈垹闄?;

ALTER TABLE cs_agent COMMENT = '瀹㈡湇鍧愬腑琛?;
ALTER TABLE cs_agent
  MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '鑷涓婚敭',
  MODIFY COLUMN tenant_id VARCHAR(64) NOT NULL COMMENT '绉熸埛ID',
  MODIFY COLUMN agent_id VARCHAR(64) NOT NULL COMMENT '鍧愬腑ID',
  MODIFY COLUMN username VARCHAR(128) NOT NULL COMMENT '鍧愬腑鐧诲綍璐﹀彿',
  MODIFY COLUMN display_name VARCHAR(128) NOT NULL COMMENT '鍧愬腑鏄剧ず鍚嶇О',
  MODIFY COLUMN max_sessions INT NOT NULL DEFAULT 5 COMMENT '鏈€澶у悓鏃舵帴寰呬細璇濇暟',
  MODIFY COLUMN status VARCHAR(32) NOT NULL DEFAULT 'enabled' COMMENT '鍧愬腑鐘舵€侊細enabled鍚敤锛宒isabled绂佺敤',
  MODIFY COLUMN online_status VARCHAR(32) NOT NULL DEFAULT 'offline' COMMENT '鍦ㄧ嚎鐘舵€侊細online鍦ㄧ嚎锛宱ffline绂荤嚎锛宐usy蹇欑',
  MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '鍒涘缓鏃堕棿',
  MODIFY COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '鏇存柊鏃堕棿',
  MODIFY COLUMN deleted_at DATETIME NULL COMMENT '鍒犻櫎鏃堕棿锛岀┖琛ㄧず鏈垹闄?;

ALTER TABLE cs_agent_group COMMENT = '瀹㈡湇鍧愬腑缁勮〃';
ALTER TABLE cs_agent_group
  MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '鑷涓婚敭',
  MODIFY COLUMN tenant_id VARCHAR(64) NOT NULL COMMENT '绉熸埛ID',
  MODIFY COLUMN group_id VARCHAR(64) NOT NULL COMMENT '鍧愬腑缁処D',
  MODIFY COLUMN name VARCHAR(128) NOT NULL COMMENT '鍧愬腑缁勫悕绉?,
  MODIFY COLUMN status VARCHAR(32) NOT NULL DEFAULT 'enabled' COMMENT '鍧愬腑缁勭姸鎬侊細enabled鍚敤锛宒isabled绂佺敤',
  MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '鍒涘缓鏃堕棿',
  MODIFY COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '鏇存柊鏃堕棿',
  MODIFY COLUMN deleted_at DATETIME NULL COMMENT '鍒犻櫎鏃堕棿锛岀┖琛ㄧず鏈垹闄?;

ALTER TABLE cs_agent_group_rel COMMENT = '鍧愬腑涓庡潗甯粍鍏崇郴琛?;
ALTER TABLE cs_agent_group_rel
  MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '鑷涓婚敭',
  MODIFY COLUMN tenant_id VARCHAR(64) NOT NULL COMMENT '绉熸埛ID',
  MODIFY COLUMN agent_id VARCHAR(64) NOT NULL COMMENT '鍧愬腑ID',
  MODIFY COLUMN group_id VARCHAR(64) NOT NULL COMMENT '鍧愬腑缁処D',
  MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '鍒涘缓鏃堕棿';

ALTER TABLE cs_session COMMENT = '瀹㈡湇浼氳瘽琛?;
ALTER TABLE cs_session
  MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '鑷涓婚敭',
  MODIFY COLUMN tenant_id VARCHAR(64) NOT NULL COMMENT '绉熸埛ID',
  MODIFY COLUMN app_id VARCHAR(64) NOT NULL DEFAULT 'default' COMMENT '搴旂敤ID',
  MODIFY COLUMN session_id VARCHAR(64) NOT NULL COMMENT '浼氳瘽ID',
  MODIFY COLUMN channel_id VARCHAR(64) NOT NULL DEFAULT '' COMMENT '娓犻亾ID鎴栨笭閬撴帴鍏ey',
  MODIFY COLUMN user_id VARCHAR(64) NOT NULL COMMENT '瀹㈡埛鐢ㄦ埛ID',
  MODIFY COLUMN agent_id VARCHAR(64) NOT NULL DEFAULT '' COMMENT '褰撳墠鎺ュ緟鍧愬腑ID',
  MODIFY COLUMN group_id VARCHAR(64) NOT NULL DEFAULT '' COMMENT '褰撳墠鍒嗛厤鍧愬腑缁処D',
  MODIFY COLUMN status VARCHAR(32) NOT NULL COMMENT '浼氳瘽鐘舵€侊細waiting绛夊緟涓紝serving鏈嶅姟涓紝closed宸插叧闂瓑',
  MODIFY COLUMN priority INT NOT NULL DEFAULT 0 COMMENT '浼氳瘽浼樺厛绾э紝鏁板€艰秺澶т紭鍏堢骇瓒婇珮',
  MODIFY COLUMN last_seq BIGINT NOT NULL DEFAULT 0 COMMENT '浼氳瘽鏈€鏂版秷鎭簭鍙?,
  MODIFY COLUMN user_read_seq BIGINT NOT NULL DEFAULT 0 COMMENT '瀹㈡埛宸茶娑堟伅搴忓彿',
  MODIFY COLUMN agent_read_seq BIGINT NOT NULL DEFAULT 0 COMMENT '鍧愬腑宸茶娑堟伅搴忓彿',
  MODIFY COLUMN last_msg_time DATETIME NULL COMMENT '鏈€鍚庝竴鏉℃秷鎭椂闂?,
  MODIFY COLUMN source_ip VARCHAR(64) NOT NULL DEFAULT '' COMMENT '瀹㈡埛鏉ユ簮IP',
  MODIFY COLUMN user_agent VARCHAR(512) NOT NULL DEFAULT '' COMMENT '瀹㈡埛娴忚鍣ㄦ垨瀹㈡埛绔爣璇?,
  MODIFY COLUMN login_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '瀹㈡埛杩涘叆浼氳瘽鏃堕棿',
  MODIFY COLUMN close_time DATETIME NULL COMMENT '浼氳瘽鍏抽棴鏃堕棿',
  MODIFY COLUMN close_reason VARCHAR(255) NOT NULL DEFAULT '' COMMENT '浼氳瘽鍏抽棴鍘熷洜',
  MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '鍒涘缓鏃堕棿',
  MODIFY COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '鏇存柊鏃堕棿',
  MODIFY COLUMN deleted_at DATETIME NULL COMMENT '鍒犻櫎鏃堕棿锛岀┖琛ㄧず鏈垹闄?;

ALTER TABLE cs_message COMMENT = '鑱婂ぉ娑堟伅琛?;
ALTER TABLE cs_message
  MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '鑷涓婚敭',
  MODIFY COLUMN tenant_id VARCHAR(64) NOT NULL COMMENT '绉熸埛ID',
  MODIFY COLUMN app_id VARCHAR(64) NOT NULL DEFAULT 'default' COMMENT '搴旂敤ID',
  MODIFY COLUMN channel_id VARCHAR(64) NOT NULL DEFAULT '' COMMENT '娓犻亾ID鎴栨笭閬撴帴鍏ey',
  MODIFY COLUMN msg_id VARCHAR(64) NOT NULL COMMENT '娑堟伅ID',
  MODIFY COLUMN session_id VARCHAR(64) NOT NULL COMMENT '浼氳瘽ID',
  MODIFY COLUMN client_msg_id VARCHAR(128) NOT NULL COMMENT '瀹㈡埛绔秷鎭疘D锛岀敤浜庡箓绛夊幓閲?,
  MODIFY COLUMN sender_id VARCHAR(64) NOT NULL COMMENT '鍙戦€佹柟ID',
  MODIFY COLUMN sender_type VARCHAR(32) NOT NULL COMMENT '鍙戦€佹柟绫诲瀷锛歝ustomer瀹㈡埛锛宎gent鍧愬腑锛宻ystem绯荤粺',
  MODIFY COLUMN receiver_id VARCHAR(64) NOT NULL DEFAULT '' COMMENT '鎺ユ敹鏂笽D',
  MODIFY COLUMN msg_type VARCHAR(32) NOT NULL DEFAULT 'text' COMMENT '娑堟伅绫诲瀷锛歵ext鏂囨湰锛宨mage鍥剧墖锛宖ile鏂囦欢绛?,
  MODIFY COLUMN content TEXT NOT NULL COMMENT '娑堟伅鍐呭',
  MODIFY COLUMN seq BIGINT NOT NULL COMMENT '浼氳瘽鍐呮秷鎭簭鍙?,
  MODIFY COLUMN status VARCHAR(32) NOT NULL DEFAULT 'sent' COMMENT '娑堟伅鐘舵€侊細sending鍙戦€佷腑锛宻ent宸插彂閫侊紝read宸茶锛宖ailed澶辫触绛?,
  MODIFY COLUMN send_time DATETIME NOT NULL COMMENT '鍙戦€佹椂闂?,
  MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '鍒涘缓鏃堕棿',
  MODIFY COLUMN deleted_at DATETIME NULL COMMENT '鍒犻櫎鏃堕棿锛岀┖琛ㄧず鏈垹闄?;

ALTER TABLE cs_outbox COMMENT = '娑堟伅浜嬪姟鍙戜欢绠辫〃';
ALTER TABLE cs_outbox
  MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '鑷涓婚敭',
  MODIFY COLUMN tenant_id VARCHAR(64) NOT NULL COMMENT '绉熸埛ID',
  MODIFY COLUMN aggregate_type VARCHAR(64) NOT NULL COMMENT '鑱氬悎绫诲瀷锛屽message銆乻ession',
  MODIFY COLUMN aggregate_id VARCHAR(64) NOT NULL COMMENT '鑱氬悎ID',
  MODIFY COLUMN event_type VARCHAR(64) NOT NULL COMMENT '浜嬩欢绫诲瀷',
  MODIFY COLUMN payload JSON NOT NULL COMMENT '浜嬩欢杞借嵎JSON',
  MODIFY COLUMN status VARCHAR(32) NOT NULL DEFAULT 'pending' COMMENT '鎶曢€掔姸鎬侊細pending寰呮姇閫掞紝sent宸叉姇閫掞紝retry閲嶈瘯涓紝failed澶辫触',
  MODIFY COLUMN retry_count INT NOT NULL DEFAULT 0 COMMENT '閲嶈瘯娆℃暟',
  MODIFY COLUMN next_retry_time DATETIME NULL COMMENT '涓嬫閲嶈瘯鏃堕棿',
  MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '鍒涘缓鏃堕棿',
  MODIFY COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '鏇存柊鏃堕棿';

ALTER TABLE cs_audit_log COMMENT = '瀹¤鏃ュ織琛?;
ALTER TABLE cs_audit_log
  MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '鑷涓婚敭',
  MODIFY COLUMN tenant_id VARCHAR(64) NOT NULL COMMENT '绉熸埛ID',
  MODIFY COLUMN operator_id VARCHAR(64) NOT NULL COMMENT '鎿嶄綔浜篒D',
  MODIFY COLUMN operator_type VARCHAR(32) NOT NULL COMMENT '鎿嶄綔浜虹被鍨嬶細admin绠＄悊鍛橈紝agent鍧愬腑锛宻ystem绯荤粺',
  MODIFY COLUMN action VARCHAR(64) NOT NULL COMMENT '鎿嶄綔鍔ㄤ綔',
  MODIFY COLUMN resource_type VARCHAR(64) NOT NULL COMMENT '璧勬簮绫诲瀷',
  MODIFY COLUMN resource_id VARCHAR(64) NOT NULL COMMENT '璧勬簮ID',
  MODIFY COLUMN ip VARCHAR(64) NOT NULL DEFAULT '' COMMENT '鎿嶄綔IP',
  MODIFY COLUMN user_agent VARCHAR(512) NOT NULL DEFAULT '' COMMENT '娴忚鍣ㄦ垨瀹㈡埛绔爣璇?,
  MODIFY COLUMN detail JSON NULL COMMENT '鎿嶄綔璇︽儏JSON',
  MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '鍒涘缓鏃堕棿';

ALTER TABLE cs_sensitive_word COMMENT = '鏁忔劅璇嶈〃';
ALTER TABLE cs_sensitive_word
  MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '鑷涓婚敭',
  MODIFY COLUMN tenant_id VARCHAR(64) NOT NULL COMMENT '绉熸埛ID',
  MODIFY COLUMN word VARCHAR(128) NOT NULL COMMENT '鏁忔劅璇嶅唴瀹?,
  MODIFY COLUMN level VARCHAR(32) NOT NULL DEFAULT 'medium' COMMENT '椋庨櫓绛夌骇锛歭ow浣庯紝medium涓紝high楂?,
  MODIFY COLUMN action VARCHAR(32) NOT NULL DEFAULT 'review' COMMENT '澶勭悊鍔ㄤ綔锛歳eview瀹℃牳锛宐lock鎷︽埅锛宺eplace鏇挎崲',
  MODIFY COLUMN status VARCHAR(32) NOT NULL DEFAULT 'enabled' COMMENT '鐘舵€侊細enabled鍚敤锛宒isabled绂佺敤',
  MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '鍒涘缓鏃堕棿',
  MODIFY COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '鏇存柊鏃堕棿',
  MODIFY COLUMN deleted_at DATETIME NULL COMMENT '鍒犻櫎鏃堕棿锛岀┖琛ㄧず鏈垹闄?;

ALTER TABLE cs_blacklist COMMENT = '椋庢帶榛戝悕鍗曡〃';
ALTER TABLE cs_blacklist
  MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '鑷涓婚敭',
  MODIFY COLUMN tenant_id VARCHAR(64) NOT NULL COMMENT '绉熸埛ID',
  MODIFY COLUMN target_type VARCHAR(32) NOT NULL COMMENT '榛戝悕鍗曞璞＄被鍨嬶細user瀹㈡埛锛宨p鍦板潃锛宲hone鎵嬫満鍙风瓑',
  MODIFY COLUMN target_value VARCHAR(128) NOT NULL COMMENT '榛戝悕鍗曞璞″€?,
  MODIFY COLUMN reason VARCHAR(255) NOT NULL DEFAULT '' COMMENT '鍔犲叆榛戝悕鍗曞師鍥?,
  MODIFY COLUMN status VARCHAR(32) NOT NULL DEFAULT 'enabled' COMMENT '鐘舵€侊細enabled鍚敤锛宒isabled绂佺敤',
  MODIFY COLUMN expire_at DATETIME NULL COMMENT '杩囨湡鏃堕棿锛岀┖琛ㄧず闀挎湡鏈夋晥',
  MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '鍒涘缓鏃堕棿',
  MODIFY COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '鏇存柊鏃堕棿',
  MODIFY COLUMN deleted_at DATETIME NULL COMMENT '鍒犻櫎鏃堕棿锛岀┖琛ㄧず鏈垹闄?;

ALTER TABLE cs_risk_event COMMENT = '椋庢帶浜嬩欢琛?;
ALTER TABLE cs_risk_event
  MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '鑷涓婚敭',
  MODIFY COLUMN tenant_id VARCHAR(64) NOT NULL COMMENT '绉熸埛ID',
  MODIFY COLUMN event_type VARCHAR(64) NOT NULL COMMENT '椋庢帶浜嬩欢绫诲瀷',
  MODIFY COLUMN target_type VARCHAR(32) NOT NULL COMMENT '椋庢帶瀵硅薄绫诲瀷锛歶ser瀹㈡埛锛宨p鍦板潃锛宮essage娑堟伅绛?,
  MODIFY COLUMN target_value VARCHAR(128) NOT NULL COMMENT '椋庢帶瀵硅薄鍊?,
  MODIFY COLUMN level VARCHAR(32) NOT NULL DEFAULT 'medium' COMMENT '椋庨櫓绛夌骇锛歭ow浣庯紝medium涓紝high楂?,
  MODIFY COLUMN description VARCHAR(512) NOT NULL DEFAULT '' COMMENT '浜嬩欢鎻忚堪',
  MODIFY COLUMN status VARCHAR(32) NOT NULL DEFAULT 'open' COMMENT '澶勭悊鐘舵€侊細open寰呭鐞嗭紝processing澶勭悊涓紝closed宸插叧闂?,
  MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '鍒涘缓鏃堕棿';

ALTER TABLE cs_config COMMENT = '绉熸埛绯荤粺閰嶇疆琛?;
ALTER TABLE cs_config
  MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT COMMENT '鑷涓婚敭',
  MODIFY COLUMN tenant_id VARCHAR(64) NOT NULL COMMENT '绉熸埛ID',
  MODIFY COLUMN config_key VARCHAR(128) NOT NULL COMMENT '閰嶇疆閿?,
  MODIFY COLUMN config_value TEXT NOT NULL COMMENT '閰嶇疆鍊?,
  MODIFY COLUMN value_type VARCHAR(32) NOT NULL DEFAULT 'string' COMMENT '閰嶇疆鍊肩被鍨嬶細string瀛楃涓诧紝number鏁板瓧锛宐ool甯冨皵锛宩son瀵硅薄',
  MODIFY COLUMN remark VARCHAR(255) NOT NULL DEFAULT '' COMMENT '閰嶇疆璇存槑',
  MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '鍒涘缓鏃堕棿',
  MODIFY COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '鏇存柊鏃堕棿',
  MODIFY COLUMN deleted_at DATETIME NULL COMMENT '鍒犻櫎鏃堕棿锛岀┖琛ㄧず鏈垹闄?;

-- ============================================================
-- Source: 005_tenant_admin.sql
-- ============================================================
CREATE TABLE IF NOT EXISTS cs_tenant_admin (
  id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '鑷涓婚敭',
  tenant_id VARCHAR(64) NOT NULL COMMENT '绉熸埛ID',
  gfast_user_id BIGINT NOT NULL COMMENT 'GFast鍚庡彴鐢ㄦ埛ID',
  gfast_username VARCHAR(128) NOT NULL DEFAULT '' COMMENT 'GFast鍚庡彴鐢ㄦ埛鍚嶆垨鏄电О',
  role_type VARCHAR(32) NOT NULL DEFAULT 'tenant_admin' COMMENT '绉熸埛鍐呰鑹诧細tenant_admin绉熸埛绠＄悊鍛橈紝operator杩愯惀浜哄憳',
  status VARCHAR(32) NOT NULL DEFAULT 'enabled' COMMENT '鐘舵€侊細enabled鍚敤锛宒isabled绂佺敤',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '鍒涘缓鏃堕棿',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '鏇存柊鏃堕棿',
  deleted_at DATETIME NULL COMMENT '鍒犻櫎鏃堕棿锛岀┖琛ㄧず鏈垹闄?,
  UNIQUE KEY uk_tenant_user (tenant_id, gfast_user_id),
  KEY idx_user (gfast_user_id),
  KEY idx_tenant_status (tenant_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='绉熸埛鍚庡彴鐢ㄦ埛缁戝畾琛?;

-- ============================================================
-- Source: 006_session_client_meta.sql
-- ============================================================
ALTER TABLE cs_session
  ADD COLUMN source_ip VARCHAR(64) NOT NULL DEFAULT '' COMMENT '瀹㈡埛鏉ユ簮IP' AFTER last_msg_time,
  ADD COLUMN user_agent VARCHAR(512) NOT NULL DEFAULT '' COMMENT '瀹㈡埛娴忚鍣ㄦ垨瀹㈡埛绔爣璇? AFTER source_ip,
  ADD COLUMN login_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '瀹㈡埛杩涘叆浼氳瘽鏃堕棿' AFTER user_agent;

UPDATE cs_session
SET login_time = created_at
WHERE login_time IS NULL;

SET FOREIGN_KEY_CHECKS = 1;
