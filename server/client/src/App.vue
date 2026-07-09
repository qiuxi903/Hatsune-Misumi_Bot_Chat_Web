<template>
  <div class="app-container">
    <!-- 动态背景 -->
    <div class="dynamic-background" :class="{ loaded: bgLoaded }" :style="{ '--bg-image': `url(${bgImage})` }">
      <div class="bg-overlay"></div>
    </div>

    <!-- 壁纸控制入口按钮 -->
    <button class="wallpaper-toggle" @click="showPanel = !showPanel" title="壁纸设置">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
      </svg>
    </button>

    <!-- 壁纸控制面板 -->
    <transition name="panel-slide">
      <div v-if="showPanel" class="wallpaper-panel">
        <div class="panel-header">
          <span class="panel-title">🖼️ 壁纸设置</span>
          <button class="panel-close" @click="showPanel = false">✕</button>
        </div>

        <div class="panel-content">
          <!-- 操作按钮 -->
          <div class="action-buttons">
            <button class="action-item" @click="refreshBackground">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              <span>换一张</span>
            </button>
            <button class="action-item" :class="{ active: bgSaved }" @click="toggleSaveBackground">
              <svg width="18" height="18" viewBox="0 0 24 24" :fill="bgSaved ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              <span>{{ bgSaved ? '已收藏' : '收藏' }}</span>
            </button>
            <button class="action-item" @click="downloadBackground">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              <span>下载</span>
            </button>
          </div>

          <!-- 自动切换 -->
          <div class="auto-switch">
            <div class="switch-header">
              <span>自动切换</span>
              <button class="switch-toggle" :class="{ active: autoSwitch }" @click="toggleAutoSwitch">
                <div class="switch-thumb"></div>
              </button>
            </div>
            <div v-if="autoSwitch" class="switch-options">
              <button
                v-for="opt in switchOptions"
                :key="opt.value"
                class="switch-option"
                :class="{ active: autoSwitchInterval === opt.value }"
                @click="setAutoSwitchInterval(opt.value)"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>

          <!-- 主题切换 -->
          <div class="theme-section">
            <span>主题</span>
            <div class="theme-buttons">
              <button class="theme-btn" :class="{ active: isDark }" @click="setTheme(true)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
                暗色
              </button>
              <button class="theme-btn" :class="{ active: !isDark }" @click="setTheme(false)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                </svg>
                亮色
              </button>
            </div>
          </div>

          <!-- 我的收藏 -->
          <div class="favorites-section">
            <div class="favorites-header" @click="showFavorites = !showFavorites">
              <span>我的收藏 ({{ favorites.length }}/9)</span>
              <svg :class="{ rotated: showFavorites }" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
            <div v-if="showFavorites && favorites.length > 0" class="favorites-list">
              <div
                v-for="(fav, index) in favorites"
                :key="fav.id"
                class="favorite-item"
                @click="loadFavorite(fav)"
              >
                <div class="favorite-preview" :style="{ backgroundImage: `url(${fav.image_data})` }"></div>
                <button class="favorite-remove" @click.stop="removeFavorite(index)">✕</button>
              </div>
            </div>
            <div v-if="showFavorites && favorites.length === 0" class="favorites-empty">
              暂无收藏
            </div>
          </div>

          <!-- 底部信息 -->
          <div class="panel-footer">
            图片由 loliapi.com 提供
          </div>
        </div>
      </div>
    </transition>

    <!-- 主内容 -->
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>

    <!-- 全局弹窗组件 -->
    <Toast
      :visible="toastState.visible"
      :message="toastState.message"
      :type="toastState.type"
      :duration="toastState.duration"
      @close="hideToast"
    />
    <Confirm
      :visible="confirmState.visible"
      :title="confirmState.title"
      :message="confirmState.message"
      :type="confirmState.type"
      @confirm="onConfirmConfirm"
      @cancel="onCancelConfirm"
    />
    <Prompt
      :visible="promptState.visible"
      :title="promptState.title"
      :default-value="promptState.defaultValue"
      :placeholder="promptState.placeholder"
      @confirm="onConfirmPrompt"
      @cancel="onCancelPrompt"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useUserStore } from '@/stores/user'
import api from '@/utils/api'
import { useDialog } from '@/utils/dialog'
import Toast from '@/components/Toast.vue'
import Confirm from '@/components/Confirm.vue'
import Prompt from '@/components/Prompt.vue'

const {
  toastState, hideToast,
  confirmState, onConfirmConfirm, onCancelConfirm,
  promptState, onConfirmPrompt, onCancelPrompt
} = useDialog()

const userStore = useUserStore()
const bgImage = ref('')
const bgLoaded = ref(false)
const bgSaved = ref(false)
const isDark = ref(true)
const showPanel = ref(false)
const showFavorites = ref(true)
const favorites = ref([])
const autoSwitch = ref(true)
const autoSwitchInterval = ref(30)
const autoSwitchTimer = ref(null)

const switchOptions = [
  { label: '5 分钟', value: 5 },
  { label: '15 分钟', value: 15 },
  { label: '30 分钟', value: 30 },
  { label: '60 分钟', value: 60 }
]

// 将图片URL转为base64
const urlToBase64 = async (url) => {
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.readAsDataURL(blob)
    })
  } catch (e) {
    console.error('转base64失败:', e)
    return null
  }
}

// 检查当前背景是否已收藏
const checkIfSaved = () => {
  bgSaved.value = favorites.value.some(f => f.image_data === bgImage.value)
}

// 加载随机背景图片
const loadBackground = async () => {
  // 检查是否有保存的背景（base64格式）
  const savedBg = localStorage.getItem('savedBackground')
  if (savedBg && savedBg.startsWith('data:')) {
    bgImage.value = savedBg
    bgLoaded.value = true
    // 稍后检查是否已收藏（需要先加载收藏列表）
    return
  }

  // 加载新图片
  await fetchNewBackground()
}

// 获取新背景图片
const fetchNewBackground = async () => {
  bgLoaded.value = false
  try {
    const response = await fetch('https://www.loliapi.com/acg/')
    const blob = await response.blob()
    const base64 = await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.readAsDataURL(blob)
    })
    bgImage.value = base64
    bgLoaded.value = true
  } catch (e) {
    console.error('加载背景失败:', e)
    bgLoaded.value = false
  }
}

// 刷新背景
const refreshBackground = async () => {
  bgSaved.value = false
  localStorage.removeItem('savedBackground')
  await fetchNewBackground()
}

// 保存/取消保存背景
const toggleSaveBackground = async () => {
  if (bgSaved.value) {
    // 取消收藏
    const fav = favorites.value.find(f => f.image_data === bgImage.value)
    if (fav) {
      await removeFavoriteById(fav.id)
    }
    localStorage.removeItem('savedBackground')
    bgSaved.value = false
  } else {
    // 添加收藏
    try {
      const response = await api.post('/api/wallpapers', { imageData: bgImage.value })
      if (response.data.success) {
        favorites.value.push(response.data.favorite)
        localStorage.setItem('savedBackground', bgImage.value)
        bgSaved.value = true
      } else {
        alert(response.data.message || '收藏失败')
      }
    } catch (e) {
      console.error('收藏失败:', e)
      alert(e.response?.data?.message || '收藏失败')
    }
  }
}

// 下载背景
const downloadBackground = () => {
  if (!bgImage.value) return
  const link = document.createElement('a')
  link.href = bgImage.value
  link.download = `wallpaper-${Date.now()}.jpg`
  link.target = '_blank'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// 收藏管理
const loadFavorites = async () => {
  try {
    const response = await api.get('/api/wallpapers')
    if (response.data.success) {
      favorites.value = response.data.favorites
    }
  } catch (e) {
    console.error('加载收藏失败:', e)
  }
}

const loadFavorite = (fav) => {
  bgImage.value = fav.image_data
  bgLoaded.value = true
  bgSaved.value = true
  localStorage.setItem('savedBackground', fav.image_data)
}

const removeFavorite = async (index) => {
  const fav = favorites.value[index]
  await removeFavoriteById(fav.id)
}

const removeFavoriteById = async (id) => {
  try {
    await api.delete(`/api/wallpapers/${id}`)
    favorites.value = favorites.value.filter(f => f.id !== id)
    // 如果删除的是当前背景，取消保存状态
    const currentFav = favorites.value.find(f => f.image_data === bgImage.value)
    if (!currentFav) {
      bgSaved.value = false
      localStorage.removeItem('savedBackground')
    }
  } catch (e) {
    console.error('删除收藏失败:', e)
  }
}

// 自动切换
const toggleAutoSwitch = () => {
  autoSwitch.value = !autoSwitch.value
  localStorage.setItem('autoSwitch', autoSwitch.value)
  if (autoSwitch.value) {
    startAutoSwitch()
  } else {
    stopAutoSwitch()
  }
}

const setAutoSwitchInterval = (minutes) => {
  autoSwitchInterval.value = minutes
  localStorage.setItem('autoSwitchInterval', minutes)
  if (autoSwitch.value) {
    stopAutoSwitch()
    startAutoSwitch()
  }
}

const startAutoSwitch = () => {
  stopAutoSwitch()
  const ms = autoSwitchInterval.value * 60 * 1000
  autoSwitchTimer.value = setInterval(() => {
    refreshBackground()
  }, ms)
}

const stopAutoSwitch = () => {
  if (autoSwitchTimer.value) {
    clearInterval(autoSwitchTimer.value)
    autoSwitchTimer.value = null
  }
}

// 主题切换
const setTheme = (dark) => {
  isDark.value = dark
  localStorage.setItem('theme', dark ? 'dark' : 'light')
  applyTheme()
}

const applyTheme = () => {
  document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light')
}

onMounted(async () => {
  // 恢复用户登录状态
  await userStore.init()

  // 加载背景
  await loadBackground()

  // 加载收藏列表（需要登录状态）
  if (userStore.isAuthenticated) {
    await loadFavorites()
    checkIfSaved()
  }

  // 初始化主题
  const savedTheme = localStorage.getItem('theme')
  isDark.value = savedTheme ? savedTheme === 'dark' : true
  applyTheme()

  // 初始化自动切换（默认开启）
  const savedAutoSwitch = localStorage.getItem('autoSwitch')
  const savedInterval = localStorage.getItem('autoSwitchInterval')
  autoSwitch.value = savedAutoSwitch !== 'false' // 默认开启
  autoSwitchInterval.value = savedInterval ? parseInt(savedInterval) : 30
  if (autoSwitch.value) {
    startAutoSwitch()
  }

  console.log('丰川初音bot 已启动')
})

onUnmounted(() => {
  stopAutoSwitch()
})
</script>

<style scoped>
.app-container {
  width: 100%;
  height: 100vh;
  position: relative;
  overflow: hidden;
}

.bg-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
}

[data-theme="light"] .bg-overlay {
  background: transparent;
}

/* 壁纸入口按钮 */
.wallpaper-toggle {
  position: fixed;
  top: 0.75rem;
  right: 0.75rem;
  z-index: 1001;
  width: 32px;
  height: 32px;
  border-radius: 0.375rem;
  background: var(--glass-bg);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border: 1px solid var(--glass-border);
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.wallpaper-toggle:hover {
  background: var(--bg-input);
  transform: scale(1.1);
}

/* 壁纸面板 */
.wallpaper-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 280px;
  height: 100vh;
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-left: 1px solid var(--glass-border);
  z-index: 1002;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid var(--glass-border);
}

.panel-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
}

.panel-close {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 1rem;
  padding: 0.25rem;
}

.panel-content {
  flex: 1;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* 操作按钮 */
.action-buttons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  padding: 0.75rem 0.5rem;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.75rem;
}

.action-item:hover {
  background: var(--bg-card);
  transform: translateY(-2px);
}

.action-item.active {
  color: #ef4444;
  border-color: #ef4444;
}

/* 自动切换 */
.auto-switch {
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  padding: 0.75rem;
}

.switch-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--text-primary);
  font-size: 0.8125rem;
}

.switch-toggle {
  width: 36px;
  height: 20px;
  border-radius: 10px;
  background: var(--border-color);
  border: none;
  cursor: pointer;
  position: relative;
  transition: background 0.2s;
}

.switch-toggle.active {
  background: #0ea5e9;
}

.switch-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: white;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: transform 0.2s;
}

.switch-toggle.active .switch-thumb {
  transform: translateX(16px);
}

.switch-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.375rem;
  margin-top: 0.75rem;
}

.switch-option {
  padding: 0.375rem;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 0.375rem;
  color: var(--text-secondary);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.switch-option:hover {
  border-color: #0ea5e9;
}

.switch-option.active {
  background: #0ea5e9;
  border-color: #0ea5e9;
  color: white;
}

/* 主题切换 */
.theme-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--text-primary);
  font-size: 0.8125rem;
}

.theme-buttons {
  display: flex;
  gap: 0.375rem;
}

.theme-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.375rem 0.625rem;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 0.375rem;
  color: var(--text-secondary);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.theme-btn:hover {
  border-color: #0ea5e9;
}

.theme-btn.active {
  background: #0ea5e9;
  border-color: #0ea5e9;
  color: white;
}

/* 收藏 */
.favorites-section {
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  overflow: hidden;
}

.favorites-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  color: var(--text-primary);
  font-size: 0.8125rem;
  cursor: pointer;
}

.favorites-header svg {
  transition: transform 0.2s;
}

.favorites-header svg.rotated {
  transform: rotate(180deg);
}

.favorites-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  padding: 0 0.75rem 0.75rem;
}

.favorite-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 0.375rem;
  overflow: hidden;
  cursor: pointer;
}

.favorite-preview {
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  transition: transform 0.2s;
}

.favorite-item:hover .favorite-preview {
  transform: scale(1.1);
}

.favorite-remove {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 18px;
  height: 18px;
  background: rgba(0, 0, 0, 0.6);
  border: none;
  border-radius: 50%;
  color: white;
  font-size: 0.625rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.favorite-item:hover .favorite-remove {
  opacity: 1;
}

.favorites-empty {
  padding: 0 0.75rem 0.75rem;
  color: var(--text-muted);
  font-size: 0.75rem;
  text-align: center;
}

.panel-footer {
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid var(--glass-border);
  color: var(--text-muted);
  font-size: 0.6875rem;
  text-align: center;
}

/* 面板动画 */
.panel-slide-enter-active,
.panel-slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.panel-slide-enter-from,
.panel-slide-leave-to {
  transform: translateX(100%);
}
</style>
