# Customer Service

企业级多租户在线客服系统骨架，技术栈为 Gin、Gorilla WebSocket、RocketMQ、Redis、MySQL 和 GFast。

## 快速启动

```powershell
go mod tidy
go run ./cmd/customer-api
go run ./cmd/customer-ws
```

API 默认监听 `:8080`，WebSocket 默认监听 `:8081`。
当前 API 启动会连接 MySQL、Redis，并在 RocketMQ 可用时启动 Outbox 投递 worker。

## API 示例

创建会话：

```http
POST /api/v1/sessions
X-Tenant-ID: tenant-demo
X-App-ID: default
Content-Type: application/json

{
  "user_id": "u001",
  "channel_id": "web"
}
```

坐席上线：

```http
POST /api/v1/agents/a001/online
X-Tenant-ID: tenant-demo
Content-Type: application/json

{
  "group_id": "default",
  "max_sessions": 5,
  "active_sessions": 0
}
```

会话创建时会从 Redis ZSET 中选择当前接待会话数最少的在线坐席。

发送消息：

```http
POST /api/v1/messages
X-Tenant-ID: tenant-demo
X-App-ID: default
Content-Type: application/json

{
  "session_id": "session-id",
  "client_msg_id": "client-001",
  "sender_id": "u001",
  "sender_type": "customer",
  "content": "hello"
}
```

同步消息：

```http
GET /api/v1/sessions/{session_id}/messages?after_seq=0
X-Tenant-ID: tenant-demo
```

WebSocket：

```text
ws://127.0.0.1:8081/ws?tenant_id=tenant-demo&user_type=customer&user_id=u001&device_id=web001
```

## 目录

```text
cmd/customer-api      HTTP API 服务
cmd/customer-ws       WebSocket 服务
internal/app          服务装配层
internal/cache        Redis 在线状态和坐席分配
internal/domain       核心领域模型
internal/mq           RocketMQ 发布和 Outbox worker
internal/store        MySQL 存储与接口
internal/tenant       多租户上下文
configs               配置文件
migrations            MySQL 表结构
deploy                Docker 和 Nginx 样例
docs                  架构文档
```
