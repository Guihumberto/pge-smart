import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

import App from './App.vue'
import router from './router'
import i18n from './plugins/i18n'
import '@/style.css'

const app    = createApp(App)
const pinia  = createPinia()
pinia.use(piniaPluginPersistedstate)

app.use(pinia)
app.use(router)
app.use(i18n)

// Importa DEPOIS do pinia estar instalado
import { useAuthStore } from '@/stores/auth.store'
const authStore = useAuthStore()

// Restaura sessão ANTES de montar e ANTES do router processar
authStore.restoreSession().finally(() => {
  app.mount('#app')
})