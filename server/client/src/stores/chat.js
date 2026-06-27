import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/utils/api'

export const useChatStore = defineStore('chat', () => {
  // 状态
  const sessions = ref([])
  const currentSession = ref(null)
  const messages = ref([])
  const loading = ref(false)
  const sending = ref(false)
  const error = ref(null)
  const streamingMessage = ref(null)

  // 计算属性
  const sessionList = computed(() => sessions.value)
  const currentMessages = computed(() => messages.value)
  const isLoading = computed(() => loading.value)
  const isSending = computed(() => sending.value)

  // 获取会话列表
  const fetchSessions = async () => {
    loading.value = true
    try {
      const response = await api.get('/api/chat/sessions')
      sessions.value = response.data.sessions
    } catch (err) {
      error.value = err.response?.data?.message || '获取会话列表失败'
      console.error('获取会话列表失败:', err)
    } finally {
      loading.value = false
    }
  }

  // 创建新会话
  const createSession = async (title = '新对话') => {
    loading.value = true
    try {
      const response = await api.post('/api/chat/sessions', { title })
      const newSession = response.data.session
      sessions.value.unshift(newSession)
      currentSession.value = newSession
      messages.value = []
      return { success: true, session: newSession }
    } catch (err) {
      error.value = err.response?.data?.message || '创建会话失败'
      return { success: false, message: error.value }
    } finally {
      loading.value = false
    }
  }

  // 切换会话
  const switchSession = async (sessionId) => {
    loading.value = true
    try {
      const response = await api.get(`/api/chat/sessions/${sessionId}`)
      currentSession.value = response.data.session
      messages.value = response.data.messages || []
      return { success: true }
    } catch (err) {
      error.value = err.response?.data?.message || '切换会话失败'
      return { success: false, message: error.value }
    } finally {
      loading.value = false
    }
  }

  // 删除会话
  const deleteSession = async (sessionId) => {
    try {
      await api.delete(`/api/chat/sessions/${sessionId}`)
      sessions.value = sessions.value.filter(s => s.id !== sessionId)
      if (currentSession.value?.id === sessionId) {
        currentSession.value = null
        messages.value = []
      }
      return { success: true }
    } catch (err) {
      error.value = err.response?.data?.message || '删除会话失败'
      return { success: false, message: error.value }
    }
  }

  // 重命名会话
  const renameSession = async (sessionId, title) => {
    try {
      const response = await api.put(`/api/chat/sessions/${sessionId}`, { title })
      const index = sessions.value.findIndex(s => s.id === sessionId)
      if (index !== -1) {
        sessions.value[index] = { ...sessions.value[index], title }
      }
      if (currentSession.value?.id === sessionId) {
        currentSession.value = { ...currentSession.value, title }
      }
      return { success: true }
    } catch (err) {
      error.value = err.response?.data?.message || '重命名失败'
      return { success: false, message: error.value }
    }
  }

  // 发送消息
  const sendMessage = async (content, options = {}) => {
    console.log('[sendMessage] 开始发送消息:', content.substring(0, 50))

    if (!currentSession.value) {
      console.log('[sendMessage] 没有当前会话，创建新会话')
      const sessionResult = await createSession()
      if (!sessionResult.success) {
        console.error('[sendMessage] 创建会话失败:', sessionResult.message)
        return sessionResult
      }
    }

    sending.value = true
    error.value = null

    // 添加用户消息到列表
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    }
    messages.value.push(userMessage)

    // 创建AI消息占位符
    let aiMessage = {
      id: Date.now() + 1,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      streaming: true
    }
    messages.value.push(aiMessage)
    streamingMessage.value = aiMessage

    try {
      console.log('[sendMessage] 发送fetch请求到: /api/chat/send')
      console.log('[sendMessage] sessionId:', currentSession.value?.id)

      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          sessionId: currentSession.value?.id,
          content,
          ...options
        })
      })

      console.log('[sendMessage] 收到响应，状态:', response.status, response.ok)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[sendMessage] 响应错误:', errorText)
        throw new Error(`发送失败: ${response.status}`)
      }

      console.log('[sendMessage] 响应成功，开始处理SSE流')

      // 处理SSE流式响应
      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      let buffer = ''
      let receivedMessages = []
      let currentMsgIdx = 0

      // 逐字显示函数
      const typewriter = async (targetIdx, content) => {
        for (let i = 0; i < content.length; i++) {
          const partial = content.substring(0, i + 1)
          messages.value = messages.value.map((m, idx) => {
            if (idx === targetIdx) {
              return { ...m, content: partial, streaming: true }
            }
            return m
          })
          await new Promise(r => setTimeout(r, 20))
        }
        messages.value = messages.value.map((m, idx) => {
          if (idx === targetIdx) {
            return { ...m, streaming: false }
          }
          return m
        })
      }

      // 读取SSE流
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.content) {
                receivedMessages.push(data.content)

                if (receivedMessages.length === 1) {
                  // 第一条消息 - 更新占位符并逐字显示
                  const idx = messages.value.findIndex(m => m.id === aiMessage.id)
                  if (idx !== -1) {
                    await typewriter(idx, data.content)
                  }
                } else {
                  // 后续消息 - 创建新气泡并逐字显示
                  messages.value = [...messages.value, {
                    id: Date.now() + receivedMessages.length,
                    role: 'assistant',
                    content: '',
                    streaming: true,
                    timestamp: new Date().toISOString()
                  }]
                  await typewriter(messages.value.length - 1, data.content)
                }
              }
            } catch (e) {
              // 忽略
            }
          }
        }
      }

      streamingMessage.value = null
      return { success: true }
    } catch (err) {
      console.error('发送消息错误:', err)
      error.value = err.message || '发送失败'
      aiMessage.content = '抱歉，发生了错误，请重试。'
      aiMessage.streaming = false
      streamingMessage.value = null
      return { success: false, message: error.value }
    } finally {
      sending.value = false
    }
  }

  // 停止生成
  const stopGeneration = async () => {
    if (streamingMessage.value) {
      streamingMessage.value.streaming = false
      streamingMessage.value = null
      sending.value = false
    }
  }

  // 清空当前会话消息
  const clearMessages = () => {
    messages.value = []
  }

  // 重新生成回复
  const regenerateMessage = async (messageId) => {
    const messageIndex = messages.value.findIndex(m => m.id === messageId)
    if (messageIndex === -1) return

    // 找到上一条用户消息
    let userMessageIndex = messageIndex - 1
    while (userMessageIndex >= 0 && messages.value[userMessageIndex].role !== 'user') {
      userMessageIndex--
    }

    if (userMessageIndex < 0) return

    // 删除当前AI消息
    messages.value.splice(messageIndex, 1)

    // 重新发送用户消息
    const userMessage = messages.value[userMessageIndex]
    return await sendMessage(userMessage.content)
  }

  return {
    sessions,
    currentSession,
    messages,
    loading,
    sending,
    error,
    streamingMessage,
    sessionList,
    currentMessages,
    isLoading,
    isSending,
    fetchSessions,
    createSession,
    switchSession,
    deleteSession,
    renameSession,
    sendMessage,
    stopGeneration,
    clearMessages,
    regenerateMessage
  }
})
