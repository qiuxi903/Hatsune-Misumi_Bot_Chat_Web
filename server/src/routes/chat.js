import { Router } from 'express'
import db from '../utils/db.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

// 获取会话列表
router.get('/sessions', authenticate, (req, res) => {
  try {
    const userId = req.user.id

    const sessions = db.sessions.getAll(userId)

    // 按更新时间排序
    sessions.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))

    res.json({
      success: true,
      sessions
    })
  } catch (error) {
    console.error('获取会话列表错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// 创建新会话
router.post('/sessions', authenticate, (req, res) => {
  try {
    const userId = req.user.id
    const { title } = req.body

    // 生成唯一的AstrBot会话ID（基于用户ID和时间戳）
    const astrbotSessionId = `webchat_${userId}_${Date.now().toString(36)}`

    const session = db.sessions.create({
      user_id: userId,
      title: title || '新对话',
      model: null,
      plugin: null,
      astrbot_session_id: astrbotSessionId
    })

    res.status(201).json({
      success: true,
      session
    })
  } catch (error) {
    console.error('创建会话错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// 获取会话详情
router.get('/sessions/:sessionId', authenticate, (req, res) => {
  try {
    const userId = req.user.id
    const sessionId = req.params.sessionId

    // 获取会话
    const session = db.sessions.getById(sessionId)

    if (!session) {
      return res.status(404).json({
        success: false,
        message: '会话不存在'
      })
    }

    // 验证会话归属
    if (session.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: '无权访问此会话'
      })
    }

    // 获取会话消息
    const messages = db.messages.getAll(sessionId)

    // 按创建时间排序
    messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

    // 解析metadata
    const parsedMessages = messages.map(msg => ({
      ...msg,
      metadata: msg.metadata ? JSON.parse(msg.metadata) : null
    }))

    res.json({
      success: true,
      session,
      messages: parsedMessages
    })
  } catch (error) {
    console.error('获取会话详情错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// 更新会话
router.put('/sessions/:sessionId', authenticate, (req, res) => {
  try {
    const userId = req.user.id
    const sessionId = req.params.sessionId
    const { title, model, plugin } = req.body

    // 获取会话
    const session = db.sessions.getById(sessionId)

    if (!session) {
      return res.status(404).json({
        success: false,
        message: '会话不存在'
      })
    }

    // 验证会话归属
    if (session.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: '无权修改此会话'
      })
    }

    // 更新会话
    const updateData = {}
    if (title !== undefined) updateData.title = title
    if (model !== undefined) updateData.model = model
    if (plugin !== undefined) updateData.plugin = plugin

    const updatedSession = db.sessions.update(sessionId, updateData)

    res.json({
      success: true,
      session: updatedSession
    })
  } catch (error) {
    console.error('更新会话错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// 删除会话
router.delete('/sessions/:sessionId', authenticate, (req, res) => {
  try {
    const userId = req.user.id
    const sessionId = req.params.sessionId

    // 获取会话
    const session = db.sessions.getById(sessionId)

    if (!session) {
      return res.status(404).json({
        success: false,
        message: '会话不存在'
      })
    }

    // 验证会话归属
    if (session.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: '无权删除此会话'
      })
    }

    // 删除会话（同时删除消息）
    db.sessions.delete(sessionId)

    res.json({
      success: true,
      message: '会话删除成功'
    })
  } catch (error) {
    console.error('删除会话错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// 添加消息
router.post('/sessions/:sessionId/messages', authenticate, (req, res) => {
  try {
    const userId = req.user.id
    const sessionId = req.params.sessionId
    const { role, content, message_type, metadata } = req.body

    // 获取会话
    const session = db.sessions.getById(sessionId)

    if (!session) {
      return res.status(404).json({
        success: false,
        message: '会话不存在'
      })
    }

    // 验证会话归属
    if (session.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: '无权在此会话中添加消息'
      })
    }

    // 验证必填字段
    if (!role || !content) {
      return res.status(400).json({
        success: false,
        message: '角色和内容为必填项'
      })
    }

    // 添加消息
    const message = db.messages.create({
      session_id: sessionId,
      role,
      content,
      message_type: message_type || 'text',
      metadata: metadata ? JSON.stringify(metadata) : null
    })

    // 更新会话时间
    db.sessions.update(sessionId, {})

    res.status(201).json({
      success: true,
      message: {
        ...message,
        metadata: message.metadata ? JSON.parse(message.metadata) : null
      }
    })
  } catch (error) {
    console.error('添加消息错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// 获取消息列表
router.get('/sessions/:sessionId/messages', authenticate, (req, res) => {
  try {
    const userId = req.user.id
    const sessionId = req.params.sessionId
    const { limit = 50, offset = 0 } = req.query

    // 获取会话
    const session = db.sessions.getById(sessionId)

    if (!session) {
      return res.status(404).json({
        success: false,
        message: '会话不存在'
      })
    }

    // 验证会话归属
    if (session.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: '无权访问此会话的消息'
      })
    }

    // 获取消息
    let messages = db.messages.getAll(sessionId)

    // 按创建时间排序
    messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

    // 分页
    const startIndex = parseInt(offset)
    const endIndex = startIndex + parseInt(limit)
    messages = messages.slice(startIndex, endIndex)

    // 解析metadata
    const parsedMessages = messages.map(msg => ({
      ...msg,
      metadata: msg.metadata ? JSON.parse(msg.metadata) : null
    }))

    res.json({
      success: true,
      messages: parsedMessages
    })
  } catch (error) {
    console.error('获取消息列表错误:', error)
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    })
  }
})

// 发送消息并获取AI回复
router.post('/send', authenticate, async (req, res) => {
  try {
    const userId = req.user.id
    const { sessionId, content } = req.body

    // 验证必填字段
    if (!content) {
      return res.status(400).json({
        success: false,
        message: '消息内容为必填项'
      })
    }

    // 如果没有sessionId，创建新会话
    let session
    if (sessionId) {
      session = db.sessions.getById(sessionId)
      if (!session || session.user_id !== userId) {
        return res.status(404).json({
          success: false,
          message: '会话不存在'
        })
      }
    } else {
      // 生成唯一的AstrBot会话ID
      const astrbotSessionId = `webchat_${userId}_${Date.now().toString(36)}`
      session = db.sessions.create({
        user_id: userId,
        title: content.substring(0, 20) + (content.length > 20 ? '...' : ''),
        model: null,
        plugin: null,
        astrbot_session_id: astrbotSessionId
      })
    }

    // 如果会话没有astrbot_session_id（旧数据），生成一个
    if (!session.astrbot_session_id) {
      const astrbotSessionId = `webchat_${userId}_${Date.now().toString(36)}`
      session = db.sessions.update(session.id, { astrbot_session_id: astrbotSessionId })
      console.log('为旧会话生成astrbot_session_id:', astrbotSessionId)
    }

    // 检查是否是新会话（没有历史消息）
    const existingMessages = db.messages.getAll(session.id)
    const isNewSession = existingMessages.length === 0

    // 如果会话标题是"新对话"，用第一条消息内容作为标题
    if (session.title === '新对话' && content) {
      const newTitle = content.length > 20 ? content.substring(0, 20) + '...' : content
      session = db.sessions.update(session.id, { title: newTitle })
      console.log(`会话标题已更新: "${newTitle}"`)
    }

    // 保存用户消息
    db.messages.create({
      session_id: session.id,
      role: 'user',
      content,
      message_type: 'text',
      metadata: null
    })

    // 更新会话时间
    db.sessions.update(session.id, {})

    // 设置SSE响应头
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    // 导入服务
    const oneBotService = (await import('../services/onebot.js')).default

    console.log('=== 发送消息到AstrBot ===')
    console.log('本地会话ID:', session.id)
    console.log('消息内容:', content)
    console.log('OneBot连接状态:', oneBotService.isConnected)
    console.log('OneBot连接详情:', oneBotService.getConnectionStatus())

    let aiReply = ''
    let usedMethod = ''
    let streamedMessages = [] // 通过流式回调收集的消息

    try {
      // 优先使用OneBot WebSocket（支持插件触发）
      if (oneBotService.isConnectionReady()) {
        usedMethod = 'onebot'
        console.log('使用OneBot WebSocket发送消息（支持插件）')

        try {
          // 通过OneBot发送消息，使用回调立即发送给前端
          aiReply = await oneBotService.sendWebMessage(
            req.user.username || 'web_user',
            content,
            {
              sessionId: session.astrbot_session_id,
              qqNumber: req.user.qq_number,
              nickname: req.user.nickname,
              isNewSession: isNewSession,
              // 收到消息立即发送给前端
              onMessage: (msg) => {
                streamedMessages.push(msg.content)
                console.log(`流式发送消息给前端: ${msg.content.substring(0, 50)}`)
                res.write(`data: ${JSON.stringify({
                  content: msg.content,
                  done: false,
                  sessionId: session.id,
                  method: 'onebot',
                  messageIndex: msg.messageIndex,
                  totalMessages: msg.totalMessages
                })}\n\n`)
              }
            }
          )

          console.log('OneBot响应成功，类型:', Array.isArray(aiReply) ? `数组(${aiReply.length}条)` : '字符串')
        } catch (onebotError) {
          console.error('OneBot发送失败:', onebotError.message)
          if (onebotError.message.includes('消息已发送')) {
            usedMethod = 'onebot_timeout'
            aiReply = '消息已发送，但AI响应超时，请稍后再试。'
          } else {
            throw onebotError
          }
        }
      } else {
        const status = oneBotService.getConnectionStatus()
        console.log('OneBot连接未就绪，状态:', status)
        throw new Error(`OneBot未就绪，连接状态: ${JSON.stringify(status)}`)
      }

      // 如果没有通过流式回调发送，则一次性发送
      if (streamedMessages.length === 0) {
        const messages = Array.isArray(aiReply) ? aiReply : [aiReply]
        for (let i = 0; i < messages.length; i++) {
          const isLast = i === messages.length - 1
          res.write(`data: ${JSON.stringify({
            content: messages[i],
            done: isLast,
            sessionId: session.id,
            method: usedMethod,
            messageIndex: i,
            totalMessages: messages.length
          })}\n\n`)
        }
        streamedMessages = messages
      }

      // 发送结束标记
      console.log('发送SSE结束标记')
      res.write(`data: ${JSON.stringify({ done: true, sessionId: session.id })}\n\n`)
      res.end()
      console.log('SSE响应已结束')

      // 保存AI回复
      const fullContent = streamedMessages.join('\n')
      db.messages.create({
        session_id: session.id,
        role: 'assistant',
        content: fullContent,
        message_type: 'text',
        metadata: JSON.stringify({ method: usedMethod, messageCount: streamedMessages.length })
      })

    } catch (apiError) {
      console.error('AstrBot API调用失败:', apiError)

      // 发送错误响应
      const errorReply = '抱歉，AI服务暂时不可用，请稍后再试。'

      // 保存错误回复
      db.messages.create({
        session_id: session.id,
        role: 'assistant',
        content: errorReply,
        message_type: 'text',
        metadata: JSON.stringify({ error: apiError.message })
      })

      res.write(`data: ${JSON.stringify({ content: errorReply, done: true, sessionId: session.id })}\n\n`)
      res.end()
    }

  } catch (error) {
    console.error('发送消息错误:', error)
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      })
    }
  }
})

export default router
