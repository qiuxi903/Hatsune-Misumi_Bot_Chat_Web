import { Router } from 'express'
import db from '../utils/db.js'
import { requireAdmin } from '../middleware/admin.js'

const router = Router()

// 所有路由都需要管理员权限
router.use(requireAdmin)

// 获取统计数据
router.get('/stats', (req, res) => {
  try {
    const users = db.users.getAll()
    const sessions = db.sessions.getAll()
    const messages = db.messages.getAll()
    const favorites = db.favorites.getAll()

    // 计算今日新增
    const today = new Date().toISOString().split('T')[0]
    const todayNewUsers = users.filter(u => u.created_at?.startsWith(today)).length
    const todayNewSessions = sessions.filter(s => s.created_at?.startsWith(today)).length
    const todayNewMessages = messages.filter(m => m.created_at?.startsWith(today)).length

    // 计算活跃用户（最近7天有消息的用户）
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const recentMessages = messages.filter(m => m.created_at > sevenDaysAgo)
    const activeUserIds = new Set(recentMessages.map(m => {
      const session = sessions.find(s => s.id === m.session_id)
      return session?.user_id
    }).filter(Boolean))

    res.json({
      success: true,
      stats: {
        totalUsers: users.length,
        totalSessions: sessions.length,
        totalMessages: messages.length,
        totalFavorites: favorites.length,
        todayNewUsers,
        todayNewSessions,
        todayNewMessages,
        activeUsers: activeUserIds.size
      }
    })
  } catch (error) {
    console.error('获取统计数据失败:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// 获取用户列表
router.get('/users', (req, res) => {
  try {
    const users = db.users.getAll()
    const sessions = db.sessions.getAll()
    const messages = db.messages.getAll()

    // 为每个用户添加统计信息
    const usersWithStats = users.map(user => {
      const userSessions = sessions.filter(s => s.user_id === user.id)
      const userMessages = messages.filter(m => {
        const session = sessions.find(s => s.id === m.session_id)
        return session?.user_id === user.id
      })

      return {
        ...user,
        password_hash: undefined, // 不返回密码哈希
        sessionCount: userSessions.length,
        messageCount: userMessages.length,
        lastActive: userMessages.length > 0
          ? userMessages[userMessages.length - 1].created_at
          : user.created_at
      }
    })

    // 按最后活跃时间排序
    usersWithStats.sort((a, b) => new Date(b.lastActive) - new Date(a.lastActive))

    res.json({
      success: true,
      users: usersWithStats
    })
  } catch (error) {
    console.error('获取用户列表失败:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// 获取单个用户详情
router.get('/users/:id', (req, res) => {
  try {
    const userId = req.params.id
    const user = db.users.getById(userId)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      })
    }

    const sessions = db.sessions.getAll(userId)
    const messages = db.messages.getAll()
    const favorites = db.favorites.getAll(userId)

    // 获取该用户的所有消息
    const userMessages = messages.filter(m => {
      const session = sessions.find(s => s.id === m.session_id)
      return session?.user_id === userId
    })

    res.json({
      success: true,
      user: {
        ...user,
        password_hash: undefined
      },
      sessions,
      recentMessages: userMessages.slice(-50), // 最近50条消息
      favorites
    })
  } catch (error) {
    console.error('获取用户详情失败:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// 删除用户
router.delete('/users/:id', (req, res) => {
  try {
    const userId = req.params.id
    const user = db.users.getById(userId)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      })
    }

    // 不能删除自己
    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: '不能删除自己的账号'
      })
    }

    // 删除用户的所有会话和消息
    const sessions = db.sessions.getAll(userId)
    sessions.forEach(session => {
      db.sessions.delete(session.id)
    })

    // 删除用户
    db.users.delete(userId)

    res.json({
      success: true,
      message: '用户已删除'
    })
  } catch (error) {
    console.error('删除用户失败:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// 获取会话列表
router.get('/sessions', (req, res) => {
  try {
    const sessions = db.sessions.getAll()
    const users = db.users.getAll()
    const messages = db.messages.getAll()

    // 为每个会话添加统计信息
    const sessionsWithStats = sessions.map(session => {
      const user = users.find(u => u.id === session.user_id)
      const sessionMessages = messages.filter(m => m.session_id === session.id)

      return {
        ...session,
        username: user?.username || '未知用户',
        messageCount: sessionMessages.length,
        lastMessage: sessionMessages.length > 0
          ? sessionMessages[sessionMessages.length - 1].content.substring(0, 50)
          : '暂无消息'
      }
    })

    // 按更新时间排序
    sessionsWithStats.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))

    res.json({
      success: true,
      sessions: sessionsWithStats
    })
  } catch (error) {
    console.error('获取会话列表失败:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// 获取消息列表
router.get('/messages', (req, res) => {
  try {
    const { limit = 100, offset = 0, sessionId } = req.query

    let messages = db.messages.getAll()

    if (sessionId) {
      messages = messages.filter(m => m.session_id === sessionId)
    }

    // 按时间倒序
    messages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    // 分页
    const startIndex = parseInt(offset)
    const endIndex = startIndex + parseInt(limit)
    const paginatedMessages = messages.slice(startIndex, endIndex)

    res.json({
      success: true,
      messages: paginatedMessages,
      total: messages.length
    })
  } catch (error) {
    console.error('获取消息列表失败:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// 删除消息
router.delete('/messages/:id', (req, res) => {
  try {
    const messageId = req.params.id
    db.messages.delete(messageId)

    res.json({
      success: true,
      message: '消息已删除'
    })
  } catch (error) {
    console.error('删除消息失败:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// 获取系统信息
router.get('/system', (req, res) => {
  try {
    const users = db.users.getAll()
    const sessions = db.sessions.getAll()
    const messages = db.messages.getAll()

    // 计算存储大小
    const dataStats = {
      usersSize: JSON.stringify(users).length,
      sessionsSize: JSON.stringify(sessions).length,
      messagesSize: JSON.stringify(messages).length
    }

    res.json({
      success: true,
      system: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
        platform: process.platform,
        dataStats
      }
    })
  } catch (error) {
    console.error('获取系统信息失败:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

export default router
