<template>
  <div class="register-container">
    <router-link to="/" class="back-home-btn">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <polyline points="9 22 9 12 15 12 15 22"></polyline>
      </svg>
      返回主页
    </router-link>
    <div class="register-card glass">
      <div class="register-header">
        <div class="register-avatar">
          <img src="https://q.qlogo.cn/headimg_dl?dst_uin=1712833352&spec=640&img_type=jpg" alt="丰川初音" />
        </div>
        <h1>注册</h1>
        <p>创建丰川初音bot账号</p>
      </div>

      <form @submit.prevent="handleRegister" class="register-form">
        <div v-if="error" class="error-msg">{{ error }}</div>

        <div class="form-group">
          <label for="username">用户名</label>
          <input id="username" v-model="form.username" type="text" class="input-glass" placeholder="请输入用户名" required />
        </div>

        <div class="form-group">
          <label for="email">邮箱</label>
          <input id="email" v-model="form.email" type="email" class="input-glass" placeholder="请输入邮箱" required />
        </div>

        <div class="form-group">
          <label for="qq_number">QQ号 <span class="optional">可选</span></label>
          <input id="qq_number" v-model="form.qq_number" type="text" class="input-glass" placeholder="用于插件功能" />
        </div>

        <div class="form-group">
          <label for="password">密码</label>
          <input id="password" v-model="form.password" :type="showPassword ? 'text' : 'password'" class="input-glass" placeholder="至少6位" required minlength="6" />
        </div>

        <div class="form-group">
          <label for="confirmPassword">确认密码</label>
          <input id="confirmPassword" v-model="form.confirmPassword" :type="showPassword ? 'text' : 'password'" class="input-glass" placeholder="请再次输入密码" required />
          <span v-if="passwordMismatch" class="error-text">两次输入的密码不一致</span>
        </div>

        <div class="form-check">
          <label class="check-label">
            <input v-model="form.agree" type="checkbox" required />
            <span>我已阅读并同意用户协议和隐私政策</span>
          </label>
        </div>

        <button type="submit" class="btn-primary register-btn" :disabled="loading || !form.agree || passwordMismatch">
          <span v-if="loading" class="spinner"></span>
          <span v-else>注册</span>
        </button>
      </form>

      <div class="login-link">
        已有账号？<router-link to="/login">立即登录</router-link>
      </div>
    </div>

    <div class="page-copyright">
      <p>© 2026 丰川初音bot by <a href="https://github.com/qiuxi903/Hatsune-Misumi_Bot_Chat_Web" target="_blank" rel="noopener">邱息</a></p>
      <p class="license-info">Licensed under <a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank" rel="noopener">GNU AGPLv3</a></p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const form = reactive({
  username: '',
  email: '',
  qq_number: '',
  password: '',
  confirmPassword: '',
  agree: false
})

const showPassword = ref(false)
const loading = ref(false)
const error = ref(null)

const passwordMismatch = computed(() =>
  form.confirmPassword && form.password !== form.confirmPassword
)

const handleRegister = async () => {
  if (form.password !== form.confirmPassword) {
    error.value = '两次输入的密码不一致'
    return
  }
  if (!form.agree) {
    error.value = '请同意用户协议和隐私政策'
    return
  }

  loading.value = true
  error.value = null

  try {
    const result = await userStore.register({
      username: form.username,
      email: form.email,
      password: form.password,
      qq_number: form.qq_number || undefined
    })

    result.success ? router.push('/chat') : (error.value = result.message)
  } catch (err) {
    error.value = '注册失败，请重试'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.register-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  overflow-y: auto;
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

.register-card {
  width: 100%;
  max-width: 420px;
  padding: 2.5rem;
}

.register-header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.register-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  overflow: hidden;
  margin: 0 auto 1rem;
  border: 2px solid var(--border-color);
}

.register-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.register-header h1 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.375rem;
}

.register-header p {
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.register-form {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.error-msg {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #fca5a5;
  padding: 0.625rem 0.875rem;
  border-radius: 0.5rem;
  font-size: 0.8rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.form-group label {
  color: var(--text-primary);
  font-size: 0.8rem;
  font-weight: 500;
}

.optional {
  font-size: 0.7rem;
  color: var(--text-muted);
  font-weight: 400;
}

.error-text {
  color: #fca5a5;
  font-size: 0.75rem;
}

.form-check {
  margin-top: -0.25rem;
}

.check-label {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.75rem;
  cursor: pointer;
  line-height: 1.4;
}

.check-label input[type="checkbox"] {
  accent-color: var(--primary);
  margin-top: 0.125rem;
}

.register-btn {
  width: 100%;
  padding: 0.75rem;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

.register-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.login-link {
  text-align: center;
  margin-top: 1.25rem;
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.login-link a {
  color: var(--primary);
  text-decoration: none;
  font-weight: 500;
  margin-left: 0.25rem;
}

.login-link a:hover {
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
  .register-card {
    padding: 1.5rem;
  }
}
</style>
