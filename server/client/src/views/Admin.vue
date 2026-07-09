<template>
  <div class="admin-container">
    <!-- 侧边栏 -->
    <aside class="admin-sidebar">
      <div class="sidebar-header">
        <h2>🔧 管理后台</h2>
      </div>
      <nav class="sidebar-nav">
        <router-link to="/admin" class="nav-item" :class="{ active: currentTab === 'dashboard' }">
          <span>📊</span> 仪表盘
        </router-link>
        <router-link to="/admin/users" class="nav-item" :class="{ active: currentTab === 'users' }">
          <span>👥</span> 用户管理
        </router-link>
        <router-link to="/admin/sessions" class="nav-item" :class="{ active: currentTab === 'sessions' }">
          <span>💬</span> 会话管理
        </router-link>
        <router-link to="/admin/messages" class="nav-item" :class="{ active: currentTab === 'messages' }">
          <span>✉️</span> 消息记录
        </router-link>
      </nav>
      <div class="sidebar-footer">
        <router-link to="/chat" class="nav-item">
          <span>←</span> 返回聊天
        </router-link>
      </div>
    </aside>

    <!-- 主内容区 -->
    <main class="admin-main">
      <header class="admin-header">
        <h1>{{ pageTitle }}</h1>
        <div class="header-actions">
          <button class="btn-refresh" @click="refreshData">刷新</button>
        </div>
      </header>

      <div class="admin-content">
        <!-- 仪表盘 -->
        <div v-if="currentTab === 'dashboard'" class="dashboard">
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon">👥</div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.totalUsers }}</div>
                <div class="stat-label">总用户数</div>
              </div>
              <div class="stat-trend" v-if="stats.todayNewUsers > 0">
                +{{ stats.todayNewUsers }} 今日
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">💬</div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.totalSessions }}</div>
                <div class="stat-label">总会话数</div>
              </div>
              <div class="stat-trend" v-if="stats.todayNewSessions > 0">
                +{{ stats.todayNewSessions }} 今日
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">✉️</div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.totalMessages }}</div>
                <div class="stat-label">总消息数</div>
              </div>
              <div class="stat-trend" v-if="stats.todayNewMessages > 0">
                +{{ stats.todayNewMessages }} 今日
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">🔥</div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.activeUsers }}</div>
                <div class="stat-label">活跃用户(7天)</div>
              </div>
            </div>
          </div>

          <div class="info-cards">
            <div class="info-card">
              <h3>🖼️ 壁纸收藏</h3>
              <p>{{ stats.totalFavorites }} 张</p>
            </div>
            <div class="info-card">
              <h3>⏱️ 运行时间</h3>
              <p>{{ formatUptime(systemInfo.uptime) }}</p>
            </div>
            <div class="info-card">
              <h3>💾 内存使用</h3>
              <p>{{ formatMemory(systemInfo.memoryUsage?.heapUsed) }}</p>
            </div>
          </div>
        </div>

        <!-- 用户列表 -->
        <div v-if="currentTab === 'users'" class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>用户名</th>
                <th>邮箱</th>
                <th>会话数</th>
                <th>消息数</th>
                <th>最后活跃</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user.id">
                <td class="id-cell">{{ user.id.substring(0, 8) }}...</td>
                <td>{{ user.username }}</td>
                <td>{{ user.email }}</td>
                <td>{{ user.sessionCount }}</td>
                <td>{{ user.messageCount }}</td>
                <td>{{ formatTime(user.lastActive) }}</td>
                <td>
                  <button class="btn-view" @click="viewUser(user.id)">查看</button>
                  <button class="btn-delete" @click="deleteUser(user.id)" v-if="user.id !== currentUserId">删除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 会话列表 -->
        <div v-if="currentTab === 'sessions'" class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>用户</th>
                <th>标题</th>
                <th>消息数</th>
                <th>最后消息</th>
                <th>更新时间</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="session in sessions" :key="session.id">
                <td class="id-cell">{{ session.id.substring(0, 8) }}...</td>
                <td>{{ session.username }}</td>
                <td>{{ session.title || '新对话' }}</td>
                <td>{{ session.messageCount }}</td>
                <td class="message-preview">{{ session.lastMessage }}</td>
                <td>{{ formatTime(session.updated_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 消息列表 -->
        <div v-if="currentTab === 'messages'" class="table-container">
          <div class="filter-bar">
            <select v-model="messageFilter" @change="loadMessages" class="filter-select">
              <option value="">全部消息</option>
              <option value="user">用户消息</option>
              <option value="assistant">AI回复</option>
            </select>
          </div>
          <table class="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>会话</th>
                <th>角色</th>
                <th>内容</th>
                <th>时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="message in messages" :key="message.id">
                <td class="id-cell">{{ message.id.substring(0, 8) }}...</td>
                <td class="id-cell">{{ message.session_id.substring(0, 8) }}...</td>
                <td>
                  <span :class="['role-badge', message.role]">
                    {{ message.role === 'user' ? '用户' : 'AI' }}
                  </span>
                </td>
                <td class="content-cell">{{ message.content.substring(0, 100) }}{{ message.content.length > 100 ? '...' : '' }}</td>
                <td>{{ formatTime(message.created_at) }}</td>
                <td>
                  <button class="btn-delete" @click="deleteMessage(message.id)">删除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 用户详情弹窗 -->
        <div v-if="selectedUser" class="modal-overlay" @click.self="selectedUser = null">
          <div class="modal-content">
            <div class="modal-header">
              <h2>用户详情</h2>
              <button class="modal-close" @click="selectedUser = null">✕</button>
            </div>
            <div class="modal-body">
              <div class="user-detail">
                <p><strong>ID:</strong> {{ selectedUser.user.id }}</p>
                <p><strong>用户名:</strong> {{ selectedUser.user.username }}</p>
                <p><strong>邮箱:</strong> {{ selectedUser.user.email }}</p>
                <p><strong>昵称:</strong> {{ selectedUser.user.nickname || '未设置' }}</p>
                <p><strong>QQ号:</strong> {{ selectedUser.user.qq_number || '未绑定' }}</p>
                <p><strong>注册时间:</strong> {{ formatTime(selectedUser.user.created_at) }}</p>
              </div>
              <h3>会话列表 ({{ selectedUser.sessions.length }})</h3>
              <div class="user-sessions">
                <div v-for="session in selectedUser.sessions" :key="session.id" class="session-item">
                  <span>{{ session.title || '新对话' }}</span>
                  <span class="session-time">{{ formatTime(session.updated_at) }}</span>
                </div>
              </div>
              <h3>最近消息 ({{ selectedUser.recentMessages.length }})</h3>
              <div class="user-messages">
                <div v-for="msg in selectedUser.recentMessages.slice(-10)" :key="msg.id" class="message-item">
                  <span :class="['role-badge', msg.role]">{{ msg.role === 'user' ? '用户' : 'AI' }}</span>
                  <span class="msg-content">{{ msg.content.substring(0, 80) }}{{ msg.content.length > 80 ? '...' : '' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/utils/api'
import { showToast, showConfirm } from '@/utils/dialog'

const route = useRoute()

const currentTab = computed(() => {
  if (route.path === '/admin/users') return 'users'
  if (route.path === '/admin/sessions') return 'sessions'
  if (route.path === '/admin/messages') return 'messages'
  return 'dashboard'
})

const pageTitle = computed(() => {
  const titles = {
    dashboard: '仪表盘',
    users: '用户管理',
    sessions: '会话管理',
    messages: '消息记录'
  }
  return titles[currentTab.value] || '管理后台'
})

const stats = ref({
  totalUsers: 0,
  totalSessions: 0,
  totalMessages: 0,
  totalFavorites: 0,
  todayNewUsers: 0,
  todayNewSessions: 0,
  todayNewMessages: 0,
  activeUsers: 0
})

const systemInfo = ref({})
const users = ref([])
const sessions = ref([])
const messages = ref([])
const selectedUser = ref(null)
const messageFilter = ref('')
const currentUserId = ref('')

// 加载统计数据
const loadStats = async () => {
  try {
    const response = await api.get('/api/admin/stats')
    if (response.data.success) {
      stats.value = response.data.stats
    }
  } catch (e) {
    console.error('加载统计数据失败:', e)
  }
}

// 加载系统信息
const loadSystemInfo = async () => {
  try {
    const response = await api.get('/api/admin/system')
    if (response.data.success) {
      systemInfo.value = response.data.system
    }
  } catch (e) {
    console.error('加载系统信息失败:', e)
  }
}

// 加载用户列表
const loadUsers = async () => {
  try {
    const response = await api.get('/api/admin/users')
    if (response.data.success) {
      users.value = response.data.users
    }
  } catch (e) {
    console.error('加载用户列表失败:', e)
  }
}

// 加载会话列表
const loadSessions = async () => {
  try {
    const response = await api.get('/api/admin/sessions')
    if (response.data.success) {
      sessions.value = response.data.sessions
    }
  } catch (e) {
    console.error('加载会话列表失败:', e)
  }
}

// 加载消息列表
const loadMessages = async () => {
  try {
    const params = { limit: 200 }
    if (messageFilter.value) {
      params.role = messageFilter.value
    }
    const response = await api.get('/api/admin/messages', { params })
    if (response.data.success) {
      messages.value = response.data.messages
    }
  } catch (e) {
    console.error('加载消息列表失败:', e)
  }
}

// 查看用户详情
const viewUser = async (userId) => {
  try {
    const response = await api.get(`/api/admin/users/${userId}`)
    if (response.data.success) {
      selectedUser.value = response.data
    }
  } catch (e) {
    console.error('加载用户详情失败:', e)
  }
}

// 删除用户
const deleteUser = async (userId) => {
  const confirmed = await showConfirm('确定要删除该用户及其所有数据吗？', '删除用户', 'danger')
  if (!confirmed) return
  try {
    await api.delete(`/api/admin/users/${userId}`)
    await loadUsers()
    await loadStats()
    showToast('用户已删除', 'success')
  } catch (e) {
    showToast('删除失败: ' + (e.response?.data?.message || e.message), 'error')
  }
}

// 删除消息
const deleteMessage = async (messageId) => {
  const confirmed = await showConfirm('确定要删除这条消息吗？', '删除消息', 'danger')
  if (!confirmed) return
  try {
    await api.delete(`/api/admin/messages/${messageId}`)
    await loadMessages()
    await loadStats()
    showToast('消息已删除', 'success')
  } catch (e) {
    showToast('删除失败: ' + (e.response?.data?.message || e.message), 'error')
  }
}

// 刷新数据
const refreshData = () => {
  loadStats()
  loadSystemInfo()
  if (currentTab.value === 'users') loadUsers()
  if (currentTab.value === 'sessions') loadSessions()
  if (currentTab.value === 'messages') loadMessages()
}

// 格式化时间
const formatTime = (timestamp) => {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 格式化运行时间
const formatUptime = (seconds) => {
  if (!seconds) return '-'
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days}天${hours}小时`
  if (hours > 0) return `${hours}小时${minutes}分钟`
  return `${minutes}分钟`
}

// 格式化内存
const formatMemory = (bytes) => {
  if (!bytes) return '-'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

onMounted(async () => {
  // 获取当前用户ID
  try {
    const meResponse = await api.get('/api/auth/me')
    if (meResponse.data.success) {
      currentUserId.value = meResponse.data.user.id
    }
  } catch (e) {
    console.error('获取用户信息失败:', e)
  }

  loadStats()
  loadSystemInfo()

  if (currentTab.value === 'users') loadUsers()
  if (currentTab.value === 'sessions') loadSessions()
  if (currentTab.value === 'messages') loadMessages()
})
</script>

<style scoped>
.admin-container {
  display: flex;
  height: 100vh;
  background: var(--bg-primary);
}

/* 侧边栏 */
.admin-sidebar {
  width: 220px;
  background: var(--sidebar-bg);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 1.25rem;
  border-bottom: 1px solid var(--border-color);
}

.sidebar-header h2 {
  font-size: 1rem;
  color: var(--text-primary);
  margin: 0;
}

.sidebar-nav {
  flex: 1;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.625rem 0.75rem;
  color: var(--text-secondary);
  text-decoration: none;
  border-radius: 0.5rem;
  font-size: 0.8125rem;
  transition: all 0.2s;
}

.nav-item:hover {
  background: var(--bg-input);
  color: var(--text-primary);
}

.nav-item.active {
  background: linear-gradient(135deg, #0ea5e9, #06b6d4);
  color: white;
}

.sidebar-footer {
  padding: 0.75rem;
  border-top: 1px solid var(--border-color);
}

/* 主内容区 */
.admin-main {
  flex: 1;
  overflow-y: auto;
}

.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
  background: var(--sidebar-bg);
  position: sticky;
  top: 0;
  z-index: 10;
}

.admin-header h1 {
  font-size: 1.125rem;
  color: var(--text-primary);
  margin: 0;
}

.btn-refresh {
  padding: 0.5rem 1rem;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 0.375rem;
  color: var(--text-primary);
  cursor: pointer;
  font-size: 0.8125rem;
  transition: all 0.2s;
}

.btn-refresh:hover {
  background: var(--bg-card);
}

.admin-content {
  padding: 1.5rem;
}

/* 仪表盘 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  backdrop-filter: blur(10px);
}

.stat-icon {
  font-size: 2rem;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(14, 165, 233, 0.1);
  border-radius: 0.75rem;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 0.125rem;
}

.stat-trend {
  font-size: 0.6875rem;
  color: #10b981;
  background: rgba(16, 185, 129, 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 1rem;
}

.info-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.info-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
  padding: 1.25rem;
  backdrop-filter: blur(10px);
}

.info-card h3 {
  font-size: 0.8125rem;
  color: var(--text-muted);
  margin: 0 0 0.5rem 0;
}

.info-card p {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

/* 表格容器 */
.table-container {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
  overflow: hidden;
}

.filter-bar {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.filter-select {
  padding: 0.5rem 0.75rem;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 0.375rem;
  color: var(--text-primary);
  font-size: 0.8125rem;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
  font-size: 0.8125rem;
}

.data-table th {
  background: var(--bg-input);
  color: var(--text-muted);
  font-weight: 500;
}

.data-table tr:hover {
  background: var(--bg-input);
}

.id-cell {
  font-family: monospace;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.message-preview {
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.content-cell {
  max-width: 300px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.role-badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 1rem;
  font-size: 0.6875rem;
  font-weight: 500;
}

.role-badge.user {
  background: rgba(14, 165, 233, 0.1);
  color: #0ea5e9;
}

.role-badge.assistant {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.btn-view,
.btn-delete {
  padding: 0.25rem 0.625rem;
  border: none;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
  margin-right: 0.375rem;
}

.btn-view {
  background: rgba(14, 165, 233, 0.1);
  color: #0ea5e9;
}

.btn-view:hover {
  background: rgba(14, 165, 233, 0.2);
}

.btn-delete {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.btn-delete:hover {
  background: rgba(239, 68, 68, 0.2);
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--bg-card);
  border-radius: 0.75rem;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.125rem;
  color: var(--text-primary);
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.25rem;
  color: var(--text-muted);
  cursor: pointer;
}

.modal-body {
  padding: 1.25rem;
}

.modal-body h3 {
  font-size: 0.875rem;
  color: var(--text-muted);
  margin: 1.25rem 0 0.75rem;
}

.user-detail p {
  margin: 0.5rem 0;
  font-size: 0.8125rem;
  color: var(--text-primary);
}

.user-detail strong {
  color: var(--text-muted);
  margin-right: 0.5rem;
}

.user-sessions,
.user-messages {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.session-item,
.message-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  background: var(--bg-input);
  border-radius: 0.375rem;
  font-size: 0.8125rem;
}

.session-time {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.msg-content {
  flex: 1;
  margin-left: 0.5rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 响应式 */
@media (max-width: 768px) {
  .admin-sidebar {
    width: 60px;
  }

  .sidebar-header h2,
  .nav-item span:not(:first-child) {
    display: none;
  }

  .nav-item {
    justify-content: center;
    padding: 0.75rem;
  }

  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
