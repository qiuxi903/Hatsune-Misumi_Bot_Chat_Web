<template>
  <div class="profile-container">
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

    <!-- 个人资料卡片 -->
    <div class="profile-card glass">
      <div class="avatar-section">
        <div class="avatar-wrapper" @click="triggerAvatarUpload">
          <img v-if="user?.avatar" :src="user.avatar" :alt="user.nickname" class="avatar-image" />
          <div v-else class="avatar-placeholder">{{ (user?.nickname || user?.username || '?')[0].toUpperCase() }}</div>
          <div class="avatar-overlay"><span>📷 更换头像</span></div>
        </div>
        <input type="file" ref="avatarInput" @change="handleAvatarUpload" accept="image/*" style="display:none" />
      </div>

      <div class="user-info">
        <h1 class="user-name">{{ user?.nickname || user?.username }}</h1>
        <p class="user-email">{{ user?.email }}</p>
      </div>

      <form @submit.prevent="handleUpdateProfile" class="profile-form">
        <h2 class="form-title">编辑资料</h2>
        <div class="form-group">
          <label class="form-label">昵称</label>
          <input v-model="form.nickname" type="text" class="input-glass" placeholder="请输入昵称" />
        </div>
        <div class="form-group">
          <label class="form-label">QQ号</label>
          <input v-model="form.qq_number" type="text" class="input-glass" placeholder="请输入QQ号" />
        </div>
        <div class="form-group">
          <label class="form-label">个人简介</label>
          <textarea v-model="form.bio" class="input-glass" placeholder="介绍一下自己..." rows="3"></textarea>
        </div>
        <button type="submit" class="btn-primary" :disabled="loading" style="width:100%">
          {{ loading ? '保存中...' : '保存修改' }}
        </button>
      </form>

      <form @submit.prevent="handleChangePassword" class="password-form">
        <h2 class="form-title">修改密码</h2>
        <div class="form-group">
          <label class="form-label">当前密码</label>
          <input v-model="passwordForm.currentPassword" type="password" class="input-glass" placeholder="请输入当前密码" required />
        </div>
        <div class="form-group">
          <label class="form-label">新密码</label>
          <input v-model="passwordForm.newPassword" type="password" class="input-glass" placeholder="请输入新密码（至少6位）" required minlength="6" />
        </div>
        <div class="form-group">
          <label class="form-label">确认新密码</label>
          <input v-model="passwordForm.confirmNewPassword" type="password" class="input-glass" placeholder="请再次输入新密码" required />
          <span v-if="passwordMismatch" class="error-text">两次输入的密码不一致</span>
        </div>
        <button type="submit" class="btn-secondary" :disabled="passwordLoading || passwordMismatch" style="width:100%">
          {{ passwordLoading ? '修改中...' : '修改密码' }}
        </button>
      </form>

      <div class="logout-section">
        <button @click="handleLogout" class="logout-btn">退出登录</button>
      </div>
    </div>

    <div class="page-copyright">
      <p>© 2026 丰川初音bot by <a href="https://github.com/qiuxi903/Hatsune-Misumi_Bot_Chat_Web" target="_blank" rel="noopener">邱息</a></p>
      <p class="license-info">Licensed under <a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank" rel="noopener">GNU AGPLv3</a></p>
    </div>

    <div v-if="successMessage" class="success-toast">{{ successMessage }}</div>
    <div v-if="errorMessage" class="error-toast">{{ errorMessage }}</div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const user = computed(() => userStore.userInfo)
const loading = ref(false)
const passwordLoading = ref(false)
const successMessage = ref('')
const errorMessage = ref('')
const avatarInput = ref(null)

const form = reactive({ nickname: '', bio: '', qq_number: '' })
const passwordForm = reactive({ currentPassword: '', newPassword: '', confirmNewPassword: '' })

const passwordMismatch = computed(() =>
  passwordForm.confirmNewPassword && passwordForm.newPassword !== passwordForm.confirmNewPassword
)

onMounted(() => {
  if (user.value) {
    form.nickname = user.value.nickname || ''
    form.bio = user.value.bio || ''
    form.qq_number = user.value.qq_number || ''
  }
})

const triggerAvatarUpload = () => avatarInput.value?.click()

const handleAvatarUpload = async (e) => {
  const file = e.target.files[0]
  if (!file) return
  const result = await userStore.uploadAvatar(file)
  result.success ? showSuccess('头像更新成功') : showError(result.message || '头像上传失败')
  e.target.value = ''
}

const handleUpdateProfile = async () => {
  loading.value = true
  const result = await userStore.updateProfile({ nickname: form.nickname, bio: form.bio, qq_number: form.qq_number })
  result.success ? showSuccess('资料更新成功') : showError(result.message || '更新失败')
  loading.value = false
}

const handleChangePassword = async () => {
  if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
    showError('两次输入的密码不一致')
    return
  }
  passwordLoading.value = true
  const result = await userStore.changePassword({
    currentPassword: passwordForm.currentPassword,
    newPassword: passwordForm.newPassword
  })
  if (result.success) {
    showSuccess('密码修改成功')
    passwordForm.currentPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmNewPassword = ''
  } else {
    showError(result.message || '密码修改失败')
  }
  passwordLoading.value = false
}

const handleLogout = () => {
  if (confirm('确定要退出登录吗？')) {
    userStore.logout()
    router.push('/login')
  }
}

const showSuccess = (msg) => { successMessage.value = msg; setTimeout(() => successMessage.value = '', 3000) }
const showError = (msg) => { errorMessage.value = msg; setTimeout(() => errorMessage.value = '', 3000) }
</script>

<style scoped>
.profile-container {
  height: 100vh;
  overflow-y: auto;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.back-buttons {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 2rem;
  align-self: flex-start;
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

.profile-card {
  width: 100%;
  max-width: 500px;
  padding: 2.5rem;
}

.avatar-section {
  display: flex;
  justify-content: center;
  margin-bottom: 2rem;
}

.avatar-wrapper {
  position: relative;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  cursor: pointer;
  border: 4px solid var(--border-color);
  transition: border-color 0.3s;
}

.avatar-wrapper:hover {
  border-color: #0ea5e9;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #0ea5e9, #a855f7);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  font-weight: 700;
  color: white;
}

.avatar-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
  color: white;
  font-size: 0.8rem;
}

.avatar-wrapper:hover .avatar-overlay {
  opacity: 1;
}

.user-info {
  text-align: center;
  margin-bottom: 2rem;
}

.user-name {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.user-email {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.profile-form,
.password-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding-top: 2rem;
  border-top: 1px solid var(--border-color);
  margin-bottom: 2rem;
}

.form-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
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

textarea.input-glass {
  resize: vertical;
  min-height: 80px;
}

.error-text {
  color: #fca5a5;
  font-size: 0.75rem;
}

.btn-primary {
  width: 100%;
  padding: 1rem;
  border-radius: 1rem;
}

.btn-secondary {
  width: 100%;
  padding: 1rem;
  border-radius: 1rem;
}

.btn-primary:disabled,
.btn-secondary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.logout-section {
  text-align: center;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.logout-btn {
  background: none;
  border: none;
  color: #ef4444;
  font-size: 0.875rem;
  cursor: pointer;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  transition: background 0.3s;
}

.logout-btn:hover {
  background: rgba(239, 68, 68, 0.1);
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

.success-toast,
.error-toast {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 1rem 2rem;
  border-radius: 1rem;
  font-size: 0.875rem;
  z-index: 1000;
  animation: slideUp 0.3s ease;
}

.success-toast { background: rgba(16, 185, 129, 0.9); color: white; }
.error-toast { background: rgba(239, 68, 68, 0.9); color: white; }

@keyframes slideUp {
  from { opacity: 0; transform: translateX(-50%) translateY(20px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

@media (max-width: 480px) {
  .profile-container { padding: 1rem; }
  .profile-card { padding: 1.5rem; }
  .avatar-wrapper { width: 100px; height: 100px; }
  .avatar-placeholder { font-size: 2.5rem; }
}
</style>
