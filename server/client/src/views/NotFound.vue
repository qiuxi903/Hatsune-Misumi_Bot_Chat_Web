<template>
  <div class="not-found-container">
    <div class="not-found-content glass">
      <div class="error-code">404</div>
      <h1 class="error-title">页面未找到</h1>
      <p class="error-description">抱歉，您访问的页面不存在或已被移除。</p>
      <div class="error-actions">
        <router-link to="/" class="btn-primary">返回首页</router-link>
        <router-link to="/chat" class="btn-secondary">开始聊天</router-link>
      </div>
    </div>
    <div class="page-copyright">
      <p>© 2026 <a href="https://github.com/qiuxi903/Hatsune-Misumi_Bot_Chat_Web" target="_blank" rel="noopener">丰川初音bot</a> by <a href="https://www.hutaomu.cn" target="_blank" rel="noopener">邱息</a></p>
      <p class="license-info">Licensed under <a href="https://www.gnu.org/licenses/agpl-3.0.html" target="_blank" rel="noopener">GNU AGPLv3</a></p>
    </div>
  </div>
</template>

<style scoped>
.not-found-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.not-found-content {
  text-align: center;
  padding: 3rem;
  max-width: 400px;
}

.error-code {
  font-size: 6rem;
  font-weight: 800;
  color: var(--text-muted);
  line-height: 1;
  margin-bottom: 1rem;
}

.error-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.75rem;
}

.error-description {
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.6;
  margin-bottom: 1.5rem;
}

.error-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
}

.page-copyright {
  position: absolute;
  bottom: 1.5rem;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.page-copyright a {
  color: var(--text-primary);
  text-decoration: none;
  transition: color 0.15s ease;
}

.page-copyright a:hover {
  color: #0ea5e9;
}

.page-copyright .license-info {
  margin-top: 0.25rem;
  font-size: 0.8125rem;
}

.page-copyright .license-info a {
  color: var(--text-primary);
}

.page-copyright .license-info a:hover {
  color: #a855f7;
}

@media (max-width: 480px) {
  .not-found-content { padding: 2rem 1.5rem; }
  .error-code { font-size: 4rem; }
  .error-actions { flex-direction: column; }
  .btn-primary, .btn-secondary { width: 100%; text-align: center; }
}
</style>
