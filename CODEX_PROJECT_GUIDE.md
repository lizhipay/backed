# Codex 项目移植指南

本文件给 Codex AI 和接手工程师快速理解当前后台管理系统。目标是在其他项目里复用这套基础后台时，能快速判断哪些内容要保留、哪些内容要替换、怎样新增业务模块，以及怎样验证移植结果。

## 项目定位

这是一个通用后台管理系统起始模板：

- 前端：React + TypeScript + Material UI，提供深色/浅色主题、国际化、路由、权限守卫和后台 Shell。
- 后端：Go API，负责认证、管理员、角色、权限、会话、审计、系统设置和个人资料。
- 数据库：PostgreSQL，保存管理员、角色、权限、审计、设置、MFA 密钥、恢复码等长期数据。
- 缓存/会话：Redis，保存 refresh 会话和 MFA 登录临时验证数据。
- 默认后台挂载路径：`/admin`。
- 默认 API 前缀：`/api`。

这套系统适合作为其他项目的后台管理基础，不是某个固定业务系统。业务相关页面应作为新增模块接入，演示页面可以整包删除。

## 技术栈

### 前端

- Vite
- React 18
- TypeScript
- Material UI 6
- MUI X Data Grid
- MUI X Charts
- React Router
- TanStack Query
- Zustand
- React Hook Form
- Zod
- i18next / react-i18next
- qrcode.react
- Vitest
- ESLint

### 后端

- Go 1.23
- chi
- pgx
- go-redis
- golang-jwt/jwt
- Argon2id 密码哈希
- TOTP / Google Authenticator
- slog
- 内置 SQL migration runner

### 数据与安全

- PostgreSQL：持久化身份、权限、审计和系统数据。
- Redis：refresh session、MFA challenge。
- 认证方式：短期 access token + HttpOnly refresh cookie。
- MFA：Google Authenticator 兼容 TOTP，恢复码只保存哈希。
- 权限模型：管理员只通过直接绑定角色获得权限。

## 目录结构

```text
.
├── backend/
│   ├── cmd/api/                 # Go API 入口
│   ├── internal/auth/           # 密码、JWT、cookie、MFA、加密工具
│   ├── internal/bootstrap/      # 权限、系统角色、首个超级管理员引导
│   ├── internal/cache/          # Redis 连接
│   ├── internal/config/         # 环境变量配置
│   ├── internal/db/             # PostgreSQL 连接和 migration runner
│   ├── internal/http/           # HTTP 路由、接口 handler、前端静态文件挂载
│   ├── internal/middleware/     # 请求 ID、日志、认证、错误处理
│   ├── internal/permissions/    # 后端权限目录，后端权威来源
│   ├── internal/sessionstore/   # Redis 会话存储
│   ├── internal/store/          # PostgreSQL 数据访问层
│   └── migrations/              # SQL 迁移，启动时自动执行
├── frontend/
│   ├── src/app/                 # App provider 和路由
│   ├── src/foundation/          # 通用基础层：API、认证、布局、主题、i18n、权限、UI
│   ├── src/features/            # 真实后台页面：登录、仪表盘、权限、安全、设置、个人资料
│   ├── src/demo/                # 可删除演示模块
│   ├── dist/                    # 前端构建产物，由 Go 服务挂载
│   └── package.json             # 前端依赖和命令
├── .env.example                 # 运行环境变量示例
├── CODEX_PROJECT_GUIDE.md       # 给 Codex 的项目移植说明
├── README.md                    # 面向使用者的项目介绍和提示词示例
└── dev.sh                       # 本地调试启动脚本
```

## 当前基础功能

真实基础功能：

- 登录、刷新登录、退出登录。
- MFA 登录第二步。
- 管理员 CRUD、启用/禁用、删除、分配角色、强制下线。
- 角色 CRUD、绑定权限。
- 权限矩阵，只读展示后端权限目录。
- 会话列表、个人会话、会话吊销。
- 审计日志查询和详情。
- 设置页：主题、语言、系统默认值。
- 个人资料：头像、昵称、用户名、密码修改、Google 口令、恢复码、个人会话。
- 多语言：简体中文、繁体中文、日语、英语。
- 主题：深色、浅色、跟随系统。
- 头像上传：本地磁盘存储。

已删除的功能：

- 用户组功能已完全删除。管理员权限只来自管理员直接绑定的角色。

演示功能：

- `frontend/src/demo` 下的表格、表单、图表、订单、会员、商品、通知、组件展示等页面都是假数据。
- 演示模块不连接后端数据库，不属于基础系统核心。

## 运行方式

### 一键本地调试

```bash
./dev.sh
```

默认访问：

```text
http://127.0.0.1:5175/admin
```

`dev.sh` 会先构建前端，再启动 Go API，并把 `frontend/dist` 挂载到后台路径下。

### 前端单独验证

```bash
cd frontend
npm run lint
npm run typecheck
VITE_ADMIN_BASE=/admin npm run build
```

### 后端单独验证

```bash
cd backend
go test ./...
go vet ./...
```

### 健康检查

```bash
curl -sS http://127.0.0.1:5175/api/healthz
```

健康检查应返回数据库和 Redis 状态。

## 环境变量

移植到其他项目时，不要把真实密码、密钥或生产配置写进代码。使用运行时环境变量。

```bash
APP_ENV=development
APP_PORT=5175

DATABASE_URL='postgres://<postgres-user>:<postgres-password>@<postgres-host>:5432/<database>?sslmode=disable'

JWT_SECRET='<change-this-jwt-secret-min-16-bytes>'
REFRESH_TOKEN_SECRET='<change-this-refresh-secret-min-16-bytes>'
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=720h

REDIS_ADDR='<redis-host>:6379'
REDIS_PASSWORD='<redis-password>'
REDIS_DB=0
REDIS_KEY_PREFIX='<project-name>:admin'

ADMIN_BASE_PATH=/admin
ADMIN_FRONTEND_DIR=/absolute/path/to/frontend/dist
VITE_ADMIN_BASE=/admin
VITE_API_BASE_URL=/api

ADMIN_BOOTSTRAP_EMAIL='<first-admin-email>'
ADMIN_BOOTSTRAP_PASSWORD='<first-admin-password>'

ADMIN_UPLOAD_DIR=uploads
ADMIN_PUBLIC_UPLOAD_BASE=/uploads

MFA_SECRET_ENCRYPTION_KEY='<16-24-or-32-byte-compatible-key>'
CORS_ALLOWED_ORIGINS='http://127.0.0.1:5175,http://localhost:5173'
```

重要规则：

- `ADMIN_BASE_PATH` 和 `VITE_ADMIN_BASE` 必须一致，否则前端资源路径会错。
- `ADMIN_FRONTEND_DIR` 指向前端构建产物目录，通常是 `frontend/dist`。
- 生产环境必须显式配置 `MFA_SECRET_ENCRYPTION_KEY`。
- `ADMIN_BOOTSTRAP_EMAIL` 和 `ADMIN_BOOTSTRAP_PASSWORD` 只用于系统没有可用超级管理员时恢复或创建超级管理员。
- Redis 不可用时服务会启动失败，因为 refresh 会话依赖 Redis。

## API 和前端约定

后端接口统一在 `/api` 下：

- `/api/auth/*`：登录、刷新、退出、MFA 登录验证、密码重置占位。
- `/api/me/*`：当前管理员、权限、个人资料、头像、密码、MFA、个人会话。
- `/api/admins/*`：管理员管理。
- `/api/roles/*`：角色管理和权限绑定。
- `/api/permissions`：权限目录。
- `/api/sessions`：会话列表和吊销。
- `/api/audit-logs`：审计日志。
- `/api/settings`：系统设置。
- `/api/healthz`：健康检查。

前端 API 客户端约定：

- `frontend/src/foundation/api/client.ts` 默认请求 `/api`。
- access token 只保存在内存状态中。
- refresh token 由后端写入 HttpOnly cookie。
- 401 时前端会尝试 `/auth/refresh`，刷新失败后清空登录状态。

## 权限模型

后端权限目录在 `backend/internal/permissions/catalog.go`，这是系统权限的权威来源。

规则：

- 每个受保护接口必须由后端权限中间件检查。
- 前端权限只用于隐藏或禁用菜单、页面、按钮，不能作为安全边界。
- 管理员通过 `admin_roles` 直接绑定角色。
- 角色通过 `role_permissions` 绑定权限。
- `super_admin` 角色受保护，不能被禁用、删除或移除超级管理员角色。

前端权限使用方式：

- 页面级：`RequirePermission`。
- 按钮级：`Can`。
- 导航级：`foundation/layout/navConfig.tsx` 的 `perm` 字段。

## 如何移植到其他项目

### 1. 复制项目骨架

复制 `frontend/`、`backend/`、`dev.sh` 和本指南。

不要复制本机运行产物到新项目：

- `frontend/node_modules`
- `frontend/dist`
- `backend/uploads`
- 临时缓存文件

### 2. 修改项目命名

建议替换：

- `frontend/package.json` 里的 `name`。
- Go module 名称：`backend/go.mod`。
- 前端品牌文案：布局 Logo 附近的 `Backed Admin`。
- Redis key 前缀：`REDIS_KEY_PREFIX`。
- 应用默认设置里的应用名。

如果修改 Go module 名称，需要同步替换后端所有 import 路径。

### 3. 配置数据库和 Redis

新项目必须提供：

- PostgreSQL 数据库。
- Redis 实例。
- `DATABASE_URL`。
- `REDIS_ADDR`、`REDIS_PASSWORD`、`REDIS_DB`。

首次启动时，后端会自动执行 `backend/migrations` 里的 pending migration，并写入 `schema_migrations`。

### 4. 设置首个超级管理员

首次启动前配置：

```bash
ADMIN_BOOTSTRAP_EMAIL='<first-admin-email>'
ADMIN_BOOTSTRAP_PASSWORD='<first-admin-password>'
```

启动后，如果系统没有可用超级管理员，后端会恢复或创建这个账号，并绑定 `super_admin` 角色。

### 5. 构建并挂载前端

如果后台路径仍使用 `/admin`：

```bash
cd frontend
VITE_ADMIN_BASE=/admin npm run build
```

Go 服务配置：

```bash
ADMIN_BASE_PATH=/admin
ADMIN_FRONTEND_DIR=/absolute/path/to/frontend/dist
```

如果后台路径改成其他路径，例如 `/console`：

```bash
VITE_ADMIN_BASE=/console
ADMIN_BASE_PATH=/console
```

两者必须一致。

### 6. 验证移植成功

```bash
cd backend && go test ./...
cd backend && go vet ./...
cd frontend && npm run lint
cd frontend && npm run typecheck
cd frontend && VITE_ADMIN_BASE=/admin npm run build
curl -sS http://127.0.0.1:5175/api/healthz
```

浏览器打开：

```text
http://127.0.0.1:5175/admin
```

## 如何接入新业务模块

### 后端接入步骤

1. 新增 migration，创建业务表。
2. 在 `backend/internal/store` 新增数据访问方法。
3. 在 `backend/internal/http` 新增 handler 和路由挂载。
4. 在 `backend/internal/permissions/catalog.go` 新增权限 key。
5. 在 bootstrap 里让合适的系统角色获得新权限。
6. 对写操作追加审计日志。
7. 为关键 store 或 handler 增加测试。

权限 key 建议格式：

```text
<resource>.view
<resource>.create
<resource>.update
<resource>.delete
<resource>.<custom_action>
```

### 前端接入步骤

1. 在 `frontend/src/foundation/api/types.ts` 增加业务类型。
2. 在 `frontend/src/features/<module>` 增加页面组件。
3. 在 `frontend/src/app/router/AppRouter.tsx` 增加路由。
4. 在 `frontend/src/foundation/layout/navConfig.tsx` 增加导航项。
5. 在 `frontend/src/foundation/permissions/keys.ts` 增加前端权限 key。
6. 在 `frontend/src/foundation/i18n/resources.ts` 增加四语言文案。
7. 页面请求使用 `api.get`、`api.list`、`api.post`、`api.patch`、`api.delete`。
8. 表格优先使用 `DataTable`，页面标题使用 `PageHeader`，状态展示使用现有 `EmptyState`、`ErrorState`、`StatusBadge`。

按钮权限示例：

```tsx
<Can perm={PERMISSIONS.exampleUpdate}>
  <Button>保存</Button>
</Can>
```

页面权限示例：

```tsx
<RequirePermission perm={PERMISSIONS.exampleView}>
  <ExamplePage />
</RequirePermission>
```

## 如何删除演示模块

演示模块在：

```text
frontend/src/demo
```

删除方式：

```bash
rm -rf frontend/src/demo
```

当前路由使用 `import.meta.glob('../../*/index.tsx')` 自动加载额外模块。删除 `frontend/src/demo` 后，演示导航和演示路由会一起消失。

删除后验证：

```bash
rg -i "demo|faker|mock|placeholder|example\\.com" frontend/src backend
cd frontend && VITE_ADMIN_BASE=/admin npm run build
cd backend && go test ./...
```

如果业务项目需要保留示例页面作为参考，不要把它们接入生产导航。

## 多语言规则

当前支持：

- `zh-CN` 简体中文
- `zh-TW` 繁体中文
- `ja-JP` 日语
- `en-US` 英语
- `auto` 跟随浏览器

新增页面时必须补齐四语言文案。不要在真实后台页面里直接写死中文或英文业务文案。

常用位置：

- `frontend/src/foundation/i18n/resources.ts`
- `frontend/src/foundation/i18n/display.ts`
- `frontend/src/foundation/i18n/LanguageSelect.tsx`

## 主题和布局规则

当前后台使用 Material UI 主题系统：

- 主题入口：`frontend/src/foundation/theme`。
- 页面 Shell：`frontend/src/foundation/layout`。
- 左侧导航：`SidebarContent` + `navConfig`。
- 左下角用户菜单包含个人资料、设置、主题模式和退出登录。
- 设置类页面优先使用 tab 布局，不堆叠大量 card。
- 表单保存按钮放在表单右下角。

移植时应保持这些布局约定，避免把基础后台改成一次性业务页面。

## 数据库和迁移规则

- migration 文件放在 `backend/migrations`。
- migration 使用 `-- +goose Up` 和 `-- +goose Down` 标记，但实际执行由项目内置 runner 完成。
- 服务启动时自动执行 pending migration。
- 已执行版本记录在 `schema_migrations`。
- 新增表、字段、索引时优先使用非破坏性迁移。
- 删除表或权限时必须明确写 migration，不能只删代码。

当前核心表包括：

- `admins`
- `roles`
- `permissions`
- `role_permissions`
- `admin_roles`
- `login_attempts`
- `password_resets`
- `audit_logs`
- `mfa_recovery_codes`

旧的用户组表已通过迁移删除。

## 数据库设计

### 总体关系

```text
admins ──< admin_roles >── roles ──< role_permissions >── permissions
admins ──< audit_logs
admins ──< settings.updated_by
admins ──< login_attempts
admins ──< password_resets
admins ──< mfa_recovery_codes
```

说明：

- 管理员权限只来自 `admin_roles` 直接绑定的角色。
- 权限目录由后端 `backend/internal/permissions/catalog.go` 写入 `permissions`。
- `sessions` 和 `mfa_challenges` 表仍可能存在于旧库，但当前运行逻辑已经改为 Redis，不再写这两张表。
- 用户组相关表 `groups`、`admin_groups`、`group_roles` 已由 `0007_remove_groups.sql` 删除。

### `admins`

管理员账号主表。

| 字段 | 用途 |
| --- | --- |
| `id` | 管理员 UUID 主键 |
| `email` | 登录邮箱，未删除账号内大小写不敏感唯一 |
| `username` | 用户名，未删除账号内大小写不敏感唯一 |
| `display_name` | 昵称 |
| `avatar_url` | 前端展示头像地址 |
| `avatar_object_key` | 服务端保存头像文件的对象 key |
| `password_hash` | Argon2id 密码哈希 |
| `status` | `active`、`disabled`、`locked` |
| `mfa_enabled` | 是否启用 Google Authenticator |
| `mfa_secret` | 加密后的 TOTP secret |
| `must_change_password` | 是否强制下次修改密码 |
| `theme_preference` | `dark`、`light`、`auto` |
| `language_preference` | `auto`、`zh-CN`、`zh-TW`、`ja-JP`、`en-US` |
| `last_login_at` | 最后登录时间 |
| `failed_login_count` | 连续失败登录计数 |
| `locked_until` | 锁定截止时间 |
| `created_by` | 创建该管理员的管理员 ID |
| `created_at` / `updated_at` | 创建和更新时间 |
| `deleted_at` | 软删除时间 |

索引和约束：

- `admins_email_key`：`lower(email)` 唯一，过滤 `deleted_at IS NULL`。
- `admins_username_key`：`lower(username)` 唯一，过滤 `deleted_at IS NULL`。
- `admins_status_idx`：按状态筛选。

### `roles`

角色表。

| 字段 | 用途 |
| --- | --- |
| `id` | 角色 UUID 主键 |
| `name` | 角色名称 |
| `slug` | 稳定标识，例如 `super_admin`、`admin`、`readonly` |
| `description` | 角色说明 |
| `is_system` | 是否系统角色 |
| `created_at` / `updated_at` | 创建和更新时间 |

索引和约束：

- `roles_slug_key`：`slug` 唯一。

系统内置角色：

- `super_admin`：超级管理员，拥有所有权限并受保护。
- `admin`：标准管理员，默认授予当前权限目录中的全部权限。
- `readonly`：只读管理员，默认授予查看类权限。

### `permissions`

权限目录表。后端启动时根据权限 catalog 幂等写入。

| 字段 | 用途 |
| --- | --- |
| `id` | 权限 UUID 主键 |
| `key` | 权限 key，例如 `admins.view` |
| `resource` | 资源名，例如 `admins` |
| `action` | 动作名，例如 `view`、`create` |
| `category` | 权限分类，例如 `Access Control` |
| `description` | 权限说明 |
| `is_system` | 是否系统权限 |
| `created_at` / `updated_at` | 创建和更新时间 |

索引和约束：

- `permissions_key_key`：`key` 唯一。
- `permissions_resource_idx`：按资源筛选。

### `role_permissions`

角色和权限的多对多关系表。

| 字段 | 用途 |
| --- | --- |
| `role_id` | 角色 ID，删除角色时级联删除 |
| `permission_id` | 权限 ID，删除权限时级联删除 |

约束：

- 主键：`(role_id, permission_id)`。
- `role_permissions_perm_idx`：按权限反查角色。

### `admin_roles`

管理员和角色的多对多关系表。

| 字段 | 用途 |
| --- | --- |
| `admin_id` | 管理员 ID，删除管理员时级联删除 |
| `role_id` | 角色 ID，删除角色时级联删除 |
| `assigned_by` | 分配该角色的管理员 ID |
| `assigned_at` | 分配时间 |

约束：

- 主键：`(admin_id, role_id)`。
- `admin_roles_role_idx`：按角色反查管理员。

### `sessions`

旧版 PostgreSQL session 表。当前系统会话已经迁移到 Redis。

| 字段 | 用途 |
| --- | --- |
| `id` | session UUID |
| `admin_id` | 管理员 ID |
| `refresh_token_hash` | refresh token 哈希 |
| `access_jti` | access token JTI |
| `user_agent` | 登录设备信息 |
| `ip` | 登录 IP |
| `expires_at` | 过期时间 |
| `last_seen_at` | 最后活跃时间 |
| `revoked_at` | 吊销时间 |
| `revoked_reason` | 吊销原因 |
| `created_at` | 创建时间 |

注意：

- 当前代码不再向 `sessions` 表写入新会话。
- 会话列表、刷新、退出、强制下线都读写 Redis。

### `login_attempts`

登录尝试记录。

| 字段 | 用途 |
| --- | --- |
| `id` | UUID 主键 |
| `identifier` | 登录标识，通常是邮箱 |
| `success` | 是否成功 |
| `ip` | 请求 IP |
| `user_agent` | User Agent |
| `created_at` | 创建时间 |

索引：

- `login_attempts_identifier_idx`：按登录标识和时间倒序查询。

### `password_resets`

密码重置令牌表。当前接口保留占位能力，生产是否启用由业务项目决定。

| 字段 | 用途 |
| --- | --- |
| `id` | UUID 主键 |
| `admin_id` | 管理员 ID |
| `token_hash` | 重置 token 哈希 |
| `expires_at` | 过期时间 |
| `consumed_at` | 使用时间 |
| `created_at` | 创建时间 |

索引和约束：

- `password_resets_token_key`：`token_hash` 唯一。
- `password_resets_admin_idx`：按管理员查询。

### `audit_logs`

审计日志表，按追加写入使用。

| 字段 | 用途 |
| --- | --- |
| `id` | UUID 主键 |
| `actor_admin_id` | 操作者管理员 ID，可为空 |
| `actor_label` | 操作者展示名或系统标签 |
| `action` | 动作名，例如 `auth.login`、`me.change_password` |
| `resource_type` | 资源类型 |
| `resource_id` | 资源 ID |
| `changes` | JSONB 变更内容 |
| `status` | `success`、`failure`、`denied` |
| `ip` | 请求 IP |
| `user_agent` | User Agent |
| `request_id` | 请求 ID |
| `created_at` | 创建时间 |

索引：

- `audit_logs_created_idx`：按时间倒序。
- `audit_logs_actor_idx`：按操作者。
- `audit_logs_action_idx`：按动作。
- `audit_logs_resource_idx`：按资源类型和资源 ID。

### `settings`

系统设置表。

| 字段 | 用途 |
| --- | --- |
| `key` | 设置 key，主键 |
| `value` | JSONB 设置值 |
| `updated_by` | 更新人管理员 ID |
| `updated_at` | 更新时间 |

当前设置页面按 settings map 读取，业务项目可以继续追加新的设置 key。

### `mfa_recovery_codes`

MFA 恢复码表。

| 字段 | 用途 |
| --- | --- |
| `id` | UUID 主键 |
| `admin_id` | 管理员 ID |
| `code_hash` | 恢复码哈希 |
| `consumed_at` | 使用时间 |
| `created_at` | 创建时间 |

索引和约束：

- `mfa_recovery_codes_admin_idx`：按管理员查询。
- `mfa_recovery_codes_hash_key`：恢复码哈希唯一。

安全规则：

- 恢复码明文只在启用 MFA 时显示一次。
- 每个恢复码只能使用一次。

### `mfa_challenges`

旧版 PostgreSQL MFA 临时挑战表。当前系统 MFA 登录临时 token 已迁移到 Redis。

| 字段 | 用途 |
| --- | --- |
| `id` | UUID 主键 |
| `admin_id` | 管理员 ID |
| `token_hash` | MFA 临时 token 哈希 |
| `expires_at` | 过期时间 |
| `consumed_at` | 使用时间 |
| `ip` | 请求 IP |
| `user_agent` | User Agent |
| `created_at` | 创建时间 |

注意：

- 当前代码不再向 `mfa_challenges` 表写入新的登录挑战。
- MFA 登录临时 challenge 存在 Redis，读取后立即删除。

### Redis key 设计

Redis key 使用 `REDIS_KEY_PREFIX` 作为前缀，默认形态如下：

| Key | 类型 | 用途 |
| --- | --- | --- |
| `<prefix>:session:<session_id>` | string JSON | session 主体 |
| `<prefix>:session_by_refresh:<refresh_hash>` | string | refresh hash 到 session ID 的索引 |
| `<prefix>:admin_sessions:<admin_id>` | set | 某个管理员的 session ID 集合 |
| `<prefix>:sessions:index` | set | 全局 session ID 集合 |
| `<prefix>:mfa_challenge:<token_hash>` | string JSON | MFA 登录临时挑战 |

TTL 规则：

- session 主体和 refresh 索引使用 refresh token 过期时间。
- 管理员 session 集合和全局 session 集合使用 refresh TTL 加 24 小时。
- MFA challenge 固定为短期一次性验证，验证时使用原子读取并删除。

## 生产部署注意事项

- 生产环境不要使用开发密钥。
- 生产环境必须设置 `MFA_SECRET_ENCRYPTION_KEY`。
- `JWT_SECRET` 和 `REFRESH_TOKEN_SECRET` 必须足够长且不可复用默认值。
- PostgreSQL 和 Redis 配置必须来自运行环境。
- `ADMIN_BASE_PATH` 和 `VITE_ADMIN_BASE` 必须统一。
- 前端构建后由 Go 服务通过 `ADMIN_FRONTEND_DIR` 挂载。
- 上传目录应放到可持久化路径，并配置备份策略。
- Redis key 前缀应按项目区分，避免多个后台共享 Redis 时冲突。

## 移植检查清单

移植到新项目后逐项确认：

- [ ] `backend/go.mod` module 名称已替换。
- [ ] 前端应用名和品牌文案已替换。
- [ ] `DATABASE_URL` 指向新项目 PostgreSQL。
- [ ] Redis 地址、密码、DB 和 key 前缀已设置。
- [ ] `JWT_SECRET`、`REFRESH_TOKEN_SECRET` 已换成新密钥。
- [ ] 生产环境已设置 `MFA_SECRET_ENCRYPTION_KEY`。
- [ ] `ADMIN_BOOTSTRAP_EMAIL` 和 `ADMIN_BOOTSTRAP_PASSWORD` 已配置。
- [ ] `ADMIN_BASE_PATH` 和 `VITE_ADMIN_BASE` 一致。
- [ ] `frontend/dist` 已重新构建。
- [ ] `/api/healthz` 返回数据库和 Redis 正常。
- [ ] 超级管理员可以登录。
- [ ] 管理员、角色、权限矩阵、会话、审计、设置、个人资料页面可访问。
- [ ] MFA 设置和 MFA 登录可用。
- [ ] 头像上传目录可写。
- [ ] 演示模块已按项目需要删除或保留。
- [ ] `cd backend && go test ./...` 通过。
- [ ] `cd frontend && npm run typecheck` 通过。
- [ ] `cd frontend && VITE_ADMIN_BASE=/admin npm run build` 通过。

## 给 Codex 的执行提示

在这个项目里继续开发时，优先遵守下面的顺序：

1. 先读本文件和当前任务要求。
2. 再检查相关源码，不要凭通用后台经验猜实现。
3. 修改前先确认功能属于基础系统、业务模块还是 demo 模块。
4. 后端安全边界必须由后端接口和权限中间件保证。
5. 前端只负责体验层权限隐藏，不能替代后端鉴权。
6. 新增业务功能必须同步补齐权限、路由、导航、接口、类型、多语言和验证命令。
7. 不要把真实密码、真实 token、真实密钥写入代码或文档。
