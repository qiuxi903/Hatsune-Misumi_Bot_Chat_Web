# 丰川初音bot Chat Web

> 🎸 基于 OneBot v11 协议的 AI 聊天 Web 客户端，角色为 BanG Dream! 丰川初音（三角初華）

一个全栈 Web 聊天应用，通过 OneBot v11 反向 WebSocket 连接 AstrBot，提供类 QQ 的私聊交互体验。支持 SSE 流式回复、消息卡片、插件管理、明暗主题等功能。

## ✨ 功能特性

### 用户系统
- 用户注册 / 登录（支持用户名或邮箱登录）
- 个人资料编辑、头像上传
- 密码修改
- JWT 认证（3 小时过期）

### 聊天系统
- 多会话管理（创建、重命名、删除、批量删除）
- SSE 流式回复，打字机动画效果
- 消息历史持久化存储
- Markdown 渲染、代码高亮
- 消息复制、重新生成

### 消息类型支持
- 📝 文本消息
- 🖼️ 图片消息（本地上传 + URL）
- 🎵 音乐卡片（网易云音乐、QQ 音乐）
- 📎 链接卡片、合并转发消息
- 😊 CQ 码解析（表情、@、回复、语音、视频、文件）

### AstrBot 集成
- OneBot v11 反向 WebSocket 连接
- HTTP API 连接模式（可切换）
- 插件管理界面
- 戳一戳动画
- 智能消息聚合（多条回复自动合并）

### 界面设计
- 🌓 明暗主题切换
- 🎨 毛玻璃（Glassmorphism）UI
- 📱 响应式移动端适配
- 🖼️ 动态渐变背景（随机动漫图片）

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| **前端框架** | Vue 3（Composition API） |
| **构建工具** | Vite 5 |
| **状态管理** | Pinia 2 |
| **路由** | Vue Router 4 |
| **HTTP 客户端** | Axios |
| **WebSocket** | Socket.io-client 4 |
| **CSS** | TailwindCSS 3 + PostCSS |
| **后端框架** | Express 4 |
| **实时通信** | Socket.io 4 |
| **认证** | JWT（jsonwebtoken） |
| **密码加密** | bcryptjs |
| **Bot 协议** | OneBot v11（ws 库） |
| **文件上传** | multer |
| **数据存储** | JSON 文件（无数据库依赖） |

## 📁 项目结构

```
丰川初音aichat/
├── README.md
├── LICENSE                          # AGPL-3.0
├── docs/
│   ├── 开发日志.md
│   └── 对话日志.md
└── server/                          # 主项目目录
    ├── package.json
    ├── .env.example                 # 环境变量模板
    ├── src/
    │   ├── app.js                   # Express + Socket.IO 入口
    │   ├── middleware/
    │   │   └── auth.js              # JWT 认证中间件
    │   ├── routes/
    │   │   ├── auth.js              # 注册 / 登录 / 密码
    │   │   ├── user.js              # 用户资料 / 头像
    │   │   ├── chat.js              # 会话 / 消息 / SSE 流式
    │   │   └── plugins.js           # 插件管理
    │   ├── services/
    │   │   └── onebot.js            # OneBot v11 协议实现
    │   └── utils/
    │       └── db.js                # JSON 文件数据库
    ├── data/                        # 运行时数据（自动创建）
    │   ├── users.json
    │   ├── sessions.json
    │   └── messages.json
    ├── uploads/                     # 上传文件
    └── client/                      # Vue 3 前端
        ├── index.html
        ├── vite.config.js
        ├── tailwind.config.js
        └── src/
            ├── App.vue
            ├── main.js
            ├── router/index.js
            ├── stores/
            │   ├── user.js          # 用户状态
            │   └── chat.js          # 聊天状态
            ├── utils/
            │   ├── api.js           # Axios 封装
            │   └── socket.js        # Socket.IO 服务
            ├── styles/
            │   └── main.css         # 全局样式 + 主题变量
            └── views/
                ├── Home.vue         # 首页
                ├── Login.vue        # 登录
                ├── Register.vue     # 注册
                ├── Chat.vue         # 聊天主界面
                ├── Profile.vue      # 个人资料
                ├── Plugins.vue      # 插件管理
                └── NotFound.vue     # 404
```

## 🚀 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 1. 克隆项目

```bash
git clone https://github.com/qiuxi903/Hatsune-Misumi_Bot_Chat_Web.git
cd Hatsune-Misumi_Bot_Chat_Web
```

### 2. 安装依赖

```bash
cd server
npm run install:all
```

### 3. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# 必须修改：设置一个随机密钥
JWT_SECRET=your_random_secret_here

# AstrBot 连接配置（二选一）
# 方式一：WebSocket（推荐）
CONNECTION_MODE=websocket
ONEBOT_WS_URL=ws://localhost:6199/ws

# 方式二：HTTP API
CONNECTION_MODE=http
ASTRBOT_API_URL=http://localhost:6185
ASTRBOT_API_KEY=your_api_key_here
```

### 4. 构建前端

```bash
npm run build
```

### 5. 启动服务

```bash
# 生产模式
npm start

# 开发模式（自动重启）
npm run dev
```

访问 `http://localhost:5000` 即可使用。

### 开发模式（前后端分离）

```bash
# 终端 1：启动后端
cd server
npm run dev

# 终端 2：启动前端开发服务器
cd server/client
npm run dev
```

前端开发服务器运行在 `http://localhost:3000`，API 请求自动代理到后端 `5000` 端口。

## ⚙️ 环境变量说明

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `5000` | 服务端口 |
| `JWT_SECRET` | （必须设置） | JWT 签名密钥 |
| `CONNECTION_MODE` | `websocket` | 连接模式：`websocket` / `http` |
| `ONEBOT_WS_URL` | `ws://localhost:6199/ws` | OneBot 反向 WebSocket 地址 |
| `ONEBOT_TOKEN` | （可选） | OneBot 认证 Token |
| `ASTRBOT_API_URL` | `http://localhost:6185` | AstrBot HTTP API 地址 |
| `ASTRBOT_API_KEY` | （可选） | AstrBot API Key |
| `UPLOAD_DIR` | `./uploads` | 文件上传目录 |
| `MAX_FILE_SIZE` | `10485760` | 最大上传文件大小（字节） |
| `CORS_ORIGIN` | `http://localhost:3000` | CORS 允许的来源 |

## 📡 API 接口

<details>
<summary>点击展开完整 API 列表</summary>

### 认证 `/api/auth`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/login` | 用户登录 |
| GET | `/api/auth/me` | 获取当前用户信息 🔒 |
| PUT | `/api/auth/password` | 修改密码 🔒 |

### 用户 `/api/user`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/user/profile` | 获取个人资料 🔒 |
| PUT | `/api/user/profile` | 更新个人资料 🔒 |
| POST | `/api/user/avatar` | 上传头像 🔒 |

### 聊天 `/api/chat`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/chat/sessions` | 获取会话列表 🔒 |
| POST | `/api/chat/sessions` | 创建新会话 🔒 |
| GET | `/api/chat/sessions/:id` | 获取会话详情 🔒 |
| PUT | `/api/chat/sessions/:id` | 更新会话 🔒 |
| DELETE | `/api/chat/sessions/:id` | 删除会话 🔒 |
| POST | `/api/chat/sessions/:id/messages` | 添加消息 🔒 |
| GET | `/api/chat/sessions/:id/messages` | 获取消息列表 🔒 |
| POST | `/api/chat/send` | 发送消息并获取 AI 回复（SSE 流式） 🔒 |

### 系统

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET | `/api/connection/status` | 获取连接模式 |
| POST | `/api/connection/mode` | 切换连接模式 |
| GET | `/api/onebot/status` | OneBot 连接状态 |

🔒 = 需要 JWT 认证（`Authorization: Bearer <token>`）

</details>

## 🔌 AstrBot 对接

本项目通过 OneBot v11 协议与 AstrBot 通信，模拟 QQ 私聊环境：

```
用户浏览器 ⟷ Express 服务 ⟷ OneBot v11 WS ⟷ AstrBot ⟷ AI 模型
```

### WebSocket 模式（推荐）

1. 在 AstrBot 中配置反向 WebSocket，指向本服务地址
2. 服务启动后自动建立连接，支持心跳检测和断线重连
3. 支持所有 OneBot v11 标准查询 API

### HTTP API 模式

1. 配置 `ASTRBOT_API_URL` 和 `ASTRBOT_API_KEY`
2. 消息通过 HTTP API 发送到 AstrBot

## 📜 开源许可

本项目基于 [GNU Affero General Public License v3.0](https://www.gnu.org/licenses/agpl-3.0.html) 开源。

```
Copyright (C) 2026 邱息

本程序是自由软件：你可以再分发和/或修改它，
遵循 GNU Affero 通用公共许可证第三版或（由你选择的）任何更新的版本。
```

## 👤 作者

- [邱息](https://github.com/qiuxi903)

## ⚠️ 免责声明

- AI 生成内容可能有误，请勿当真，请自行核实
- 本项目为粉丝二创作品，与 BanG Dream! 原作及其版权方无关
