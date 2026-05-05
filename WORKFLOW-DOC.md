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