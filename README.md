# 校园活动报名系统（campus-events）

面向全校师生的校园活动发布与报名平台。移动优先响应式设计，支持学生浏览/报名活动、组织者发布活动并管理报名名单（含导出 CSV）、管理员后台审核与用户管理。

v2（安全加固 + 功能增强）：邮箱验证码注册、自助改密/找回密码、登录失败锁定、签到核销、候补递补、操作日志、活动日历、报名趋势图、隐私政策/用户协议、PWA（可添加到主屏幕）。

v3（社区 + 体验）：校园论坛（发帖/评论/点赞/收藏/关注/@提及）、帖子与活动置顶、管理员角色分级（大管理员 super_admin / 小管理员 admin）、亮暗双主题切换、图形验证码防机器人、视频上传与站内小视频。

## 技术栈

- 后端：Node.js 18+ / Express 4 / better-sqlite3（WAL 模式）/ JWT / bcryptjs / helmet / express-rate-limit / sanitize-html / multer / zod / svg-captcha / nodemailer（SMTP 验证码邮件）
- 前端：Vite 5 / React 18 / Tailwind CSS 3 / MUI 5 / zustand / axios / dayjs
- 部署形态：单 Express 进程同时托管 API（`/api/v1`）与前端构建产物（`client/dist`）

## 目录结构

```
campus-events/
├── server/   # 后端（Express + SQLite）
│   ├── scripts/        # 运维脚本（备份 / 密钥生成 / 上线前核对）
│   └── src/
├── client/   # 前端（Vite + React）
│   ├── scripts/        # PWA 图标生成脚本
│   └── public/         # manifest / sw.js / icons
├── deploy/   # 服务器侧配置模板（Nginx HTTPS / sshd 加固）
└── tests/    # API 功能验证测试
```

## 本地开发

```bash
# 1. 安装依赖（前后端）
npm run install:all

# 2. 配置后端环境变量
cp server/.env.example server/.env
# 修改 JWT_SECRET 与初始管理员账号密码；开发期保持 SMTP_DEV_ECHO=1

# 3. 启动后端（默认 3000 端口，首次启动自动建表、幂等迁移并写入种子数据）
npm run dev:server

# 4. 另开终端启动前端（默认 5173 端口，/api 与 /uploads 已代理到 3000）
npm run dev:client
```

浏览器访问 http://localhost:5173

### 邮件通道（验证码）配置

- 开发/演示：`SMTP_DEV_ECHO=1`（默认），不发真实邮件，验证码在接口响应 `dev_code` 与服务器日志回显。
- 生产：在 `server/.env` 配置 `SMTP_HOST/SMTP_PORT/SMTP_SECURE/SMTP_USER/SMTP_AUTH_CODE/SMTP_FROM`，并将 `SMTP_DEV_ECHO` 设为 `0` 或删除该行。
  - QQ 邮箱：`smtp.qq.com`，端口 `465`（`SMTP_SECURE=true`），授权码在邮箱设置-账户-POP3/SMTP 服务中开通（**不是登录密码**）。
  - 163 邮箱：`smtp.163.com`，端口 `465` 或 `587`（`SMTP_SECURE=false`）。
- 验证码规则（可在 `.env` 调整）：6 位数字 / 5 分钟有效 / 同邮箱同用途 60 秒冷却 / 单码错误 5 次作废。

### CORS 跨域配置

前后端一体部署（单 Express 进程托管）默认**同源**，无需配置 CORS。仅在确有跨域需求时，在 `server/.env` 设置：

```
CORS_ORIGINS=https://app.example.edu.cn,https://admin.example.edu.cn
```

默认空 = 仅同源放行（最安全）；`*` 表示全放行（不推荐生产使用）。

## 生产部署（2 核 4G Linux）

```bash
npm run install:all   # 安装依赖
npm run build         # 构建前端到 client/dist
npm run start         # 启动后端，单进程托管 API + 前端静态资源
```

- 前置 Nginx/Caddy 做 HTTPS（Let's Encrypt）反向代理到 `http://127.0.0.1:3000`，模板见 `deploy/nginx-campus-events.conf`
- 数据库文件默认位于 `server/data/data.db`（SQLite 单文件），每日自动备份见 `server/scripts/backup-db.sh`
- 上传的封面图存储在 `server/uploads/`
- 上线前核对：`bash server/scripts/pre-deploy-check.sh`（JWT 密钥强度 / 线上 seed.js 差异 / SMTP 配置 / 迁移日志）

## 运维脚本索引

| 脚本 | 用途 |
| --- | --- |
| `server/scripts/backup-db.sh` | 每日 `sqlite3 .backup` 安全备份 + 完整性检查 + 保留 14 份 + scp 异地传出（cron 每日 3 点） |
| `server/scripts/gen-jwt-secret.sh` | `openssl rand -base64 48` 生成强随机 JWT 密钥 |
| `server/scripts/pre-deploy-check.sh` | 上线前核对：JWT_SECRET 是否默认值、线上 seed.js 是否含 ADMIN_RESET_PASSWORD、SMTP 是否配置 |
| `deploy/nginx-campus-events.conf` | Nginx 443 server 块 + 80 全量跳转模板 |
| `deploy/sshd-99-hardening.conf` | sshd drop-in 加固片段（禁密码登录等，先验证密钥登录再启用） |
| `client/scripts/generate-pwa-icons.mjs` | 生成 PWA 图标（纯 Node 无依赖，可重复执行） |

## 默认管理员

首次启动自动创建（可在 `server/.env` 中修改后重启生效，仅在不存在时创建）：

- 大管理员（super_admin，完整权限）：学号 `admin`（环境变量 `ADMIN_STUDENT_ID`）/ 密码 `admin123`（环境变量 `ADMIN_PASSWORD`）
- 小管理员（admin，完整业务权限）：学号 `admin01` / `admin02` / `admin03`，密码 `admin123`（环境变量 `SUB_ADMIN_PASSWORD`）

> **生产环境务必修改所有管理员密码**，小管理员密码也需一并修改。

## 主要功能

- 学生：注册登录（邮箱验证码 + 图形验证码）、浏览/搜索/分类筛选活动、活动日历、活动详情、报名/取消报名（满员自动候补、取消自动递补）、我的报名（核销凭证提示）、站内信通知、个人资料完善、自助改密、忘记密码找回、绑定邮箱
- 组织者（全员可发布）：发布/编辑/取消活动、报名名单管理（候补页签/顺位提升/移出）、报名审核（可选开启）、CSV 导出（含核销状态列）、现场核销台（口令生成 + 学号核销 + 出席统计）、报名趋势图
- 管理员：数据概览（含全站报名趋势）、活动审核（通过/拒绝）、活动下架、活动置顶、用户禁用/启用、重置用户密码（一次性临时密码）、操作日志查询（只读）
- 校园论坛：发帖（富文本 + 图片/视频）、评论/回复、点赞/收藏、关注、@提及、话题标签、帖子置顶（管理员）、热榜排序
- 全站：隐私政策/用户协议页、PWA 可添加到主屏幕、登录失败账号锁定（5 次/15 分钟）、亮暗双主题（跟随系统 + 手动切换）

## 统一约定

- API 前缀 `/api/v1`，统一响应 `{code, message, data}`，`code=0` 成功
- 鉴权 `Authorization: Bearer <jwt>`（有效期 7 天）
- 分页参数 `page`（从 1 开始）/ `page_size`（默认 10，最大 50）
- 时间字段一律 ISO 8601 UTC 字符串；趋势统计按北京时间（UTC+8）归日期
- 错误码见 `server/src/utils/constants.js`（v2 新增 40002/40302/40906-40912）

## 测试

```bash
# 先启动后端（:3000，且 SMTP_DEV_ECHO=1），再执行：
node tests/api.test.js
```

纯 Node 脚本 + 全局 fetch，无测试框架；每次运行使用时间戳前缀，可重复执行。注意登录限流为 10 次/5 分钟/IP，测试套件已按该额度编排。
