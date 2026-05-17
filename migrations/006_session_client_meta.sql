ALTER TABLE cs_session
  ADD COLUMN source_ip VARCHAR(64) NOT NULL DEFAULT '' COMMENT '客户来源IP' AFTER last_msg_time,
  ADD COLUMN user_agent VARCHAR(512) NOT NULL DEFAULT '' COMMENT '客户浏览器或客户端标识' AFTER source_ip,
  ADD COLUMN login_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '客户进入会话时间' AFTER user_agent;

UPDATE cs_session
SET login_time = created_at
WHERE login_time IS NULL;
