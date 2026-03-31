<template>
  <div class="user-area" style="font-family: 'DM Sans', sans-serif;">

    <h1 class="page-title">Área do Usuário</h1>
    <p class="page-sub">Gerencie sua sessão e troque de perfil em desenvolvimento</p>

    <!-- Usuário atual -->
    <div v-if="authStore.isAuthenticated" class="current-user">
      <div class="current-user__avatar">{{ initials }}</div>
      <div class="current-user__info">
        <p class="current-user__name">{{ authStore.user?.name }}</p>
        <p class="current-user__email">{{ authStore.user?.email }}</p>
        <span :class="['role-badge', `role-badge--${authStore.user?.role}`]">
          {{ roleLabel }}
        </span>
      </div>
      <button class="btn-danger" @click="logout">
        <LogOut :size="14" /> Sair
      </button>
    </div>

    <div v-else class="not-logged">
      <p>Nenhuma sessão ativa.</p>
    </div>

  </div>
</template>

<script setup>
import { computed } from 'vue'
import { LogOut } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth.store'

const authStore = useAuthStore()

const initials = computed(() =>
  authStore.user?.name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() ?? '?'
)

const roleLabel = computed(() =>
  ({ mentor: 'Mentor', student: 'Aluno' }[authStore.user?.role] ?? '—')
)

const logout = () => {
  authStore.logout()
}
</script>

<style scoped>
.user-area { max-width: 600px; display: flex; flex-direction: column; gap: 24px; }

.page-title { font-size: 1.25rem; font-weight: 700; color: #1a1a2e; margin: 0; }
.page-sub   { font-size: 12px; color: #aaa; margin: 4px 0 0; }

/* Usuário atual */
.current-user {
  display: flex; align-items: center; gap: 14px;
  background: #fff; border: 1px solid #ebe9e4;
  border-radius: 14px; padding: 20px;
}
.current-user__avatar {
  width: 48px; height: 48px; border-radius: 50%;
  background: #1a1a2e; color: #fff;
  font-size: 15px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.current-user__info { flex: 1; display: flex; flex-direction: column; gap: 3px; }
.current-user__name  { font-size: 15px; font-weight: 700; color: #1a1a2e; margin: 0; }
.current-user__email { font-size: 12px; color: #aaa; margin: 0; }

.not-logged { font-size: 13px; color: #aaa; }

/* Badges */
.role-badge {
  font-size: 10px; font-weight: 700;
  letter-spacing: 0.06em; text-transform: uppercase;
  border-radius: 5px; padding: 2px 8px;
}
.role-badge--mentor  { background: #1a1a2e; color: #fff; }
.role-badge--student { background: #EEEDFE; color: #534AB7; }

/* Buttons */
.btn-danger {
  display: flex; align-items: center; gap: 6px;
  font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 600;
  background: #FCEBEB; color: #A32D2D; border: none;
  border-radius: 8px; padding: 8px 14px; cursor: pointer;
  transition: background 0.15s;
}
.btn-danger:hover { background: #f7c1c1; }
</style>