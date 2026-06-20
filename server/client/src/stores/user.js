import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/utils/api'

export const useUserStore = defineStore('user', () => {
  // 状态
  const user = ref(null)
  const token = ref(localStorage.getItem('token') || null)
  const loading = ref(false)
  const error = ref(null)

  // 计算属性
  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const userInfo = computed(() => user.value)

  // 初始化 - 从本地存储恢复用户信息
  const init = async () => {
    if (token.value) {
      try {
        api.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
        const response = await api.get('/api/user/profile')
        user.value = response.data.user
      } catch (err) {
        console.error('恢复用户信息失败:', err)
        logout()
      }
    }
  }

  // 注册
  const register = async (userData) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.post('/api/auth/register', userData)
      const { token: newToken, user: newUser } = response.data
      token.value = newToken
      user.value = newUser
      localStorage.setItem('token', newToken)
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
      return { success: true }
    } catch (err) {
      error.value = err.response?.data?.message || '注册失败'
      return { success: false, message: error.value }
    } finally {
      loading.value = false
    }
  }

  // 登录
  const login = async (credentials) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.post('/api/auth/login', credentials)
      const { token: newToken, user: newUser } = response.data
      token.value = newToken
      user.value = newUser
      localStorage.setItem('token', newToken)
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
      return { success: true }
    } catch (err) {
      error.value = err.response?.data?.message || '登录失败'
      return { success: false, message: error.value }
    } finally {
      loading.value = false
    }
  }

  // 登出
  const logout = () => {
    user.value = null
    token.value = null
    localStorage.removeItem('token')
    delete api.defaults.headers.common['Authorization']
  }

  // 更新用户信息
  const updateProfile = async (profileData) => {
    loading.value = true
    error.value = null
    try {
      const response = await api.put('/api/user/profile', profileData)
      user.value = response.data.user
      return { success: true }
    } catch (err) {
      error.value = err.response?.data?.message || '更新失败'
      return { success: false, message: error.value }
    } finally {
      loading.value = false
    }
  }

  // 上传头像
  const uploadAvatar = async (file) => {
    loading.value = true
    error.value = null
    try {
      const formData = new FormData()
      formData.append('avatar', file)
      const response = await api.post('/api/user/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      user.value = { ...user.value, avatar: response.data.avatar }
      return { success: true, avatar: response.data.avatar }
    } catch (err) {
      error.value = err.response?.data?.message || '上传失败'
      return { success: false, message: error.value }
    } finally {
      loading.value = false
    }
  }

  // 修改密码
  const changePassword = async (passwordData) => {
    loading.value = true
    error.value = null
    try {
      await api.put('/api/user/password', passwordData)
      return { success: true }
    } catch (err) {
      error.value = err.response?.data?.message || '修改失败'
      return { success: false, message: error.value }
    } finally {
      loading.value = false
    }
  }

  return {
    user,
    token,
    loading,
    error,
    isAuthenticated,
    userInfo,
    init,
    register,
    login,
    logout,
    updateProfile,
    uploadAvatar,
    changePassword
  }
})
