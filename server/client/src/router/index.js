import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false, guestOnly: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/Register.vue'),
    meta: { requiresAuth: false, guestOnly: true }
  },
  {
    path: '/chat',
    name: 'Chat',
    component: () => import('@/views/Chat.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/chat/:sessionId',
    name: 'ChatSession',
    component: () => import('@/views/Chat.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/Profile.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore()

  // 如果有token但用户信息还没加载，先尝试恢复
  if (userStore.token && !userStore.user) {
    try {
      await userStore.init()
    } catch (err) {
      console.error('恢复用户状态失败:', err)
    }
  }

  const isAuthenticated = userStore.isAuthenticated

  // 需要登录的页面
  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
    return
  }

  // 仅限访客的页面（已登录用户不能访问）
  if (to.meta.guestOnly && isAuthenticated) {
    next({ name: 'Chat' })
    return
  }

  next()
})

export default router
