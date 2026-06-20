import { io } from 'socket.io-client'

class SocketService {
  constructor() {
    this.socket = null
    this.listeners = new Map()
  }

  // 连接Socket.IO
  connect() {
    if (this.socket?.connected) {
      return
    }

    const token = localStorage.getItem('token')
    
    this.socket = io('', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    })

    this.socket.on('connect', () => {
      console.log('Socket.IO 已连接')
      this.emit('connected')
    })

    this.socket.on('disconnect', (reason) => {
      console.log('Socket.IO 已断开:', reason)
      this.emit('disconnected', reason)
    })

    this.socket.on('connect_error', (error) => {
      console.error('Socket.IO 连接错误:', error)
      this.emit('error', error)
    })

    // 监听聊天消息
    this.socket.on('chat:message', (data) => {
      this.emit('chat:message', data)
    })

    // 监听流式消息
    this.socket.on('chat:stream', (data) => {
      this.emit('chat:stream', data)
    })

    // 监听消息完成
    this.socket.on('chat:done', (data) => {
      this.emit('chat:done', data)
    })

    // 监听错误
    this.socket.on('chat:error', (data) => {
      this.emit('chat:error', data)
    })

    // 监听在线状态
    this.socket.on('user:online', (data) => {
      this.emit('user:online', data)
    })

    this.socket.on('user:offline', (data) => {
      this.emit('user:offline', data)
    })
  }

  // 断开连接
  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  // 发送消息
  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data)
    }
  }

  // 监听事件
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event).add(callback)

    // 如果socket已连接，直接添加监听器
    if (this.socket) {
      this.socket.on(event, callback)
    }

    // 返回取消监听的函数
    return () => {
      this.listeners.get(event)?.delete(callback)
      if (this.socket) {
        this.socket.off(event, callback)
      }
    }
  }

  // 移除所有监听器
  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners()
    }
    this.listeners.clear()
  }

  // 获取连接状态
  get connected() {
    return this.socket?.connected || false
  }
}

// 创建单例
const socketService = new SocketService()

export default socketService
