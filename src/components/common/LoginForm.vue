<!-- src/components/common/LoginForm.vue -->
<template>
  <div class="form-wrap">

    <div class="form-header">
      <h2 class="form-title">Bem-vindo de volta</h2>
      <p class="form-sub">Entre com sua conta para continuar</p>
    </div>

    <!-- Form -->
    <div class="form-fields">
      <div class="field">
        <label class="field__label">Usuário</label>
        <div class="field__wrap">
          <User :size="14" class="field__icon" />
          <input
            v-model="credentials.username"
            class="field__input"
            placeholder="seu@email.com"
            autocomplete="username"
            @keyup.enter="handleLogin"
          />
        </div>
      </div>

      <div class="field">
        <label class="field__label">Senha</label>
        <div class="field__wrap">
          <Lock :size="14" class="field__icon" />
          <input
            v-model="credentials.password"
            :type="showPwd ? 'text' : 'password'"
            class="field__input"
            placeholder="••••••••"
            autocomplete="current-password"
            @keyup.enter="handleLogin"
          />
          <button class="field__eye" @click="showPwd = !showPwd">
            <EyeOff v-if="showPwd" :size="14" />
            <Eye    v-else          :size="14" />
          </button>
        </div>
      </div>

      <p v-if="errorMsg" class="form-error">{{ errorMsg }}</p>

      <button class="btn-login" :disabled="loading" @click="handleLogin">
        <span v-if="!loading">Entrar</span>
        <span v-else class="spinner" />
      </button>
    </div>

    <!-- Divider -->
    <div class="divider">
      <span>ou acesse rapidamente</span>
    </div>

    <!-- OAuth2 -->
    <button class="btn-oauth" @click="handleOAuth">
      <KeyRound :size="15" />
      Entrar com SSO
    </button>

  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { User, Lock, Eye, EyeOff, KeyRound } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth.store'

const authStore = useAuthStore()
const router    = useRouter()
const loading      = ref(false)
const showPwd      = ref(false)
const errorMsg     = ref('')
const credentials  = ref({ username: '', password: '' })

const handleLogin = async () => {
  errorMsg.value = ''
  if (!credentials.value.username) {
    errorMsg.value = 'Informe o usuário.'
    return
  }
  loading.value = true
  try {
    await authStore.login()
  } catch (err) {
    errorMsg.value = err.message || 'Erro ao fazer login.'
  } finally {
    loading.value = false
  }
}

const handleOAuth = async () => {
  await authStore.login()
}
</script>

<style scoped>
.form-wrap {
  width: 100%; max-width: 400px;
  display: flex; flex-direction: column; gap: 22px;
  font-family: 'DM Sans', sans-serif;
}

.form-header { display: flex; flex-direction: column; gap: 4px; }
.form-title { font-size: 1.5rem; font-weight: 800; color: #1a1a2e; margin: 0; letter-spacing: -0.02em; }
.form-sub   { font-size: 13px; color: #aaa; margin: 0; }

/* Fields */
.form-fields { display: flex; flex-direction: column; gap: 14px; }

.field { display: flex; flex-direction: column; gap: 6px; }
.field__label { font-size: 12px; font-weight: 600; color: #555; }

.field__wrap { position: relative; display: flex; align-items: center; }

.field__icon {
  position: absolute; left: 11px;
  color: #bbb; pointer-events: none;
}

.field__input {
  font-family: 'DM Sans', sans-serif; font-size: 13px;
  width: 100%; border: 1px solid #ddd; border-radius: 9px;
  padding: 10px 36px; outline: none; background: #fff;
  transition: border-color 0.15s;
}
.field__input:focus { border-color: #534AB7; }

.field__eye {
  position: absolute; right: 10px;
  background: transparent; border: none;
  cursor: pointer; color: #bbb; padding: 0;
  display: flex; align-items: center;
}
.field__eye:hover { color: #666; }

.form-error {
  font-size: 12px; color: #A32D2D;
  background: #FCEBEB; border-radius: 7px;
  padding: 8px 12px; margin: 0;
}

.btn-login {
  width: 100%; padding: 12px;
  background: #1a1a2e; color: #fff;
  border: none; border-radius: 10px;
  font-family: 'DM Sans', sans-serif;
  font-size: 14px; font-weight: 700;
  cursor: pointer; transition: background 0.15s;
  display: flex; align-items: center; justify-content: center;
  min-height: 44px; margin-top: 4px;
}
.btn-login:hover:not(:disabled) { background: #2d2d4e; }
.btn-login:disabled { opacity: 0.5; cursor: not-allowed; }

/* Divider */
.divider {
  display: flex; align-items: center; gap: 12px;
}
.divider::before, .divider::after {
  content: ''; flex: 1; height: 1px; background: #ebe9e4;
}
.divider span { font-size: 11px; color: #bbb; white-space: nowrap; }

/* OAuth */
.btn-oauth {
  width: 100%; padding: 11px;
  background: #fff; color: #444;
  border: 1px solid #ddd; border-radius: 10px;
  font-family: 'DM Sans', sans-serif;
  font-size: 13px; font-weight: 600;
  cursor: pointer; transition: background 0.15s;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}
.btn-oauth:hover { background: #f5f4f0; }

/* Spinner */
.spinner {
  width: 18px; height: 18px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>