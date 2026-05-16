# Customer Service

企业级多租户在线客服系统骨架，技术栈为 Gin、Gorilla WebSocket、RocketMQ、Redis、MySQL 和 GFast。

## 快速启动

```powershell
go mod tidy
go run ./cmd/customer-api
go run ./cmd/customer-ws
```

API 默认监听 `:8080`，WebSocket 默认监听 `:8081`。

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
internal/domain       核心领域模型
internal/store        存储接口与占位实现
internal/tenant       多租户上下文
configs               配置文件
migrations            MySQL 表结构
deploy                Docker 和 Nginx 样例
docs                  架构文档
```
