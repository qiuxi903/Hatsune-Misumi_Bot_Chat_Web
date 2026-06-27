import WebSocket from 'ws'
import { EventEmitter } from 'events'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import 'dotenv/config'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

class OneBotService extends EventEmitter {
  constructor() {
    super()
    this.ws = null // Event连接（发送事件给AstrBot）
    this.wsApi = null // API连接（接收AstrBot的API调用）
    this.isConnected = false
    this.isApiConnected = false
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 5000
    this.messageQueue = []
    this.pendingRequests = Map ? new Map() : {}
    this.echoCounter = 0

    // Web用户消息跟踪 - 用于双向通信
    this.pendingWebMessages = new Map() // userId -> { resolve, reject, messages, timer }
    this.webMessageCounter = 0

    // 连接配置
    this._url = null
    this._token = null

    // 心跳检测配置
    this.heartbeatInterval = null
    this.heartbeatTimeout = 30000 // 30秒心跳间隔
    this.lastHeartbeat = null
    this.heartbeatTimer = null

    // 监听来自AstrBot的API调用（如send_msg）
    this.on('api_call', (message) => this.handleApiCall(message))
  }

  // 创建WebSocket连接选项
  _createOptions(role, token) {
    const options = {
      headers: {
        'User-Agent': 'HatsuneAIChat/1.0',
        'X-Client-Role': role,
        'X-Self-ID': '1712833352',
        'X-Client-Platform': 'web_chat'
      }
    }
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`
    }
    return options
  }

  // 设置Event WebSocket连接的事件处理
  _setupEventWs(ws, wsUrl, token) {
    ws.on('open', () => {
      console.log('[Event WebSocket] 连接成功')
      this.isConnected = true
      this.reconnectAttempts = 0
      this.lastHeartbeat = Date.now()
      this.emit('connected')

      // 启动心跳检测
      this.startHeartbeat()

      // 发送队列中的消息
      console.log(`[Event WebSocket] 发送队列中的 ${this.messageQueue.length} 条消息`)
      while (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift()
        this._sendRaw(message)
      }
    })

    ws.on('pong', () => {
      this.lastHeartbeat = Date.now()
      console.log('[心跳] 收到pong')
    })

    ws.on('message', (data) => {
      try {
        const rawStr = data.toString()
        // 只记录非心跳消息
        if (!rawStr.includes('"meta_event_type":"heartbeat"')) {
          console.log('[Event WS] 收到消息:', rawStr.substring(0, 300))
        }
        const message = JSON.parse(rawStr)
        // Event连接不应该处理API调用
        if (message.action) {
          console.log(`[Event WS] 忽略API调用（应通过API连接）: ${message.action}`)
          return
        }
        this.handleMessage(message)
      } catch (error) {
        console.error('[Event WS] 解析消息失败:', error)
      }
    })

    ws.on('close', (code, reason) => {
      console.log(`[Event WebSocket] 连接已关闭: code=${code}`)
      this.isConnected = false
      this.stopHeartbeat()
      this.emit('disconnected', { code, reason })

      // 清理待处理消息
      for (const [userId, pending] of this.pendingWebMessages) {
        clearTimeout(pending.timer)
        pending.reject(new Error('WebSocket连接已断开'))
      }
      this.pendingWebMessages.clear()

      // 自动重连
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
        console.log(`[Event WebSocket] 尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})，${delay}ms后...`)
        setTimeout(() => this.connect(wsUrl, token), delay)
      } else {
        console.log('[Event WebSocket] 达到最大重连次数')
        this.emit('reconnect_failed')
      }
    })

    ws.on('error', (error) => {
      console.error('[Event WebSocket] 错误:', error.message)
      this.emit('error', error)
    })
  }

  // 设置API WebSocket连接的事件处理
  _setupApiWs(ws, wsUrl, token) {
    ws.on('open', () => {
      console.log('[API WebSocket] 连接成功 - 可接收AstrBot API调用')
      this.isApiConnected = true
    })

    ws.on('pong', () => {
      // API连接心跳
    })

    ws.on('message', (data) => {
      try {
        const rawStr = data.toString()
        console.log('[API WS] 收到消息:', rawStr.substring(0, 500))
        const message = JSON.parse(rawStr)

        // 处理API调用
        if (message.action) {
          console.log(`[API WS] 收到API调用: ${message.action}`)
          this.emit('api_call', message)
          return
        }

        // 处理响应
        if (message.echo !== undefined) {
          const pending = this.pendingRequests.get(message.echo)
          if (pending) {
            this.pendingRequests.delete(message.echo)
            if (message.status === 'ok') {
              pending.resolve(message.data)
            } else {
              pending.reject(new Error(message.message || '请求失败'))
            }
          }
          return
        }

        // 其他消息
        this.handleMessage(message)
      } catch (error) {
        console.error('[API WS] 解析消息失败:', error)
      }
    })

    ws.on('close', (code, reason) => {
      console.log(`[API WebSocket] 连接已关闭: code=${code}`)
      this.isApiConnected = false

      // 自动重连API连接
      if (this._url) {
        const delay = 3000
        console.log(`[API WebSocket] ${delay}ms后重连...`)
        setTimeout(() => this._connectApi(this._url, this._token), delay)
      }
    })

    ws.on('error', (error) => {
      console.error('[API WebSocket] 错误:', error.message)
    })
  }

  // 建立API连接
  _connectApi(url, token) {
    if (this.wsApi) {
      try { this.wsApi.close() } catch (e) {}
    }

    let wsUrl = url
    if (!wsUrl.endsWith('/ws')) {
      wsUrl = wsUrl.replace(/\/$/, '') + '/ws'
    }

    console.log(`[API WebSocket] 正在连接: ${wsUrl}`)
    const options = this._createOptions('API', token)
    this.wsApi = new WebSocket(wsUrl, options)
    this._setupApiWs(this.wsApi, url, token)
  }

  // 连接到OneBot v11服务
  connect(url, token = null) {
    if (this.ws) {
      console.log('[connect] 断开现有Event连接')
      this.disconnect()
    }

    this._url = url
    this._token = token

    // 确保URL格式正确
    let wsUrl = url
    if (!wsUrl.endsWith('/ws')) {
      wsUrl = wsUrl.replace(/\/$/, '') + '/ws'
    }

    console.log(`[connect] 正在建立双WebSocket连接: ${wsUrl}`)

    // 1. 建立Event连接（发送事件给AstrBot）
    const eventOptions = this._createOptions('Event', token)
    this.ws = new WebSocket(wsUrl, eventOptions)
    this._setupEventWs(this.ws, url, token)

    // 2. 建立API连接（接收AstrBot的API调用）
    setTimeout(() => {
      this._connectApi(url, token)
    }, 1000) // 延迟1秒，确保Event连接先建立
  }

  // 启动心跳检测
  startHeartbeat() {
    this.stopHeartbeat()

    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.ws) {
        // 检查WebSocket状态
        if (this.ws.readyState !== WebSocket.OPEN) {
          console.log(`[心跳] WebSocket状态异常: ${this.ws.readyState}，尝试重新连接...`)
          this.reconnect()
          return
        }

        // 发送心跳ping
        try {
          this.ws.ping()
          console.log('[心跳] 发送ping')
        } catch (error) {
          console.error('[心跳] 发送失败:', error.message)
          this.reconnect()
        }

        // 检查是否超时
        if (this.lastHeartbeat && Date.now() - this.lastHeartbeat > this.heartbeatTimeout * 2) {
          console.log('[心跳] 超时，重新连接...')
          this.reconnect()
        }
      }
    }, this.heartbeatTimeout)
  }

  // 停止心跳检测
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  // 重新连接
  reconnect() {
    if (this._url) {
      console.log('[reconnect] 开始重新连接...')
      this.disconnect()
      this.connect(this._url, this._token)
    } else {
      console.log('[reconnect] 无法重连：没有保存的URL')
    }
  }

  // 主动检查连接健康状态
  async checkConnectionHealth() {
    if (!this.isConnected || !this.ws) {
      return { healthy: false, reason: '未连接' }
    }

    if (this.ws.readyState !== WebSocket.OPEN) {
      return { healthy: false, reason: `WebSocket状态异常: ${this.ws.readyState}` }
    }

    // 检查最后一次心跳时间
    const now = Date.now()
    if (this.lastHeartbeat && now - this.lastHeartbeat > this.heartbeatTimeout * 3) {
      return { healthy: false, reason: `心跳超时: ${(now - this.lastHeartbeat) / 1000}秒未收到pong` }
    }

    return { healthy: true, lastHeartbeat: this.lastHeartbeat }
  }

  // 断开连接
  disconnect() {
    console.log('[disconnect] 断开OneBot连接')
    this.stopHeartbeat()

    if (this.ws) {
      this.ws.close()
      this.ws = null
      this.isConnected = false
    }

    if (this.wsApi) {
      this.wsApi.close()
      this.wsApi = null
      this.isApiConnected = false
    }

    // 清理所有待处理的Web消息
    const pendingCount = this.pendingWebMessages.size
    if (pendingCount > 0) {
      console.log(`[disconnect] 清理 ${pendingCount} 个待处理的Web消息`)
    }
    for (const [userId, pending] of this.pendingWebMessages) {
      clearTimeout(pending.timer)
      pending.reject(new Error('连接已断开'))
    }
    this.pendingWebMessages.clear()
  }

  // 通过API连接发送消息（用于echo响应）
  _sendApiRaw(message) {
    if (!this.wsApi || this.wsApi.readyState !== WebSocket.OPEN) {
      console.log(`[_sendApiRaw] API WebSocket未就绪，尝试通过Event连接发送`)
      return this._sendRaw(message)
    }

    try {
      const msgStr = JSON.stringify(message)
      console.log(`[_sendApiRaw] 通过API连接发送: ${msgStr.substring(0, 200)}`)
      this.wsApi.send(msgStr)
      return true
    } catch (error) {
      console.error('[_sendApiRaw] 发送失败:', error)
      return this._sendRaw(message)
    }
  }

  // 发送消息（内部方法，通过Event连接）
  _sendRaw(message) {
    // 检查连接状态
    if (!this.isConnected || !this.ws) {
      console.log(`[_sendRaw] WebSocket未连接，消息加入队列。isConnected: ${this.isConnected}, ws: ${!!this.ws}`)
      this.messageQueue.push(message)
      return false
    }

    // 检查WebSocket就绪状态
    if (this.ws.readyState !== WebSocket.OPEN) {
      console.log(`[_sendRaw] WebSocket状态不是OPEN: ${this.ws.readyState}，消息加入队列`)
      this.messageQueue.push(message)
      return false
    }

    try {
      const msgStr = JSON.stringify(message)
      // 只记录API调用响应和重要消息，不记录心跳
      if (message.action || message.echo || message.post_type === 'message') {
        console.log(`[_sendRaw] 发送消息: ${msgStr.substring(0, 200)}`)
      }
      this.ws.send(msgStr)
      return true
    } catch (error) {
      console.error('[_sendRaw] 发送OneBot消息失败:', error)
      // 发送失败时尝试重连
      this.reconnect()
      return false
    }
  }

  // 发送消息（公开方法，支持队列）
  send(message) {
    return this._sendRaw(message)
  }

  // 将消息文本解析为OneBot v11消息段数组
  // 支持图片本地文件读取并转为base64发送
  async _parseMessageToSegments(message) {
    const segments = []
    // 匹配Markdown图片格式: ![图片](url) 或 ![alt](url)
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g
    let lastIndex = 0
    let match

    while ((match = imageRegex.exec(message)) !== null) {
      // 添加图片前的文本
      if (match.index > lastIndex) {
        const text = message.substring(lastIndex, match.index)
        if (text.trim()) {
          segments.push({ type: 'text', data: { text } })
        }
      }

      // 添加图片段
      let imageUrl = match[2]
      console.log('处理图片URL:', imageUrl.substring(0, 80))

      // 如果是相对路径，读取本地文件并转为base64
      if (imageUrl.startsWith('/uploads/')) {
        try {
          // 构建本地文件路径
          const localPath = path.join(__dirname, '..', '..', imageUrl)
          console.log('读取本地文件:', localPath)

          // 检查文件是否存在
          if (fs.existsSync(localPath)) {
            const imageBuffer = fs.readFileSync(localPath)
            const base64Data = imageBuffer.toString('base64')
            const base64File = `base64://${base64Data}`
            console.log('图片已转为base64, 长度:', base64Data.length)

            segments.push({
              type: 'image',
              data: { file: base64File }
            })
          } else {
            console.error('图片文件不存在:', localPath)
            segments.push({ type: 'text', data: { text: '[图片加载失败]' } })
          }
        } catch (err) {
          console.error('读取图片失败:', err.message)
          segments.push({ type: 'text', data: { text: '[图片加载失败]' } })
        }
      } else {
        // 如果是完整URL，直接使用
        segments.push({
          type: 'image',
          data: { file: imageUrl }
        })
      }

      lastIndex = match.index + match[0].length
    }

    // 添加剩余的文本
    if (lastIndex < message.length) {
      const text = message.substring(lastIndex)
      if (text.trim()) {
        segments.push({ type: 'text', data: { text } })
      }
    }

    // 如果没有匹配到任何内容，返回纯文本
    if (segments.length === 0) {
      segments.push({ type: 'text', data: { text: message } })
    }

    return segments
  }

  // 处理接收到的消息
  handleMessage(message) {
    // 调试日志 - 记录所有非meta_event消息
    if (message.post_type !== 'meta_event') {
      console.log('收到OneBot消息:', JSON.stringify(message).substring(0, 300))
    }

    // 处理API调用来自AstrBot（如send_msg, send_private_msg）
    // OneBot v11协议中，实现端可以向客户端发送API调用
    if (message.action) {
      console.log(`[API调用] 收到AstrBot API请求: ${message.action}`, message.echo ? `(echo: ${message.echo})` : '')
      this.emit('api_call', message)
      return
    }

    // 处理响应消息（我们调用API后的响应）
    if (message.echo !== undefined) {
      const pending = this.pendingRequests.get(message.echo)
      if (pending) {
        this.pendingRequests.delete(message.echo)
        if (message.status === 'ok') {
          pending.resolve(message.data)
        } else {
          pending.reject(new Error(message.message || '请求失败'))
        }
      }
      return
    }

    // 处理事件消息
    if (message.post_type) {
      this.emit(message.post_type, message)

      // 根据事件类型分发
      switch (message.post_type) {
        case 'message':
          this.emit('message', message)
          if (message.message_type === 'private') {
            this.emit('private_message', message)
          } else if (message.message_type === 'group') {
            this.emit('group_message', message)
          }
          break
        case 'notice':
          this.emit('notice', message)
          break
        case 'request':
          this.emit('request', message)
          break
        case 'meta_event':
          this.emit('meta_event', message)
          if (message.meta_event_type === 'heartbeat') {
            this.emit('heartbeat', message)
          } else if (message.meta_event_type === 'lifecycle') {
            this.emit('lifecycle', message)
          }
          break
      }
    }
  }

  // 处理来自AstrBot的API调用（核心：这是接收插件响应的关键）
  async handleApiCall(message) {
    const { action, params, echo } = message

    console.log(`[handleApiCall] 处理API调用: ${action}`, echo ? `(echo: ${echo})` : '')
    if (params) {
      console.log(`[handleApiCall] 参数:`, JSON.stringify(params).substring(0, 300))
    }

    // === 查询API处理（返回模拟QQ数据，不推入pending消息）===
    const queryResult = this._handleQueryApi(action, params)
    if (queryResult !== undefined) {
      if (echo) {
        this._sendApiRaw({ status: 'ok', retcode: 0, data: queryResult, echo })
      }
      return
    }

    // === 响应类API处理（推入pending消息）===

    // 处理send_msg和send_private_msg调用（AstrBot要发送消息给用户）
    if (action === 'send_msg' || action === 'send_private_msg') {
      console.log(`[send_private_msg] 开始处理发送消息请求`)
      // 统一转为数字类型，确保与Map的key类型一致
      let userId = params.user_id !== undefined ? Number(params.user_id) : null
      let responseContent = ''

      // 提取消息内容
      if (typeof params.message === 'string') {
        responseContent = params.message
      } else if (Array.isArray(params.message)) {
        // 处理消息段数组（支持async因为music类型需要获取歌曲信息）
        responseContent = await this.extractMessageText(params.message)
      }

      // 如果没有user_id，尝试找到最近的待处理消息（私聊场景下通常只有一个用户）
      if (!userId && this.pendingWebMessages.size > 0) {
        const entries = [...this.pendingWebMessages.entries()]
        // 找到最近创建的待处理消息
        entries.sort((a, b) => (b[1].sentAt || 0) - (a[1].sentAt || 0))
        userId = entries[0][0]
        console.log(`[send_private_msg] 未指定user_id，使用最近的待处理用户: ${userId}`)
      }

      console.log(`[send_private_msg] AstrBot发送消息给用户 ${userId}: ${responseContent.substring(0, 200)}`)
      console.log(`[send_private_msg] 消息类型: ${typeof params.message}, 是否数组: ${Array.isArray(params.message)}`)
      if (Array.isArray(params.message)) {
        console.log(`[send_private_msg] 消息段: ${JSON.stringify(params.message.map(s => ({type: s.type, hasData: !!s.data})))}`)
      }

      // 查找对应的待处理Web消息
      const pending = userId ? this.pendingWebMessages.get(userId) : null
      console.log(`[send_private_msg] 查找pending消息: userId=${userId}(类型:${typeof userId}), pendingWebMessages.size=${this.pendingWebMessages.size}, found=${!!pending}, keys=[${[...this.pendingWebMessages.keys()].join(',')}]`)

      if (pending) {
        // 过滤掉AstrBot插件的错误消息
        if (responseContent && (
          responseContent.includes("'NoneType' object has no attribute") ||
          responseContent.includes("Traceback (most recent call last)") ||
          responseContent.includes("AttributeError:") ||
          responseContent.includes("TypeError:") ||
          responseContent.includes("在调用插件") && responseContent.includes("时出现异常")
        )) {
          console.log(`[send_private_msg] 过滤掉AstrBot插件错误消息: ${responseContent.substring(0, 80)}`)
          // 仍然回复echo，但不推入pending消息
          if (echo) {
            this._sendApiRaw({ status: 'ok', retcode: 0, data: null, echo })
          }
          return
        }

        // 收集响应消息（可能有多条）
        pending.messages.push(responseContent)
        console.log(`[send_private_msg] 已推送消息到pending，当前共 ${pending.messages.length} 条消息`)
        console.log(`[send_private_msg] 消息内容预览: ${responseContent.substring(0, 100)}`)

        // 立即通过回调通知前端（流式输出）
        if (pending.onMessage) {
          pending.onMessage({
            content: responseContent,
            messageIndex: pending.messages.length - 1,
            totalMessages: pending.messages.length
          })
        }

        // 智能消息收集：每次收到新消息重置定时器，最多等待3秒
        clearTimeout(pending.timer)
        const elapsed = Date.now() - (pending.sentAt || Date.now())
        const remaining = Math.max(3000 - elapsed, 500) // 至少等500ms，最多等到3秒

        console.log(`[send_private_msg] 重置收集定时器, userId=${userId}, 已过${elapsed}ms, 等待${remaining}ms`)

        pending.timer = setTimeout(() => {
          console.log(`[send_private_msg] 收集定时器触发，userId=${userId}，共 ${pending.messages.length} 条消息`)
          if (this.pendingWebMessages.has(userId)) {
            this.pendingWebMessages.delete(userId)
            // 返回消息数组，支持多条消息分开显示
            const messages = [...pending.messages]
            console.log(`[send_private_msg] Web用户 ${userId} 收到所有响应，共 ${messages.length} 条消息`)
            pending.resolve(messages)
          }
        }, remaining)
      } else {
        console.log(`[send_private_msg] 未找到pending消息: userId=${userId}`)
        console.log(`[send_private_msg] 当前pending用户: [${[...this.pendingWebMessages.keys()].join(',')}]`)
      }

      // 发送成功响应给AstrBot（必须回复，否则AstrBot会认为调用失败）
      if (echo) {
        console.log(`[send_private_msg] 发送成功响应给AstrBot, echo: ${echo}`)
        this._sendApiRaw({ status: 'ok', retcode: 0, data: null, echo })
      } else {
        console.log(`[send_private_msg] 警告: 没有echo字段，无法发送响应`)
      }
    } else if (action === 'send_group_msg') {
      // 群消息响应（暂不处理，但需要回复echo）
      if (echo) {
        this._sendApiRaw({ status: 'ok', retcode: 0, data: null, echo })
      }
    } else if (action === 'friend_poke') {
      // 处理戳一戳动作
      const userId = params.user_id
      console.log(`[friend_poke] AstrBot发送戳一戳给用户 ${userId}`)

      // 查找对应的待处理Web消息
      const pending = this.pendingWebMessages.get(userId)
      if (pending) {
        // 只记录戳一戳消息，不立即resolve
        // 等待正式的send_private_msg来resolve
        pending.messages.push('[戳一戳]')
        console.log(`[friend_poke] 已记录戳一戳消息到pending，当前共 ${pending.messages.length} 条消息`)

        // 重置定时器，等待更长时间（30秒）让正式消息到达
        clearTimeout(pending.timer)
        pending.timer = setTimeout(() => {
          if (this.pendingWebMessages.has(userId)) {
            this.pendingWebMessages.delete(userId)
            const messages = [...pending.messages]
            console.log(`[friend_poke] 戳一戳定时器触发，Web用户 ${userId} 收到所有响应，共 ${messages.length} 条消息`)
            pending.resolve(messages)
          }
        }, 30000) // 30秒超时，等待正式消息
      } else {
        console.log(`[friend_poke] 未找到用户 ${userId} 的pending消息`)
      }

      // 发送成功响应给AstrBot
      if (echo) {
        console.log(`[friend_poke] 发送成功响应给AstrBot, echo: ${echo}`)
        this._sendApiRaw({ status: 'ok', retcode: 0, data: null, echo })
      }
    } else {
      // 未知的响应类API调用 - 回复成功但不推入pending消息
      console.log(`未处理的API调用: ${action}`)
      if (echo) {
        this._sendApiRaw({ status: 'ok', retcode: 0, data: null, echo })
      }
    }
  }

  // 处理查询API调用（返回模拟QQ数据）
  _handleQueryApi(action, params) {
    const botQQ = 1712833352
    const botNickname = '丰川初音'

    switch (action) {
      case 'get_stranger_info': {
        const userId = params.user_id
        // 尝试从缓存中获取用户信息
        const cached = this._userCache?.[userId]
        return {
          user_id: userId,
          nickname: cached?.nickname || `用户${userId}`,
          sex: 'unknown',
          age: 0,
          level: '活跃',
          login_days: Math.floor(Math.random() * 365) + 30,
          remark: ''
        }
      }

      case 'get_login_info':
        return {
          user_id: botQQ,
          nickname: botNickname
        }

      case 'get_friend_list':
        return []

      case 'get_group_list':
        return []

      case 'get_group_member_list':
        return []

      case 'get_group_member_info': {
        const userId = params.user_id
        const cached = this._userCache?.[userId]
        return {
          group_id: params.group_id || 0,
          user_id: userId,
          nickname: cached?.nickname || `用户${userId}`,
          card: '',
          sex: 'unknown',
          age: 0,
          area: '',
          join_time: Math.floor(Date.now() / 1000) - 86400 * 30,
          last_sent_time: Math.floor(Date.now() / 1000),
          level: '活跃',
          role: 'member',
          title: ''
        }
      }

      case 'get_status':
        return {
          online: true,
          good: true,
          stat: {
            packet_received: 0,
            packet_sent: 0,
            packet_lost: 0,
            message_received: 0,
            message_sent: 0,
            disconnect_times: 0,
            lost_times: 0
          }
        }

      case 'get_version_info':
        return {
          app_name: 'go-cqhttp',
          app_version: '1.0.0',
          protocol_version: 'v11',
          coolq_edition: 'pro'
        }

      case 'can_send_image':
        return { yes: true }

      case 'can_send_record':
        return { yes: true }

      case 'get_image':
        return {
          file: params.file || '',
          url: params.file || '',
          file_size: '0'
        }

      case 'get_record':
        return {
          file: params.file || '',
          url: params.file || ''
        }

      case 'get_msg':
        return {
          message_id: params.message_id || 0,
          message_id_str: String(params.message_id || 0),
          real_id: 0,
          sender: { user_id: botQQ, nickname: botNickname },
          time: Math.floor(Date.now() / 1000),
          message: [{ type: 'text', data: { text: '' } }],
          raw_message: ''
        }

      case 'delete_msg':
        return null

      case 'set_friend_add_request':
        return null

      case 'set_group_add_request':
        return null

      default:
        // 不是查询API，返回undefined表示需要继续处理
        return undefined
    }
  }

  // 从消息段数组中提取文本和图片（支持async因为music类型需要获取歌曲信息）
  async extractMessageText(segments) {
    const results = await Promise.all(segments.map(async seg => {
      if (seg.type === 'text') {
        return seg.data?.text || ''
      } else if (seg.type === 'image') {
        const url = seg.data?.url || seg.data?.file || ''
        console.log(`处理图片消息: url长度=${url.length}, 前缀=${url.substring(0, 20)}`)
        if (!url) return '[图片]'
        // 如果是base64数据，保存为文件
        if (url.startsWith('base64://')) {
          try {
            const base64Data = url.replace('base64://', '')
            const buffer = Buffer.from(base64Data, 'base64')
            const filename = `img_${Date.now()}_${Math.random().toString(36).substr(2, 6)}.jpg`
            const uploadDir = path.join(__dirname, '../../uploads/images')
            // 确保目录存在
            if (!fs.existsSync(uploadDir)) {
              fs.mkdirSync(uploadDir, { recursive: true })
            }
            const filepath = path.join(uploadDir, filename)
            fs.writeFileSync(filepath, buffer)
            console.log(`保存base64图片成功: ${filename} (${buffer.length} bytes)`)
            return `![图片](/uploads/images/${filename})`
          } catch (e) {
            console.error('保存base64图片失败:', e.message)
            return '[图片]'
          }
        }
        // 如果是普通URL，直接返回
        if (url.startsWith('http://') || url.startsWith('https://')) {
          return `![图片](${url})`
        }
        // 其他情况（可能是文件路径）
        return `[图片: ${url.substring(0, 50)}]`
      } else if (seg.type === 'face') {
        return '[表情]'
      } else if (seg.type === 'at') {
        return `@${seg.data?.qq || ''}`
      } else if (seg.type === 'reply') {
        // 忽略引用消息，不显示
        return ''
      } else if (seg.type === 'forward') {
        // 尝试解析合并转发消息
        return this._parseForwardMessage(seg.data)
      } else if (seg.type === 'json') {
        // 解析JSON消息（音乐卡片、小程序等）
        return this._parseJsonMessage(seg.data)
      } else if (seg.type === 'music') {
        // 音乐分享（网易云音乐、QQ音乐等）
        return this._parseMusicMessage(seg.data)
      } else if (seg.type === 'record') {
        return '[语音消息]'
      } else if (seg.type === 'video') {
        return '[视频消息]'
      } else if (seg.type === 'file') {
        const fileName = seg.data?.name || seg.data?.file || '文件'
        return `[文件: ${fileName}]`
      } else if (seg.type === 'node') {
        // 转发消息节点
        return this._parseForwardNode(seg.data)
      } else {
        console.log(`未知消息段类型: ${seg.type}`, seg.data)
        return `[${seg.type}]`
      }
    }))
    return results.filter(Boolean).join('\n')
  }

  // 解析JSON消息（音乐卡片、小程序等）
  _parseJsonMessage(data) {
    try {
      const jsonStr = typeof data === 'string' ? data : (data?.data || data?.config?.token || JSON.stringify(data))
      const json = JSON.parse(jsonStr)

      // 腾讯结构化消息（音乐卡片、链接分享等）
      if (json.app === 'com.tencent.structmsg' || json.view) {
        const title = json.meta?.detail_1?.desc || json.meta?.news?.desc || json.desc || ''
        const prompt = json.prompt || json.desc || ''
        const jumpUrl = json.meta?.detail_1?.qqdocurl || json.meta?.news?.jumpUrl || ''

        // 音乐卡片
        if (json.view === 'music') {
          const music = json.meta?.music || {}
          const musicTitle = music.title || title || '未知歌曲'
          const musicDesc = music.desc || ''
          const musicUrl = music.jumpUrl || music.musicUrl || jumpUrl || ''
          const preview = music.preview || ''
          let result = `🎵 ${musicTitle}`
          if (musicDesc) result += ` - ${musicDesc}`
          if (musicUrl) result += `\n${musicUrl}`
          return result
        }

        // 新闻/链接分享
        if (json.view === 'news' || json.view === 'link') {
          let result = `🔗 ${prompt || title}`
          if (jumpUrl) result += `\n${jumpUrl}`
          return result
        }

        return prompt || '[富文本消息]'
      }

      // 小程序
      if (json.app === 'com.tencent.miniapp') {
        const title = json.prompt || json.meta?.detail_1?.desc || '[小程序]'
        return `📱 ${title}`
      }

      // B站等第三方分享
      if (json.app === 'com.tencent.qqdownloader' || json.desc?.includes('bilibili')) {
        return `🔗 ${json.prompt || json.desc || '[链接分享]'}`
      }

      // 通用处理
      return json.prompt || json.desc || json.meta?.detail_1?.desc || '[富文本消息]'
    } catch (e) {
      return '[JSON消息]'
    }
  }

  // 解析音乐分享消息（type=music）
  async _parseMusicMessage(data) {
    try {
      const musicType = data?.type || 'unknown'
      const musicId = data?.id || ''
      const musicUrl = data?.url || ''
      let musicName = data?.name || data?.title || ''
      let musicSinger = data?.singer || data?.artist || ''

      // 根据音乐平台生成链接
      let url = musicUrl
      if (!url && musicId) {
        if (musicType === '163' || musicType === 'netease') {
          url = `https://music.163.com/song/${musicId}`
          // 尝试从网易云API获取歌曲信息
          if (!musicName) {
            try {
              const resp = await fetch(`https://music.163.com/api/song/detail?ids=[${musicId}]`, {
                headers: { 'Referer': 'https://music.163.com/' },
                signal: AbortSignal.timeout(3000)
              })
              const json = await resp.json()
              const song = json?.songs?.[0]
              if (song) {
                musicName = song.name || ''
                musicSinger = song.artists?.map(a => a.name).join('/') || ''
              }
            } catch (e) {
              // 获取失败，使用默认值
            }
          }
        } else if (musicType === 'qq') {
          url = `https://y.qq.com/n/ryqq/songDetail/${musicId}`
        }
      }

      const title = musicName || '未知歌曲'
      const artist = musicSinger || ''

      return `🎵 ${title}${artist ? ' - ' + artist : ''}\n${url}`
    } catch (e) {
      return '[音乐分享]'
    }
  }

  // 解析合并转发消息
  _parseForwardMessage(data) {
    try {
      if (data?.content && Array.isArray(data.content)) {
        const messages = data.content.map(node => {
          const name = node.sender?.nickname || node.name || '未知'
          const text = this._parseForwardNode(node)
          return `${name}: ${text}`
        })
        return `[合并转发]\n${messages.join('\n')}`
      }
      return '[合并转发消息]'
    } catch (e) {
      return '[合并转发消息]'
    }
  }

  // 解析转发消息节点
  async _parseForwardNode(data) {
    try {
      if (!data) return '[消息]'
      if (data.message) {
        if (typeof data.message === 'string') return data.message
        if (Array.isArray(data.message)) return await this.extractMessageText(data.message)
      }
      if (data.content) {
        if (typeof data.content === 'string') return data.content
        if (Array.isArray(data.content)) return await this.extractMessageText(data.content)
      }
      return '[消息]'
    } catch (e) {
      return '[消息]'
    }
  }

  // 生成用户ID（基于用户名的哈希，确保一致性）
  generateUserId(username) {
    let hash = 0
    for (let i = 0; i < username.length; i++) {
      const char = username.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 转换为32位整数
    }
    // 确保是正数且在合理范围内（1000000-9999999）
    return (Math.abs(hash) % 9000000) + 1000000
  }

  // 发送Web用户消息到AstrBot并等待响应（核心方法）
  // options.onMessage: 回调函数，收到消息时立即调用
  async sendWebMessage(username, message, options = {}) {
    // 使用QQ号作为user_id（如果有的话）
    const userId = Number(options.qqNumber ? parseInt(options.qqNumber) : this.generateUserId(username))
    const nickname = options.nickname || username
    const sessionId = options.sessionId
    const isNewSession = options.isNewSession || false
    const onMessage = options.onMessage || null // 流式回调

    // 缓存用户信息，供查询API使用
    this._userCache = this._userCache || {}
    this._userCache[userId] = { username, nickname, qqNumber: options.qqNumber }

    console.log(`发送Web消息到AstrBot: 用户=${username}, userId=${userId}, sessionId=${sessionId}, isNewSession=${isNewSession}, 消息=${message.substring(0, 100)}`)

    // 如果是新会话，先发送 /new 指令创建新对话
    if (isNewSession && this.isConnected) {
      console.log('发送 /new 指令创建新会话...')
      const newSessionEvent = {
        time: Math.floor(Date.now() / 1000),
        self_id: 1712833352,
        post_type: 'message',
        message_type: 'private',
        sub_type: 'friend',
        message_id: ++this.webMessageCounter,
        user_id: userId,
        message: [{ type: 'text', data: { text: '/new' } }],
        raw_message: '/new',
        font: 0,
        sender: {
          user_id: userId,
          nickname: nickname,
          sex: 'unknown',
          age: 0
        }
      }
      this._sendRaw(newSessionEvent)
      // 等待一小段时间让AstrBot处理/new指令
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    // 将消息转换为OneBot v11消息段数组（异步，因为可能需要下载图片）
    const messageSegments = await this._parseMessageToSegments(message)
    console.log('消息段数量:', messageSegments.length, '类型:', messageSegments.map(s => s.type))

    const messageId = ++this.webMessageCounter
    const timestamp = Math.floor(Date.now() / 1000)

    // 创建OneBot v11格式的消息事件（模拟QQ私聊消息）
    // 使用array格式，aiocqhttp适配器要求array格式
    const messageEvent = {
      time: timestamp,
      self_id: 1712833352, // 机器人的QQ号（必须与AstrBot配置一致）
      post_type: 'message',
      message_type: 'private',
      sub_type: 'friend',
      message_id: messageId,
      user_id: userId,
      message: messageSegments,
      raw_message: message,
      font: 0,
      sender: {
        user_id: userId,
        nickname: nickname,
        sex: 'unknown',
        age: 0
      }
    }

    // 尝试通过WebSocket发送消息
    let wsSent = false
    if (this.isConnectionReady()) {
      wsSent = this._sendRaw(messageEvent)
      if (wsSent) {
        console.log('[sendWebMessage] 消息已通过WebSocket发送')
      } else {
        console.log('[sendWebMessage] WebSocket发送失败')
      }
    } else {
      console.log('[sendWebMessage] WebSocket未就绪，状态:', {
        isConnected: this.isConnected,
        wsReadyState: this.ws ? this.ws.readyState : null
      })
      // 尝试重连
      if (!this.isConnected) {
        console.log('[sendWebMessage] 尝试重新连接...')
        this.reconnect()
      }
    }

    // 如果WebSocket发送失败，抛出错误
    if (!wsSent) {
      throw new Error('WebSocket发送失败，请检查连接')
    }

    // 等待WebSocket响应
    return new Promise((resolve, reject) => {
      // 设置超时（120秒，给AI足够时间回复）
      const timeout = setTimeout(() => {
        if (this.pendingWebMessages.has(userId)) {
          this.pendingWebMessages.delete(userId)
          console.log(`[sendWebMessage] 响应超时, userId=${userId}, wsSent=${wsSent}`)
          // 区分"消息已发送但响应超时"和"消息发送失败"
          if (wsSent) {
            reject(new Error('消息已发送，但AstrBot响应超时（120秒）'))
          } else {
            reject(new Error('OneBot消息处理超时，AstrBot可能未正确处理消息'))
          }
        }
      }, 120000)

      // 存储待处理的请求
      this.pendingWebMessages.set(userId, {
        resolve: (data) => {
          clearTimeout(timeout)
          console.log(`[sendWebMessage] 收到响应, userId=${userId}, 消息数=${Array.isArray(data) ? data.length : 1}`)
          resolve(data)
        },
        reject: (error) => {
          clearTimeout(timeout)
          console.log(`[sendWebMessage] 请求失败, userId=${userId}: ${error.message}`)
          reject(error)
        },
        onMessage: onMessage, // 流式回调
        messages: [],
        timer: null,
        username,
        sentAt: Date.now()
      })
      console.log(`[sendWebMessage] 已注册pending消息, userId=${userId}, 当前pending数=${this.pendingWebMessages.size}`)

      // 如果WebSocket发送失败，我们需要通过HTTP API发送消息
      // 但HTTP API发送后，响应会通过WebSocket返回（如果连接的话）
      // 如果没有WebSocket连接，我们无法获取响应
      if (!wsSent && this.isConnected) {
        // HTTP API发送后，等待WebSocket响应
        console.log('等待WebSocket响应...')
      } else if (!wsSent && !this.isConnected) {
        // 没有WebSocket连接，无法获取响应
        clearTimeout(timeout)
        this.pendingWebMessages.delete(userId)
        resolve('消息已发送，但无法获取AI回复（WebSocket未连接）')
      }
    })
  }

  // 调用API（用于发送命令到AstrBot）
  async callApi(action, params = {}) {
    return new Promise((resolve, reject) => {
      const echo = `echo_${++this.echoCounter}_${Date.now()}`

      const message = {
        action,
        params,
        echo
      }

      // 设置超时
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(echo)
        reject(new Error('API调用超时'))
      }, 30000)

      this.pendingRequests.set(echo, {
        resolve: (data) => {
          clearTimeout(timeout)
          resolve(data)
        },
        reject: (error) => {
          clearTimeout(timeout)
          reject(error)
        }
      })

      this._sendRaw(message)
    })
  }

  // 发送私聊消息
  async sendPrivateMessage(userId, message, autoEscape = false) {
    return this.callApi('send_private_msg', {
      user_id: userId,
      message,
      auto_escape: autoEscape
    })
  }

  // 发送群聊消息
  async sendGroupMessage(groupId, message, autoEscape = false) {
    return this.callApi('send_group_msg', {
      group_id: groupId,
      message,
      auto_escape: autoEscape
    })
  }

  // 发送消息（通用）
  async sendMessage(messageType, id, message, autoEscape = false) {
    const params = {
      message,
      auto_escape: autoEscape
    }

    if (messageType === 'private') {
      params.user_id = id
    } else if (messageType === 'group') {
      params.group_id = id
    }

    return this.callApi('send_msg', {
      message_type: messageType,
      ...params
    })
  }

  // 获取登录信息
  async getLoginInfo() {
    return this.callApi('get_login_info')
  }

  // 获取好友列表
  async getFriendList() {
    return this.callApi('get_friend_list')
  }

  // 获取群列表
  async getGroupList() {
    return this.callApi('get_group_list')
  }

  // 获取群成员列表
  async getGroupMemberList(groupId) {
    return this.callApi('get_group_member_list', {
      group_id: groupId
    })
  }

  // 获取群成员信息
  async getGroupMemberInfo(groupId, userId, noCache = false) {
    return this.callApi('get_group_member_info', {
      group_id: groupId,
      user_id: userId,
      no_cache: noCache
    })
  }

  // 获取陌生人信息
  async getStrangerInfo(userId, noCache = false) {
    return this.callApi('get_stranger_info', {
      user_id: userId,
      no_cache: noCache
    })
  }

  // 获取消息
  async getMessage(messageId) {
    return this.callApi('get_msg', {
      message_id: messageId
    })
  }

  // 撤回消息
  async deleteMessage(messageId) {
    return this.callApi('delete_msg', {
      message_id: messageId
    })
  }

  // 获取状态
  async getStatus() {
    return this.callApi('get_status')
  }

  // 获取版本信息
  async getVersionInfo() {
    return this.callApi('get_version_info')
  }

  // 解析CQ码消息
  parseCQCode(message) {
    if (typeof message !== 'string') {
      return message
    }

    const segments = []
    const regex = /\[CQ:([^,\]]+)(?:,([^\]]+))?\]/g
    let lastIndex = 0
    let match

    while ((match = regex.exec(message)) !== null) {
      // 添加前面的文本
      if (match.index > lastIndex) {
        segments.push({
          type: 'text',
          data: { text: message.slice(lastIndex, match.index) }
        })
      }

      // 解析CQ码
      const type = match[1]
      const params = {}

      if (match[2]) {
        match[2].split(',').forEach(param => {
          const [key, value] = param.split('=')
          params[key] = value
        })
      }

      segments.push({ type, data: params })
      lastIndex = regex.lastIndex
    }

    // 添加剩余的文本
    if (lastIndex < message.length) {
      segments.push({
        type: 'text',
        data: { text: message.slice(lastIndex) }
      })
    }

    return segments
  }

  // 构建CQ码消息
  buildCQCode(segments) {
    if (typeof segments === 'string') {
      return segments
    }

    return segments.map(segment => {
      if (segment.type === 'text') {
        return segment.data.text
      }

      const params = Object.entries(segment.data)
        .map(([key, value]) => `${key}=${value}`)
        .join(',')

      return `[CQ:${segment.type}${params ? ',' + params : ''}]`
    }).join('')
  }

  // 获取连接状态
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      apiConnected: this.isApiConnected,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      pendingWebMessages: this.pendingWebMessages.size,
      lastHeartbeat: this.lastHeartbeat,
      heartbeatActive: !!this.heartbeatInterval,
      wsReadyState: this.ws ? this.ws.readyState : null,
      wsApiReadyState: this.wsApi ? this.wsApi.readyState : null
    }
  }

  // 检查连接是否真正可用
  isConnectionReady() {
    return this.isConnected &&
           this.ws &&
           this.ws.readyState === WebSocket.OPEN
  }

  // 处理HTTP API调用
  async handleHttpApiCall(action, params, echo) {
    console.log(`[handleHttpApiCall] 处理HTTP API调用: ${action}`)

    // 查询API处理
    const queryResult = this._handleQueryApi(action, params)
    if (queryResult !== undefined) {
      return queryResult
    }

    // 处理send_msg和send_private_msg
    if (action === 'send_msg' || action === 'send_private_msg') {
      let userId = params.user_id !== undefined ? Number(params.user_id) : null
      let responseContent = ''

      // 提取消息内容
      if (typeof params.message === 'string') {
        responseContent = params.message
      } else if (Array.isArray(params.message)) {
        responseContent = await this.extractMessageText(params.message)
      }

      // 如果没有user_id，尝试找到最近的待处理消息
      if (!userId && this.pendingWebMessages.size > 0) {
        const entries = [...this.pendingWebMessages.entries()]
        entries.sort((a, b) => (b[1].sentAt || 0) - (a[1].sentAt || 0))
        userId = entries[0][0]
      }

      console.log(`[HTTP send_private_msg] 用户 ${userId}: ${responseContent.substring(0, 100)}`)

      // 查找对应的待处理Web消息
      const pending = userId ? this.pendingWebMessages.get(userId) : null

      if (pending) {
        // 收集响应消息
        pending.messages.push(responseContent)
        console.log(`[HTTP send_private_msg] 已推送消息到pending，当前共 ${pending.messages.length} 条消息`)

        // 立即通过回调通知前端
        if (pending.onMessage) {
          pending.onMessage({
            content: responseContent,
            messageIndex: pending.messages.length - 1,
            totalMessages: pending.messages.length
          })
        }

        // 智能消息收集
        clearTimeout(pending.timer)
        const elapsed = Date.now() - (pending.sentAt || Date.now())
        const remaining = Math.max(3000 - elapsed, 500)

        pending.timer = setTimeout(() => {
          if (this.pendingWebMessages.has(userId)) {
            this.pendingWebMessages.delete(userId)
            const messages = [...pending.messages]
            console.log(`[HTTP send_private_msg] 收集完成，共 ${messages.length} 条消息`)
            pending.resolve(messages)
          }
        }, remaining)
      } else {
        console.log(`[HTTP send_private_msg] 未找到pending消息: userId=${userId}`)
      }

      return null
    }

    // 处理friend_poke
    if (action === 'friend_poke') {
      const userId = params.user_id
      console.log(`[HTTP friend_poke] 用户 ${userId}`)

      const pending = this.pendingWebMessages.get(userId)
      if (pending) {
        pending.messages.push('[戳一戳]')

        clearTimeout(pending.timer)
        pending.timer = setTimeout(() => {
          if (this.pendingWebMessages.has(userId)) {
            this.pendingWebMessages.delete(userId)
            const messages = [...pending.messages]
            pending.resolve(messages)
          }
        }, 30000)
      }

      return null
    }

    // 未知API
    console.log(`[handleHttpApiCall] 未知API: ${action}`)
    return null
  }
}

// 创建单例
const oneBotService = new OneBotService()

export default oneBotService
