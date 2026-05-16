# 在线客服系统架构设计

## 服务边界

- `customer-api`：登录认证、租户上下文、会话创建、坐席分配、历史消息、消息写库。
- `customer-ws`：WebSocket 连接、心跳、在线状态、多端路由、实时推送。
- `admin-system`：基于 GFast 承接租户、坐席、权限、监控、统计和配置。

## 多租户原则

所有业务表必须包含 `tenant_id`，多数接口从 `X-Tenant-ID` 请求头提取租户，不信任前端传入的 body 字段。默认采用共享库共享表隔离，后续大客户可独立库或独立部署。

## WebSocket 连接路由

当前骨架使用内存 Hub：

```text
tenant_id:user_type:user_id -> []*Client
```

生产版本替换为 Redis 路由：

```text
cs:conn:{tenantId}:{userType}:{userId}:{deviceId} -> ws_node_id
cs:node:{nodeId}:info -> node metadata
```

跨节点推送通过 RocketMQ `cs_push` 投递到目标 WS 节点。

## 消息可靠性

消息写入采用 Outbox Pattern：

1. 写 `cs_message`
2. 写 `cs_outbox`
3. 提交数据库事务
4. Outbox worker 发送 RocketMQ
5. 成功标记 `sent`
6. 失败按 `retry_count` 和 `next_retry_time` 重试

客户端必须传 `client_msg_id`，服务端用 `(tenant_id, session_id, client_msg_id)` 做幂等。

## 同步模型

客户端通过 `after_seq` 增量同步：

```http
GET /api/v1/sessions/{session_id}/messages?after_seq=100&limit=50
```

会话维度维护：

- `last_seq`
- `user_read_seq`
- `agent_read_seq`

## Redis Key 规划

```text
cs:conn:{tenantId}:{userType}:{userId}:{deviceId}
cs:online:agent:{tenantId}:{agentId}
cs:agent:zset:{tenantId}:{groupId}
cs:queue:waiting:{tenantId}:{groupId}
cs:session:{tenantId}:{sessionId}
cs:unread:{tenantId}:{userType}:{userId}:{sessionId}
cs:readseq:{tenantId}:{sessionId}:{userId}
```

## RocketMQ Topic

```text
cs_message
cs_push
cs_notify
cs_audit
```

## 当前实现状态

这版是可编译的基础骨架：

- Gin API 服务
- Gorilla WebSocket 服务
- 多租户请求头中间件
- 会话创建接口
- 消息写入与幂等占位实现
- 按 `after_seq` 拉取消息
- WS `ping` / `send_message` / `ack` 协议壳
- MySQL 初始化迁移
- Docker Compose 与 Nginx 样例

下一步建议优先替换内存存储为 MySQL + Redis，并实现坐席分配策略。
