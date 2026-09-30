<script setup>
</script>

<template>
  <nav class="top-nav">
    <RouterLink to="/calculator">计算器</RouterLink>
    <RouterLink to="/paldex">图鉴</RouterLink>
  </nav>

  <main class="page">
    <RouterView />
  </main>
</template>

<style scoped>
.top-nav {
  display: flex;
  gap: 16px;
  padding: 16px 24px;
  background: #1a1a1e;
  border-bottom: 1px solid #333;
}
.top-nav a {
  color: #ccc;
  text-decoration: none;
  font-size: 0.95rem;
}
.top-nav a.router-link-active {
  color: #4a9eff;
}
.page {
  padding: 24px;
}
</style>