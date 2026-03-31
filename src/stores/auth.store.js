import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { oidcClient } from '@/auth/oidcConfig'

export const useAuthStore = defineStore('auth', () => {

  const user         = ref(null)
  const accessToken  = ref(null)
  const isLoading    = ref(false)
  const error        = ref(null)

  const isAuthenticated = computed(() => !!accessToken.value && !!user.value)

  // ── Monta o usuário a partir do objeto OIDC ────────────────
  // src/stores/auth.store.js — buildUser
  function buildUser(oidcUser) {
    if (!oidcUser) return null
    const profile = oidcUser.profile ?? {}

    // IDs que são mentor — adicione o seu sub aqui
    const MENTOR_IDS = [
      '71d213f5-9047-4ffd-9dba-6f2824c018b6',  // seu sub do token
    ]

    const isMentor = MENTOR_IDS.includes(profile.sub)

    return {
      id:     profile.sub,
      name:   profile.name ?? profile.preferred_username ?? 'Usuário',
      email:  profile.email ?? '',
      role:   isMentor ? 'mentor' : 'student',
      userId: profile.userId,
    }
  }

  // ── Inicia o login — redireciona para o OAuth2 ─────────────
  async function login() {
    try {
      // Salva a rota atual para redirecionar após o login
      sessionStorage.setItem('pre_login_path', window.location.pathname)
      await oidcClient.signinRedirect()
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  // ── Processa o callback após o OAuth2 redirecionar ─────────
  async function handleCallback() {
    isLoading.value = true
    error.value     = null
    try {
      const oidcUser   = await oidcClient.signinRedirectCallback()
      user.value       = buildUser(oidcUser)
      accessToken.value = oidcUser.access_token
      localStorage.setItem('access_token', oidcUser.access_token)
      return user.value
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // ── Restaura sessão ao recarregar a página ─────────────────
  async function restoreSession() {
    isLoading.value = true
    try {
      const oidcUser = await oidcClient.getUser()
      console.log('restoreSession oidcUser:', oidcUser)
      console.log('oidcUser expired:', oidcUser?.expired)

      if (!oidcUser || oidcUser.expired) {
        user.value        = null
        accessToken.value = null
        localStorage.removeItem('access_token')
        return
      }

      user.value        = buildUser(oidcUser)
      accessToken.value = oidcUser.access_token
      localStorage.setItem('access_token', oidcUser.access_token)
      console.log('sessão restaurada:', user.value)
    } catch (err) {
      console.error('restoreSession error:', err)
      user.value        = null
      accessToken.value = null
    } finally {
      isLoading.value = false
    }
  }

  // ── Logout ─────────────────────────────────────────────────
  async function logout() {
    user.value        = null
    accessToken.value = null
    localStorage.removeItem('access_token')

    try {
      await oidcClient.removeUser()
      await oidcClient.clearStaleState()
    } catch {
      // ignora
    }

    window.location.href = '/auth/login'
  }

  return {
    user,
    accessToken,
    isLoading,
    error,
    isAuthenticated,
    login,
    handleCallback,
    restoreSession,
    logout,
  }
})