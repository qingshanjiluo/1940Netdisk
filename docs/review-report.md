# 项目审查报告 — K-Vault (1940Netdisk)

> 审查时间：2026-07-17  
> 审查范围：全项目（架构、代码质量、安全、性能、文档、测试）

---

## 总体评价

K-Vault 是一个功能完善的文件托管服务，支持 Cloudflare Pages + Docker 双部署模式，集成 7 种存储后端（Telegram、R2、S3、Discord、HuggingFace、WebDAV、GitHub），具备分片上传、文件分享、Paste、访客上传等功能。项目整体架构清晰、功能丰富，但存在一些需要关注的代码质量和安全问题。

**综合评分：7/10** — 功能完整度高，架构设计合理，但单文件过大、存在安全隐患和性能瓶颈。

---

## 严重问题（Critical）

### C1. [`app.js`](server/app.js) 单文件 2895 行 — 严重违反单一职责原则

[`server/app.js`](server/app.js) 包含了所有路由定义、中间件逻辑、工具函数、业务逻辑，共 2895 行。这导致：
- 代码难以导航和维护
- 合并冲突概率极高
- 单元测试困难

**建议**：将路由按功能模块拆分为独立文件（如 `routes/auth.js`、`routes/upload.js`、`routes/file.js`、`routes/manage.js`、`routes/storage.js`、`routes/settings.js`），使用 Hono 的 `app.route()` 注册。

### C2. 认证凭证明文比较 — 存在时序攻击风险

在 [`server/lib/utils/auth.js:45`](server/lib/utils/auth.js:45) 中，`verifyBasicAuth` 方法使用 `===` 直接比较用户名和密码：

```javascript
if (user === this.config.basicUser && pass === this.config.basicPass) {
```

虽然项目其他地方（如 [`api-token-repo.js`](server/lib/repos/api-token-repo.js:288)）正确使用了 `crypto.timingSafeEqual`，但认证入口却未使用。

**建议**：使用 `crypto.timingSafeEqual` 进行常量时间比较，防止时序攻击。

### C3. [`chunk-service.js`](server/lib/services/chunk-service.js:24) 使用 `Math.random()` 生成上传 ID

```javascript
const uploadId = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
```

`Math.random()` 不是密码学安全的，可能导致 ID 碰撞或被预测。项目其他地方（如 [`crypto.js`](server/lib/utils/crypto.js:41)）使用 `crypto.randomBytes`。

**建议**：统一使用 `crypto.randomUUID()` 或 `crypto.randomBytes` 生成 ID。

---

## 高危问题（High）

### H1. Guest IP 伪造风险

在 [`server/lib/utils/guest.js:3-9`](server/lib/utils/guest.js:3) 中，`getClientIp` 直接信任 `X-Forwarded-For` 头：

```javascript
function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  ...
}
```

攻击者可以伪造 `X-Forwarded-For` 头来绕过访客上传的每日限制。

**建议**：仅在可信的反向代理（如 nginx）后使用此逻辑，并在 nginx 配置中覆盖 `X-Forwarded-For`。

### H2. Telegram Webhook Secret 比较未使用常量时间

在 [`server/app.js:2776-2779`](server/app.js:2776) 中：

```javascript
if (headerSecret !== expectedSecret) {
  return c.json({ ok: false, error: 'Invalid webhook secret.' }, 401);
}
```

Webhook secret 的比较使用 `!==`，存在时序攻击风险。

**建议**：使用 `crypto.timingSafeEqual`。

### H3. [`deleteBatch`](server/lib/repos/file-repo.js:256) 方法存在 SQL 注入风险

```javascript
const placeholders = normalizedIds.map(() => '?').join(', ');
const result = run(this.db, `DELETE FROM files WHERE id IN (${placeholders})`, normalizedIds);
```

虽然使用了参数化查询（`?` 占位符），但 `normalizedIds` 的数量没有上限限制。如果传入数千个 ID，可能导致性能问题或内存耗尽。

**建议**：添加 ID 数量上限（如 500），分批执行删除。

### H4. `findByShareSlug` 全表扫描

在 [`server/lib/repos/file-repo.js:194-210`](server/lib/repos/file-repo.js:194) 中：

```javascript
findByShareSlug(slugValue) {
  const rows = all(this.db, 'SELECT * FROM files ORDER BY created_at DESC');
  for (const row of rows) {
    const extra = parseExtra(row.extra_json);
    const current = String(extra.shareSlug || '').trim().toLowerCase();
    if (current !== slug) continue;
    return { ...row, metadata: toMetadata(row) };
  }
  return null;
}
```

每次查找都执行全表扫描，且在 JS 层过滤 `shareSlug`。当文件数量增长时，性能会急剧下降。

**建议**：在 `extra_json` 中提取 `shareSlug` 到独立列并建立索引。

### H5. [`buildStats`](server/lib/repos/file-repo.js:637) 每次分页查询都执行全量统计

```javascript
buildStats(filters = {}) {
  const rows = all(this.db, `SELECT storage_type, file_name FROM files ${whereClause}`, params);
  // ... 遍历所有行
}
```

在 `list()` 方法中，`includeStats: true` 时会额外执行一次全表查询来统计文件类型分布。这意味着每次分页请求都会执行两次全量查询。

**建议**：缓存统计数据，或使用增量更新策略。

---

## 中等问题（Medium）

### M1. 重复的路由处理函数

[`server/app.js`](server/app.js) 中存在多处重复的路由处理逻辑：

1. **Bing 壁纸路由**：`/api/bing/wallpaper` 和 `/api/bing/wallpaper/` 完全相同（第 2708-2737 行）
2. **创建文件夹**：`/api/drive/folders` 和 `/api/manage/folders` 的 POST 处理完全相同（第 2399-2426 行）
3. **删除文件夹**：`/api/drive/folders` 和 `/api/manage/folders` 的 DELETE 处理逻辑不同但功能重叠（第 2474-2525 行）
4. **移动文件**：`/api/drive/files/move` 和 `/api/manage/files/move-folder` 功能相同（第 2527-2574 行）
5. **Settings**：`/api/settings` 和 `/api/manage/settings` 是兼容别名（第 1510-1517 行）

**建议**：使用路由别名（`app.route()`）或中间件统一处理，消除重复代码。

### M2. 缺少请求体大小限制

nginx 配置中 `client_max_body_size 1024m` 过大，且 Node.js 层没有全局的请求体大小限制。虽然上传接口有文件大小检查，但 JSON 请求体（如 Settings、Storage Config）没有限制。

**建议**：在 nginx 层和 Node.js 层都设置合理的请求体大小限制。

### M3. `moveFolder` 方法未使用事务

在 [`server/lib/repos/file-repo.js:337-395`](server/lib/repos/file-repo.js:337) 中，`moveFolder` 执行多次数据库操作（更新文件路径、创建新文件夹、删除旧文件夹），但没有使用事务包装。如果中途失败，可能导致数据不一致。

**建议**：使用 `transaction()` 包装整个操作。

### M4. `chunkService.complete` 将所有分片读入内存

在 [`server/lib/services/chunk-service.js:91-126`](server/lib/services/chunk-service.js:91) 中：

```javascript
const chunks = [];
for (let i = 0; i < totalChunks; i += 1) {
  chunks.push(fs.readFileSync(chunkFile));
}
const combined = Buffer.concat(chunks);
```

对于大文件（如 100MB），这会将整个文件读入内存，可能导致 OOM。

**建议**：使用流式拼接，或分块读取后直接流式上传。

### M5. StorageFactory adapter 缓存无大小限制

在 [`server/lib/storage/factory.js:11`](server/lib/storage/factory.js:11) 中，`adapterCache` 是一个无限增长的 Map：

```javascript
this.adapterCache = new Map();
```

虽然使用了 `id:updatedAt` 作为 key，但如果存储配置频繁更新，缓存会持续增长。

**建议**：添加 LRU 缓存策略或设置最大容量。

### M6. Session Cookie 未设置 `Secure` 标志

在 [`server/lib/utils/auth.js:93`](server/lib/utils/auth.js:93) 中：

```javascript
return `${this.config.sessionCookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}`;
```

Cookie 缺少 `Secure` 标志，如果部署在 HTTPS 环境下，cookie 会被明文传输。

**建议**：在生产环境中添加 `Secure` 标志。

### M7. 前端代码缺乏模块化

根目录下的 HTML 文件（[`index.html`](index.html)、[`admin.html`](admin.html)、[`gallery.html`](gallery.html) 等）都是单文件结构，内联了大量 JavaScript 和 CSS。这导致：
- 代码重复（如认证逻辑在多个页面中重复）
- 难以维护和更新
- 无法使用现代前端工具链

**建议**：考虑引入轻量级构建工具（如 Vite）或至少将公共 JS/CSS 提取为独立文件。

---

## 低优先级建议（Low）

### L1. 缺少 `.prettierrc` / `.eslintrc` 配置

项目有 `.editorconfig` 和 `.markdownlint.json`，但缺少 JavaScript 代码格式化和 linting 配置。

### L2. `参考文件/` 目录不应提交到仓库

[`参考文件/`](参考文件/) 目录包含设计参考文件，属于开发过程中的临时文件，建议添加到 `.gitignore`。

### L3. 日志文件不应提交

[`1940netdisk.910e6db0-6358-4300-88f6-8c28ec0dd9dd.log`](1940netdisk.910e6db0-6358-4300-88f6-8c28ec0dd9dd.log) 是运行时日志文件，应添加到 `.gitignore`。

### L4. 缺少 API 文档

项目提供了丰富的 REST API，但没有 OpenAPI/Swagger 文档。建议使用 Hono 的 OpenAPI 插件或独立的文档文件。

### L5. `LICENSE` 文件内容未审查

项目包含 [`LICENSE`](LICENSE) 文件，建议确认许可证类型是否符合预期。

### L6. `package.json` 中 `overrides` 的必要性

[`package.json`](package.json:33) 中的 `overrides` 字段覆盖了多个依赖版本（如 `axios`、`lodash`），但 `dependencies` 中并未直接引用这些包。这些可能是传递依赖的安全修复，但建议添加注释说明原因。

---

## 安全发现（Security）

| 严重度 | 问题 | 位置 |
|--------|------|------|
| 🔴 Critical | 认证凭证明文比较（时序攻击） | [`auth.js:45`](server/lib/utils/auth.js:45) |
| 🔴 Critical | `Math.random()` 生成上传 ID | [`chunk-service.js:24`](server/lib/services/chunk-service.js:24) |
| 🟠 High | Guest IP 伪造绕过限制 | [`guest.js:3-9`](server/lib/utils/guest.js:3) |
| 🟠 High | Telegram Webhook Secret 时序攻击 | [`app.js:2776`](server/app.js:2776) |
| 🟡 Medium | Session Cookie 缺少 Secure 标志 | [`auth.js:93`](server/lib/utils/auth.js:93) |
| 🟡 Medium | `deleteBatch` 无数量上限 | [`file-repo.js:256`](server/lib/repos/file-repo.js:256) |
| ✅ Good | 存储配置使用 AES-256-GCM 加密 | [`crypto.js`](server/lib/utils/crypto.js) |
| ✅ Good | API Token 使用盐值 + SHA-256 哈希存储 | [`api-token-repo.js`](server/lib/repos/api-token-repo.js) |
| ✅ Good | Token 验证使用 `crypto.timingSafeEqual` | [`api-token-repo.js:288`](server/lib/repos/api-token-repo.js:288) |
| ✅ Good | Session Cookie 设置了 HttpOnly + SameSite=Strict | [`auth.js:93`](server/lib/utils/auth.js:93) |

---

## 架构评估

### 优点
- **清晰的分层架构**：`repos/` → `services/` → `app.js`，职责划分合理
- **存储适配器模式**：[`StorageFactory`](server/lib/storage/factory.js) + 6 种适配器，扩展性好
- **依赖注入**：[`createContainer`](server/lib/container.js) 统一管理服务依赖
- **双部署模式**：Cloudflare Pages（`functions/`）和 Docker（`server/`）都完整支持
- **数据库设计合理**：SQLite WAL 模式、合理的索引、外键约束

### 需要改进
- **`app.js` 过大**：2895 行的单文件是最大的架构问题
- **Cloudflare Pages 和 Docker 代码重复**：`functions/` 和 `server/` 中存在大量重复逻辑
- **缺少抽象层**：部分业务逻辑直接写在路由处理函数中

---

## 性能评估

| 指标 | 状态 | 说明 |
|------|------|------|
| 数据库查询 | ⚠️ 需关注 | `findByShareSlug` 全表扫描；`buildStats` 每次查询都执行 |
| 内存使用 | ⚠️ 需关注 | 分片上传完成时将全部分片读入内存 |
| 缓存策略 | ⚠️ 需关注 | StorageFactory 有缓存但无上限；无其他缓存层 |
| 异步处理 | ✅ 良好 | 上传、下载操作正确使用 async/await |
| 压缩/优化 | ✅ 良好 | Docker 构建合理，nginx 配置简洁 |

---

## 测试覆盖评估

项目有 12 个测试文件，覆盖以下方面：
- ✅ API v1 接口测试
- ✅ 分页功能测试
- ✅ 文件移动操作测试
- ✅ WebDAV 适配器测试
- ✅ Telegram 上传路由测试
- ✅ 部署契约测试
- ✅ 上传路径测试

**缺失的测试**：
- ❌ 认证/授权流程测试
- ❌ 分片上传完整流程测试
- ❌ 存储适配器单元测试
- ❌ 安全相关测试（如时序攻击防护）
- ❌ 并发上传测试

---

## 改进建议汇总（按优先级排序）

1. **拆分 [`app.js`](server/app.js)** 为独立路由模块（影响最大、最紧急）
2. **修复认证时序攻击**：[`auth.js:45`](server/lib/utils/auth.js:45) 使用 `timingSafeEqual`
3. **修复 `Math.random()`**：[`chunk-service.js:24`](server/lib/services/chunk-service.js:24) 改用 `crypto.randomBytes`
4. **修复 Webhook Secret 比较**：[`app.js:2776`](server/app.js:2776) 使用 `timingSafeEqual`
5. **为 `findByShareSlug` 建立索引**：将 `shareSlug` 提取到独立列
6. **`moveFolder` 添加事务包装**
7. **分片上传改用流式处理**
8. **消除重复路由**
9. **添加 ESLint + Prettier 配置**
10. **补充安全和认证相关测试**

---

## 后续建议

1. **短期（1-2 周）**：修复 Critical 和 High 级别安全问题
2. **中期（1 个月）**：拆分 `app.js`，建立索引，添加事务
3. **长期（3 个月）**：引入前端构建工具，统一 Cloudflare Pages 和 Docker 的代码路径，完善测试覆盖
