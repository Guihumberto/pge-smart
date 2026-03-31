<template>
  <div class="callback-page">
    <div class="callback-card">
      <div class="spinner" />
      <p class="callback-text">Saindo...</p>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { oidcClient } from '@/auth/oidcConfig'
import { useAuthStore } from '@/stores/auth.store'

const router    = useRouter()
const authStore = useAuthStore()

onMounted(async () => {
  try {
    await oidcClient.signoutRedirectCallback()
  } catch {
    // ignora erros no logout
  } finally {
    authStore.user        = null
    authStore.accessToken = null
    localStorage.removeItem('access_token')
    router.push('/auth/login')
  }
})
</script>

<style scoped>
.callback-page {
  min-height: 100vh; background: #f8f7f4;
  display: flex; align-items: center; justify-content: center;
  font-family: 'DM Sans', sans-serif;
}
.callback-card {
  background: #fff; border: 1px solid #ebe9e4;
  border-radius: 20px; padding: 48px 36px;
  text-align: center; display: flex;
  flex-direction: column; align-items: center; gap: 16px;
}
.callback-text { font-size: 13px; color: #888; margin: 0; }
.spinner {
  width: 36px; height: 36px;
  border: 3px solid #f0efea; border-top-color: #534AB7;
  border-radius: 50%; animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>