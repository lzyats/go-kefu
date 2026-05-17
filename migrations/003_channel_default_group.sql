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
