<template>
  <div class="home-container">
    <!-- 导航栏 -->
    <nav class="glass-nav">
      <div class="nav-content">
        <div class="logo">
          <img class="logo-avatar" src="https://q.qlogo.cn/headimg_dl?dst_uin=1712833352&spec=640&img_type=jpg" alt="丰川初音bot" />
          <span class="logo-text">丰川初音bot</span>
        </div>
        <div class="nav-links">
          <router-link v-if="!isAuthenticated" to="/login" class="nav-link">登录</router-link>
          <router-link v-if="!isAuthenticated" to="/register" class="nav-link btn-register">注册</router-link>
          <router-link v-if="isAuthenticated" to="/chat" class="nav-link btn-chat">开始聊天</router-link>
        </div>
      </div>
    </nav>

    <!-- 主内容 -->
    <main class="hero-section">
      <div class="hero-content">
        <h1 class="hero-title">
          <span class="gradient-text">丰川初音bot</span>
        </h1>
        <p class="hero-subtitle">Ave Mujica / sumimi</p>
        <div class="hero-actions">
          <router-link v-if="isAuthenticated" to="/chat" class="btn-primary">开始对话</router-link>
          <template v-else>
            <router-link to="/register" class="btn-primary">立即注册</router-link>
            <router-link to="/login" class="btn-secondary-text">已有账号？立即登录</router-link>
          </template>
        </div>
      </div>

      <!-- 装饰性聊天预览 -->
      <div class="chat-preview glass">
        <div class="preview-header">
          <img class="preview-avatar-img" src="https://q.qlogo.cn/headimg_dl?dst_uin=1712833352&spec=640&img_type=jpg" alt="丰川初音bot" />
          <div class="preview-info">
            <div class="preview-name">丰川初音bot</div>
            <div class="preview-status">在线</div>
          </div>
        </div>
        <div class="preview-messages">
          <div class="preview-message user">
            <div class="message-content">你好</div>
          </div>
          <div class="preview-message assistant">
            <div class="message-content">こんにちは。

私は三角初華です。

Ave Mujicaでボーカルとギターを担当しています。

sumimiとしても活動しているけど……あなたは、私のことを知っていたの？</div>
          </div>
        </div>
      </div>
    </main>

    <!-- 页脚 -->
    <footer class="glass-footer">
      <p class="footer-copyright">© 2026 丰川初音bot by <a href="https://github.com/qiuxi903/Hatsune-Misumi_Bot_Chat_Web" target="_blank" rel="noopener">邱息</a></p>
        <p class="license-info">Licensed under <a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank" rel="noopener">GNU AGPLv3</a></p>
      <p class="footer-disclaimer">⚠️ AI生成内容可能有误，请勿当真，请自行核实</p>
      <p class="footer-disclaimer">本项目为粉丝二创作品，与《BanG Dream!》原作及其版权方无关</p>
    </footer>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const isAuthenticated = computed(() => userStore.isAuthenticated)
</script>

<style scoped>
.home-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

/* 导航栏 */
.glass-nav {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

[data-theme="light"] .glass-nav {
  background: rgba(255, 255, 255, 0.4);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.nav-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.logo-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}

.logo-text {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
}

.nav-links {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.nav-link {
  color: var(--text-primary);
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  transition: all 0.3s ease;
}

.nav-link:hover {
  background: rgba(255, 255, 255, 0.2);
}

[data-theme="light"] .nav-link:hover {
  background: rgba(0, 0, 0, 0.06);
}

.btn-register {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

[data-theme="light"] .btn-register {
  background: rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.btn-chat {
  background: linear-gradient(135deg, #0ea5e9, #06b6d4);
  color: white;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(14, 165, 233, 0.3);
}

.btn-chat:hover {
  background: linear-gradient(135deg, #0284c7, #0891b2);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.4);
}

/* 主内容 */
.hero-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6rem 2rem 2rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  gap: 4rem;
  animation: fadeIn 0.6s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.hero-content {
  flex: 1;
  animation: slideUp 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.hero-title {
  font-size: 3rem;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.3;
  margin-bottom: 1.5rem;
  letter-spacing: 0.05em;
  animation: slideUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.1s both;
}

.gradient-text {
  color: var(--text-primary);
}

[data-theme="light"] .gradient-text {
  color: #1f2937;
}

.hero-description {
  font-size: 1.25rem;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 2rem;
  max-width: 500px;
}

.hero-actions {
  display: flex;
  gap: 1.25rem;
  align-items: center;
  margin-bottom: 2rem;
}

.btn-secondary-text {
  color: var(--text-muted);
  text-decoration: none;
  font-size: 0.8125rem;
  transition: all 0.2s ease;
  padding: 0.5rem 0;
  border-bottom: 1px solid transparent;
}

.btn-secondary-text:hover {
  color: var(--text-primary);
  border-bottom-color: var(--text-primary);
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.875rem 2rem;
  background: linear-gradient(135deg, #0ea5e9, #06b6d4);
  color: white;
  font-weight: 600;
  font-size: 0.9375rem;
  border-radius: 0.875rem;
  text-decoration: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 14px rgba(14, 165, 233, 0.35);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(14, 165, 233, 0.45);
}

.btn-primary:active {
  transform: translateY(0);
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 1rem 2rem;
  background: rgba(255, 255, 255, 0.15);
  color: white;
  font-weight: 600;
  border-radius: 1rem;
  text-decoration: none;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(10px);
}

[data-theme="light"] .btn-secondary {
  background: rgba(0, 0, 0, 0.06);
  color: #1f2937;
  border-color: rgba(0, 0, 0, 0.1);
}

[data-theme="light"] .btn-secondary:hover {
  background: rgba(0, 0, 0, 0.1);
}

[data-theme="light"] .btn-secondary:hover {
  background: rgba(0, 0, 0, 0.1);
}

/* 特性网格 */
.hero-subtitle {
  color: var(--text-muted);
  font-size: 1rem;
  margin-bottom: 1.5rem;
}

/* 聊天预览 */
.chat-preview {
  width: 350px;
  padding: 0;
  overflow: hidden;
  flex-shrink: 0;
  animation: slideUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.3s both;
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: rgba(255, 255, 255, 0.1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

[data-theme="light"] .preview-header {
  background: rgba(0, 0, 0, 0.04);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.preview-avatar-img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.preview-name {
  color: var(--text-primary);
  font-weight: 600;
}

.preview-status {
  color: #4ade80;
  font-size: 0.75rem;
}

.preview-messages {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-height: 300px;
}

.preview-message {
  max-width: 80%;
}

.preview-message.user {
  align-self: flex-end;
}

.preview-message.assistant {
  align-self: flex-start;
}

.message-content {
  padding: 0.75rem 1rem;
  border-radius: 1rem;
  font-size: 0.875rem;
  line-height: 1.5;
}

.preview-message.user .message-content {
  background: #0ea5e9;
  color: white;
  border-bottom-right-radius: 0.25rem;
}

.preview-message.assistant .message-content {
  background: rgba(255, 255, 255, 0.15);
  color: var(--text-primary);
  border-bottom-left-radius: 0.25rem;
}

[data-theme="light"] .preview-message.assistant .message-content {
  background: rgba(0, 0, 0, 0.06);
  color: #1f2937;
}

.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 0.5rem 0;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  background: var(--text-muted);
  border-radius: 50%;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
.typing-indicator span:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.2); opacity: 1; }
}

/* 页脚 */
.glass-footer {
  text-align: center;
  padding: 1.25rem 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

[data-theme="light"] .glass-footer {
  background: rgba(0, 0, 0, 0.03);
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.footer-copyright {
  color: var(--text-muted);
  font-size: 0.8125rem;
  margin-bottom: 0.375rem;
}

.footer-copyright a {
  color: var(--text-secondary);
  text-decoration: none;
  transition: color 0.15s ease;
}

.footer-copyright a:hover {
  color: var(--text-primary);
}

.footer-disclaimer {
  color: #f59e0b;
  font-size: 0.75rem;
  font-weight: 500;
  margin-top: 0.25rem;
  letter-spacing: 0.02em;
}

.license-info {
  color: var(--text-muted);
  font-size: 0.6875rem;
  margin-top: 0.25rem;
}

.license-info a {
  color: var(--text-secondary);
  text-decoration: none;
  transition: color 0.15s ease;
}

.license-info a:hover {
  color: var(--text-primary);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .hero-section {
    flex-direction: column;
    padding: 5rem 1rem 2rem;
    gap: 2rem;
  }

  .hero-title {
    font-size: 2.5rem;
  }

  .hero-actions {
    flex-direction: column;
  }

  .chat-preview {
    width: 100%;
    max-width: 350px;
  }
}

@media (max-width: 480px) {
  .nav-content {
    padding: 0.75rem 1rem;
  }

  .hero-section {
    padding: 4rem 1rem 1.5rem;
  }

  .hero-title {
    font-size: 2rem;
  }

  .hero-description {
    font-size: 1rem;
  }

  .hero-actions {
    max-width: 300px;
  }

  .chat-preview {
    border-radius: 0.75rem;
  }
}
</style>
