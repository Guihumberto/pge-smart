import { ref, readonly } from 'vue'
import http from '@/services/http'

const isOffline = ref(false)
const showBanner = ref(false)
const bannerState = ref('offline') // 'offline' | 'online'

let hideTimer = null
let healthCheckTimer = null
let installed = false

function markOffline() {
  if (!isOffline.value) {
    isOffline.value = true
    bannerState.value = 'offline'
    showBanner.value = true
    startHealthCheck()
  }
}

function markOnline() {
  if (isOffline.value) {
    isOffline.value = false
    bannerState.value = 'online'
    showBanner.value = true
    stopHealthCheck()

    clearTimeout(hideTimer)
    hideTimer = setTimeout(() => {
      showBanner.value = false
    }, 3000)
  }
}

function startHealthCheck() {
  stopHealthCheck()
  healthCheckTimer = setInterval(async () => {
    try {
      await http.get('/health', { timeout: 5000 })
      markOnline()
    } catch {
      // still offline
    }
  }, 5000)
}

function stopHealthCheck() {
  clearInterval(healthCheckTimer)
  healthCheckTimer = null
}

export function useConnectionStatus() {
  if (!installed) {
    installed = true

    // Intercept network errors on every response
    http.interceptors.response.use(
      (response) => {
        // Any successful response means we're connected
        if (isOffline.value) markOnline()
        return response
      },
      (error) => {
        const isNetworkError = !error.response && (
          error.code === 'ERR_NETWORK' ||
          error.code === 'ECONNABORTED' ||
          error.message === 'Network Error'
        )

        if (isNetworkError) markOffline()

        return Promise.reject(error)
      }
    )

    // Also listen to browser online/offline events
    window.addEventListener('offline', markOffline)
    window.addEventListener('online', () => {
      // Browser says online, verify with a real request
      startHealthCheck()
    })
  }

  return {
    isOffline: readonly(isOffline),
    showBanner: readonly(showBanner),
    bannerState: readonly(bannerState),
  }
}
