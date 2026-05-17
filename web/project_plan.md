# 在线客服系统

## 1. 项目描述
一款面向企业和开发者的在线客服系统，提供用户端快速接入的聊天窗口和坐席工作台两大核心界面。采用模块化设计，支持实时聊天、智能客服机器人、FAQ检索、多语言切换、满意度评分等功能，以清新简约的科技风格呈现。

## 2. 页面结构
- `/` - 产品首页（客服系统介绍与演示入口）
- `/agent-dashboard` - 坐席工作台（客服端管理后台）
- `/chat-demo` - 用户端聊天弹窗演示页

## 3. 核心功能
- [ ] 用户端聊天弹窗（悬浮窗/侧边栏模式）
- [ ] 实时消息收发与聊天记录
- [ ] 智能客服机器人辅助对话
- [ ] 常见问题快速检索
- [ ] 多语言切换支持
- [ ] 用户满意度评分
- [ ] 通知提醒系统
- [ ] 暗色/亮色模式切换
- [ ] 自定义界面主题
- [ ] 坐席工作台概览面板
- [ ] 会话管理与客户摘要
- [ ] 拖拽式配置界面

## 4. 数据模型设计

### 表：chat_sessions
| 字段 | 类型 | 描述 |
|------|------|------|
| id | BIGINT | 主键 |
| user_id | TEXT | 用户标识 |
| agent_id | TEXT | 客服标识 |
| status | TEXT | active/closed/pending |
| subject | TEXT | 会话主题 |
| satisfaction | INT | 满意度评分 1-5 |
| created_at | TIMESTAMPTZ | 创建时间 |

### 表：chat_messages
| 字段 | 类型 | 描述 |
|------|------|------|
| id | BIGINT | 主键 |
| session_id | BIGINT | 会话ID |
| sender_type | TEXT | user/agent/bot |
| sender_id | TEXT | 发送者标识 |
| content | TEXT | 消息内容 |
| message_type | TEXT | text/image/file |
| created_at | TIMESTAMPTZ | 创建时间 |

### 表：faq_items
| 字段 | 类型 | 描述 |
|------|------|------|
| id | BIGINT | 主键 |
| category | TEXT | 分类 |
| question | TEXT | 问题 |
| answer | TEXT | 答案 |
| sort_order | INT | 排序 |

### 表：agents
| 字段 | 类型 | 描述 |
|------|------|------|
| id | TEXT | 主键 |
| name | TEXT | 姓名 |
| email | TEXT | 邮箱 |
| avatar | TEXT | 头像URL |
| status | TEXT | online/away/offline |
| role | TEXT | admin/agent |

## 5. 后端/第三方集成计划
- Supabase：用于实时聊天数据存储、用户认证、数据持久化
- 无需Shopify：本项目不涉及电商
- 无需Stripe：本项目不涉及支付

## 6. 开发阶段计划

### 阶段 1：产品首页 + 用户端聊天弹窗
- 目标：搭建产品展示首页，实现用户端聊天弹窗UI
- 交付物：首页、聊天弹窗界面、基础交互

### 阶段 2：坐席工作台
- 目标：实现坐席工作台核心界面
- 交付物：会话概览面板、会话列表、客户摘要、统计数据

### 阶段 3：功能完善与数据连接
- 目标：连接Supabase数据，完善聊天逻辑和FAQ功能
- 交付物：实时消息、多语言、暗色模式、满意度评分