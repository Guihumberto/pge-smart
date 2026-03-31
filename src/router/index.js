// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
import routes from './routes'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    return savedPosition ?? { top: 0 }
  }
})

const publicRoutes = ['Login', 'Register', 'Callback', 'LogoutCallback', 'Invite', 'InviteCallback', 'NotFound']

router.beforeEach(async (to, from, next) => {
  NProgress.start()

  // Rotas públicas — passa direto
  if (publicRoutes.includes(to.name)) {
    return next()
  }

  const token = localStorage.getItem('access_token')

  // Sem token — vai para login
  if (!token) {
    sessionStorage.setItem('pre_login_path', to.fullPath)
    return next({ name: 'Login' })
  }

  // Com token — verifica se é rota de guest
  if (to.meta.guest) {
    return next({ name: 'Plans' })
  }

  next()
})

router.afterEach(() => NProgress.done())

export default router