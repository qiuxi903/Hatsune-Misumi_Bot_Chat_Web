<template>
  <div class="login-container">
    <router-link to="/" class="back-home-btn">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <polyline points="9 22 9 12 15 12 15 22"></polyline>
      </svg>
      返回主页
    </router-link>
    <div class="login-card glass">
      <div class="login-header">
        <h1 class="login-title">欢迎回来</h1>
        <p class="login-subtitle">登录丰川初音bot</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div v-if="error" class="error-message">{{ error }}</div>

        <div class="form-group">
          <label class="form-label">用户名或邮箱</label>
          <input v-model="form.username" type="text" class="input-glass" placeholder="请输入用户名或邮箱" required autocomplete="username" />
        </div>

        <div class="form-group">
          <label class="form-label">密码</label>
          <div class="password-input">
            <input v-model="form.password" :type="showPassword ? 'text' : 'password'" class="input-glass" placeholder="请输入密码" required autocomplete="current-password" />
            <button type="button" class="password-toggle" @click="showPassword = !showPassword">
              <svg v-if="showPassword" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
              <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          </div>
        </div>

        <button type="submit" class="login-btn btn-primary" :disabled="loading">
          <span v-if="loading" class="loading-spinner"></span>
          <span v-else>登录</span>
        </button>
      </form>

      <div class="register-link">
        还没有账号？<router-link to="/register">立即注册</router-link>
      </div>
    </div>

    <div class="page-copyright">
      <p>© 2026 丰川初音bot by <a href="https://github.com/qiuxi903/Hatsune-Misumi_Bot_Chat_Web" target="_blank" rel="noopener">邱息</a></p>
      <p class="license-info">Licensed under <a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank" rel="noopener">GNU AGPLv3</a></p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const form = reactive({ username: '', password: '' })
const showPassword = ref(false)
const loading = ref(false)
const error = ref(null)

const handleLogin = async () => {
  loading.value = true
  error.value = null
  try {
    const result = await userStore.login({ username: form.username, password: form.password })
    if (result.success) {
      router.push(route.query.redirect || '/chat')
    } else {
      error.value = result.message
    }
  } catch (err) {
    error.value = '登录失败，请重试'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  position: relative;
}

.back-home-btn {
  position: absolute;
  top: 1rem;
  left: 1rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  color: var(--text-primary);
  text-decoration: none;
  font-size: 0.8125rem;
  transition: all 0.2s ease;
}

.back-home-btn:hover {
  background: var(--bg-input);
  transform: translateY(-1px);
}

.back-home-btn svg {
  width: 16px;
  height: 16px;
}

.login-card {
  width: 100%;
  max-width: 400px;
  padding: 2rem;
}

.login-header {
  text-align: center;
  margin-bottom: 2rem;
}

.login-title {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.login-subtitle {
  color: var(--text-secondary);
  font-size: 1rem;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.error-message {
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.5);
  color: #fca5a5;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  font-size: 0.875rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  color: var(--text-primary);
  font-size: 0.875rem;
  font-weight: 500;
}

.password-input {
  position: relative;
}

.password-toggle {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.125rem;
  opacity: 0.7;
}

.password-toggle:hover {
  opacity: 1;
}

.login-btn {
  width: 100%;
  padding: 1rem;
  font-size: 1rem;
  border-radius: 1rem;
}

.login-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.loading-spinner {
  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.register-link {
  text-align: center;
  margin-top: 1.5rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.register-link a {
  color: #0ea5e9;
  text-decoration: none;
  font-weight: 500;
}

.register-link a:hover {
  text-decoration: underline;
}

.page-copyright {
  position: absolute;
  bottom: 1.5rem;
  left: 0;
  right: 0;
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

@media (max-width: 480px) {
  .login-card { padding: 2rem 1.5rem; }
  .login-title { font-size: 1.75rem; }
}
</style>
