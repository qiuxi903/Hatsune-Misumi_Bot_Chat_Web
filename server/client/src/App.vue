<template>
  <div class="app-container">
    <!-- 动态背景 -->
    <div class="dynamic-background" :class="{ loaded: bgLoaded }" :style="{ '--bg-image': `url(${bgImage})` }">
      <div class="bg-overlay"></div>
    </div>

    <!-- 全局主题切换按钮 -->
    <button class="global-theme-toggle" @click="toggleTheme" :title="isDark ? '切换亮色' : '切换暗色'">
      <svg v-if="isDark" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
      </svg>
      <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
      </svg>
    </button>

    <!-- 主内容 -->
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const bgImage = ref('')
const bgLoaded = ref(false)
const isDark = ref(true)

// 加载随机背景图片
const loadBackground = () => {
  const img = new Image()
  img.onload = () => {
    bgImage.value = img.src
    bgLoaded.value = true
  }
  img.onerror = () => {
    bgLoaded.value = false
  }
  img.src = 'https://www.loliapi.com/acg/'
}

// 主题切换
const toggleTheme = () => {
  isDark.value = !isDark.value
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
  applyTheme()
}

const applyTheme = () => {
  document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light')
}

onMounted(async () => {
  loadBackground()
  // 初始化主题
  const saved = localStorage.getItem('theme')
  isDark.value = saved ? saved === 'dark' : true
  applyTheme()
  // 恢复用户登录状态
  await userStore.init()
  console.log('丰川初音bot 已启动')
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

.global-theme-toggle {
  position: fixed;
  top: 0.75rem;
  right: 0.75rem;
  z-index: 1001;
  width: 28px;
  height: 28px;
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

.global-theme-toggle:hover {
  background: var(--bg-input);
  transform: scale(1.1) rotate(15deg);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.global-theme-toggle:active {
  transform: scale(0.9) rotate(-15deg);
}

.global-theme-toggle svg {
  transition: transform 0.3s ease;
}

.global-theme-toggle:hover svg {
  transform: rotate(-15deg);
}
</style>
