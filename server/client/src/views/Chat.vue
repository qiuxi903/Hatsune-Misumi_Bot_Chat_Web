<template>
  <div class="chat-container">
    <!-- 左侧边栏 - 会话列表 -->
    <aside class="sidebar" :class="{ 'sidebar-open': sidebarOpen }">
      <!-- 侧边栏头部 -->
      <div class="sidebar-header">
        <h2 class="sidebar-title" v-if="!selectMode">对话列表</h2>
        <h2 class="sidebar-title" v-else>已选择 {{ selectedSessions.size }} 项</h2>
        <div class="sidebar-header-actions">
          <template v-if="!selectMode">
            <router-link to="/" class="icon-btn" title="返回主页">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
            </router-link>
            <button class="icon-btn" @click="enterSelectMode" title="多选">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 11 12 14 22 4"></polyline>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
            </button>
            <button class="new-chat-btn" @click="createNewSession">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          </template>
          <template v-else>
            <button class="icon-btn" @click="selectAll" title="全选">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <path d="M9 12l2 2 4-4"></path>
              </svg>
            </button>
            <button class="icon-btn delete-btn" @click="deleteSelected" :disabled="selectedSessions.size === 0" title="删除选中">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
            <button class="icon-btn" @click="exitSelectMode" title="取消">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </template>
          <button class="sidebar-close-btn" @click="sidebarOpen = false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      <!-- 搜索框 -->
      <div class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索对话..."
          class="input-glass"
        />
      </div>

      <!-- 会话列表 -->
      <div class="session-list">
        <div
          v-for="session in filteredSessions"
          :key="session.id"
          class="session-item"
          :class="{ active: currentSession?.id === session.id }"
          @click="selectMode ? toggleSelect(session.id) : switchSession(session.id)"
        >
          <input
            v-if="selectMode"
            type="checkbox"
            class="session-checkbox"
            :checked="selectedSessions.has(session.id)"
            @click.stop
            @change="toggleSelect(session.id)"
          />
          <div class="session-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <div class="session-info">
            <div class="session-title">{{ session.title || '新对话' }}</div>
            <div class="session-time">{{ formatTime(session.updated_at) }}</div>
          </div>
          <button
            v-if="!selectMode"
            class="session-delete"
            @click.stop="deleteSession(session.id)"
            title="删除对话"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div v-if="filteredSessions.length === 0" class="empty-sessions">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <p>暂无对话</p>
          <p class="empty-hint">点击上方按钮开始新对话</p>
        </div>
      </div>

      <!-- 侧边栏底部 -->
      <div class="sidebar-footer">
        <router-link to="/profile" class="sidebar-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          个人资料
        </router-link>
      </div>
      <div class="sidebar-footer-copyright">
        <p>© 2026 丰川初音bot by <a href="https://github.com/qiuxi903/Hatsune-Misumi_Bot_Chat_Web" target="_blank" rel="noopener">邱息</a></p>
        <p class="license-info">Licensed under <a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank" rel="noopener">GNU AGPLv3</a></p>
        <p class="disclaimer">⚠️ AI生成可能有误，请勿当真</p>
        <p class="disclaimer">二创作品，与BanG Dream!原作无关</p>
      </div>
    </aside>

    <!-- 侧边栏遮罩（移动端点击关闭） -->
    <div v-if="sidebarOpen" class="sidebar-overlay" @click="sidebarOpen = false"></div>

    <!-- 主聊天区域 -->
    <main class="chat-main">
      <!-- 聊天头部 -->
      <header class="chat-header">
        <div class="header-left">
          <button class="menu-btn" @click="sidebarOpen = !sidebarOpen">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <div class="chat-title">
            {{ currentSession?.title || '新对话' }}
          </div>
        </div>
        <div class="header-center">
          <span class="bot-brand">丰川初音</span>
        </div>
        <div class="header-right">
          <button
            v-if="currentSession"
            class="action-btn"
            @click="renameSession"
            title="重命名"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
        </div>
      </header>

      <!-- 消息列表 -->
      <div class="messages-container" ref="messagesContainer">
        <!-- 欢迎消息 -->
        <div v-if="messages.length === 0" class="welcome-message">
          <div class="welcome-avatar">
            <img :src="botAvatar" :alt="botName" />
          </div>
          <h2>{{ botName }}</h2>
          <p>有什么可以帮助您的吗？输入 /help 查看可用命令</p>
          <div class="welcome-suggestions">
            <button
              v-for="suggestion in suggestions"
              :key="suggestion"
              class="suggestion-btn"
              @click="sendMessage(suggestion)"
            >
              {{ suggestion }}
            </button>
          </div>
        </div>

        <!-- 消息列表 -->
        <template
          v-for="message in messages"
          :key="message.id"
        >
          <!-- 戳一戳消息 - 浮在中间的小字 -->
          <div v-if="isPokeMessage(message.content)" class="poke-message-container">
            <div class="poke-message">
              <span class="poke-text">{{ botName }} 戳了戳你</span>
            </div>
          </div>

          <!-- 普通消息 -->
          <div
            v-else-if="!isVoiceMessage(message.content)"
            class="message-wrapper"
            :class="[message.role, { 'poke-shake': isPokeMessage(message.content) }]"
          >
            <!-- 头像 -->
            <div class="message-avatar" :class="message.role">
              <img v-if="message.role === 'assistant'" :src="botAvatar" :alt="botName" class="avatar-img" />
              <img v-else-if="userAvatar" :src="userAvatar" alt="用户头像" class="avatar-img" />
              <div v-else class="user-avatar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
            </div>

            <!-- 消息内容 -->
            <div class="message-content">
              <div class="message-header" v-if="message.role === 'assistant'">
                <span class="bot-name">{{ botName }}</span>
              </div>
              <div class="message-bubble" :class="message.role">
                <!-- 文本消息 -->
                <div v-if="message.role === 'user'" class="message-text">
                  {{ message.content }}
                </div>

                <!-- AI消息 - 支持Markdown渲染 -->
                <div v-else class="message-text markdown-body" v-html="renderMarkdown(message.content)"></div>

                <!-- 流式输入指示器 -->
                <div v-if="message.streaming" class="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>

              <!-- 消息操作 -->
              <div class="message-actions">
                <button
                  v-if="message.role === 'assistant' && !message.streaming"
                  class="action-btn small"
                  @click="copyMessage(message.content)"
                  title="复制"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </button>
                <button
                  v-if="message.role === 'assistant' && !message.streaming"
                  class="action-btn small"
                  @click="regenerateMessage(message.id)"
                  title="重新生成"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                  </svg>
                </button>
                <span class="message-time">
                  {{ formatTime(message.timestamp) }}
                </span>
              </div>
            </div>
          </div>
        </template>

        <!-- 加载状态 -->
        <div v-if="sending && !streamingMessage" class="loading-message">
          <div class="message-avatar assistant">
            <img :src="botAvatar" :alt="botName" class="avatar-img" />
          </div>
          <div class="message-bubble assistant">
            <div class="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="input-container">
        <!-- 输入框 -->
        <div class="input-wrapper">
          <textarea
            v-model="inputMessage"
            @keydown.enter.exact="handleEnter"
            @keydown.shift.enter="handleShiftEnter"
            placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
            rows="1"
            ref="inputRef"
            :disabled="sending"
          ></textarea>
        </div>

        <!-- 发送按钮 -->
        <button
          class="send-btn"
          @click="handleSend"
          :disabled="!inputMessage.trim() || sending"
        >
          <svg v-if="!sending" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="6" y="6" width="12" height="12" rx="2"></rect>
          </svg>
        </button>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useChatStore } from '@/stores/chat'
import { useUserStore } from '@/stores/user'
import socketService from '@/utils/socket'

const route = useRoute()
const router = useRouter()
const chatStore = useChatStore()
const userStore = useUserStore()

// Bot配置
const botName = '丰川初音'
const botAvatar = 'https://q.qlogo.cn/headimg_dl?dst_uin=1712833352&spec=640&img_type=jpg'

// 用户头像
const userAvatar = computed(() => userStore.user?.avatar || null)

// 状态
const sidebarOpen = ref(true)
const searchQuery = ref('')
const inputMessage = ref('')
const messagesContainer = ref(null)
const inputRef = ref(null)
const selectMode = ref(false)
const selectedSessions = ref(new Set())

// 计算属性
const sessions = computed(() => chatStore.sessionList)
const currentSession = computed(() => chatStore.currentSession)
const messages = computed(() => chatStore.currentMessages)
const sending = computed(() => chatStore.isSending)
const streamingMessage = computed(() => chatStore.streamingMessage)

const filteredSessions = computed(() => {
  if (!searchQuery.value) return sessions.value
  const query = searchQuery.value.toLowerCase()
  return sessions.value.filter(s =>
    (s.title || '新对话').toLowerCase().includes(query)
  )
})

// 建议问题
const suggestions = [
  '/help 查看帮助',
  '你好！你是谁？',
  '今天天气怎么样？',
  '给我讲个笑话'
]

// 方法
const createNewSession = async () => {
  await chatStore.createSession()
  router.push('/chat')
}

const switchSession = async (sessionId) => {
  await chatStore.switchSession(sessionId)
  router.push(`/chat/${sessionId}`)
  scrollToBottom()
}

const deleteSession = async (sessionId) => {
  if (confirm('确定要删除这个对话吗？')) {
    await chatStore.deleteSession(sessionId)
  }
}

// 多选功能
const enterSelectMode = () => {
  selectMode.value = true
  selectedSessions.value = new Set()
}

const exitSelectMode = () => {
  selectMode.value = false
  selectedSessions.value = new Set()
}

const toggleSelect = (sessionId) => {
  const newSet = new Set(selectedSessions.value)
  if (newSet.has(sessionId)) {
    newSet.delete(sessionId)
  } else {
    newSet.add(sessionId)
  }
  selectedSessions.value = newSet
}

const selectAll = () => {
  if (selectedSessions.value.size === filteredSessions.value.length) {
    selectedSessions.value = new Set()
  } else {
    selectedSessions.value = new Set(filteredSessions.value.map(s => s.id))
  }
}

const deleteSelected = async () => {
  if (selectedSessions.value.size === 0) return
  if (confirm(`确定要删除选中的 ${selectedSessions.value.size} 个对话吗？`)) {
    for (const sessionId of selectedSessions.value) {
      await chatStore.deleteSession(sessionId)
    }
    exitSelectMode()
  }
}

const renameSession = async () => {
  if (!currentSession.value) return
  const newTitle = prompt('请输入新标题:', currentSession.value.title || '新对话')
  if (newTitle && newTitle.trim()) {
    await chatStore.renameSession(currentSession.value.id, newTitle.trim())
  }
}

const clearChat = () => {
  if (confirm('确定要清空当前对话吗？')) {
    chatStore.clearMessages()
  }
}

const handleSend = async () => {
  const content = inputMessage.value.trim()
  if (!content || sending.value) return

  inputMessage.value = ''
  await chatStore.sendMessage(content)
  scrollToBottom()
}

const sendMessage = async (content) => {
  inputMessage.value = content
  await handleSend()
}

const handleEnter = (e) => {
  if (!e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

const handleShiftEnter = (e) => {
  // 允许换行
}

// 检测戳一戳消息
const isPokeMessage = (content) => {
  return content && content.trim() === '[戳一戳]'
}

// 检测语音消息（完全屏蔽）
const isVoiceMessage = (content) => {
  return content && (content.trim() === '[语音消息]' || content.trim().startsWith('[语音消息]'))
}

const copyMessage = async (content) => {
  try {
    await navigator.clipboard.writeText(content)
    // TODO: 显示复制成功提示
  } catch (err) {
    console.error('复制失败:', err)
  }
}

const regenerateMessage = async (messageId) => {
  await chatStore.regenerateMessage(messageId)
  scrollToBottom()
}

const renderMarkdown = (text) => {
  if (!text) return ''

  // 戳一戳消息已在模板中单独处理，这里返回空
  if (text.trim() === '[戳一戳]') {
    return ''
  }

  // 完全屏蔽语音消息
  if (text.trim() === '[语音消息]' || text.trim().startsWith('[语音消息]')) {
    return ''
  }

  // 调试日志
  if (text.includes('图片') || text.includes('![')) {
    console.log('renderMarkdown输入:', text.substring(0, 200))
  }

  // 音乐卡片检测和渲染（🎵 开头 + URL）
  const musicMatch = text.match(/🎵\s*(.+?)(?:\s*-\s*(.+?))\n(https?:\/\/\S+)/ms)
  if (musicMatch) {
    const title = musicMatch[1]?.trim() || '未知歌曲'
    const artist = musicMatch[2]?.trim() || ''
    const url = musicMatch[3]?.trim() || ''
    // 提取音乐链接之前的文本
    const beforeText = text.substring(0, musicMatch.index).trim()
    // 提取音乐链接之后的文本
    const afterText = text.substring(musicMatch.index + musicMatch[0].length).trim()
    let result = ''
    if (beforeText) {
      result += `${escapeHtml(beforeText)}<br>`
    }
    result += `<a href="${escapeHtml(url)}" target="_blank" rel="noopener" class="music-link">🎵 ${escapeHtml(title)} - ${escapeHtml(artist || '未知歌手')}</a><br><a href="${escapeHtml(url)}" target="_blank" rel="noopener" class="music-url">${escapeHtml(url)}</a>`
    if (afterText) {
      result += `<br>${escapeHtml(afterText)}`
    }
    return result
  }

  // 链接分享检测（🔗 开头 + URL）
  const linkMatch = text.match(/🔗\s*(.+?)\n(https?:\/\/\S+)/ms)
  if (linkMatch) {
    const title = linkMatch[1]?.trim() || '链接'
    const url = linkMatch[2]?.trim() || ''
    const beforeText = text.substring(0, linkMatch.index).trim()
    const afterText = text.substring(linkMatch.index + linkMatch[0].length).trim()
    let result = ''
    if (beforeText) {
      result += `<div class="message-text-line">${escapeHtml(beforeText)}</div>`
    }
    result += `<a href="${escapeHtml(url)}" target="_blank" rel="noopener" class="link-card">
      <div class="link-card-icon">🔗</div>
      <div class="link-card-info">
        <div class="link-card-title">${escapeHtml(title)}</div>
        <div class="link-card-url">${escapeHtml(url)}</div>
      </div>
    </a>`
    if (afterText) {
      result += `<div class="message-text-line">${escapeHtml(afterText)}</div>`
    }
    return result
  }

  // 合并转发检测
  if (text.startsWith('[合并转发]')) {
    const lines = text.split('\n')
    const header = lines[0]
    const content = lines.slice(1).join('<br>')
    return `<div class="forward-card">
      <div class="forward-card-header">${escapeHtml(header)}</div>
      <div class="forward-card-content">${content}</div>
    </div>`
  }

  // 通用Markdown渲染
  return text
    .replace(/\[引用消息:(\d+)\]/g, '') // 移除引用消息
    .replace(/\[引用消息\]/g, '') // 移除引用消息
    .replace(/\[(戳一戳)\]/g, '<span class="poke-msg">👉 $1</span>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/!\[图片\]\((.*?)\)/g, (match, url) => {
      console.log('图片匹配成功:', url)
      return `<img src="${url}" alt="图片" style="max-width: 100%; border-radius: 8px; margin: 8px 0;" onerror="this.style.display='none'; this.insertAdjacentHTML('afterend', '<span style=\\'color:red\\'>图片加载失败: ${url}</span>')" />`
    })
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="chat-link">$1</a>')
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener" class="chat-link">$1</a>')
    .replace(/\n/g, '<br>')
}

const escapeHtml = (str) => {
  if (!str) return ''
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`

  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// 监听消息变化，自动滚动
watch(messages, () => {
  scrollToBottom()
}, { deep: true })

// 生命周期
onMounted(async () => {
  // 获取会话列表
  await chatStore.fetchSessions()

  // 如果有sessionId参数，切换到该会话
  if (route.params.sessionId) {
    await chatStore.switchSession(route.params.sessionId)
  }

  // 连接Socket.IO
  socketService.connect()

  // 监听新消息
  socketService.on('chat:message', (data) => {
    console.log('收到新消息:', data)
  })

  // 桌面端自动聚焦输入框，移动端不自动聚焦（避免弹出输入法）
  if (window.innerWidth > 768) {
    nextTick(() => {
      inputRef.value?.focus()
    })
  }
  // 移动端不聚焦，由用户点击触发
})

onUnmounted(() => {
  socketService.disconnect()
})
</script>

<style scoped>
.chat-container {
  height: 100vh;
  display: flex;
  overflow: hidden;
}

/* 侧边栏 */
.sidebar {
  width: 280px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border-color);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: var(--sidebar-bg);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  padding-bottom: 0;
}

.sidebar-header {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-color);
}

.sidebar-header-actions {
  display: flex;
  gap: 0.375rem;
  align-items: center;
  margin-top: 0.5rem;
}

.sidebar-title {
  color: var(--text-primary);
  font-size: 0.9375rem;
  font-weight: 600;
  margin-bottom: 0.625rem;
}

.sidebar-close-btn {
  display: none;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: var(--bg-input);
  color: var(--text-primary);
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  flex-shrink: 0;
}

.sidebar-close-btn svg {
  width: 14px;
  height: 14px;
}

.new-chat-btn {
  flex: 1;
  height: 28px;
  padding: 0 0.625rem;
  background: var(--bg-input);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 0.375rem;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  vertical-align: middle;
}

.new-chat-btn:hover {
  background: var(--bg-input);
}

.new-chat-btn svg {
  width: 16px;
  height: 16px;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: var(--bg-input);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 0.375rem;
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0;
}

.icon-btn:hover {
  background: var(--border-color);
}

.icon-btn svg {
  width: 14px;
  height: 14px;
}

.icon-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.icon-btn.delete-btn {
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.3);
}

.icon-btn.delete-btn:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.1);
}

.session-checkbox {
  width: 16px;
  height: 16px;
  accent-color: #0ea5e9;
  cursor: pointer;
  flex-shrink: 0;
}

.search-box {
  padding: 0.75rem 1.25rem;
}

.session-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.session-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.625rem 0.75rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  margin-bottom: 0.125rem;
  border-left: 2px solid transparent;
}

.session-item:hover {
  background: var(--bg-input);
  transform: translateX(4px);
}

.session-item:active {
  transform: translateX(2px);
}

.session-item.active {
  background: var(--bg-input);
  border-left-color: #0ea5e9;
  box-shadow: inset 4px 0 0 -2px #0ea5e9;
}

.session-icon {
  flex-shrink: 0;
  color: var(--text-muted);
}

.session-icon svg {
  width: 18px;
  height: 18px;
}

.session-info {
  flex: 1;
  min-width: 0;
}

.session-title {
  color: var(--text-primary);
  font-size: 0.8125rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-time {
  color: var(--text-muted);
  font-size: 0.6875rem;
  margin-top: 0.125rem;
}

.session-delete {
  opacity: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.25rem;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.session-item:hover .session-delete {
  opacity: 1;
}

.session-delete:hover {
  color: #ef4444;
}

.session-delete svg {
  width: 14px;
  height: 14px;
}

.empty-sessions {
  text-align: center;
  padding: 2rem;
  color: var(--text-muted);
}

.empty-icon {
  margin-bottom: 0.75rem;
}

.empty-icon svg {
  width: 40px;
  height: 40px;
  opacity: 0.3;
}

.empty-hint {
  font-size: 0.75rem;
  margin-top: 0.25rem;
}

.sidebar-footer {
  padding: 0.5rem 0.75rem;
  border-top: 1px solid var(--border-color);
}

.sidebar-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.625rem;
  color: var(--text-secondary);
  text-decoration: none;
  border-radius: 0.5rem;
  transition: all 0.15s ease;
  font-size: 0.8125rem;
}

.sidebar-link:hover {
  background: var(--bg-input);
  color: var(--text-primary);
}

.sidebar-link svg {
  width: 18px;
  height: 18px;
}

.sidebar-home-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  margin-bottom: 1rem;
  background: var(--bg-input);
  color: var(--text-primary);
  text-decoration: none;
  font-size: 0.8125rem;
  font-weight: 500;
  border-radius: 0.375rem;
  transition: all 0.2s ease;
  border: 1px solid var(--border-color);
}

.sidebar-home-link:hover {
  background: var(--bg-card);
  transform: translateY(-1px);
}

.sidebar-home-link svg {
  width: 16px;
  height: 16px;
}

.sidebar-footer-copyright {
  padding: 0.75rem 1rem;
  margin-top: auto;
  border-top: 1px solid var(--border-color);
  text-align: center;
  font-size: 0.6875rem;
  color: var(--text-muted);
}

.sidebar-footer-copyright p {
  margin: 0;
  line-height: 1.5;
}

.sidebar-footer-copyright .disclaimer {
  font-size: 0.625rem;
  color: #f59e0b;
  font-weight: 500;
  margin-top: 0.25rem;
}

.sidebar-footer-copyright a {
  color: var(--text-secondary);
  text-decoration: none;
  transition: color 0.15s ease;
}

.sidebar-footer-copyright a:hover {
  color: var(--text-primary);
}

.sidebar-footer-copyright .license-info {
  margin-top: 0.25rem;
  font-size: 0.625rem;
}

.sidebar-footer-copyright .license-info a {
  color: var(--text-muted);
}

.sidebar-footer-copyright .license-info a:hover {
  color: var(--text-primary);
}

/* 主聊天区域 */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--border-color);
  background: var(--header-bg);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
}

.header-center {
  flex-shrink: 0;
}

.bot-brand {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.05em;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex: 1;
  justify-content: flex-end;
}

.menu-btn {
  display: none;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--text-primary);
  cursor: pointer;
  padding: 0.25rem;
  flex-shrink: 0;
}

.menu-btn svg {
  width: 20px;
  height: 20px;
}

.chat-title {
  color: var(--text-secondary);
  font-size: 0.8125rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-actions {
  display: flex;
  gap: 0.25rem;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 0.375rem;
  transition: all 0.2s ease;
  vertical-align: middle;
  text-decoration: none;
}

.action-btn:hover {
  background: var(--bg-input);
  color: var(--text-primary);
}

.action-btn svg {
  width: 18px;
  height: 18px;
}

.action-btn.small {
  padding: 0.25rem;
}

.action-btn.small svg {
  width: 14px;
  height: 14px;
}

/* 消息容器 */
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* 欢迎消息 */
.welcome-message {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--text-primary);
}

.welcome-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  margin-bottom: 1rem;
  border: 3px solid var(--border-color);
}

.welcome-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.welcome-message h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.welcome-message p {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
}

.welcome-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
  max-width: 420px;
}

.suggestion-btn {
  padding: 0.5rem 0.875rem;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
  color: var(--text-secondary);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.15s ease;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.suggestion-btn:hover {
  color: var(--text-primary);
  border-color: #0ea5e9;
}

/* 戳一戳消息样式 */
.poke-message-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0.5rem 0;
  margin: 0.25rem 0;
}

.poke-message {
  background: rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(10px);
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  animation: poke-fade-in 0.3s ease;
}

[data-theme="light"] .poke-message {
  background: rgba(0, 0, 0, 0.06);
}

.poke-text {
  font-size: 0.75rem;
  color: var(--text-muted);
}

/* 戳一戳头像摇晃动画 */
@keyframes poke-shake {
  0%, 100% { transform: translateX(0); }
  10% { transform: translateX(-4px) rotate(-2deg); }
  20% { transform: translateX(4px) rotate(2deg); }
  30% { transform: translateX(-4px) rotate(-2deg); }
  40% { transform: translateX(4px) rotate(2deg); }
  50% { transform: translateX(-2px) rotate(-1deg); }
  60% { transform: translateX(2px) rotate(1deg); }
  70% { transform: translateX(-2px) rotate(-1deg); }
  80% { transform: translateX(2px) rotate(1deg); }
  90% { transform: translateX(-1px); }
}

@keyframes poke-fade-in {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}

.poke-shake .message-avatar.user {
  animation: poke-shake 0.8s ease;
}

/* 消息样式 */
.message-wrapper {
  display: flex;
  gap: 0.625rem;
  animation: messageSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-wrapper.user {
  animation-name: messageSlideInRight;
}

@keyframes messageSlideInRight {
  from {
    opacity: 0;
    transform: translateX(10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.message-wrapper.user {
  align-self: flex-end;
  flex-direction: row-reverse;
  align-items: flex-end;
}

.message-wrapper.assistant {
  align-self: flex-start;
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.message-avatar.assistant {
  border: 1.5px solid var(--border-color);
}

.message-avatar.user {
  background: var(--bg-input);
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-avatar {
  color: var(--text-secondary);
}

.user-avatar svg {
  width: 20px;
  height: 20px;
}

.message-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.message-header {
  margin-bottom: 0.125rem;
}

.bot-name {
  color: var(--text-secondary);
  font-size: 0.75rem;
  font-weight: 500;
}

.message-bubble {
  padding: 0.625rem 0.875rem;
  border-radius: 1rem;
  font-size: 0.8125rem;
  line-height: 1.65;
  word-wrap: break-word;
  word-break: break-word;
  max-width: 100%;
  letter-spacing: 0.01em;
}

.message-bubble.user {
  background: linear-gradient(135deg, #0ea5e9, #06b6d4);
  color: white;
  border-bottom-right-radius: 0.25rem;
  box-shadow: 0 2px 8px rgba(14, 165, 233, 0.2);
}

.message-bubble.assistant {
  background: var(--bg-card);
  color: var(--text-primary);
  border-bottom-left-radius: 0.25rem;
  border: 1px solid var(--border-color);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.message-text {
  white-space: pre-wrap;
}

.message-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.message-wrapper:hover .message-actions {
  opacity: 1;
}

.action-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.375rem;
  border-radius: 0.375rem;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn:hover {
  background: var(--bg-input);
  color: var(--text-secondary);
}

.message-time {
  color: #4b5563;
  font-size: 0.6875rem;
}

/* 打字指示器 */
.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 0.25rem 0;
}

.typing-indicator span {
  width: 6px;
  height: 6px;
  background: var(--bg-input);
  border-radius: 50%;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 100% { transform: scale(1); opacity: 0.4; }
  50% { transform: scale(1.2); opacity: 0.8; }
}

/* 音乐链接样式 */
.music-link {
  color: inherit;
  text-decoration: underline;
  text-decoration-style: dotted;
  text-underline-offset: 0.2em;
  transition: opacity 0.2s;
}

.music-link:hover {
  opacity: 0.8;
}

.music-url {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  text-decoration: none;
  word-break: break-all;
}

.music-url:hover {
  text-decoration: underline;
}

/* 消息文本行 */
.message-text-line {
  margin: 0.25rem 0;
}

/* 链接卡片 */
.link-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem;
  margin: 0.5rem 0;
  background: rgba(0, 0, 0, 0.12);
  border-radius: 0.5rem;
  text-decoration: none;
  color: inherit;
  transition: background 0.2s;
  cursor: pointer;
  max-width: 300px;
}

.link-card:hover {
  background: rgba(0, 0, 0, 0.2);
}

.link-card-icon {
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 0.375rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.125rem;
  flex-shrink: 0;
}

.link-card-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.link-card-title {
  font-weight: 500;
  font-size: 0.8125rem;
  color: inherit;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.link-card-url {
  font-size: 0.6875rem;
  color: rgba(255, 255, 255, 0.5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 加载状态 */
.loading-message {
  display: flex;
  gap: 0.75rem;
  align-self: flex-start;
}

.loading-dots {
  display: flex;
  gap: 4px;
  padding: 0.5rem 0;
}

.loading-dots span {
  width: 6px;
  height: 6px;
  background: var(--bg-input);
  border-radius: 50%;
  animation: loading 1.4s infinite ease-in-out;
}

.loading-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.loading-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes loading {
  0%, 100% { transform: scale(1); opacity: 0.4; }
  50% { transform: scale(1.2); opacity: 0.8; }
}

/* 输入区域 */
.input-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  margin: 0.5rem 0.75rem 0.75rem;
  border-radius: 1rem;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.input-container:focus-within {
  border-color: rgba(14, 165, 233, 0.5);
  box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.08);
}

.input-wrapper {
  flex: 1;
  position: relative;
}

.input-wrapper textarea {
  width: 100%;
  background: transparent;
  border: none;
  padding: 0.5rem 0;
  color: var(--text-primary);
  font-size: 0.875rem;
  line-height: 1.5;
  resize: none;
  max-height: 120px;
  font-family: inherit;
  outline: none !important;
  box-shadow: none !important;
}

.input-wrapper textarea::placeholder {
  color: var(--text-muted);
}

.input-wrapper textarea:focus {
  outline: none !important;
  border: none !important;
  box-shadow: none !important;
}

.send-btn {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #0ea5e9, #06b6d4);
  border: none;
  border-radius: 50%;
  color: white;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
  vertical-align: middle;
  box-shadow: 0 2px 10px rgba(14, 165, 233, 0.35);
}

.send-btn svg {
  width: 18px;
  height: 18px;
  margin-left: 2px;
}

.send-btn:hover:not(:disabled) {
  transform: scale(1.1);
  box-shadow: 0 4px 18px rgba(14, 165, 233, 0.5);
}

.send-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.send-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: scale(1);
}

.send-btn svg {
  width: 16px;
  height: 16px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 280px;
    z-index: 100;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }

  .sidebar-open {
    transform: translateX(0);
  }

  .sidebar-close-btn {
    display: flex;
  }

  .sidebar-overlay {
    display: block;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 99;
  }

  .menu-btn {
    display: flex;
  }

  .header-left {
    flex: 1;
    min-width: 0;
  }

  .header-center {
    display: none;
  }

  .header-right {
    flex: 0;
  }

  .message-wrapper {
    max-width: 92%;
  }

  .message-wrapper.user {
    max-width: 85%;
  }

  .chat-input-area {
    padding: 0.5rem 0.75rem;
    padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
  }

  .chat-input-area textarea {
    font-size: 16px; /* 防止iOS缩放 */
    padding: 0.625rem 0.875rem;
    min-height: 44px;
    max-height: 120px;
  }

  .send-btn {
    width: 40px;
    height: 40px;
  }

  .messages-container {
    padding: 0.75rem;
  }

  .message-header .bot-name {
    font-size: 0.7rem;
  }

  .message-bubble {
    font-size: 0.9rem;
  }

  /* 移动端防止输入框自动聚焦 */
  .input-wrapper textarea {
    caret-color: transparent;
  }

  .input-wrapper textarea:focus {
    caret-color: auto;
  }
}

@media (max-width: 380px) {
  .hero-title {
    font-size: 1.75rem;
  }

  .chat-header h2 {
    font-size: 0.9rem;
  }
}
</style>
