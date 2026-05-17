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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='租户后台用户绑定表';
