<template>
  <div class="callback-page">
    <div class="callback-card">
      <div v-if="status === 'processing'">
        <div class="spinner" />
        <p class="callback-text">Confirmando seu acesso...</p>
      </div>

      <div v-else-if="status === 'success'">
        <div class="callback-icon callback-icon--ok">✓</div>
        <h2 class="callback-title">Tudo certo!</h2>
        <p class="callback-text">
          Você foi matriculado em <strong>{{ planTitle }}</strong>.
          Redirecionando para a plataforma...
        </p>
      </div>

      <div v-else-if="status === 'error'">
        <div class="callback-icon callback-icon--err">✕</div>
        <h2 class="callback-title">Algo deu errado</h2>
        <p class="callback-text">{{ errorMsg }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useEnrollmentStore } from '@/stores/useEnrollmentStore'
import { useAuthStore } from '@/stores/auth.store'

const enrollmentStore = useEnrollmentStore()
const authStore       = useAuthStore()

const status    = ref('processing')
const planTitle = ref('')
const errorMsg  = ref('')

onMounted(async () => {
  try {
    const token  = sessionStorage.getItem('pending_invite_token')
    const planId = sessionStorage.getItem('pending_invite_plan')

    if (!token || !planId) {
      throw new Error('Dados do convite não encontrados. Tente o link novamente.')
    }

    // 1. Processa o callback OIDC (troca code pelo access_token)
    await authStore.handleCallback()

    // 2. Matricula o aluno via API
    const enrollment = await enrollmentStore.enrollViaLink(token)
    planTitle.value  = enrollment.planId

    // 3. Limpa sessionStorage
    sessionStorage.removeItem('pending_invite_token')
    sessionStorage.removeItem('pending_invite_plan')

    status.value = 'success'

    // 4. Redireciona para o app do aluno
    setTimeout(() => {
      window.location.href = `${import.meta.env.VITE_STUDENT_APP_URL}?enrolled=${enrollment.planId}`
    }, 2000)

  } catch (err) {
    status.value = 'error'
    errorMsg.value = err.message
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
  text-align: center; width: 100%; max-width: 380px;
  display: flex; flex-direction: column;
  align-items: center; gap: 16px;
}
.callback-icon {
  width: 52px; height: 52px; border-radius: 50%;
  font-size: 22px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}
.callback-icon--ok  { background: #EAF3DE; color: #3B6D11; }
.callback-icon--err { background: #FCEBEB; color: #A32D2D; }
.callback-title { font-size: 18px; font-weight: 700; color: #1a1a2e; margin: 0; }
.callback-text  { font-size: 13px; color: #888; line-height: 1.6; margin: 0; }
.spinner {
  width: 36px; height: 36px;
  border: 3px solid #f0efea; border-top-color: #534AB7;
  border-radius: 50%; animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>