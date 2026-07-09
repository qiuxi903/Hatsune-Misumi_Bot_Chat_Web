import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import axios from 'axios'
import { createServer } from 'http'
import { Server } from 'socket.io'
import path from 'path'
import { fileURLToPath } from 'url'

// 导入路由
import authRoutes from './routes/auth.js'
import userRoutes from './routes/user.js'
import chatRoutes from './routes/chat.js'
import pluginRoutes from './routes/plugins.js'
import wallpapersRoutes from './routes/wallpapers.js'
import adminRoutes from './routes/admin.js'

// 导入服务
import oneBotService from './services/onebot.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const server = createServer(app)

// 配置Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
})

const PORT = process.env.PORT || 5000

// 中间件
const corsOrigin = process.env.CORS_ORIGIN || '*'
app.use(cors({
  origin: corsOrigin === '*' ? true : corsOrigin,
  credentials: true
}))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// 请求日志中间件
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    console.log(`[请求] ${req.method} ${req.path}`)
  }
  next()
})

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// 前端静态文件服务（融合模式）
const clientDistPath = path.join(__dirname, '../client/dist')
app.use(express.static(clientDistPath))

// 路由
app.use('/api/auth', authRoutes)
app.use('/api/user', userRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/plugins', pluginRoutes)
app.use('/api/wallpapers', wallpapersRoutes)
app.use('/api/admin', adminRoutes)

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '丰川初音bot 服务运行正常',
    timestamp: new Date().toISOString(),
    connectionMode: 'websocket',
    onebot: oneBotService.getConnectionStatus()
  })
})

// 获取OneBot状态
app.get('/api/onebot/status', (req, res) => {
  res.json({
    success: true,
    status: oneBotService.getConnectionStatus()
  })
})

// Socket.IO连接处理
io.on('connection', (socket) => {
  console.log('客户端已连接:', socket.id)

  // 认证
  socket.on('auth', (token) => {
    // TODO: 验证token
    console.log('用户已认证:', socket.id)
    socket.emit('authenticated', { success: true })
  })

  // 发送消息
  socket.on('chat:send', async (data) => {
    const { sessionId, content, plugin } = data

    try {
      // 如果指定了插件，通过插件处理
      if (plugin) {
        // TODO: 调用插件处理消息
        socket.emit('chat:message', {
          sessionId,
          role: 'assistant',
          content: `正在通过 ${plugin} 插件处理您的消息...`,
          timestamp: new Date().toISOString()
        })
      } else {
        // 通过OneBot发送消息
        if (oneBotService.isConnected) {
          await oneBotService.sendPrivateMessage(
            data.userId || 0,
            content
          )
        } else {
          socket.emit('chat:error', {
            sessionId,
            message: 'OneBot未连接，请检查连接'
          })
        }
      }
    } catch (error) {
      console.error('处理消息错误:', error)
      socket.emit('chat:error', {
        sessionId,
        message: '处理消息失败，请重试'
      })
    }
  })

  // 停止生成
  socket.on('chat:stop', (data) => {
    // TODO: 实现停止生成功能
    console.log('停止生成:', data)
  })

  // 断开连接
  socket.on('disconnect', () => {
    console.log('客户端已断开:', socket.id)
  })
})

// 启动OneBot服务
const startOneBot = () => {
  const wsUrl = process.env.ONEBOT_WS_URL || 'ws://localhost:6199/ws'
  const token = process.env.ONEBOT_TOKEN || ''

  console.log(`正在启动OneBot v11服务，连接到: ${wsUrl}`)
  oneBotService.connect(wsUrl, token)

  oneBotService.on('connected', () => {
    console.log('✅ OneBot v11服务已连接 - 插件功能可用')
  })

  oneBotService.on('disconnected', () => {
    console.log('❌ OneBot v11服务已断开')
  })

  oneBotService.on('error', (error) => {
    console.error('OneBot v11服务错误:', error.message)
  })

  // 监听API调用（来自AstrBot的响应）
  oneBotService.on('api_call', (message) => {
    console.log('📨 收到AstrBot API调用:', message.action)
  })

  // 监听消息
  oneBotService.on('private_message', (message) => {
    console.log('收到私聊消息:', message)
    io.emit('onebot:message', {
      type: 'private',
      data: message
    })
  })

  oneBotService.on('group_message', (message) => {
    console.log('收到群聊消息:', message)
    io.emit('onebot:message', {
      type: 'group',
      data: message
    })
  })
}

// 启动服务器
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🎵 丰川初音bot 服务已启动`)
  console.log(`📡 服务地址: http://0.0.0.0:${PORT}`)
  console.log(`🔌 API地址: http://0.0.0.0:${PORT}/api`)
  console.log(`🔗 连接模式: WebSocket (OneBot v11)`)
  console.log(`💚 健康检查: http://0.0.0.0:${PORT}/api/health`)
  console.log(`📁 前端路径: ${clientDistPath}\n`)

  // 启动OneBot服务
  startOneBot()
})

// SPA路由支持 - 所有非API路由都返回index.html
app.get('*', (req, res) => {
  // 如果是API请求，返回404
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      message: '接口不存在'
    })
  }
  // 否则返回前端index.html
  res.sendFile(path.join(clientDistPath, 'index.html'))
})

// 错误处理
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason)
})

export default app
