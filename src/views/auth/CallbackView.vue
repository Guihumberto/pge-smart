<template>
  <div class="callback-page">
    <div class="callback-card">
      <div v-if="status === 'processing'">
        <div class="spinner" />
        <p class="callback-text">Autenticando...</p>
      </div>

      <div v-else-if="status === 'error'">
        <div class="callback-icon callback-icon--err">✕</div>
        <h2 class="callback-title">Falha na autenticação</h2>
        <p class="callback-text">{{ errorMsg }}</p>
        <button class="btn-retry" @click="router.push('/auth/login')">
          Tentar novamente
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

const router    = useRouter()
const authStore = useAuthStore()

const status   = ref('processing')
const errorMsg = ref('')

const processed = ref(false)

// src/views/auth/CallbackView.vue
onMounted(async () => {
  if (processed.value) return
  processed.value = true

  try {
    const loggedUser = await authStore.handleCallback()
    console.log('callback user:', loggedUser)

    // Pequeno delay para garantir que o store atualizou
    await new Promise(r => setTimeout(r, 100))

    const prePath = sessionStorage.getItem('pre_login_path') ?? '/planos'
    sessionStorage.removeItem('pre_login_path')

    const inviteToken = sessionStorage.getItem('pending_invite_token')
    if (inviteToken) {
      router.replace('/convite/callback?from=oidc')
      return
    }
  

    router.replace('/')
  } catch (err) {
    console.error('Callback error:', err)
    status.value   = 'error'
    errorMsg.value = err.message ?? 'Erro desconhecido'
  }
})
</script>

<style scoped>
.callback-page {
  min-height: 100vh;
  background: #f8f7f4;
  display: flex; align-items: center; justify-content: center;
  font-family: 'DM Sans', sans-serif;
}
.callback-card {
  background: #fff; border: 1px solid #ebe9e4;
  border-radius: 20px; padding: 48px 36px;
  text-align: center; width: 100%; max-width: 360px;
  display: flex; flex-direction: column;
  align-items: center; gap: 16px;
}
.callback-icon {
  width: 52px; height: 52px; border-radius: 50%;
  font-size: 22px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}
.callback-icon--err { background: #FCEBEB; color: #A32D2D; }
.callback-title { font-size: 18px; font-weight: 700; color: #1a1a2e; margin: 0; }
.callback-text  { font-size: 13px; color: #888; margin: 0; }
.btn-retry {
  font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600;
  background: #1a1a2e; color: #fff; border: none;
  border-radius: 8px; padding: 10px 20px; cursor: pointer;
}
.spinner {
  width: 36px; height: 36px; margin: 0 auto 16px;
  border: 3px solid #f0efea; border-top-color: #534AB7;
  border-radius: 50%; animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>