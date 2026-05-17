# GFast 后台接入方案

## 是否需要接入 GFast

建议接入，但不要把客服核心逻辑写进 GFast。

推荐边界：

- GFast：后台登录、菜单、角色、权限、租户管理员账号、页面管理。
- customer-api：租户、渠道、坐席、坐席组、会话、消息、统计等客服业务 API。
- customer-ws：客服工作台和访客端实时连接。

这样做的好处是后台框架可替换，聊天核心不被后台系统绑死。

## 后台菜单建议

```text
客服系统
├── 控制台
├── 租户管理
├── 渠道管理
├── 坐席管理
├── 坐席组管理
├── 会话监控
├── 消息记录
├── 敏感词/风控
├── 统计报表
└── 系统配置
```

## 当前已提供的管理 API

所有租户内接口都需要传：

```text
X-Tenant-ID: tenant-demo
X-App-ID: default
```

接口：

```text
GET  /admin/v1/dashboard
GET  /admin/v1/tenants
POST /admin/v1/tenants
GET  /admin/v1/channels
POST /admin/v1/channels
GET  /admin/v1/agents
POST /admin/v1/agents
GET  /admin/v1/agent-groups
POST /admin/v1/agent-groups
POST /admin/v1/agent-groups/{group_id}/agents/{agent_id}
GET  /admin/v1/sessions?status=serving
```

## GFast 权限映射

GFast 中建议增加这些权限标识：

```text
cs:dashboard:view
cs:tenant:list
cs:tenant:save
cs:channel:list
cs:channel:save
cs:agent:list
cs:agent:save
cs:group:list
cs:group:save
cs:session:list
cs:message:list
cs:report:view
cs:config:save
```

GFast 登录后需要在反向代理或后端网关注入：

```text
X-Admin-ID
X-Tenant-ID
X-App-ID
```

当前代码已经强制检查 `X-Tenant-ID`。后续可以补一个 `AdminAuthMiddleware`，校验 GFast JWT 或内部网关签名。

## 接入方式

### 方式一：GFast 作为独立后台

GFast 独立部署，页面通过 HTTP 调用 `customer-api` 的 `/admin/v1/*` 接口。

适合 SaaS 多租户，边界最清晰。

### 方式二：GFast 反向代理 customer-api

Nginx 或 GFast 网关把 `/customer/admin/*` 转发到 `customer-api/admin/v1/*`。

适合希望后台域名统一的部署。

### 方式三：把客服管理模块写成 GFast 插件

不推荐第一阶段做。插件方式会更贴近 GFast，但会让客服领域逻辑和后台框架耦合。

## 下一步

建议下一步实现：

- GFast JWT/网关签名校验
- 操作审计写入 `cs_audit_log`
- 消息记录查询接口
- 会话关闭、转接、备注、评价
- 敏感词和黑名单配置
- 统计报表宽表
