# Image Background Remover 项目工作流文档

## 一、项目信息

| 项目 | 内容 |
|------|------|
| 产品名称 | Image Background Remover |
| 核心功能 | 上传图片，一键移除背景，返回透明PNG |
| 技术栈 | Next.js (App Router) + Tailwind CSS + Remove.bg API |
| 部署平台 | Cloudflare Workers |
| 仓库 | https://github.com/xiadieliuying-droid/image-background-remover |
| 访问地址 | https://image-background-remover.xiadieliuying.workers.dev |

---

## 二、完整开发流程（从需求到上线）

### 阶段1：需求确认
| 环节 | 操作 | 产出物 |
|------|------|--------|
| 用户提出需求 | 用户描述需求，AI整理成文档 | `MVP-REQ.md` |
| 需求评审 | 确认功能范围、优先级、技术可行性 | 需求确认 |
| 技术方案设计 | 确定架构、技术栈、API方案 | 技术方案 |

### 阶段2：项目初始化
| 环节 | 操作 | 命令/产出物 |
|------|------|------------|
| 创建GitHub仓库 | 手动在GitHub创建 | 仓库地址 |
| 克隆到本地 | `git clone <repo>` | 本地项目目录 |
| 初始化Next.js | `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir` | 项目骨架 |
| 安装依赖 | `npm install axios` 等 | `package.json` |
| 配置环境变量 | 创建 `.env.example` | 环境变量模板 |
| 推送初始代码 | `git add . && git commit -m "init" && git push` | 初始commit |

### 阶段3：功能开发
| 环节 | 操作 | 产出物 |
|------|------|--------|
| 编写前端页面 | `src/app/page.tsx` — 上传+预览+结果展示 | 前端代码 |
| 编写后端API | `src/app/api/remove/route.ts` — 调用Remove.bg | API代码 |
| 样式开发 | `src/app/globals.css` + Tailwind | 样式文件 |
| 本地测试 | `npm run dev` → 浏览器访问 http://localhost:3000 | 功能验证 |

### 阶段4：部署配置
| 环节 | 操作 | 产出物 |
|------|------|--------|
| 安装Cloudflare适配器 | `npm install opennextjs-cloudflare @opennextjs/cloudflare` | 依赖 |
| 配置open-next | `open-next.config.ts` | 适配器配置 |
| 配置wrangler | `wrangler.jsonc` + patch.js | 部署配置 |
| 配置Secrets | 在GitHub仓库 Settings → Secrets 添加所有密钥 | GitHub Secrets |
| 测试构建 | `npm run build` | 构建产物 |
| 手动部署测试 | `npm run deploy` | 验证部署 |

### 阶段5：CI/CD自动化
| 环节 | 操作 | 产出物 |
|------|------|--------|
| 编写GitHub Actions | `.github/workflows/ci-cd.yml` | CI/CD流程 |
| 推送触发部署 | `git push` | 自动部署 |
| 验证上线 | 访问 workers URL | 上线确认 |

### 阶段6：迭代维护
| 环节 | 操作 |
|------|------|
| 本地开发 | 修改代码 → `npm run dev` 测试 |
| 提交代码 | `git add . && git commit -m "描述" && git push` |
| 自动部署 | GitHub Actions 自动构建并部署到Cloudflare Workers |

---

## 三、密钥管理清单

### 3.1 GitHub Secrets（部署用）
| 密钥名 | 用途 | 必需 |
|--------|------|------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare Workers 部署授权 | ✅ |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 账户ID | ✅ |
| `REMOVE_BG_API_KEY` | Remove.bg API（核心功能） | ✅ |
| `GOOGLE_CLIENT_ID` | Google OAuth 登录 | ✅ |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 登录 | ✅ |
| `PAYPAL_CLIENT_ID` | PayPal 支付 | ✅（可选） |
| `PAYPAL_CLIENT_SECRET` | PayPal 支付 | ✅（可选） |

### 3.2 本地环境变量（.env.local / .dev.vars）
| 变量名 | 用途 |
|--------|------|
| `REMOVE_BG_API_KEY` | 本地开发调用Remove.bg |
| `CLOUDFLARE_API_TOKEN` | 本地 wrangler 部署 |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 账户ID |
| `GOOGLE_CLIENT_ID` | Google OAuth（本地测试登录） |
| `GOOGLE_CLIENT_SECRET` | Google OAuth（本地测试登录） |
| `PAYPAL_CLIENT_ID` | PayPal 沙箱 |
| `PAYPAL_CLIENT_SECRET` | PayPal 沙箱 |

---

## 四、GitHub 工作流（ci-cd.yml）详解

```
触发条件：
  - push 到 main 分支（自动部署）
  - pull_request（检查）
  - workflow_dispatch（手动触发）

环境：
  - Node.js 22
  - ubuntu-latest

Job 串联（必须前面的成功才能跑后面的）：
  lint → build → test → deploy → status

步骤：
  1. Checkout 代码
  2. Lint（ESLint + TypeScript检查）
  3. Build（Next.js生产构建）
  4. Test（预留测试位）
  5. patch.js 注入 OAuth 和 PayPal 密钥到 wrangler.jsonc
  6. 构建 + 部署（npm run deploy）
     - 自动注入 CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, REMOVE_BG_API_KEY 等密钥
  7. 部署后健康检查（curl验证200）
  8. 汇总部署状态
```

---

## 五、本地开发命令

| 命令 | 作用 |
|------|------|
| `npm run dev` | 本地开发服务器（http://localhost:3000） |
| `npm run build` | 构建生产版本 |
| `npm run deploy` | 部署到 Cloudflare Workers |
| `npx wrangler whoami` | 检查 Cloudflare 登录状态 |

---

## 六、目录结构

```
image-background-remover/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── remove/
│   │   │       └── route.ts       ← 去背API接口
│   │   ├── layout.tsx
│   │   ├── page.tsx               ← 主页面
│   │   └── globals.css
│   └── lib/
│       └── remove.ts              ← Remove.bg 调用封装
├── public/                        ← 静态资源
├── .github/
│   └── workflows/
│       ├── deploy.yml          ← 简单部署流程（旧）
│       └── ci-cd.yml           ← 完整CI/CD流程（Lint→Build→Test→Deploy→Status）
├── open-next.config.ts            ← OpenNext Cloudflare适配器配置
├── wrangler.jsonc                 ← Cloudflare Workers配置
├── patch.js                       ← 部署前注入密钥的脚本
├── next.config.ts
├── package.json
└── MVP-REQ.md                     ← 需求文档
```

---

## 七、开发问题与解决方案（真实踩坑记录）

> 以下全是实际遇到的问题，不是瞎编。每个问题都有根因和解决方法。

---

### 问题1：D1 数据库连接失败 — `db_not_configured`

**现象**
```
https://image-background-remover.xiadieliuying.workers.dev/?error=db_not_configured
❌ 服务配置问题，请联系支持
```

**根因**
Next.js Edge Runtime 中，`process.env.DB` 无法读取 Cloudflare Workers 的 D1 绑定。用的是旧版 `process.env.DB` 而不是 `getCloudflareContext()`。

**解决方法**
```typescript
// 错误写法
const db = env.DB as D1Database;

// 正确写法
import { getCloudflareContext } from '@opennextjs/cloudflare';
const ctx = getCloudflareContext();
const db = ctx.binding.D1; // 或 ctx.d1
```

---

### 问题2：Google OAuth 登录后 D1 写入失败 — `D1_TYPE_ERROR: Type 'undefined' not supported`

**现象**
```
https://image-background-remover.xiadieliuying.workers.dev/?error=auth_failed&detail=user_query_error%3A%20D1_TYPE_ERROR%3A%20Type%20%27undefined%27%20not%20supported%20for%20value%20%27undefined%27
```

**根因**
Google OAuth2 `/userinfo` 接口返回的用户字段是 `id` 而不是 `sub`，代码里一直用 `userInfo.sub` 导致绑定值是 `undefined`。

**解决方法**
```typescript
// 错误写法
const googleId = userInfo.sub;

// 正确写法（Google OAuth2 用 id 字段）
const googleId = userInfo.id; // Google 返回的是 id 不是 sub
```

涉及修改：interface 定义、校验逻辑、数据库查询、JWT payload

---

### 问题3：JWT Token 验证始终失败

**现象**
登录后页面仍然提示未登录，Token 验证不通过。

**根因**
Token 生成和验证用的 secret key 不一致：
- 生成时用：`'image-background-remover-secret-key'`
- 验证时用：`'your-secret-key-change-in-production'`

**解决方法**
统一 secret key，确保 `JWT_SECRET_KEY` 在所有环境中一致，且不暴露在前端代码里。

---

### 问题4：API 地址写死导致跨环境失效

**现象**
本地能正常使用，部署到 Workers 后前端调用的 API 地址还是本地地址。

**根因**
前端代码里写了硬编码的 Workers URL，没有用相对路径。

**解决方法**
```typescript
// 错误写法
const API_URL = 'https://image-remove-worker.xiadieliuying.workers.dev/api/remove';

// 正确写法（相对路径，自动适配部署环境）
const API_URL = '/api/remove';
```

---

### 问题5：GitHub Actions 部署时 page.tsx 修改没生效

**现象**
本地代码已更新，但 GitHub Actions 跑的还是旧版本，部署后功能没有更新。

**根因**
commit 时只推送了部分文件（API 文件），`page.tsx` 漏掉了没有 commit。

**解决方法**
每次 commit 前用 `git status` 确认所有修改的文件都已 staged。或者用 `git add .` 暂存所有修改。

---

### 问题6：useEffect 中变量重复声明导致构建失败

**现象**
```
Error: Cannot access 'params' before initialization
```

**根因**
`useEffect` 内部用 `const params = ...` 声明了变量，但外层也有同名 `params`，导致重复声明。

**解决方法**
外层和内层变量不要同名，或者把 `useEffect` 内的逻辑抽成独立函数。

---

### 问题7：环境变量未正确注入导致生产环境报错

**现象**
本地 `npm run dev` 正常，部署后出现 `xxx is undefined` 或配置缺失报错。

**根因**
GitHub Actions 部署时没有把所有必需的环境变量（Secrets）传入，导致生产环境缺少配置。

**解决方法**
在 GitHub 仓库 Settings → Secrets 添加所有密钥：
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `REMOVE_BG_API_KEY`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET`

并在 `wrangler.jsonc` 中通过 `patch.js` 脚本将 Secrets 动态注入。

---

### 问题8：PayPal 沙箱费率导致套餐亏本

**现象**
定价 $10.99/月的 Starter 套餐，实际 PayPal 收费约 $11.30（含 2.99%+$0.30），出现负利润。

**根因**
定价未计算 PayPal 交易费率（2.99% + $0.30/笔）。

**解决方法**
重新定价，确保利润空间：
| 套餐 | 最低定价建议 |
|------|------------|
| Starter | ≥ $11.99/月 |
| Professional | ≥ $34.99/月 |
| Business | ≥ $86.99/月 |

---

### 问题9：opennextjs-cloudflare adapter 缺失导致构建失败

**现象**
GitHub Actions 报错，提示找不到 `@opennextjs/cloudflare`。

**根因**
依赖没有安装或版本不对。

**解决方法**
```bash
npm install opennextjs-cloudflare @opennextjs/cloudflare
```
在 CI/CD 的 install 步骤后也要执行：
```yaml
- name: Install dependencies
  run: |
    npm ci
    npm install opennextjs-cloudflare @opennextjs/cloudflare
```

---

### 问题10：Workers 域名被墙导致国内访问失败

**现象**
部署成功，但国内用户无法访问。

**根因**
`.workers.dev` 域名在国内无法访问。

**解决方法**
绑定自有域名（如 `img.xxxx.com`），通过 CNAME 解析到 Workers，避免被墙。

---

### 问题11：GitHub token 缺少 workflow 权限，无法推送 workflow 文件

**现象**
```
! [remote rejected] main -> main (refusing to allow an OAuth application to create or modify workflow files without workflow scope)
```

**根因**
使用的 GitHub token 没有 `workflow` scope，无法创建或修改 `.github/workflows/` 下的文件。

**解决方法**
1. **手动创建 workflow 文件**：在 GitHub 仓库页面直接创建 `.github/workflows/deploy.yml`
2. **更换 token**：使用带有 `workflow` scope 的 token

---

### 问题12：Cloudflare token 权限不足 — membership error

**现象**
手动 `wrangler deploy` 能成功，但通过 `@opennextjs/cloudflare` 部署时报错：
```
error: Workers API: access denied (if you are a member of an account, you may need to request permission to access that account)
```

**根因**
token 只有 Pages API 权限，没有 Workers 权限。`@opennextjs/cloudflare` 使用 Workers API 部署，需要 token 有 Workers 权限。

**解决方法**
在 Cloudflare Dashboard 创建新 API Token，权限要求：
- ✅ Workers
- ✅ Pages

---

### 问题13：Cloudflare token 缺少 D1 权限导致直接 API 调用失败

**现象**
本地直接 curl 调用 D1 REST API 返回 403 Forbidden。
```
curl https://api.cloudflare.com/client/v4/accounts/{id}/d1/database/{db_id} -H "Authorization: Bearer {token}"
→ {"success": false, "errors": [{"code": 10000, "message": "Forbidden"]}]
```

**根因**
token 没有 D1 API 权限。不过项目使用 `getCloudflareContext()` 在 Workers 运行时访问 D1，不需要 D1 API 权限。

**解决方法**
- 如果只需要在 Workers 运行时用 D1 → 不需要额外的 D1 API 权限
- 如果需要直接调 D1 REST API → token 需要开通 Account-level D1 Read/Write 权限

---

### 问题14：GitHub token workflow 和 repo 权限分离导致部署流程不稳定

**现象**
同一个项目有的 token 能 push，有的不能；有的有 workflow 权限但无法部署。

**根因**
GitHub token 权限是分离的：
- `repo` scope — 能读写仓库代码
- `workflow` scope — 能读写 workflow 文件
- 两个必须同时拥有才能完整跑 CI/CD

**解决方法**
创建 Personal Access Token 时同时勾选 `repo`（所有）和 `workflow`。

---

### 问题15：wrangler deploy 找不到命令 — 依赖未装

**现象**
本地 `wrangler deploy` 报错 command not found，或者部署时找不到 `@opennextjs/cloudflare`。

**根因**
wrangler 和 opennextjs-cloudflare adapter 没有全局安装或项目依赖里没有。

**解决方法**
```bash
npm install wrangler opennextjs-cloudflare @opennextjs/cloudflare
```
本地先跑通 `npx wrangler whoami` 确认能连上，再推代码。

---

### 问题16：wrangler login vs API token — 本地部署认证方式混淆

**现象**
`wrangler login` 弹出浏览器登录，但某些环境没有浏览器；或者 token 认证方式不清楚。

**根因**
Cloudflare Wrangler 支持两种认证方式：
- `wrangler login` — 浏览器交互式登录，适合本地开发
- `wrangler config` — 用 API Token，适合 CI/CD 服务器

**解决方法**
本地开发用 `npx wrangler login`，GitHub Actions 用 API Token（通过环境变量 `CLOUDFLARE_API_TOKEN` 自动注入，不需要手动登录）。

---

### 问题17：Google OAuth invalid_client — 凭证配置错误

**现象**
Google 登录报错：`401 invalid_client，flowName=GeneralOAuthFlow`

**根因**
`GOOGLE_CLIENT_ID` 或 `GOOGLE_CLIENT_SECRET` 配置错误，比如：
- 填成了占位符文本（如 `REPLACE_WITH_GITHUB_SECRET`）
- 生产环境和开发环境混用
- Client Secret 填错

**解决方法**
1. 检查 Google Cloud Console → Credentials → OAuth 2.0 Client 配置
2. 确认 Authorized redirect URI 与实际一致
3. 确认 `wrangler.jsonc` 里填的是真实值而不是占位符
4. 部署后如果还报错，用 curl 验证：`curl -X POST https://accounts.google.com/.well-known/openid-configuration`

---

### 问题18：patch.js 注入占位符导致线上的凭证是假的

**现象**
部署后 Google OAuth 报错，但 `.env` 文件里明明有正确的值。

**根因**
`wrangler.jsonc` 里的 secrets 是占位符（如 `REPLACE_WITH_GITHUB_SECRET`），没有通过 `patch.js` 正确替换就打包了。

**解决方法**
在 CI/CD 中，build 之前必须跑 `node patch.js`，确保真实密钥在构建时注入。`patch.js` 读取 `process.env.GOOGLE_CLIENT_ID` 等环境变量，替换 `wrangler.jsonc` 中的占位符。

---

### 问题19：登录成功后页面仍显示未登录 — JWT 密钥不一致

**现象**
Google 登录成功回调，但刷新页面后仍显示未登录，或者提示"登录过期"。

**根因**
JWT token 签名密钥在生成和验证时不匹配：
- 生成时用：`'image-background-remover-secret-key'`
- 验证时用：`'your-secret-key-change-in-production'`

**解决方法**
统一所有环境的 JWT secret key，确保 `generateToken()` 和 `verifyToken()` 用同一个值。

---

### 问题20：Google OAuth callback 用错字段 — id vs sub

**现象**
登录后 D1 写入失败：`D1_TYPE_ERROR: Type 'undefined' not supported for value 'undefined'`

**根因**
Google OAuth2 `/userinfo` 接口返回的字段是 `id` 而不是 `sub`，代码里用 `userInfo.sub` 取到 undefined。

**解决方法**
```typescript
// 错误
const googleId = userInfo.sub;

// 正确
const googleId = (userInfo as any).id;
```
涉及接口定义、校验逻辑、数据库查询、JWT payload 四个地方都要改。

---

### 问题21：Worker GET / 返回 405 — 路由只接受 POST

**现象**
访问网站首页或 GET 请求返回 `405 Method Not Allowed`。

**根因**
Next.js Edge Worker 只暴露了 `POST /api/remove` 等 API 路由，访问 GET `/` 没有对应的 handler。

**解决方法**
这是正常行为，不是报错。Cloudflare Workers 的 Next.js 应用默认只处理 API 路由，前端页面靠 Worker 的默认响应。如果需要 GET 路由响应，可以加一个 `src/app/page.tsx` 作为入口，或者用 `_next/static` 路由。

---

### 问题22：生产环境缺少环境变量导致页面空白或报错

**现象**
本地 `npm run dev` 正常，部署后页面空白或控制台报错 `xxx is undefined`。

**根因**
`.env.local` 里的变量没有加到 GitHub Secrets，或者 `patch.js` 没有在构建前运行。

**解决方法**
1. 确认所有环境变量都加到 GitHub Secrets
2. 确认 `patch.js` 在 CI/CD build 步骤之前运行
3. 可以在本地先跑 `npm run build` 看是否有变量缺失的警告

---

### 问题23：Cloudflare Pages 部署返回 404 — 构建产物格式不兼容

**现象**
Cloudflare Pages 原生 GitHub 集成部署后返回 404，但 wrangler deploy 正常。

**根因**
Cloudflare Pages 的构建系统不知道如何处理 `@opennextjs/cloudflare` 的 Worker 输出格式（OpenNext 输出的是 Worker bundle，不是静态文件）。

**解决方法**
不要用 Pages 原生 GitHub 集成，改为用 `@opennextjs/cloudflare` + `wrangler deploy` 方式部署到 Workers。

---

### 问题24：GitHub Push Protection 拦截包含密钥的 commit

**现象**
`git push` 被拒绝：`Push cannot contain secrets`，commit 被 GH013 规则拦截。

**根因**
文档或代码里写了完整密钥（如 `sk-api-xxxx`、`ghp_xxxx` 等），GitHub 扫描到后自动阻止推送。

**解决方法**
1. 用 `git reset --soft HEAD~1` 撤销 commit
2. 修改文件，把完整密钥改成缩略形式（如 `sk-api-xxxx...`）
3. 重新 commit + push

---

### 问题25：session compaction 导致上下文丢失 — 重要记忆被遗忘

**现象**
开新会话后 AI 不记得之前的决定、上下文或已做过的操作。

**根因**
session 被压缩（compaction）时，只有 summary 被保留，详细历史丢失。tdai_conversation_search 向量搜索索引仍然有效，但当前 session 的上下文需要从 memory/tdai 中恢复。

**解决方法**
1. 重要内容必须写入 `memory/YYYY-MM-DD.md`
2. 新会话开始时先调用 `tdai_memory_search` / `tdai_conversation_search` 恢复上下文
3. 避免在同一个 session 内做太多决策而不记录

---

### 问题26：Workers 部署到旧域名导致请求打到废弃的 Worker

**现象**
部署了新代码，但网站行为没变；或者返回 405/500 而旧版本正常。

**根因**
GitHub Actions 配置的 worker 名称是 `image-background-remover`，但 DNS 可能还指向旧的 `image-remove-worker`（已废弃，返回 405）。

**解决方法**
确认 Workers 名称配置一致，删除废弃的 Worker 或确保 DNS 指向正确的 worker。

---

## 八、（可选模块）账号登录系统

适用于：**出海产品 / 需要用户识别 / 限制匿名使用**

### 技术方案：Google OAuth

| 项目 | 内容 |
|------|------|
| 适用场景 | 出海产品、需确认用户身份、防止滥用 |
| 实现方式 | Google OAuth 2.0（NextAuth.js） |
| 配置位置 | GitHub Secrets → `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` |
| 本地测试 | 需在 `.dev.vars` 中配置相同密钥 |
| 数据存储 | 用户 email + name 存入 D1 数据库 |

### 开发流程

1. 在 [Google Cloud Console](https://console.cloud.google.com/) 创建 OAuth 2.0 Client
2. 配置 Authorized redirect URI：`https://image-background-remover.xiadieliuying.workers.dev/api/auth/callback/google`
3. 添加 GitHub Secrets：`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
4. 修改 `patch.js` 将密钥注入 `wrangler.jsonc`
5. 实现登录逻辑（参考项目中已有的 auth 配置）
6. 提交 → 自动部署

### JWT 会话管理

- 登录成功后生成 JWT token，存储在 cookie 中
- 后续请求通过 token 识别用户身份
- token 验证 secret key 统一使用 `JWT_SECRET_KEY`

---

## 九、（可选模块）支付系统

适用于：**出海产品 / 需要收费 / 订阅或按次付费**

### 技术方案：PayPal 沙箱 + 生产

| 项目 | 内容 |
|------|------|
| 适用场景 | 付费去除背景限制、订阅套餐、积分包 |
| 实现方式 | PayPal REST API（沙箱环境已配置） |
| 配置位置 | GitHub Secrets → `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` |
| 订阅模式 | Starter / Professional / Business 月订阅 |
| 积分包 | 按次购买（10/50/100次） |

### PayPal 费率计算（成本）

| 套餐 | 价格 | 成本（含PayPal费率） | 利润空间 |
|------|------|---------------------|----------|
| Starter | $10.99/月 | $11.30（2.99%+$0.30） | -$0.31（亏） |
| Professional | $32.99/月 | $33.69（2.99%+$0.30） | -$0.70（亏） |
| Business | $84.99/月 | $85.93（2.99%+$0.30） | -$0.94（亏） |

**建议定价策略**：确保每个套餐利润 ≥ $1，需定价到 $11.99 / $34.99 / $86.99 或以上

### 开发流程

1. 在 [PayPal Developer](https://developer.paypal.com/) 创建 App 获取 Client ID + Secret
2. 添加 GitHub Secrets：`PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET`
3. 配置 PayPal 沙箱回调 URL
4. 实现订阅/积分包购买逻辑
5. 测试沙箱支付流程
6. 切换到生产环境（更换密钥）

### 当前状态

- ✅ PayPal 沙箱已配置
- ✅ 订阅套餐（Starter/Professional/Business）+ 积分包双模式
- ✅ pricing 页面已完成
- ⚠️ 生产环境需切换为真实 PayPal 密钥

---

## 十、新功能开发流程示例

### 示例A：新增可选模块（以Google登录为例）

1. 在 Google Cloud Console 创建 OAuth Client
2. 添加 GitHub Secrets：`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
3. 修改 `patch.js` 注入密钥
4. 编写登录页面和 API 路由
5. 本地测试 → `npm run dev`
6. 提交 → `git push` → GitHub Actions 自动部署
7. 验证 → 访问网站跳转 Google 登录

### 示例B：新增付费功能（以订阅套餐为例）

1. 在 PayPal 开发者平台创建订阅产品
2. 添加 GitHub Secrets：`PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET`
3. 实现 `/api/subscribe` 接口
4. 配置 PayPal Webhook 回调
5. 测试沙箱支付
6. 提交 → 部署 → 上线

### 示例C：常规功能迭代

1. 本地开发 → 修改代码
2. 测试 → `npm run dev`
3. 提交 → `git add . && git commit -m "描述" && git push`
4. GitHub Actions 自动跑：Lint → Build → Test → Deploy
5. 验证上线 → 访问 workers URL

---

## 十一、当前项目状态

| 项目 | 状态 | 说明 |
|------|------|------|
| MVP功能（去背） | ✅ 已上线 | 核心功能正常 |
| Google OAuth登录 | ✅ 可选模块 | 出海需求可接入 |
| PayPal支付 | ✅ 可选模块 | 出海需求可接入 |
| 付费UI（pricing） | ✅ 可选模块 | 已完成 |
| CI/CD自动化 | ✅ 已配置 | push即自动部署 |