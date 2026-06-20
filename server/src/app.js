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
let CONNECTION_MODE = process.env.CONNECTION_MODE || 'http' // http 或 websocket

// 中间件
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

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

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '丰川初音bot 服务运行正常',
    timestamp: new Date().toISOString(),
    connectionMode: CONNECTION_MODE,
    onebot: oneBotService.getConnectionStatus()
  })
})

// 获取连接状态
app.get('/api/connection/status', (req, res) => {
  res.json({
    success: true,
    mode: CONNECTION_MODE,
    onebot: oneBotService.getConnectionStatus()
  })
})

// 切换连接模式
app.post('/api/connection/mode', (req, res) => {
  const { mode } = req.body
  if (mode !== 'http' && mode !== 'websocket') {
    return res.status(400).json({
      success: false,
      message: '无效的连接模式，可选值：http 或 websocket'
    })
  }

  // 更新环境变量和本地变量（仅在当前会话生效）
  process.env.CONNECTION_MODE = mode
  CONNECTION_MODE = mode

  // 如果切换到websocket模式，启动OneBot服务
  if (mode === 'websocket') {
    startOneBot()
  } else {
    // 切换到http模式，断开OneBot连接
    oneBotService.disconnect()
  }

  res.json({
    success: true,
    message: `已切换到 ${mode} 模式`,
    mode
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
        // 根据连接模式选择发送方式
        if (CONNECTION_MODE === 'websocket' && oneBotService.isConnected) {
          // 通过OneBot发送消息
          await oneBotService.sendPrivateMessage(
            data.userId || 0,
            content
          )
        } else if (CONNECTION_MODE === 'http' && astrBotService.isConnected) {
          // 通过AstrBot HTTP API发送消息
          const result = await astrBotService.chat(
            data.username || 'web_user',
            content,
            { enableStreaming: true }
          )

          if (result.success && result.stream) {
            // 处理流式响应
            result.stream.on('data', (chunk) => {
              const text = chunk.toString()
              socket.emit('chat:stream', {
                sessionId,
                content: text
              })
            })

            result.stream.on('end', () => {
              socket.emit('chat:done', { sessionId })
            })
          }
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
  console.log(`🔗 连接模式: ${CONNECTION_MODE}`)
  console.log(`💚 健康检查: http://0.0.0.0:${PORT}/api/health`)
  console.log(`📁 前端路径: ${clientDistPath}\n`)

  // 启动OneBot服务（用于插件支持）
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
