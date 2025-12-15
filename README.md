# 伊苏存储 (Yisu Storage)

基于 Cloudflare 技术栈的文件存储和分享平台。

## 技术栈

- **前端**: Next.js 15 + Tailwind CSS 4
- **后端**: Cloudflare Workers (Hono框架)
- **数据库**: Cloudflare D1 (SQLite)
- **文件存储**: Cloudflare R2
- **部署**: Cloudflare Pages

## 项目结构

```
yisu-storage/
├── src/app/                    # Next.js 前端页面
│   ├── page.tsx                # 首页（营销落地页）
│   ├── login/page.tsx          # 登录页面
│   ├── register/page.tsx       # 注册页面
│   ├── dashboard/page.tsx      # 用户仪表盘
│   └── s/[code]/page.tsx       # 分享文件页面
├── workers/                    # Cloudflare Workers 后端
│   ├── src/index.ts            # API 路由处理
│   ├── migrations/             # D1 数据库迁移文件
│   ├── wrangler.toml           # Workers 配置
│   └── package.json            # Workers 依赖
└── next.config.ts              # Next.js 配置
```

## 本地开发

### 1. 安装前端依赖

```bash
cd yisu-storage
npm install
```

### 2. 安装后端依赖

```bash
cd workers
npm install
```

### 3. 创建 Cloudflare 资源

登录 Cloudflare 仪表盘或使用 Wrangler CLI:

```bash
# 安装 wrangler
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 创建 D1 数据库
wrangler d1 create yisu-storage-db

# 创建 R2 存储桶
wrangler r2 bucket create yisu-storage-files
```

### 4. 更新配置

将创建的资源 ID 填入 `workers/wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "yisu-storage-db"
database_id = "你的数据库ID"
```

### 5. 运行数据库迁移

```bash
cd workers
wrangler d1 execute yisu-storage-db --file=./migrations/0001_initial.sql
```

### 6. 设置 JWT Secret

```bash
wrangler secret put JWT_SECRET
# 输入一个安全的随机字符串
```

### 7. 启动开发服务器

终端1 - 启动 Workers:
```bash
cd workers
npm run dev
```

终端2 - 启动 Next.js:
```bash
npm run dev
```

## 部署

### 部署 Cloudflare Workers (后端 API)

```bash
cd workers
npm run deploy
```

### 部署 Cloudflare Pages (前端)

#### 方法1: 通过 Git 集成

1. 将代码推送到 GitHub
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
3. 进入 Workers & Pages → Create application → Pages
4. 连接 GitHub 仓库
5. 配置构建设置:
   - 构建命令: `npm run build`
   - 输出目录: `out`
   - 根目录: `yisu-storage`
6. 添加环境变量:
   - `NEXT_PUBLIC_API_URL`: `https://api.358966.xyz`

#### 方法2: 直接上传

```bash
# 构建静态文件
npm run build

# 使用 wrangler 部署
npx wrangler pages deploy out --project-name=yisu-storage
```

### 绑定自定义域名 358966.xyz

#### 1. 确保域名已添加到 Cloudflare

登录 Cloudflare Dashboard → Add a Site → 输入 `358966.xyz`

#### 2. 绑定 Pages 域名

1. 进入 Workers & Pages → yisu-storage 项目
2. 点击 Custom domains → Set up a custom domain
3. 输入 `358966.xyz` 和 `www.358966.xyz`
4. Cloudflare 会自动配置 DNS 记录

#### 3. 绑定 Workers API 域名

1. 进入 Workers & Pages → yisu-storage-api
2. 点击 Triggers → Custom Domains → Add Custom Domain
3. 输入 `api.358966.xyz`

#### 4. 配置 DNS 记录 (如需手动)

| 类型 | 名称 | 内容 | 代理状态 |
|------|------|------|----------|
| CNAME | @ | yisu-storage.pages.dev | 已代理 |
| CNAME | www | yisu-storage.pages.dev | 已代理 |
| CNAME | api | yisu-storage-api.workers.dev | 已代理 |

## API 接口

### 认证

- `POST /api/register` - 用户注册
- `POST /api/login` - 用户登录

### 文件管理 (需要认证)

- `GET /api/files` - 获取文件列表
- `POST /api/files/upload-direct` - 上传文件
- `POST /api/files/generate-download-url` - 生成分享链接
- `DELETE /api/files/:id` - 删除文件

### 公开接口

- `GET /api/download/:token` - 通过分享链接下载

## 环境变量

### Next.js (前端)

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| NEXT_PUBLIC_API_URL | API 服务地址 | https://api.358966.xyz |

### Workers (后端)

| 变量名 | 说明 | 类型 |
|--------|------|------|
| JWT_SECRET | JWT 签名密钥 | Secret |
| CORS_ORIGIN | 允许的跨域来源 | Variable |

## 许可证

MIT
