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
| 编写GitHub Actions | `.github/workflows/deploy.yml` | CI/CD流程 |
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

## 四、GitHub 工作流（deploy.yml）详解

```
触发条件：
  - push 到任意分支（自动部署）
  - workflow_dispatch（手动触发）

环境：
  - Node.js 22
  - ubuntu-latest

步骤：
  1. Checkout 代码
  2. 安装 Node.js 22
  3. 安装依赖（npm ci）
  4. 安装 opennextjs-cloudflare
  5. patch.js 注入 OAuth 和 PayPal 密钥到 wrangler.jsonc
  6. 构建 + 部署（npm run deploy）
     - 自动注入 CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, REMOVE_BG_API_KEY 等密钥
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
│       └── deploy.yml             ← CI/CD部署流程
├── open-next.config.ts            ← OpenNext Cloudflare适配器配置
├── wrangler.jsonc                 ← Cloudflare Workers配置
├── patch.js                       ← 部署前注入密钥的脚本
├── next.config.ts
├── package.json
└── MVP-REQ.md                     ← 需求文档
```

---

## 七、新功能开发流程示例

以"新增PayPal支付功能"为例：

1. **本地开发** → 在 `src/app/pricing/` 新增付费页面
2. **测试** → `npm run dev` 验证功能
3. **提交** → `git add . && git commit -m "feat: add PayPal pricing page" && git push`
4. **自动部署** → GitHub Actions 检测到 push，自动运行 `deploy.yml` → 构建 → 部署到 Cloudflare
5. **验证** → 访问 `https://image-background-remover.xiadieliuying.workers.dev/pricing`

---

## 八、当前项目状态

| 项目 | 状态 | 说明 |
|------|------|------|
| MVP功能（去背） | ✅ 已上线 | 核心功能正常 |
| Google OAuth登录 | ✅ 已完成 | 需登录才能使用 |
| PayPal支付 | ✅ 沙箱已完成 | 订阅+积分包双模式 |
| 付费UI | ✅ 已完成 | pricing页面 |
| CI/CD自动化 | ✅ 已配置 | push即自动部署 |