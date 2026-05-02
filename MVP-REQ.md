# Image Background Remover — MVP 需求文档

## 1. 项目概述

- **产品名称**: Image Background Remover
- **核心功能**: 上传图片，自动移除背景，返回透明背景的 PNG
- **目标用户**: 需要快速处理图片背景的独立开发者、电商卖家、内容创作者
- **技术栈**: Next.js (App Router) + Tailwind CSS + Remove.bg API

---

## 2. 用户流程

```
用户访问页面
    ↓
上传图片（拖拽或点击选择，支持 JPG/PNG/WebP，单文件 ≤ 10MB）
    ↓
点击"移除背景"按钮
    ↓
显示加载状态（spinner 或进度提示）
    ↓
展示处理结果（原图 + 去背图并排对比）
    ↓
提供"下载"按钮，下载去背图片（PNG 格式）
    ↓
可继续上传新图片重复使用
```

---

## 3. 功能需求

### 3.1 前端页面

| 模块 | 需求描述 |
|------|---------|
| 上传区 | 支持拖拽上传 + 点击选择文件，实时预览缩略图 |
| 文件校验 | 类型限制（JPG/PNG/WebP），大小限制（≤ 10MB），超限提示 |
| 处理按钮 | 上传后点击"移除背景"，防重复提交 |
| 加载状态 | 处理中显示 spinner 或文字提示 |
| 结果展示 | 原图与去背图并排显示，支持滑动对比 |
| 下载按钮 | 一键下载去背图（文件名：original-name-rmbg.png） |
| 错误处理 | API 失败时显示友好错误信息 |

### 3.2 后端 API

- **端点**: `POST /api/remove`
- **请求**: `FormData`，字段名 `image`（文件）
- **响应**: 
  - 成功 → 返回处理后的图片（二进制 PNG，Content-Type: image/png）
  - 失败 → `{ error: "错误描述" }`，HTTP 状态码 4xx/5xx
- **实现**: 调用 Remove.bg API，将返回的图片二进制流透传给前端
- **密钥管理**: Remove.bg API Key 存在环境变量 `REMOVE_BG_API_KEY`，不暴露在前端

### 3.3 页面路由

| 路由 | 说明 |
|------|------|
| `/` | 主页面（上传 + 处理 + 下载） |
| `/api/remove` | 后端去背处理接口 |

---

## 4. 非功能需求

- **样式**: Tailwind CSS，简洁现代风格，适合工具类产品
- **响应式**: 移动端+桌面端均可正常使用
- **性能**: 处理时间通常 3-10 秒（取决于 Remove.bg 响应速度）
- **无需登录**: MVP 阶段不做用户系统

---

## 5. 待后续接入（不属于 MVP）

- [ ] Stripe 订阅付费（限制免费次数）
- [ ] Google AdSense 广告变现
- [ ] 隐私政策页面
- [ ] 服务条款页面
- [ ] Cloudflare Pages 部署配置

---

## 6. 环境变量

```env
REMOVE_BG_API_KEY=你的_remove.bg_api_key
```

---

## 7. 项目初始化命令

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --no-import-alias
npm install axios
```

---

## 8. 验收标准

- [ ] 用户上传图片后可点击"移除背景"
- [ ] 处理完成后显示对比结果
- [ ] 可下载去背图片
- [ ] 文件类型/大小超限有明确提示
- [ ] API 失败时页面不崩溃，显示错误信息
- [ ] `git push` 后 GitHub 仓库有完整代码