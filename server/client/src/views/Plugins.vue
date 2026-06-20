<template>
  <div class="plugins-container">
    <!-- 返回按钮 -->
    <div class="back-buttons">
      <router-link to="/" class="back-btn glass">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
        主页
      </router-link>
      <router-link to="/chat" class="back-btn glass">← 返回聊天</router-link>
    </div>

    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">🔌 插件管理</h1>
      <p class="page-description">管理您的 astrbot 插件，在聊天中调用插件功能</p>
    </div>

    <!-- 连接模式选择 -->
    <div class="connection-mode glass">
      <h3 class="mode-title">连接模式</h3>
      <div class="mode-options">
        <button
          class="mode-btn"
          :class="{ active: connectionMode === 'http' }"
          @click="switchMode('http')"
        >
          <div class="mode-icon">🌐</div>
          <div class="mode-info">
            <div class="mode-name">HTTP API</div>
            <div class="mode-desc">通过AstrBot HTTP API连接（推荐）</div>
          </div>
        </button>
        <button
          class="mode-btn"
          :class="{ active: connectionMode === 'websocket' }"
          @click="switchMode('websocket')"
        >
          <div class="mode-icon">🔌</div>
          <div class="mode-info">
            <div class="mode-name">WebSocket</div>
            <div class="mode-desc">通过OneBot v11反向WebSocket连接</div>
          </div>
        </button>
      </div>
    </div>

    <!-- 连接状态 -->
    <div class="connection-status glass" :class="connectionStatus">
      <div class="status-indicator"></div>
      <div class="status-info">
        <div class="status-text">
          {{ statusText }}
        </div>
        <div class="status-detail">
          {{ statusDetail }}
        </div>
      </div>
      <button
        v-if="connectionStatus !== 'connected'"
        class="connect-btn"
        @click="connectToAstrbot"
        :disabled="connecting"
      >
        {{ connecting ? '连接中...' : '连接' }}
      </button>
    </div>

    <!-- 搜索和筛选 -->
    <div class="filter-bar glass">
      <div class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索插件..."
          class="input-glass"
        />
      </div>
      <div class="filter-options">
        <button
          v-for="filter in filters"
          :key="filter.value"
          class="filter-btn"
          :class="{ active: activeFilter === filter.value }"
          @click="activeFilter = filter.value"
        >
          {{ filter.label }}
        </button>
      </div>
    </div>

    <!-- 插件列表 -->
    <div class="plugins-grid">
      <div
        v-for="plugin in filteredPlugins"
        :key="plugin.name"
        class="plugin-card glass"
        :class="{ enabled: plugin.enabled }"
      >
        <!-- 插件头部 -->
        <div class="plugin-header">
          <div class="plugin-icon">
            {{ plugin.icon || '🔌' }}
          </div>
          <div class="plugin-status">
            <span
              class="status-badge"
              :class="plugin.enabled ? 'enabled' : 'disabled'"
            >
              {{ plugin.enabled ? '已启用' : '已禁用' }}
            </span>
          </div>
        </div>

        <!-- 插件信息 -->
        <div class="plugin-info">
          <h3 class="plugin-name">{{ plugin.name }}</h3>
          <p class="plugin-version">v{{ plugin.version || '1.0.0' }}</p>
          <p class="plugin-description">{{ plugin.description || '暂无描述' }}</p>
        </div>

        <!-- 插件作者 -->
        <div class="plugin-meta">
          <span class="plugin-author">
            👤 {{ plugin.author || '未知作者' }}
          </span>
          <span class="plugin-downloads">
            📥 {{ plugin.downloads || 0 }}
          </span>
        </div>

        <!-- 插件操作 -->
        <div class="plugin-actions">
          <button
            class="action-btn toggle-btn"
            :class="plugin.enabled ? 'disable' : 'enable'"
            @click="togglePlugin(plugin)"
          >
            {{ plugin.enabled ? '禁用' : '启用' }}
          </button>
          <button
            class="action-btn config-btn"
            @click="openConfig(plugin)"
            :disabled="!plugin.hasConfig"
          >
            配置
          </button>
          <button
            class="action-btn use-btn"
            @click="usePlugin(plugin)"
            :disabled="!plugin.enabled"
          >
            使用
          </button>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="filteredPlugins.length === 0" class="empty-state">
        <div class="empty-icon">📭</div>
        <h3>暂无插件</h3>
        <p>{{ searchQuery ? '没有找到匹配的插件' : '还没有安装任何插件' }}</p>
        <button v-if="!searchQuery" class="btn-primary" @click="fetchPlugins">
          刷新插件列表
        </button>
      </div>
    </div>

    <!-- 插件配置弹窗 -->
    <div v-if="showConfigModal" class="modal-overlay" @click="closeConfig">
      <div class="modal-content glass" @click.stop>
        <div class="modal-header">
          <h2>{{ configPlugin?.name }} - 配置</h2>
          <button class="modal-close" @click="closeConfig">✕</button>
        </div>

        <div class="modal-body">
          <div
            v-for="(value, key) in pluginConfig"
            :key="key"
            class="config-item"
          >
            <label class="config-label">{{ key }}</label>
            <input
              v-model="pluginConfig[key]"
              type="text"
              class="input-glass"
              :placeholder="`请输入 ${key}`"
            />
          </div>

          <div v-if="Object.keys(pluginConfig).length === 0" class="empty-config">
            此插件没有可配置的选项
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-secondary" @click="closeConfig">取消</button>
          <button class="btn-primary" @click="saveConfig" :disabled="savingConfig">
            {{ savingConfig ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <div class="page-copyright">
      <p>© 2026 丰川初音bot by <a href="https://github.com/qiuxi903/Hatsune-Misumi_Bot_Chat_Web" target="_blank" rel="noopener">邱息</a></p>
      <p class="license-info">Licensed under <a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank" rel="noopener">GNU AGPLv3</a></p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/utils/api'

const router = useRouter()

// 状态
const plugins = ref([])
const searchQuery = ref('')
const activeFilter = ref('all')
const connectionStatus = ref('disconnected')
const connecting = ref(false)
const showConfigModal = ref(false)
const configPlugin = ref(null)
const pluginConfig = ref({})
const savingConfig = ref(false)
const connectionMode = ref('http') // http 或 websocket

// 筛选选项
const filters = [
  { label: '全部', value: 'all' },
  { label: '已启用', value: 'enabled' },
  { label: '已禁用', value: 'disabled' }
]

// 计算属性
const statusText = computed(() => {
  switch (connectionStatus.value) {
    case 'connected':
      return '已连接到 astrbot'
    case 'connecting':
      return '正在连接...'
    case 'disconnected':
      return '未连接'
    case 'error':
      return '连接失败'
    default:
      return '未知状态'
  }
})

const statusDetail = computed(() => {
  switch (connectionStatus.value) {
    case 'connected':
      return `已加载 ${plugins.value.length} 个插件`
    case 'connecting':
      return '正在建立连接...'
    case 'disconnected':
      return '点击连接按钮开始使用插件'
    case 'error':
      return '请检查 astrbot 是否正在运行'
    default:
      return ''
  }
})

const filteredPlugins = computed(() => {
  let result = plugins.value

  // 按搜索词筛选
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(p =>
      p.name.toLowerCase().includes(query) ||
      (p.description || '').toLowerCase().includes(query)
    )
  }

  // 按状态筛选
  if (activeFilter.value === 'enabled') {
    result = result.filter(p => p.enabled)
  } else if (activeFilter.value === 'disabled') {
    result = result.filter(p => !p.enabled)
  }

  return result
})

// 方法
const fetchPlugins = async () => {
  try {
    const response = await api.get('/api/plugins')
    plugins.value = response.data.plugins || []
    connectionStatus.value = 'connected'
  } catch (err) {
    console.error('获取插件列表失败:', err)
    connectionStatus.value = 'error'
  }
}

const connectToAstrbot = async () => {
  connecting.value = true
  connectionStatus.value = 'connecting'

  try {
    // 测试连接
    await api.get('/api/plugins/status')
    await fetchPlugins()
  } catch (err) {
    console.error('连接 astrbot 失败:', err)
    connectionStatus.value = 'error'
  } finally {
    connecting.value = false
  }
}

const togglePlugin = async (plugin) => {
  try {
    await api.put(`/api/plugins/${plugin.name}/toggle`, {
      enabled: !plugin.enabled
    })
    plugin.enabled = !plugin.enabled
  } catch (err) {
    console.error('切换插件状态失败:', err)
    alert('操作失败，请重试')
  }
}

const openConfig = async (plugin) => {
  configPlugin.value = plugin
  showConfigModal.value = true

  try {
    const response = await api.get(`/api/plugins/${plugin.name}/config`)
    pluginConfig.value = response.data.config || {}
  } catch (err) {
    console.error('获取插件配置失败:', err)
    pluginConfig.value = {}
  }
}

const closeConfig = () => {
  showConfigModal.value = false
  configPlugin.value = null
  pluginConfig.value = {}
}

const saveConfig = async () => {
  if (!configPlugin.value) return

  savingConfig.value = true
  try {
    await api.put(`/api/plugins/${configPlugin.value.name}/config`, {
      config: pluginConfig.value
    })
    alert('配置保存成功')
    closeConfig()
  } catch (err) {
    console.error('保存插件配置失败:', err)
    alert('保存失败，请重试')
  } finally {
    savingConfig.value = false
  }
}

const switchMode = async (mode) => {
  try {
    const response = await api.post('/api/connection/mode', { mode })
    if (response.data.success) {
      connectionMode.value = mode
      // 重新连接
      await connectToAstrbot()
    }
  } catch (err) {
    console.error('切换连接模式失败:', err)
    alert('切换失败，请重试')
  }
}

const usePlugin = (plugin) => {
  // 跳转到聊天页面，并带上插件信息
  router.push({
    path: '/chat',
    query: { plugin: plugin.name }
  })
}

// 获取连接状态
const fetchConnectionStatus = async () => {
  try {
    const response = await api.get('/api/connection/status')
    if (response.data.success) {
      connectionMode.value = response.data.mode
    }
  } catch (err) {
    console.error('获取连接状态失败:', err)
  }
}

// 生命周期
onMounted(() => {
  fetchConnectionStatus()
  connectToAstrbot()
})
</script>

<style scoped>
.plugins-container {
  min-height: 100vh;
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.back-buttons {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 2rem;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  color: var(--text-primary);
  text-decoration: none;
  font-size: 0.8125rem;
  transition: all 0.2s ease;
}

.back-btn svg {
  width: 16px;
  height: 16px;
}

.back-btn:hover {
  background: var(--glass-bg);
}

/* 页面标题 */
.page-header {
  text-align: center;
  margin-bottom: 2rem;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.page-description {
  color: var(--text-secondary);
  font-size: 1rem;
}

/* 连接模式选择 */
.connection-mode {
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.mode-title {
  color: var(--text-primary);
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.mode-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.mode-btn {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--bg-card);
  border: 2px solid var(--border-color);
  border-radius: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.mode-btn:hover {
  background: var(--glass-bg);
  border-color: var(--text-secondary);
}

.mode-btn.active {
  background: rgba(14, 165, 233, 0.2);
  border-color: #0ea5e9;
}

.mode-icon {
  font-size: 2rem;
}

.mode-info {
  text-align: left;
}

.mode-name {
  color: var(--text-primary);
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.mode-desc {
  color: var(--text-secondary);
  font-size: 0.75rem;
}

/* 连接状态 */
.connection-status {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  margin-bottom: 2rem;
  transition: all 0.3s ease;
}

.connection-status.connected {
  border-left: 4px solid #10b981;
}

.connection-status.connecting {
  border-left: 4px solid #f59e0b;
}

.connection-status.disconnected {
  border-left: 4px solid #6b7280;
}

.connection-status.error {
  border-left: 4px solid #ef4444;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.connected .status-indicator {
  background: #10b981;
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.5);
}

.connecting .status-indicator {
  background: #f59e0b;
  animation: pulse 1.5s infinite;
}

.disconnected .status-indicator {
  background: #6b7280;
}

.error .status-indicator {
  background: #ef4444;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.status-info {
  flex: 1;
}

.status-text {
  color: var(--text-primary);
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.status-detail {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.connect-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #0ea5e9, #a855f7);
  color: white;
  border: none;
  border-radius: 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.connect-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(14, 165, 233, 0.4);
}

.connect-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* 搜索和筛选 */
.filter-bar {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.search-box {
  flex: 1;
  min-width: 200px;
}

.filter-options {
  display: flex;
  gap: 0.5rem;
}

.filter-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.filter-btn:hover {
  background: var(--glass-bg);
}

.filter-btn.active {
  background: #0ea5e9;
  border-color: #0ea5e9;
  color: white;
}

/* 插件网格 */
.plugins-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

/* 插件卡片 */
.plugin-card {
  padding: 1.5rem;
  transition: all 0.3s ease;
  border: 1px solid var(--border-color);
}

.plugin-card:hover {
  transform: translateY(-5px);
  border-color: var(--text-secondary);
}

.plugin-card.enabled {
  border-color: rgba(16, 185, 129, 0.3);
}

.plugin-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.plugin-icon {
  font-size: 2.5rem;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.status-badge.enabled {
  background: rgba(16, 185, 129, 0.2);
  color: #6ee7b7;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.status-badge.disabled {
  background: rgba(107, 114, 128, 0.2);
  color: #9ca3af;
  border: 1px solid rgba(107, 114, 128, 0.3);
}

.plugin-info {
  margin-bottom: 1rem;
}

.plugin-name {
  color: var(--text-primary);
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.plugin-version {
  color: var(--text-secondary);
  font-size: 0.75rem;
  margin-bottom: 0.5rem;
}

.plugin-description {
  color: var(--text-secondary);
  font-size: 0.875rem;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.plugin-meta {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.plugin-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.3s ease;
  background: var(--bg-card);
  color: var(--text-primary);
}

.action-btn:hover:not(:disabled) {
  background: var(--glass-bg);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toggle-btn.enable {
  border-color: rgba(16, 185, 129, 0.5);
  color: #6ee7b7;
}

.toggle-btn.disable {
  border-color: rgba(239, 68, 68, 0.5);
  color: #fca5a5;
}

.use-btn {
  background: linear-gradient(135deg, #0ea5e9, #a855f7);
  border: none;
}

.use-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(14, 165, 233, 0.4);
}

/* 空状态 */
.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 4rem 2rem;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1.5rem;
}

.empty-state h3 {
  color: var(--text-primary);
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
}

.empty-state p {
  margin-bottom: 1.5rem;
}

.btn-primary {
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #0ea5e9, #a855f7);
  color: white;
  border: none;
  border-radius: 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(14, 165, 233, 0.4);
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
}

.modal-content {
  width: 100%;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h2 {
  color: var(--text-primary);
  font-size: 1.25rem;
  font-weight: 600;
}

.modal-close {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.25rem;
}

.modal-close:hover {
  color: var(--text-primary);
}

.modal-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.config-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.config-label {
  color: var(--text-primary);
  font-size: 0.875rem;
  font-weight: 500;
}

.empty-config {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid var(--border-color);
}

.btn-secondary {
  padding: 0.75rem 1.5rem;
  background: var(--bg-card);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-secondary:hover {
  background: var(--glass-bg);
}

.page-copyright {
  margin-top: 2rem;
  text-align: center;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.page-copyright a {
  color: var(--text-secondary);
  text-decoration: none;
  transition: color 0.15s ease;
}

.page-copyright a:hover {
  color: var(--text-primary);
}

.page-copyright .license-info {
  margin-top: 0.25rem;
  font-size: 0.625rem;
}

.page-copyright .license-info a {
  color: var(--text-muted);
}

.page-copyright .license-info a:hover {
  color: var(--text-primary);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .plugins-container {
    padding: 1rem;
  }

  .filter-bar {
    flex-direction: column;
  }

  .plugins-grid {
    grid-template-columns: 1fr;
  }

  .plugin-actions {
    flex-wrap: wrap;
  }

  .action-btn {
    min-width: calc(50% - 0.25rem);
  }
}
</style>
