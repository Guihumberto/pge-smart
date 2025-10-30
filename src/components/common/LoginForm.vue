<template>
  <v-card class="login-card pa-6" elevation="4">
    <v-card-title class="text-h5 text-center mb-4">
      Entrar
    </v-card-title>
    <v-form @submit.prevent="handleLogin">
      <v-text-field
        v-model="credentials.username"
        label="Usuário"
        prepend-inner-icon="mdi-account"
        variant="outlined"
        class="mb-4"
        required
      />
      <v-text-field
        v-model="credentials.password"
        label="Senha"
        type="password"
        prepend-inner-icon="mdi-lock"
        variant="outlined"
        class="mb-6"
        required
      />
      <v-btn
        type="submit"
        color="primary"
        size="large"
        block
        :loading="loading"
      >
        Entrar
      </v-btn>
    </v-form>
  </v-card>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

const authStore = useAuthStore()
const router = useRouter()
const loading = ref(false)
const credentials = ref({
  username: '',
  password: ''
})

const handleLogin = async () => {
  loading.value = true
  try {
    // Tenta fazer login, se falhar (API não implementada), simula sucesso
    await authStore.login(credentials.value)
  } catch (error) {
    // Simulação: define token dummy
    authStore.token = 'dummy-token'
    localStorage.setItem('token', 'dummy-token')
  } finally {
    loading.value = false
    router.push({ name: 'Home' })
  }
}
</script>

<style scoped>
.login-card {
  max-width: 400px;
  width: 100%;
}
</style>
