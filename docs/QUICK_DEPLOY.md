# ⚡ SunnyCloud - Cloudflare 快速部署指南

> 🚀 本指南帮助你在 10 分钟内完成从 GitHub 克隆到 Cloudflare 上线的全部流程！

## 📋 前置要求

| 项目 | 要求 |
|------|------|
| **Cloudflare 账号** | 免费注册即可：[cloudflare.com](https://dash.cloudflare.com/sign-up) |
| **Node.js** | 18.0 或更高版本 |
| **npm** | 随 Node.js 一起安装 |

---

## 🎯 一键部署步骤

### Step 1️⃣ 克隆项目

```bash
git clone https://github.com/your-username/sunnycloud.git sunnycloud
cd sunnycloud
```

### Step 2️⃣ 安装依赖

```bash
# 安装前端依赖
npm install

# 安装后端依赖
cd workers
npm install
cd ..
```

### Step 3️⃣ 安装并登录 Wrangler CLI

```bash
# 全局安装 Wrangler（Cloudflare 官方CLI）
npm install -g wrangler

# 登录你的 Cloudflare 账号（会打开浏览器授权）
wrangler login
```

### Step 4️⃣ 创建 Cloudflare 云资源

```bash
# 创建 D1 数据库
wrangler d1 create sunnycloud-db

# 创建 R2 存储桶
wrangler r2 bucket create sunnycloud-files
```

> ⚠️ **重要**: 执行 `wrangler d1 create` 后会输出类似下面的内容，请**记下 `database_id`**：
> ```
> [[d1_databases]]
> binding = "DB"
> database_name = "sunnycloud-db"
> database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  ← 复制这个！
> ```

### Step 5️⃣ 更新配置文件

用文本编辑器打开 `workers/wrangler.toml`，找到以下位置并替换 `database_id`：

```toml
[[d1_databases]]
binding = "DB"
database_name = "sunnycloud-db"
database_id = "你的database_id"   # ← 替换成 Step 4 中获取的ID
```

**可选配置**：如果你有自己的域名，也可以修改：
```toml
[vars]
SITE_URL = "https://你的域名.com"
API_URL = "https://api.你的域名.com"
```

### Step 6️⃣ 初始化数据库

```bash
cd workers

# 执行数据库迁移（远程生产环境）
wrangler d1 execute sunnycloud-db --file=./migrations/0001_initial.sql --remote
wrangler d1 execute sunnycloud-db --file=./migrations/0002_file_groups.sql --remote
wrangler d1 execute sunnycloud-db --file=./migrations/0003_expiration.sql --remote

cd ..
```

### Step 7️⃣ 配置登录账号

打开 `workers/src/index.ts`，找到 `ALLOWED_USERS` 数组（约第 185 行），修改为你自己的账号密码：

```typescript
const ALLOWED_USERS = [
  { email: '你的邮箱@example.com', password: '你的密码', userId: 1 },
  // 可添加更多账号...
];
```

### Step 8️⃣ 部署后端 API (Workers)

```bash
cd workers

# 部署到 Cloudflare Workers
npm run deploy

cd ..
```

✅ 成功后会显示你的 Workers URL，例如：
```
https://sunnycloud-api.你的用户名.workers.dev
```

### Step 9️⃣ 部署前端 (Pages)

**方法 A：通过 Cloudflare 网站直连 GitHub（推荐）** 👇

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 点击左侧菜单 **Workers & Pages**
3. 点击 **Create** → **Pages** → **Connect to Git**
4. 选择你 fork 或上传的 GitHub 仓库
5. 配置构建设置：

   | 设置项 | 值 |
   |--------|-----|
   | Framework preset | `Next.js (Static HTML Export)` |
   | Build command | `npm run build` |
   | Build output directory | `out` |

6. 添加环境变量：
   - `NEXT_PUBLIC_API_URL`: 你的 Workers API 地址（如 `https://sunnycloud-api.你的用户名.workers.dev`）

7. 点击 **Save and Deploy**，等待构建完成（约 1-2 分钟）

**方法 B：命令行直接部署**

```bash
# 构建静态文件
npm run build

# 部署到 Cloudflare Pages
npx wrangler pages deploy out --project-name=sunnycloud
```

---

## 🎉 部署完成！

恭喜！你的个人云盘已经部署成功：

- **前端地址**: `https://sunnycloud.pages.dev` （或你的自定义域名）
- **后端 API**: `https://sunnycloud-api.你的用户名.workers.dev`

使用你在 Step 7 设置的账号密码登录即可开始使用！

---

## 🔧 可选：配置自定义域名

如果你有自己的域名，可以配置自定义域名访问：

### 配置 Workers 自定义域名（API）

1. 进入 Cloudflare Dashboard → 选择你的域名
2. 左侧菜单选择 **Workers 路由**
3. 添加路由：
   - **路由**: `api.你的域名.com/*`
   - **Worker**: `sunnycloud-api`

### 配置 Pages 自定义域名（前端）

1. 进入 Workers & Pages → 选择 `sunnycloud` 项目
2. 点击 **Custom domains**
3. 添加你的域名，例如 `pan.你的域名.com`

---

## 🌓 主题切换功能

SunnyCloud 支持明暗主题切换：

- **默认主题**: 跟随系统偏好设置
- **手动切换**: 点击页面右上角的太阳/月亮图标
- **自动保存**: 主题偏好会保存到本地，下次访问时自动应用

---

## ❓ 常见问题

### Q: 部署后登录失败怎么办？

检查 `workers/src/index.ts` 中的 `ALLOWED_USERS` 配置是否正确，修改后需要重新执行：
```bash
cd workers && npm run deploy
```

### Q: 上传文件失败？

检查 R2 存储桶是否创建成功：
```bash
wrangler r2 bucket list
```

### Q: 如何添加更多用户？

编辑 `workers/src/index.ts` 中的 `ALLOWED_USERS` 数组，添加新用户后重新部署：
```typescript
const ALLOWED_USERS = [
  { email: 'user1@example.com', password: 'pass1', userId: 1 },
  { email: 'user2@example.com', password: 'pass2', userId: 2 },
  { email: 'user3@example.com', password: 'pass3', userId: 3 },  // 新增
];
```

### Q: 免费额度够用吗？

对于个人使用完全足够！Cloudflare 免费额度：
- Workers: 100,000 请求/天
- D1: 5GB 存储 + 500万行读取/天
- R2: 10GB 存储
- Pages: 无限带宽

---

## 📚 更多资源

- 📖 [完整教程](./TUTORIAL.md) - 详细的开发和部署教程
- 📝 [API 文档](../README.md#-api-接口) - 后端接口说明

---

*最后更新: 2026年1月20日*
