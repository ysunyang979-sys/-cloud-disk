# 从零搭建基于 Cloudflare 全家桶的个人云盘系统

> 🎉 完整教程：使用 Next.js + Cloudflare Workers + R2 + D1 构建功能完整的文件存储和分享平台

## 📖 项目介绍

**SunnyCloud** 是一个完全基于 Cloudflare 技术栈搭建的文件存储和分享平台。这个项目展示了如何利用 Cloudflare 的免费资源（每月限额内）构建一个功能完整的云盘系统。

### ✨ 核心功能

- 🔐 用户注册与登录
- 📁 文件上传与管理
- 🔗 生成分享链接
- ⏰ 文件过期时间设置
- 📂 文件分组管理（支持ZIP文件）
- 🌐 全球 CDN 加速
- 🌓 明暗主题切换

### 🛠️ 技术栈一览

| 技术 | 用途 | 说明 |
|------|------|------|
| **Next.js 15** | 前端框架 | React框架，支持SSG静态导出 |
| **Tailwind CSS 4** | 样式 | 原子化CSS框架 |
| **Cloudflare Workers** | 后端API | Serverless边缘计算 |
| **Hono** | Web框架 | 轻量级Workers框架 |
| **Cloudflare D1** | 数据库 | 边缘SQLite数据库 |
| **Cloudflare R2** | 文件存储 | S3兼容对象存储 |
| **Cloudflare Pages** | 前端部署 | 静态网站托管 |

---

## 📁 项目架构

```
sunnycloud/
├── src/                        # 前端源码
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx            # 首页（营销落地页）
│   │   ├── login/page.tsx      # 登录页面
│   │   ├── register/page.tsx   # 注册页面
│   │   ├── dashboard/page.tsx  # 用户仪表盘（核心功能）
│   │   ├── download/page.tsx   # 下载页面
│   │   ├── globals.css         # 全局样式（含主题变量）
│   │   └── layout.tsx          # 布局组件（含主题切换）
│   └── lib/
│       └── apiClient.ts        # API客户端（域名故障转移）
├── workers/                    # 后端 Workers
│   ├── src/
│   │   └── index.ts            # API 路由和业务逻辑
│   ├── migrations/             # D1 数据库迁移
│   │   ├── 0001_initial.sql    # 用户和文件表
│   │   ├── 0002_file_groups.sql # 文件组表
│   │   └── 0003_expiration.sql # 过期时间字段
│   ├── wrangler.toml           # Workers 配置
│   └── package.json            # Workers 依赖
├── public/                     # 静态资源
├── next.config.ts              # Next.js 配置
└── package.json                # 项目依赖
```

---

## 🚀 准备工作

### 1. 环境要求

确保你的开发环境已安装：

- **Node.js** 18.0 或更高版本
- **npm** 或 **pnpm** 包管理器
- **Git** 版本控制
- **Cloudflare 账号**（免费注册）

### 2. 安装 Wrangler CLI

Wrangler 是 Cloudflare 的官方命令行工具：

```bash
# 全局安装 wrangler
npm install -g wrangler

# 验证安装
wrangler --version

# 登录 Cloudflare 账号
wrangler login
```

执行 `wrangler login` 后会打开浏览器，授权后即可开始使用。

---

## 📦 第一部分：创建 Cloudflare 资源

### Step 1: 创建 D1 数据库

D1 是 Cloudflare 的边缘 SQLite 数据库：

```bash
# 创建数据库
wrangler d1 create sunnycloud-db
```

输出示例：
```
✅ Successfully created DB 'sunnycloud-db' in region APAC
Created your database using D1's new storage backend. The new storage backend is...

[[d1_databases]]
binding = "DB"
database_name = "sunnycloud-db"
database_id = "689a75be-d750-42f8-b6b2-ca7bfa884671"
```

> ⚠️ **重要**：记下 `database_id`，后面配置会用到！

### Step 2: 创建 R2 存储桶

R2 是 Cloudflare 的 S3 兼容对象存储：

```bash
# 创建存储桶
wrangler r2 bucket create sunnycloud-files
```

输出示例：
```
✅ Created bucket sunnycloud-files with default storage class set to Standard.
```

### Step 3: 验证资源创建成功

```bash
# 查看 D1 数据库列表
wrangler d1 list

# 查看 R2 存储桶列表
wrangler r2 bucket list
```

---

## 🗄️ 第二部分：设计数据库结构

### 数据库设计思路

我们需要存储三类数据：

1. **用户信息** - 邮箱、密码哈希、注册时间
2. **文件信息** - 文件名、大小、类型、R2存储路径
3. **文件组** - 支持大文件拆分上传和ZIP文件

### 迁移文件 1: 初始表结构

创建 `workers/migrations/0001_initial.sql`：

```sql
-- D1 Database Schema for SunnyCloud
-- Users 表
CREATE TABLE IF NOT EXISTS Users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  hashed_password TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Files 表
CREATE TABLE IF NOT EXISTS Files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT,
  r2_key TEXT UNIQUE NOT NULL,
  upload_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- 创建索引提升查询性能
CREATE INDEX IF NOT EXISTS idx_files_user_id ON Files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_r2_key ON Files(r2_key);
CREATE INDEX IF NOT EXISTS idx_users_email ON Users(email);
```

### 迁移文件 2: 文件组功能

创建 `workers/migrations/0002_file_groups.sql`：

```sql
-- 大文件组表 - 用于存储拆分上传的大文件
CREATE TABLE IF NOT EXISTS FileGroups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  group_name TEXT NOT NULL,           -- 原始文件名
  total_size INTEGER NOT NULL,        -- 总文件大小
  file_count INTEGER NOT NULL,        -- 包含的文件数量
  group_type TEXT DEFAULT 'zip',      -- 类型：zip 或 folder
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- 大文件组中的子文件
CREATE TABLE IF NOT EXISTS FileGroupItems (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL,
  file_name TEXT NOT NULL,            -- 子文件名
  file_size INTEGER NOT NULL,
  file_type TEXT,
  r2_key TEXT UNIQUE NOT NULL,
  upload_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES FileGroups(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_filegroups_user_id ON FileGroups(user_id);
CREATE INDEX IF NOT EXISTS idx_filegroupitems_group_id ON FileGroupItems(group_id);
```

### 迁移文件 3: 添加过期时间

创建 `workers/migrations/0003_expiration.sql`：

```sql
-- 为 Files 表添加过期时间字段
ALTER TABLE Files ADD COLUMN expires_at DATETIME DEFAULT NULL;

-- 为 FileGroups 表添加过期时间字段
ALTER TABLE FileGroups ADD COLUMN expires_at DATETIME DEFAULT NULL;

-- 创建索引以便快速查询过期文件
CREATE INDEX IF NOT EXISTS idx_files_expires_at ON Files(expires_at);
CREATE INDEX IF NOT EXISTS idx_filegroups_expires_at ON FileGroups(expires_at);
```

### 执行迁移

```bash
cd workers

# 远程执行迁移（生产环境）
wrangler d1 execute sunnycloud-db --file=./migrations/0001_initial.sql --remote
wrangler d1 execute sunnycloud-db --file=./migrations/0002_file_groups.sql --remote
wrangler d1 execute sunnycloud-db --file=./migrations/0003_expiration.sql --remote

# 本地执行迁移（开发环境）
wrangler d1 execute sunnycloud-db --file=./migrations/0001_initial.sql --local
wrangler d1 execute sunnycloud-db --file=./migrations/0002_file_groups.sql --local
wrangler d1 execute sunnycloud-db --file=./migrations/0003_expiration.sql --local
```

---

## ⚙️ 第三部分：配置 Cloudflare Workers

### Workers 配置文件

创建 `workers/wrangler.toml`：

```toml
name = "sunnycloud-api"
main = "src/index.ts"
compatibility_date = "2024-12-01"
compatibility_flags = ["nodejs_compat"]

[vars]
ENVIRONMENT = "production"
CORS_ORIGIN = "*"
# 以下变量需要配置为你自己的域名
# SITE_URL = "https://your-domain.com"
# API_URL = "https://api.your-domain.com"

# D1 Database binding
[[d1_databases]]
binding = "DB"
database_name = "sunnycloud-db"
database_id = "你的数据库ID"  # 替换成你的 database_id

# R2 bucket binding
[[r2_buckets]]
binding = "BUCKET"
bucket_name = "sunnycloud-files"

# 定时任务 - 每天凌晨0点清理过期文件
[triggers]
crons = ["0 0 * * *"]
```

### 设置 JWT 密钥

```bash
# 设置生产环境密钥
wrangler secret put JWT_SECRET
# 输入一个安全的随机字符串，例如：sunnycloud-super-secret-jwt-key-2024
```

### Workers 依赖

创建 `workers/package.json`：

```json
{
  "name": "sunnycloud-api",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "deploy:production": "wrangler deploy --env production"
  },
  "dependencies": {
    "hono": "^4.0.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20241230.0",
    "wrangler": "^3.99.0",
    "typescript": "^5.0.0"
  }
}
```

安装依赖：

```bash
cd workers
npm install
```

---

## 🔧 第四部分：配置登录账号密码

本项目采用**硬编码账号配置**的方式管理用户，适合个人或小团队使用。账号密码配置在 `workers/src/index.ts` 文件中。

### 找到配置位置

打开 `workers/src/index.ts`，找到 `ALLOWED_USERS` 数组（大约在第 185 行）：

```typescript
// 多账号配置（允许以下账号登录）
const ALLOWED_USERS = [
  { email: '你的邮箱@example.com', password: '你的密码', userId: 1 },
  { email: '另一个邮箱@example.com', password: '另一个密码', userId: 2 },
];
```

### 修改或添加账号

**修改现有账号**：直接修改 `email` 和 `password` 字段

**添加新账号**：在数组中添加新的对象，注意 `userId` 必须唯一

```typescript
const ALLOWED_USERS = [
  { email: 'admin@example.com', password: 'AdminPass123', userId: 1 },
  { email: 'user@example.com', password: 'UserPass456', userId: 2 },
  { email: 'guest@example.com', password: 'GuestPass789', userId: 3 },  // 新增
];
```

### 重要注意事项

| 事项 | 说明 |
|------|------|
| **userId 必须唯一** | 每个用户的 `userId` 不能重复，用于关联文件数据 |
| **修改后需重新部署** | 修改代码后执行 `cd workers && npm run deploy` |
| **密码明文存储** | 此方式适合个人使用，生产环境建议改用数据库+密码哈希 |
| **注册功能已禁用** | `/api/register` 接口返回 403，只能通过配置添加用户 |

### 部署更新

修改账号配置后，执行以下命令部署更新：

```bash
cd workers
npm run deploy
```

---

## 🚀 第五部分：部署上线

### 部署后端 Workers

```bash
cd workers

# 部署到生产环境
npm run deploy

# 或指定环境
wrangler deploy --env production
```

部署成功后，你会得到一个 Workers URL，例如：
```
https://sunnycloud-api.你的用户名.workers.dev
```

### 配置自定义域名

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入你的域名设置
3. 添加 Workers 路由：
   - 路由：`api.你的域名.com/*`
   - Worker：`sunnycloud-api`

### 部署前端 Pages

#### 方法1：通过 Git 集成（推荐）

1. 将代码推送到 GitHub
2. 进入 Cloudflare Dashboard → Workers & Pages
3. 点击 "Create application" → "Pages"
4. 选择 "Connect to Git"
5. 选择你的仓库
6. 配置构建设置：
   - **Framework preset**: Next.js (Static HTML Export)
   - **Build command**: `npm run build`
   - **Build output directory**: `out`
7. 添加环境变量：
   - `NEXT_PUBLIC_API_URL`: `https://api.你的域名.com`
8. 点击 "Save and Deploy"

#### 方法2：直接上传

```bash
# 构建
npm run build

# 部署
npx wrangler pages deploy out --project-name=sunnycloud
```

---

## 🌓 第六部分：主题切换功能

SunnyCloud 内置了完整的明暗主题切换功能：

### 功能特点

- **跟随系统**: 默认跟随操作系统的主题偏好
- **手动切换**: 点击页面右上角的太阳🌞/月亮🌙图标切换
- **自动保存**: 主题设置保存在本地存储，下次访问自动应用
- **平滑过渡**: 主题切换时有平滑的过渡动画

### 技术实现

主题系统基于 CSS 变量实现，在 `globals.css` 中定义了两套颜色方案：

```css
:root {
  /* Light Theme */
  --background: #f8fafc;
  --foreground: #1e293b;
  --primary: #6366f1;
  /* ... */
}

[data-theme="dark"] {
  /* Dark Theme */
  --background: #0a0a1a;
  --foreground: #e4e4f7;
  --primary: #8b5cf6;
  /* ... */
}
```

在 `layout.tsx` 中通过 React Context 管理主题状态：

```tsx
const [theme, setTheme] = useState<Theme>('dark');

const toggleTheme = () => {
  setTheme(prev => prev === 'dark' ? 'light' : 'dark');
};
```

---

## 📊 成本分析

Cloudflare 提供慷慨的免费额度：

| 服务 | 免费额度 | 超出后费用 |
|------|----------|------------|
| **Workers** | 100,000 请求/天 | $0.50/百万请求 |
| **D1** | 5GB 存储，500万行读取/天 | $0.75/GB |
| **R2** | 10GB 存储，1000万 A类操作 | $0.015/GB/月 |
| **Pages** | 无限带宽 | 免费 |

对于个人使用，完全可以在免费额度内运行！

---

## 🎯 总结

通过这个教程，你学会了如何：

1. ✅ 使用 Cloudflare D1 和 R2 构建后端存储
2. ✅ 使用 Hono 框架开发 Serverless API
3. ✅ 实现 JWT 认证系统
4. ✅ 使用 Next.js 构建现代化前端
5. ✅ 实现明暗主题切换功能
6. ✅ 部署到 Cloudflare Pages 和 Workers
7. ✅ 配置自定义域名和 CDN 加速

如果这个教程对你有帮助，欢迎 Star ⭐ 项目！

---

## 📚 参考资源

- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 文档](https://developers.cloudflare.com/d1/)
- [Cloudflare R2 文档](https://developers.cloudflare.com/r2/)
- [Hono 框架文档](https://hono.dev/)
- [Next.js 文档](https://nextjs.org/docs)

---

*最后更新: 2026年1月20日*
