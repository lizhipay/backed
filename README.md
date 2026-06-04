# Backed Admin

Backed Admin 是一套可移植的通用后台管理系统模板。它提供 React + Material UI 前端、Go API、PostgreSQL 持久化、Redis 会话、管理员、角色、按钮级权限、审计日志、个人资料、头像、MFA 和多语言能力。

这个仓库的重点不是让你手工复制代码，而是让 Codex、Cursor、Claude Code 等 AI 编程助手快速理解项目结构，并把这套后台移植到你的业务系统里。

## 技术栈

- 前端：Vite、React、TypeScript、Material UI、MUI X Data Grid、MUI X Charts、React Router、TanStack Query、Zustand、i18next。
- 后端：Go、chi、pgx、go-redis、JWT、Argon2id、TOTP、slog。
- 数据库：PostgreSQL。
- 会话：Redis。
- 后台默认地址：`/admin`。
- API 默认前缀：`/api`。

更多内部结构和移植细节见 [CODEX_PROJECT_GUIDE.md](./CODEX_PROJECT_GUIDE.md)。

## 快速启动

复制环境变量示例：

```bash
cp .env.example .env.local
```

编辑 `.env.local`，填入你的 PostgreSQL、Redis、JWT、Refresh、Bootstrap 管理员等配置。

启动：

```bash
./dev.sh
```

默认访问：

```text
http://127.0.0.1:5175/admin
```

常用验证：

```bash
cd backend && go test ./...
cd backend && go vet ./...
cd frontend && npm run lint
cd frontend && npm run typecheck
cd frontend && VITE_ADMIN_BASE=/admin npm run build
```

## 适合交给 AI 的项目说明

让 AI 接手这个项目时，建议先让它读取：

- `README.md`
- `CODEX_PROJECT_GUIDE.md`
- `backend/internal/permissions/catalog.go`
- `frontend/src/app/router/AppRouter.tsx`
- `frontend/src/foundation/layout/navConfig.tsx`
- `frontend/src/foundation/api/client.ts`

如果要新增后端能力，让 AI 继续读：

- `backend/migrations`
- `backend/internal/store`
- `backend/internal/http`
- `backend/internal/bootstrap/bootstrap.go`

如果要新增前端页面，让 AI 继续读：

- `frontend/src/features`
- `frontend/src/foundation/ui`
- `frontend/src/foundation/permissions`
- `frontend/src/foundation/i18n/resources.ts`

## 提示词示例

下面的提示词可以直接复制给 Codex 或其他 AI 编程助手使用。

### 1. 快速理解项目

```text
请先阅读 README.md 和 CODEX_PROJECT_GUIDE.md，然后用 20 条以内总结这个后台管理系统的技术栈、目录结构、认证流程、权限模型、数据库设计、Redis 会话设计、前端路由方式和移植注意事项。

不要修改代码。总结必须指出哪些目录是基础系统，哪些目录是演示模块，以及移植到其他项目时必须替换哪些配置。
```

### 2. 移植到我的现有 Go 项目

```text
我要把这个 Backed Admin 后台移植到我的现有 Go 项目里。

请先阅读 README.md、CODEX_PROJECT_GUIDE.md、backend/cmd/api/main.go、backend/internal/config/config.go、backend/internal/http/server.go、frontend/src/app/router/AppRouter.tsx。

然后给我一份迁移方案，要求：
1. 保留当前后台的管理员、角色、权限、MFA、审计、会话、设置、个人资料功能。
2. 后台页面仍挂载到 /admin。
3. API 仍使用 /api 前缀，除非我的项目已有冲突。
4. PostgreSQL 继续保存长期数据，Redis 继续保存会话。
5. 列出需要复制的目录、需要改名的 Go module、需要合并的环境变量、需要新增的 migration。
6. 不要写代码，先输出完整计划。
```

### 3. 让 AI 直接执行移植

```text
请按照 README.md 和 CODEX_PROJECT_GUIDE.md，把 Backed Admin 移植到当前项目。

执行要求：
1. 先检查当前项目已有的后端入口、路由、中间件、数据库连接、Redis 连接和前端构建方式。
2. 不要覆盖我已有业务代码。
3. 如果已有 /api 或 /admin 冲突，先报告冲突并给出替代挂载方案。
4. 合并认证、权限、管理员、角色、MFA、审计、会话、设置、个人资料功能。
5. 保留前端 Material UI 后台布局。
6. 移除 frontend/src/demo 演示模块。
7. 所有真实密码、JWT 密钥、Redis 密码都只能通过环境变量读取。
8. 最后运行后端测试、前端 typecheck 和前端 build，并报告结果。
```

### 4. 新增一个业务模块

```text
请在这个后台系统里新增一个“订单管理”真实业务模块。

要求：
1. 后端新增 PostgreSQL migration、store、HTTP handler 和权限 key。
2. 权限至少包括 orders.view、orders.create、orders.update、orders.delete。
3. 前端新增订单列表页、创建/编辑弹窗、删除确认、搜索、分页、状态筛选。
4. 导航加入“订单管理”，只有 orders.view 权限可见。
5. 按钮使用 Can 控制，页面使用 RequirePermission 控制。
6. 所有文案补齐简体中文、繁体中文、日语、英语。
7. 写操作写入 audit_logs。
8. 最后运行 go test、go vet、npm run lint、npm run typecheck、VITE_ADMIN_BASE=/admin npm run build。

开始前先读 CODEX_PROJECT_GUIDE.md、backend/internal/permissions/catalog.go、frontend/src/foundation/layout/navConfig.tsx 和 frontend/src/features/access/AccessPages.tsx。
```

### 5. 只生成后端 CRUD

```text
请基于这个项目的 Go 后端风格，为 products 资源生成完整 CRUD 后端。

要求：
1. 新增 migration，表名 products。
2. 新增权限 products.view、products.create、products.update、products.delete。
3. 新增 store 方法，遵循 backend/internal/store 的现有风格。
4. 新增 HTTP handler，遵循 backend/internal/http/resources.go 的响应格式和错误处理方式。
5. 列表接口支持 q、page、page_size。
6. 创建、更新、删除写入 audit_logs。
7. bootstrap 的 admin 角色默认获得新权限，readonly 只获得 products.view。
8. 不改前端。
9. 最后运行 cd backend && go test ./... && go vet ./...。
```

### 6. 只生成前端页面

```text
请只在前端新增一个 products 管理页面，对接已有后端 /api/products。

要求：
1. 使用当前项目已有的 DataTable、PageHeader、ConfirmDialog、StatusBadge。
2. 页面放在 frontend/src/features/products。
3. 路由挂到 /products。
4. 导航加入“商品管理”。
5. 权限使用 products.view、products.create、products.update、products.delete。
6. API 类型写到 frontend/src/foundation/api/types.ts。
7. 文案补齐 zh-CN、zh-TW、ja-JP、en-US。
8. 不改后端。
9. 最后运行 npm run lint、npm run typecheck、VITE_ADMIN_BASE=/admin npm run build。
```

### 7. 删除演示页面

```text
请把这个后台里的演示页面全部删除，只保留真实基础系统。

要求：
1. 删除 frontend/src/demo。
2. 确认左侧导航不再显示 Demo Pages。
3. 确认 /demo/* 路由不再存在。
4. 不影响 Dashboard、管理员、角色、权限、会话、审计、设置、个人资料。
5. 运行 rg -i "demo|faker|mock|placeholder|example\\.com" frontend/src backend。
6. 运行 npm run typecheck 和 VITE_ADMIN_BASE=/admin npm run build。
```

### 8. 修改后台挂载路径

```text
请把后台挂载路径从 /admin 改成 /console。

要求：
1. 前端构建 base 使用 VITE_ADMIN_BASE=/console。
2. 后端 ADMIN_BASE_PATH 使用 /console。
3. Go 静态文件挂载必须继续支持前端 browser router 刷新。
4. README 和部署说明里的访问地址同步更新。
5. 不改变 /api 前缀。
6. 最后验证 /console、/console/login、/console/dashboard 和 /api/healthz。
```

### 9. 接入我自己的业务认证

```text
我有一个已有系统，想复用 Backed Admin 的前端布局、权限页面和后台基础能力，但认证要对接我现有的 SSO。

请先阅读 CODEX_PROJECT_GUIDE.md、frontend/src/foundation/auth、frontend/src/foundation/api/client.ts、backend/internal/middleware/auth.go。

然后给出改造方案：
1. 哪些接口可以保留。
2. 哪些 auth API 需要替换。
3. 前端 CurrentUser 和权限集合如何从 SSO 返回值映射。
4. 后端权限中间件如何接收上游身份。
5. 如何保留 Can 和 RequirePermission 的用法。
6. 不要直接写代码，先给方案。
```

### 10. 权限和审计检查

```text
请审查这个后台系统的权限和审计实现。

重点检查：
1. 是否有后端接口只靠前端隐藏按钮，没有后端权限校验。
2. 写操作是否都写入 audit_logs。
3. super_admin 是否仍然受到禁用、删除、移除角色保护。
4. 管理员是否只通过直接绑定角色获得权限。
5. 是否还有用户组相关权限或接口残留。
6. 会话和 MFA 临时挑战是否已经使用 Redis。

请按严重程度列出问题，带文件路径和行号；不要修改代码。
```

### 11. 生产化部署检查

```text
请按生产部署标准检查这个项目。

检查内容：
1. 是否有真实密码、token、密钥、内网地址写入代码或文档。
2. APP_ENV=production 时 MFA_SECRET_ENCRYPTION_KEY 是否强制配置。
3. JWT_SECRET、REFRESH_TOKEN_SECRET 是否只从环境变量读取。
4. Redis、PostgreSQL、上传目录、CORS、后台挂载路径是否可配置。
5. frontend/dist 是否应该作为构建产物而不是源代码提交。
6. .gitignore 是否覆盖 node_modules、dist、uploads、.env.local、IDE 文件。

请先检查再给整改清单，不要直接修改代码。
```

### 12. 让 AI 生成新项目提示词

```text
请基于 README.md 和 CODEX_PROJECT_GUIDE.md，帮我生成一个可以贴到新 Codex 窗口的提示词。

目标：把 Backed Admin 移植到另一个项目。

提示词必须包含：
1. 技术栈说明。
2. 必须先阅读哪些文件。
3. 哪些功能必须保留。
4. 哪些 demo 内容必须删除。
5. 环境变量和密钥不能写入代码。
6. 验证命令。
7. 如果发现路由、数据库、Redis 或认证冲突，必须先报告。
```

## 移植原则

- 后端是安全边界，所有权限必须由 Go 接口校验。
- 前端权限只负责隐藏或禁用页面和按钮。
- `ADMIN_BASE_PATH` 和 `VITE_ADMIN_BASE` 必须一致。
- PostgreSQL 保存长期数据，Redis 保存会话和 MFA 临时挑战。
- `frontend/src/demo` 是演示模块，可以删除。
- 不要提交 `.env.local`、真实密码、真实 token、真实密钥、上传文件、`node_modules` 和 `frontend/dist`。

## 更多细节

请读 [CODEX_PROJECT_GUIDE.md](./CODEX_PROJECT_GUIDE.md)。它包含目录结构、数据库设计、Redis key 设计、迁移规则、权限模型和移植检查清单。
