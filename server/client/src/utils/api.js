import axios from 'axios'

// 创建axios实例
const api = axios.create({
  baseURL: '',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 从本地存储获取token
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    // 如果是 FormData，删除默认的 Content-Type，让浏览器自动设置
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // 处理401错误（未授权）
    if (error.response?.status === 401) {
      // 清除本地存储的token
      localStorage.removeItem('token')
      // 如果不在登录页面，重定向到登录页面
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
