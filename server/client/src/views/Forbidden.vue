<template>
  <div class="forbidden-container">
    <div class="forbidden-content glass">
      <div class="error-code">403</div>
      <h1 class="error-title">无权访问</h1>
      <p class="error-description">抱歉，您没有权限访问此页面。</p>
      <div class="error-actions">
        <router-link to="/chat" class="btn-primary">返回聊天</router-link>
        <router-link to="/" class="btn-secondary-text">返回首页</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.forbidden-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.forbidden-content {
  text-align: center;
  padding: 3rem;
  max-width: 400px;
}

.error-code {
  font-size: 6rem;
  font-weight: 800;
  color: #f59e0b;
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

.btn-primary {
  padding: 0.625rem 1.25rem;
  background: linear-gradient(135deg, #0ea5e9, #06b6d4);
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.4);
}

.btn-secondary-text {
  padding: 0.625rem 1.25rem;
  color: var(--text-secondary);
  font-size: 0.875rem;
  text-decoration: none;
  transition: color 0.2s;
}

.btn-secondary-text:hover {
  color: var(--text-primary);
}
</style>
