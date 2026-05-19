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
