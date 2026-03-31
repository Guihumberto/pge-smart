<template>
  <div class="layout" :class="{ 'layout--collapsed': isCollapsed }">
    <!-- Overlay mobile -->
    <div
      v-if="drawer && isMobile"
      class="overlay"
      @click="drawer = false"
    />

    <!-- Sidebar -->
    <aside :class="['sidebar', { 'sidebar--open': drawer, 'sidebar--collapsed': isCollapsed && !isMobile }]">
      <!-- Logo -->
      <div class="sidebar__logo">
        <div class="sidebar__logo-icon">⚖</div>
        <Transition name="fade-text">
          <div v-if="!isCollapsed || isMobile" class="sidebar__logo-text">
            <p class="sidebar__logo-title">ESTUDO DA LEI</p>
            <p class="sidebar__logo-sub">Metas Leges</p>
          </div>
        </Transition>
      </div>

      <!-- Nav -->
      <nav class="sidebar__nav">
        <!-- Seção Aluno -->
        <Transition name="fade-text">
          <span v-if="!isCollapsed || isMobile" class="sidebar__section-label">Aluno</span>
        </Transition>
        <template v-for="item in menuItems.filter(i => i.section === 'aluno')" :key="item.title">
          <RouterLink
            :to="item.to"
            class="sidebar__link"
            active-class="sidebar__link--active"
            :title="isCollapsed && !isMobile ? item.title : undefined"
          >
            <component :is="item.icon" :size="18" class="sidebar__link-icon" />
            <Transition name="fade-text">
              <span v-if="!isCollapsed || isMobile" class="sidebar__link-label">{{ item.title }}</span>
            </Transition>
          </RouterLink>
        </template>

        <div class="sidebar__divider" />

        <!-- Seção Mentor -->
        <Transition name="fade-text">
          <span v-if="!isCollapsed || isMobile" class="sidebar__section-label">Mentor</span>
        </Transition>
        <template v-for="item in menuItems.filter(i => i.section === 'mentor')" :key="item.title">
          <RouterLink
            :to="item.to"
            class="sidebar__link"
            active-class="sidebar__link--active"
            :title="isCollapsed && !isMobile ? item.title : undefined"
          >
            <component :is="item.icon" :size="18" class="sidebar__link-icon" />
            <Transition name="fade-text">
              <span v-if="!isCollapsed || isMobile" class="sidebar__link-label">{{ item.title }}</span>
            </Transition>
          </RouterLink>
        </template>

        <div class="sidebar__divider" />

        <!-- Sem seção -->
        <template v-for="item in menuItems.filter(i => !i.section)" :key="item.title">
          <RouterLink
            :to="item.to"
            class="sidebar__link"
            active-class="sidebar__link--active"
            :title="isCollapsed && !isMobile ? item.title : undefined"
          >
            <component :is="item.icon" :size="18" class="sidebar__link-icon" />
            <Transition name="fade-text">
              <span v-if="!isCollapsed || isMobile" class="sidebar__link-label">{{ item.title }}</span>
            </Transition>
          </RouterLink>
        </template>
      </nav>

      <!-- Footer da sidebar -->
      <div class="sidebar__footer">
        <!-- Botão recolher (desktop only) -->
        <button
          v-if="!isMobile"
          class="sidebar__collapse-btn"
          @click="isCollapsed = !isCollapsed"
          :title="isCollapsed ? 'Expandir menu' : 'Recolher menu'"
        >
          <ChevronLeft
            :size="16"
            :class="['collapse-icon', { 'collapse-icon--rotated': isCollapsed }]"
          />
          <Transition name="fade-text">
            <span v-if="!isCollapsed" class="sidebar__collapse-label">Recolher</span>
          </Transition>
        </button>

        <Transition name="fade-text">
          <span v-if="!isCollapsed || isMobile" class="sidebar__version">v{{ appVersion }}</span>
        </Transition>
      </div>
    </aside>

    <!-- Conteúdo principal -->
    <div class="main-wrapper">
      <ConnectionBanner />

      <!-- Topbar -->
      <header class="topbar">
        <button class="topbar__menu-btn" @click="toggleMenu">
          <Menu :size="20" />
        </button>

        <div class="topbar__breadcrumb">
          <span>{{ currentRouteName }}</span>
        </div>

        <div class="topbar__actions">
          <!-- User menu -->
          <div class="user-menu" ref="userMenuRef">
            <button class="user-menu__btn" @click="userMenuOpen = !userMenuOpen">
              <div class="user-menu__avatar">
                {{ userInitials }}
              </div>
              <ChevronDown :size="14" :class="{ 'rotate-180': userMenuOpen }" class="chevron-transition" />
            </button>

            <div v-if="userMenuOpen" class="user-menu__dropdown">
              <button class="user-menu__item" @click="navigate('/user-area')">
                <User :size="14" />
                Área do Usuário
              </button>
              <div class="user-menu__divider" />
              <button class="user-menu__item user-menu__item--danger" @click="logout">
                <LogOut :size="14" />
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      <!-- Page content -->
      <main class="page-content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store.js'
import {
  Menu, Info, User, LogOut, BookOpen, Target,
  ChevronDown, LayoutDashboard, ChevronLeft, Compass
} from 'lucide-vue-next'
import ConnectionBanner from '@/components/ui/ConnectionBanner.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const drawer = ref(false)
const isCollapsed = ref(false)
const userMenuOpen = ref(false)
const userMenuRef = ref(null)
const isMobile = ref(window.innerWidth < 768)
const appVersion = '0.1.0'

const menuItems = [
  { title: 'Explorar',     icon: Compass,         to: '/explorar' },
  { title: 'Minhas Metas', icon: Target,          to: '/metas',          section: 'aluno' },
  { title: 'Meus Planos',  icon: BookOpen,        to: '/planos',         section: 'mentor' },
  { title: 'Workspace',    icon: LayoutDashboard, to: '/workspace',      section: 'mentor' },
  { title: 'Alunos',       icon: User,            to: '/mentor/alunos',  section: 'mentor' },
  { title: 'Sobre',        icon: Info,            to: '/about' },
]

const currentRouteName = computed(() => {
  const match = menuItems.find(i => route.path.startsWith(i.to))
  return match?.title ?? 'Estudo da Lei'
})

const userInitials = computed(() => {
  const name = authStore.user?.name ?? 'U'
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
})

const toggleMenu = () => {
  if (isMobile.value) {
    drawer.value = !drawer.value
  } else {
    isCollapsed.value = !isCollapsed.value
  }
}

const navigate = (path) => {
  userMenuOpen.value = false
  router.push(path)
}

const logout = () => {
  userMenuOpen.value = false
  authStore.logout()
  router.push({ name: 'Login' })
}

const handleClickOutside = (e) => {
  if (userMenuRef.value && !userMenuRef.value.contains(e.target)) {
    userMenuOpen.value = false
  }
}

const handleResize = () => {
  isMobile.value = window.innerWidth < 768
  if (!isMobile.value) drawer.value = false
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
/* ── Layout base ─────────────────────────────────────────── */
.layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: #f8f7f4;
  font-family: 'DM Sans', sans-serif;
}

.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 40;
}

/* ── Sidebar ──────────────────────────────────────────────── */
.sidebar {
  width: 240px;
  height: 100vh;
  background: #1a1a2e;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: width 0.25s ease, transform 0.25s ease;
  z-index: 50;
  overflow: hidden;
}

.sidebar--collapsed {
  width: 60px;
}

/* Mobile: drawer fixo */
@media (max-width: 767px) {
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 240px;
    transform: translateX(-100%);
  }

  .sidebar--open {
    transform: translateX(0);
  }
}

/* ── Logo ─────────────────────────────────────────────────── */
.sidebar__logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  min-height: 72px;
  overflow: hidden;
}

.sidebar__logo-icon {
  font-size: 20px;
  width: 36px;
  height: 36px;
  min-width: 36px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sidebar__logo-text {
  overflow: hidden;
  white-space: nowrap;
}

.sidebar__logo-title {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
}

.sidebar__logo-sub {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  margin: 0;
}

/* ── Nav ──────────────────────────────────────────────────── */
.sidebar__nav {
  flex: 1;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sidebar__link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 8px;
  font-size: 13.5px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.55);
  text-decoration: none;
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
  overflow: hidden;
}

.sidebar__link:hover {
  background: rgba(255, 255, 255, 0.07);
  color: rgba(255, 255, 255, 0.9);
}

.sidebar__link--active {
  background: rgba(99, 102, 241, 0.2);
  color: #a5b4fc;
}

.sidebar__link-icon {
  flex-shrink: 0;
}

.sidebar__link-label {
  overflow: hidden;
  white-space: nowrap;
}

.sidebar__section-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.3);
  padding: 8px 12px 2px;
  white-space: nowrap;
  overflow: hidden;
}

.sidebar__divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.07);
  margin: 6px 8px;
}

/* ── Footer ───────────────────────────────────────────────── */
.sidebar__footer {
  padding: 10px 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow: hidden;
}

.sidebar__collapse-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: transparent;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
  overflow: hidden;
}

.sidebar__collapse-btn:hover {
  background: rgba(255, 255, 255, 0.07);
  color: rgba(255, 255, 255, 0.8);
}

.sidebar__collapse-label {
  overflow: hidden;
  white-space: nowrap;
}

.collapse-icon {
  flex-shrink: 0;
  transition: transform 0.25s ease;
}

.collapse-icon--rotated {
  transform: rotate(180deg);
}

.sidebar__version {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.2);
  padding: 0 12px 4px;
  white-space: nowrap;
  overflow: hidden;
}

/* ── Main wrapper ─────────────────────────────────────────── */
.main-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100vh;
  overflow-y: auto;
  transition: margin-left 0.25s ease;
}

/* ── Topbar ───────────────────────────────────────────────── */
.topbar {
  height: 52px;
  background: #fff;
  border-bottom: 1px solid #ebe9e4;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 20px;
  position: sticky;
  top: 0;
  z-index: 30;
}

.topbar__menu-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #666;
  cursor: pointer;
  transition: background 0.15s;
  flex-shrink: 0;
}

.topbar__menu-btn:hover {
  background: #f3f2ef;
}

.topbar__breadcrumb {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: #1a1a2e;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.topbar__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ── User menu ────────────────────────────────────────────── */
.user-menu {
  position: relative;
}

.user-menu__btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px 4px 4px;
  border-radius: 20px;
  border: 1px solid #ebe9e4;
  background: transparent;
  cursor: pointer;
  transition: background 0.15s;
}

.user-menu__btn:hover {
  background: #f3f2ef;
}

.user-menu__avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #1a1a2e;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chevron-transition {
  transition: transform 0.2s ease;
}

.rotate-180 {
  transform: rotate(180deg);
}

.user-menu__dropdown {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  width: 180px;
  background: #fff;
  border: 1px solid #ebe9e4;
  border-radius: 10px;
  padding: 4px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.user-menu__item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 13px;
  color: #444;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
}

.user-menu__item:hover {
  background: #f3f2ef;
}

.user-menu__item--danger {
  color: #c0392b;
}

.user-menu__item--danger:hover {
  background: #fdf0ef;
}

.user-menu__divider {
  height: 1px;
  background: #ebe9e4;
  margin: 4px 0;
}

/* ── Page content ─────────────────────────────────────────── */
.page-content {
  flex: 1;
  min-height: 0;
  padding: 24px;
  display: flex;
  flex-direction: column;
}

@media (max-width: 767px) {
  .page-content {
    padding: 16px;
  }
}

/* ── Transitions ──────────────────────────────────────────── */
.fade-text-enter-active {
  transition: opacity 0.15s ease 0.1s, max-width 0.25s ease;
}

.fade-text-leave-active {
  transition: opacity 0.1s ease, max-width 0.25s ease;
}

.fade-text-enter-from,
.fade-text-leave-to {
  opacity: 0;
  max-width: 0;
}

.fade-text-enter-to,
.fade-text-leave-from {
  opacity: 1;
  max-width: 200px;
}
</style>
