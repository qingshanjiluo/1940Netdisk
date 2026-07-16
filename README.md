<div align="center">

<img src="favicon.png" alt="1940Netdisk Logo" width="140">

# 1940Netdisk

> 免费图片/文件托管解决方案，支持 Cloudflare Pages + Docker 双模部署，兼容多种存储后端

[English](README-EN.md) | **中文**

<br>

![GitHub stars](https://img.shields.io/github/stars/katelya77/K-Vault?style=flat-square)
![GitHub forks](https://img.shields.io/github/forks/katelya77/K-Vault?style=flat-square)
![GitHub license](https://img.shields.io/github/license/katelya77/K-Vault?style=flat-square)

</div>

---

## 📖 项目介绍

**1940Netdisk**（原 K-Vault）是一个轻量级、全功能的免费文件托管平台。采用「钢铁玻璃」（Steel Glass）军事工业风格 UI 设计，支持多用户管理、身份组权限控制，提供图片/文件上传、在线预览、多存储后端、WebDAV 上传、API Token 认证等能力。

项目名称「1940」致敬工业设计史上的经典钢铁年代，寓意坚固、可靠、历久弥新。

### 核心设计理念

- **钢铁玻璃 UI** — 橄榄绿/钢灰/卡其/锈金配色，毛玻璃卡片，军事工业风
- **多账号体系** — 用户 ↔ 身份组 ↔ 版块 三层权限模型，精细化管理
- **全功能保留** — 所有业务逻辑零改动，仅换皮肤，兼容所有后端
- **双模部署** — Cloudflare Pages（免费）+ Docker 自托管

---

## 🖼️ 效果图

<p align="center">
  <img src="demo/登录页面.webp" alt="登录页面" width="300" />
  <img src="demo/首页上传页面.webp" alt="首页上传页面" width="300" />
  <img src="demo/后台管理页面.webp" alt="后台管理页面" width="300" />
</p>
<p align="center">
  <img src="demo/图片浏览页面.webp" alt="图片浏览页面" width="300" />
  <img src="demo/WebDAV页面.webp" alt="WebDAV页面" width="300" />
</p>

---

## ✨ 功能特性

- **无限存储** — 不限数量的图片和文件上传
- **完全免费** — 托管于 Cloudflare，免费额度内零成本
- **免费域名** — 使用 `*.pages.dev` 二级域名，也支持自定义域名
- **多存储后端** — 支持 Telegram、Cloudflare R2、S3 兼容存储、Discord、HuggingFace、WebDAV、GitHub
- **Telegram Webhook 回链** — 机器人在频道/群接收文件后自动回复直链
- **KV 写入优化** — Telegram 可启用签名直链，显著降低 KV 读写消耗
- **内容审核** — 可选的图片审核 API，自动屏蔽不良内容
- **多格式支持** — 图片、视频、音频、文档、压缩包等
- **在线预览** — 支持图片、视频、音频、文档（pdf、docx、txt）、Markdown、JSON、表格、压缩包内容等多种格式的在线预览
- **分片上传** — 支持最大 100MB 文件（建议配合 R2/S3/WebDAV/GitHub，Telegram 网页上传按平台限制处理）
- **多用户管理** — 完整的用户注册、登录、账号切换体系，支持管理员/普通用户/访客三种角色
- **身份组权限** — 身份组（Group）↔ 版块（Section）三级权限模型，支持 写入/只读/无权限 三档控制
- **访客上传** — 可选的访客上传功能，支持文件大小和每日次数限制
- **API Token 认证** — 支持 `curl` / ShareX / 脚本等程序化上传与调用
- **多种视图** — 网格、列表、瀑布流多种管理界面
- **存储分类** — 直观区分不同存储后端的文件
- **双模部署** — Cloudflare Pages + Docker 自托管（`docker compose up -d`）
- **动态存储配置管理** — 支持在管理端通过 API 对存储配置进行新增/编辑/删除/测试/设为默认
- **可插拔设置存储（Docker）** — 基础站点设置可使用 `sqlite`（默认）或 Redis 协议后端（Upstash / Redis / KVrocks）
- **前端 UI 设计系统** — 基于 CSS 变量的钢铁玻璃设计系统，支持暗色/亮色模式切换，动态背景特效
- **GitHub Actions 镜像构建** — 主分支/Tag 自动构建并推送单镜像

---

## 🚀 部署方式

1940Netdisk 保留两类正式部署方式：

1. **Cloudflare Pages 部署**：使用 Cloudflare Pages 静态页面 + Pages Functions，适合免费额度、边缘函数、Cloudflare KV/R2 场景。
2. **Docker 部署**：使用单镜像，适合 VPS/NAS/内网部署，也适合 WebDAV、S3、GitHub、HuggingFace 等多存储后端长期自托管。

两种部署方式使用同一套根目录页面和同一组主入口：

- 上传首页：`/`
- 管理后台：`/admin.html`
- 图片浏览：`/gallery.html`
- 图片管理：`/admin-imgtc.html`
- 瀑布流浏览：`/admin-waterfall.html`
- WebDAV 页面：`/webdav.html`
- 登录页：`/login.html`
- 文件预览：`/preview.html`
- 管理/API 接口：`/api/*`
- 普通上传：`POST /upload`
- API Token 上传：`/api/v1/upload`
- 文件直链/分享：`/file/*`、`/share/*`、`/s/*`

Docker 版本由 Nginx 在容器内代理到 Node API，对外仍是一个端口，因此用户看到的 UI、管理后台、WebDAV 页面、API Token 上传和多存储配置流程应与 Cloudflare Pages 部署保持一致。

### 方式一：Cloudflare Pages 部署

适合想使用 Cloudflare 免费托管、KV、R2 和 Pages Functions 的用户。

1. **Fork 本仓库**

2. **创建 Pages 项目（推荐 Git 集成）**
   - 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
   - 进入 `Workers 和 Pages` → `创建应用程序` → `Pages` → `连接到 Git`
   - 选择 Fork 的仓库
   - 构建设置按下面填写：

| 项目 | 值 |
| :--- | :--- |
| Framework preset | `None` / 不使用预设 |
| Root directory | 留空（仓库根目录） |
| Install command | 留空 |
| Build command | 留空 |
| Build output directory | 留空 |
| Deploy command | 留空 |

3. **绑定 KV（图片管理、分片任务、基础配置必需）**
   - 进入 Cloudflare Dashboard → `Workers 和 Pages` → `KV`
   - 创建命名空间，例如 `netdisk`
   - 回到 Pages 项目 → `设置` → `函数` → `KV 命名空间绑定`
   - 变量名必须填 `img_url`

4. **配置至少一个存储后端**
   - 进入项目 `设置` → `环境变量`
   - 先选择一个默认存储后端。Telegram 示例：

| 变量名 | 说明 | 必需 |
| :--- | :--- | :---: |
| `TG_Bot_Token` | Telegram Bot Token | ✅ |
| `TG_Chat_ID` | Telegram 频道 ID | ✅ |
| `BASIC_USER` | 管理后台用户名 | 可选 |
| `BASIC_PASS` | 管理后台密码 | 可选 |

也可以使用 R2、S3、Discord、HuggingFace、WebDAV、GitHub 等后端。

5. **重新部署**
   - 修改环境变量或绑定后必须重新部署。

### 方式二：Docker 部署

适合 VPS、NAS、内网和自托管场景。

```bash
# 一条命令启动
docker volume create netdisk_data
docker run -d \
  --name netdisk \
  --restart unless-stopped \
  -p 8080:8080 \
  -v netdisk_data:/app/data \
  ghcr.io/katelya77/k-vault:latest
```

访问：

- 上传首页：`http://<host>:8080/`
- 管理后台：`http://<host>:8080/admin.html`
- 健康检查：`http://<host>:8080/api/health`

或者使用 Docker Compose（克隆仓库后）：

```bash
docker compose up -d
```

更多 Docker 部署细节请查看 [README-DOCKER.md](README-DOCKER.md)。

---

## 📂 页面说明

| 页面 | 路径 | 说明 |
| :--- | :--- | :--- |
| 🏠 首页/上传 | `/` | 批量上传、拖拽、粘贴上传 |
| 📁 WebDAV 独立页 | `/webdav.html` | WebDAV 上传/状态检查/URL 上传 |
| 🖼️ 图片浏览 | `/gallery.html` | 图片网格浏览 |
| 🛠️ 管理后台 | `/admin.html` | 文件管理、用户管理、身份组、版块管理、黑白名单、API Token |
| 🖼️ 图片管理 | `/admin-imgtc.html` | 图片/视频/音频/文档管理界面 |
| 🌊 瀑布流 | `/admin-waterfall.html` | 图片瀑布流浏览 |
| 👁️ 文件预览 | `/preview.html` | 多格式文件预览 |
| 🔐 登录页 | `/login.html` | 用户登录/注册/账号切换 |
| 🚫 屏蔽提示 | `/block-img.html` | 图片被屏蔽提示页 |
| ⚪ 白名单提示 | `/whitelist-on.html` | 白名单模式提示页 |

---

## 👥 多账号权限体系

1940Netdisk 实现了完整的用户 ↔ 身份组 ↔ 版块 三层权限模型。

### 角色定义

| 角色 | 说明 |
| :--- | :--- |
| **管理员 (admin)** | 完全控制权，可管理所有用户、身份组、版块和文件 |
| **普通用户 (user)** | 受身份组权限约束，对版块拥有写入/只读/无权限三种状态 |
| **访客 (guest)** | 受限访问，仅可上传和查看公开内容 |

### 身份组与版块

- **身份组（Group）**：一组用户的集合，如「运营组」「开发组」「审核组」
- **版块（Section）**：内容分类区域，如「公共资源」「内部文档」「开发日志」
- **权限级别**：
  - `write` — 可上传、删除、编辑版块内文件
  - `read` — 仅可查看版块内文件
  - `none` — 无访问权限

### 数据模型

```
用户 (User) ── 属于 ──▶ 身份组 (Group) ── 权限定义 ──▶ 版块 (Section)
  │                    │                      ├── write
  │                    │                      ├── read
  │                    │                      └── none
  │                    │
  ▼                    ▼
 角色: admin         包含多个用户
      /user
      /guest
```

管理员可在后台 `/admin.html` 的「用户管理」「身份组」「版块管理」三个标签页中完成全部管理操作。

---

## 💾 存储配置

### Telegram 增强模式

```bash
# 设置 Webhook
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"https://img.example.com/api/telegram/webhook\",\"secret_token\":\"<YOUR_SECRET>\",\"allowed_updates\":[\"message\",\"channel_post\"]}"
```

关键环境变量：

| 变量名 | 说明 | 示例 |
| :--- | :--- | :--- |
| `CUSTOM_BOT_API_URL` | 自部署 Bot API 地址 | `http://127.0.0.1:8081` |
| `PUBLIC_BASE_URL` | Webhook 公网域名 | `https://img.example.com` |
| `TG_WEBHOOK_SECRET` | Webhook 密钥 | `your-secret` |
| `TELEGRAM_LINK_MODE` | 链接模式（`signed` 启用签名直链） | `signed` |
| `MINIMIZE_KV_WRITES` | 低 KV 写入模式 | `true` |

### KV 存储（必需）

1. Cloudflare Dashboard → `Workers 和 Pages` → `KV`
2. 创建命名空间 → Pages 项目 → `设置` → `函数` → `KV 命名空间绑定`
3. 变量名 `img_url`，选择命名空间 → 重新部署

### R2 存储（可选）

1. 创建 R2 存储桶 → Pages 项目 → `设置` → `函数` → `R2 存储桶绑定`
2. 变量名 `R2_BUCKET` → 添加 `USE_R2=true` 环境变量 → 重新部署

### S3 兼容存储（可选）

| 变量名 | 说明 | 示例 |
| :--- | :--- | :--- |
| `S3_ENDPOINT` | S3 端点 URL | `https://s3.us-east-1.amazonaws.com` |
| `S3_REGION` | 区域 | `us-east-1` |
| `S3_ACCESS_KEY_ID` | 访问密钥 ID | `AKIA...` |
| `S3_SECRET_ACCESS_KEY` | 秘密访问密钥 | `wJalr...` |
| `S3_BUCKET` | 存储桶名称 | `my-filebed` |

### Discord 存储（可选）

| 变量名 | 说明 | 必需 |
| :--- | :--- | :---: |
| `DISCORD_WEBHOOK_URL` | Discord Webhook URL | 二选一 |
| `DISCORD_BOT_TOKEN` | Discord Bot Token | 推荐 |
| `DISCORD_CHANNEL_ID` | Discord 频道 ID | Bot 模式 |

### HuggingFace 存储（可选）

| 变量名 | 说明 |
| :--- | :--- |
| `HF_TOKEN` | HuggingFace 写入权限 Token |
| `HF_REPO` | Dataset 仓库 ID |

### WebDAV 存储（可选）

| 变量名 | 说明 | 示例 |
| :--- | :--- | :--- |
| `WEBDAV_BASE_URL` | WebDAV 基础地址 | `https://dav.example.com/dav` |
| `WEBDAV_USERNAME` | WebDAV 用户名 | `alice` |
| `WEBDAV_PASSWORD` | WebDAV 密码 | `your-password` |
| `WEBDAV_BEARER_TOKEN` | Bearer Token | `eyJhbGciOi...` |
| `WEBDAV_ROOT_PATH` | 根目录前缀 | `netdisk/uploads` |

### GitHub 存储（可选）

| 变量名 | 说明 | 示例 |
| :--- | :--- | :--- |
| `GITHUB_TOKEN` | GitHub Token | `ghp_xxxxxxxxxxxx` |
| `GITHUB_REPO` | 目标仓库 | `yourname/netdisk-files` |
| `GITHUB_MODE` | 存储模式 | `releases` / `contents` |

---

## 🌐 前端 UI 设计配置

支持在后台统一设置全站 UI 风格。

**入口位置：** 管理后台 `/admin.html` → 工具栏「前端 UI 设计」

**可配置项：**

- 背景图（全站 / 登录页单独）
- 卡片透明度与模糊强度（毛玻璃效果）
- 动态背景特效类型与强度（含移动端优化）
- 暗色/亮色模式切换

**持久化机制：**

- Cloudflare Pages：写入 KV 键 `ui_config`
- Docker 自托管：写入 `data/ui_config.json`
- 前端在接口失败时降级到 `localStorage`

**接口说明：**

- `GET /api/ui-config`：读取配置
- `POST /api/ui-config`：保存配置（需管理员登录态）

---

## 👤 访客上传功能

| 变量名 | 说明 | 默认值 |
| :--- | :--- | :--- |
| `GUEST_UPLOAD` | 启用访客上传 | `false` |
| `GUEST_MAX_FILE_SIZE` | 单文件最大大小（字节） | `5242880`（5MB） |
| `GUEST_DAILY_LIMIT` | 每日上传次数限制 | `10` |

---

## ⚙️ 高级配置

| 变量名 | 说明 | 默认值 |
| :--- | :--- | :--- |
| `ModerateContentApiKey` | 图片审核 API Key | - |
| `WhiteList_Mode` | 白名单模式 | `false` |
| `USE_R2` | 启用 R2 存储 | `false` |
| `CUSTOM_BOT_API_URL` | Telegram API 基础地址 | `https://api.telegram.org` |
| `PUBLIC_BASE_URL` | Webhook 公网域名 | 当前请求域名 |
| `TG_WEBHOOK_SECRET` | Telegram Webhook 密钥 | - |
| `TELEGRAM_LINK_MODE` | Telegram 链接模式（`signed`） | - |
| `MINIMIZE_KV_WRITES` | 降低 KV 写入 | `false` |
| `TELEGRAM_METADATA_MODE` | 元数据写入策略（`off` 关闭索引） | `on` |
| `TG_UPLOAD_NOTIFY` | 上传后发送通知消息 | `true` |
| `FILE_URL_SECRET` | 签名直链密钥 | `TG_Bot_Token` |
| `CHUNK_BACKEND` | 分片临时存储后端 | `auto` |

### Docker 运行时变量

| 变量名 | 说明 | 默认值 |
| :--- | :--- | :--- |
| `PORT` | 容器内 API 端口 | `8787` |
| `DATA_DIR` | 数据目录 | `/app/data` |
| `DB_PATH` | SQLite 数据库路径 | `/app/data/k-vault.db` |
| `CHUNK_DIR` | 分片临时目录 | `/app/data/chunks` |
| `CONFIG_ENCRYPTION_KEY` | 存储配置加密密钥 | 自动生成 |
| `SESSION_SECRET` | 会话/签名密钥 | 自动生成 |
| `UPLOAD_MAX_SIZE` | 最大上传大小（字节） | `104857600` |
| `DEFAULT_STORAGE_TYPE` | 默认存储类型 | `telegram` |
| `SETTINGS_STORE` | 设置存储后端 | `sqlite` |
| `WEB_PORT` | Compose 对外端口 | `8080` |

---

## 📋 使用限制

**Cloudflare 免费额度：**

- 每日 100,000 次请求
- KV 每日 1,000 次写入、100,000 次读取、1,000 次列出
- Docker 自托管不受 Cloudflare 免费额度限制

**各存储后端文件大小限制：**

| 存储后端 | 单文件最大大小 |
| :--- | :--- |
| Telegram（Cloudflare Pages） | 20MB |
| Telegram（Docker） | 50MB |
| Telegram（自部署 Bot API + Webhook） | 可达 2GB |
| Cloudflare R2 | 100MB（分片） |
| S3 兼容存储 | 100MB（分片） |
| Discord（无 Boost） | 25MB |
| Discord（Level 2+） | 50-100MB |
| HuggingFace | 35MB（普通）/ 50GB（LFS） |

---

## 📡 API 使用指南

### 创建 API Token

1. 打开管理面板 `/admin.html`
2. 点击工具箱 → **API Token 管理**
3. 创建 Token，选择权限：`upload` / `read` / `delete` / `paste`

### curl 示例

```bash
# 上传文件
curl -X POST https://your-domain.com/api/v1/upload \
  -H "Authorization: Bearer netdisk_xxxxxxxxxxxx" \
  -F "file=@/path/to/file.png"

# 上传并设置过期和密码
curl -X POST https://your-domain.com/api/v1/upload \
  -H "Authorization: Bearer netdisk_xxxxxxxxxxxx" \
  -F "file=@backup.tar.gz" \
  -F "expires_in=86400" \
  -F "password=mypassword"

# 创建文本粘贴
curl -X POST https://your-domain.com/api/v1/paste \
  -H "Authorization: Bearer netdisk_xxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello World","language":"text"}'
```

### 端点速查

| 方法 | 端点 | 权限 | 说明 |
| :--- | :--- | :--- | :--- |
| POST | `/api/v1/upload` | `upload` | 上传文件 |
| GET | `/api/v1/files` | `read` | 列出文件 |
| GET | `/api/v1/file/:id` | `read` | 下载文件 |
| GET | `/api/v1/file/:id/info` | `read` | 文件元信息 |
| DELETE | `/api/v1/file/:id` | `delete` | 删除文件 |
| POST | `/api/v1/paste` | `paste` | 创建文本粘贴 |
| GET | `/api/v1/pastes` | `read` | 列出粘贴 |
| GET | `/api/v1/paste/:id` | `read` | 获取粘贴内容 |
| DELETE | `/api/v1/paste/:id` | `delete` | 删除粘贴 |

---

## 🔗 相关链接

- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
- [Docker 部署说明](README-DOCKER.md)
- [Docker 英文部署说明](README-DOCKER-EN.md)
- [英文文档](README-EN.md)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [问题反馈](https://github.com/katelya77/K-Vault/issues)

---

## 🙏 致谢

1940Netdisk（原 K-Vault）的早期实现与功能演进参考并受益于多个开源项目、社区讨论与用户反馈。

- [Telegraph-Image](https://github.com/cf-pages/Telegraph-Image)：早期 Serverless 图床形态的重要上游参考
- [CloudFlare-ImgBed](https://github.com/MarSeventh/CloudFlare-ImgBed)：优秀的同类开源图床项目
- Linux.do 社区用户反馈：推动多存储后端、Docker 部署、WebDAV 等功能方向

---

## 📄 许可证

MIT License

---

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=katelya77/K-Vault&type=Date)](https://star-history.com/#katelya77/K-Vault&Date)
