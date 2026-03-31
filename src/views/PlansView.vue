<template>
  <div class="plans" style="font-family: 'DM Sans', sans-serif;">

    <!-- Header -->
    <div class="plans__header">
      <div>
        <h1 class="plans__title">Meus Planos</h1>
        <p class="plans__sub">Gerencie seus planos e acompanhe seus alunos</p>
      </div>
      <div class="plans__actions">
        <button class="btn-outline" @click="router.push('/mentor/alunos')">
          <Users :size="14" /> Ver todos os alunos
        </button>
        <button class="btn-primary" @click="showModal = true">
          <Plus :size="14" /> Novo plano
        </button>
      </div>
    </div>

    <!-- Stats globais -->
    <div class="stats-row">
      <div class="stat-card">
        <span class="stat-card__value">{{ planStore.plans.length }}</span>
        <span class="stat-card__label">Planos criados</span>
      </div>
      <div class="stat-card">
        <span class="stat-card__value">{{ totalStudents }}</span>
        <span class="stat-card__label">Alunos no total</span>
      </div>
      <div class="stat-card">
        <span class="stat-card__value">{{ totalGoals }}</span>
        <span class="stat-card__label">Metas criadas</span>
      </div>
      <div class="stat-card">
        <span class="stat-card__value">{{ totalTasks }}</span>
        <span class="stat-card__label">Tarefas criadas</span>
      </div>
    </div>

    <!-- Lista de planos -->
    <div v-if="planStore.plans.length" class="plans-grid">
      <div
        v-for="plan in planStore.plans"
        :key="plan.id"
        class="plan-card"
      >
        <!-- Top -->
        <div class="plan-card__top">
          <div class="plan-card__icon">⚖</div>
          <div class="plan-card__meta">
            <h3 class="plan-card__title">{{ plan.title }}</h3>
            <p v-if="plan.description" class="plan-card__desc">{{ plan.description }}</p>
          </div>
          <div class="plan-card__menu" @click.stop>
            <button class="icon-btn" @click="toggleMenu(plan.id)">
              <MoreVertical :size="14" />
            </button>
            <div v-if="openMenu === plan.id" class="dropdown">
              <button class="dropdown__item" @click="goWorkspace(plan.id)">
                <LayoutDashboard :size="13" /> Editar plano
              </button>
              <button class="dropdown__item" @click="duplicatePlan(plan)">
                <Copy :size="13" /> Duplicar
              </button>
              <div class="dropdown__divider" />
              <button class="dropdown__item dropdown__item--danger" @click="confirmDelete(plan.id)">
                <Trash2 :size="13" /> Excluir
              </button>
            </div>
          </div>
        </div>

        <!-- Stats do plano -->
        <div class="plan-card__stats">
          <div class="plan-stat">
            <span class="plan-stat__val">{{ planGoals(plan.id) }}</span>
            <span class="plan-stat__label">Metas</span>
          </div>
          <div class="plan-stat">
            <span class="plan-stat__val">{{ planStudents(plan.id) }}</span>
            <span class="plan-stat__label">Alunos</span>
          </div>
          <div class="plan-stat">
            <span class="plan-stat__val">{{ planAvgProgress(plan.id) }}%</span>
            <span class="plan-stat__label">Progresso médio</span>
          </div>
          <div class="plan-stat">
            <span class="plan-stat__val">{{ planLinks(plan.id) }}</span>
            <span class="plan-stat__label">Links</span>
          </div>
        </div>

        <!-- Alunos ativos (avatares) -->
        <div v-if="planStudents(plan.id)" class="plan-card__avatars">
          <div
            v-for="e in getEnrollments(plan.id).slice(0, 5)"
            :key="e.id"
            class="mini-avatar"
            :title="userName(e.userId)"
          >
            {{ initials(e.userId) }}
          </div>
          <div v-if="planStudents(plan.id) > 5" class="mini-avatar mini-avatar--more">
            +{{ planStudents(plan.id) - 5 }}
          </div>
        </div>
        <p v-else class="plan-card__no-students">Nenhum aluno ainda</p>

        <!-- Ações -->
        <div class="plan-card__footer">
          <button class="btn-outline-sm" @click="goWorkspace(plan.id)">
            <Pencil :size="13" /> Editar
          </button>
          <button class="btn-primary-sm" @click="goManage(plan.id)">
            <Users :size="13" /> Gerenciar alunos
            <ChevronRight :size="13" />
          </button>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="empty-state">
      <div class="empty-state__icon">📋</div>
      <h3 class="empty-state__title">Nenhum plano criado ainda</h3>
      <p class="empty-state__desc">
        Crie seu primeiro plano de estudos para começar a organizar metas e acompanhar seus alunos.
      </p>
      <button class="btn-primary" @click="showModal = true">
        <Plus :size="14" /> Criar primeiro plano
      </button>
    </div>

    <!-- Modal novo plano -->
    <ModalNewPlan
      v-if="showModal"
      @close="showModal = false"
      @created="onCreated"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  Plus, Users, MoreVertical, LayoutDashboard,
  Copy, Trash2, Pencil, ChevronRight
} from 'lucide-vue-next'
import { usePlanStore } from '@/stores/usePlanStore'
import { useEnrollmentStore } from '@/stores/useEnrollmentStore'
import { useTaskStore } from '@/stores/useTaskStore'
import { useUserStore } from '@/stores/useUserStore'
import ModalNewPlan from '@/components/workspace/ModalNewPlan.vue'
import { toast } from 'vue-sonner'

const router = useRouter()
const planStore       = usePlanStore()
const enrollmentStore = useEnrollmentStore()
const taskStore       = useTaskStore()
const userStore       = useUserStore()

const showModal = ref(false)
const openMenu  = ref(null)
const loading   = ref(false)

// ── Carrega ao montar ──────────────────────────────────────
onMounted(async () => {
  loading.value = true
  try {
    await planStore.fetchPlans()

    // Para cada plano, carrega enrollments em paralelo
    await Promise.all(
      planStore.plans.map(p => enrollmentStore.loadByPlan(p.id).catch(() => null))
    )
  } catch (err) {
    toast.error('Erro ao carregar planos.')
  } finally {
    loading.value = false
  }
})

// Stats globais
const totalStudents = computed(() =>
  new Set(enrollmentStore.enrollments.map(e => e.userId)).size
)
const totalGoals = computed(() => planStore.goals.length)
const totalTasks = computed(() => taskStore.tasks.length)

// Por plano
const getEnrollments  = (planId) => Array.from(enrollmentStore.byPlan(planId) ?? [])
const planStudents    = (planId) => getEnrollments(planId).length
const planLinks       = (planId) => enrollmentStore.inviteLinks.filter(l => l.planId === planId).length
const planGoals       = (planId) => planStore.goals.filter(g => g.planId === planId).length
const planAvgProgress = (planId) => {
  const list = getEnrollments(planId)
  if (!list.length) return 0
  return Math.round(
    list.reduce((sum, e) => sum + enrollmentStore.getProgress(e.id), 0) / list.length
  )
}

// Helpers de usuário
const userName = (id) => userStore.getById(id)?.name ?? `Usuário ${id.slice(0, 4)}`
const initials = (id) => userName(id).split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()

// Navegação
const goManage    = (id) => router.push(`/mentor/plano/${id}`)
const goWorkspace = (id) => router.push({ name: 'Workspace', query: { plan: id } })

// Menu
const toggleMenu = (id) => {
  openMenu.value = openMenu.value === id ? null : id
}
window.addEventListener('click', () => { openMenu.value = null })

// Ações
const onCreated = (planId) => {
  showModal.value = false
  router.push({ name: 'Workspace', query: { plan: planId } })
}

const duplicatePlan = async (plan) => {
  try {
    const copy = await planStore.createPlan(`${plan.title} (cópia)`, plan.description)
    const goals = planStore.goals.filter(g => g.planId === plan.id)
    await Promise.all(
      goals.map(g => planStore.copyGoalToPlan(plan.id, g.id, copy.id))
    )
    openMenu.value = null
  } catch (err) {
    toast.error(err.message)
  }
}

const confirmDelete = async (id) => {
  if (!confirm('Excluir este plano? Esta ação não pode ser desfeita.')) return
  try {
    await planStore.removePlan(id)
  } catch (err) {
    toast.error(err.message)
  }
  openMenu.value = null
}
</script>

<style scoped>
.plans {
  max-width: 1100px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Header */
.plans__header {
  display: flex; align-items: flex-start;
  justify-content: space-between; gap: 12px; flex-wrap: wrap;
}
.plans__title { font-size: 1.25rem; font-weight: 700; color: #1a1a2e; margin: 0; }
.plans__sub   { font-size: 12px; color: #aaa; margin: 4px 0 0; }
.plans__actions { display: flex; gap: 8px; }

/* Stats */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
@media (max-width: 600px) { .stats-row { grid-template-columns: repeat(2, 1fr); } }

.stat-card {
  background: #fff; border: 1px solid #ebe9e4;
  border-radius: 10px; padding: 16px;
  display: flex; flex-direction: column; gap: 4px;
}
.stat-card__value {
  font-size: 1.6rem; font-weight: 800;
  color: #1a1a2e; letter-spacing: -0.02em;
}
.stat-card__label {
  font-size: 11px; font-weight: 600; color: #aaa;
  text-transform: uppercase; letter-spacing: 0.08em;
}

/* Grid de planos */
.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 14px;
}

/* Plan card */
.plan-card {
  background: #fff; border: 1px solid #ebe9e4;
  border-radius: 14px; padding: 20px;
  display: flex; flex-direction: column; gap: 16px;
  transition: border-color 0.15s, transform 0.15s;
}
.plan-card:hover { border-color: #AFA9EC; transform: translateY(-2px); }

.plan-card__top {
  display: flex; align-items: flex-start; gap: 12px;
}

.plan-card__icon {
  width: 38px; height: 38px; border-radius: 10px;
  background: #1a1a2e; font-size: 18px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}

.plan-card__meta { flex: 1; min-width: 0; }
.plan-card__title {
  font-size: 15px; font-weight: 700; color: #1a1a2e;
  margin: 0 0 2px; white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis;
}
.plan-card__desc {
  font-size: 12px; color: #aaa; margin: 0;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* Menu dropdown */
.plan-card__menu { position: relative; }

.dropdown {
  position: absolute; top: 30px; right: 0;
  background: #fff; border: 1px solid #ebe9e4;
  border-radius: 10px; padding: 4px;
  min-width: 170px; z-index: 50;
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
}
.dropdown__item {
  display: flex; align-items: center; gap: 8px;
  width: 100%; padding: 8px 10px;
  border: none; background: transparent;
  border-radius: 6px; font-family: 'DM Sans', sans-serif;
  font-size: 13px; color: #444; cursor: pointer;
  text-align: left; transition: background 0.15s;
}
.dropdown__item:hover { background: #f5f4f0; }
.dropdown__item--danger { color: #c0392b; }
.dropdown__item--danger:hover { background: #fdf0ef; }
.dropdown__divider { height: 1px; background: #f0efea; margin: 4px 0; }

/* Plan stats */
.plan-card__stats {
  display: grid; grid-template-columns: repeat(4, 1fr);
  background: #fafaf8; border-radius: 10px; overflow: hidden;
}
.plan-stat {
  display: flex; flex-direction: column; align-items: center;
  padding: 10px 6px; gap: 2px;
  border-right: 1px solid #f0efea;
}
.plan-stat:last-child { border-right: none; }
.plan-stat__val {
  font-size: 1.1rem; font-weight: 800;
  color: #1a1a2e; letter-spacing: -0.02em;
}
.plan-stat__label {
  font-size: 9px; font-weight: 700; color: #bbb;
  text-transform: uppercase; letter-spacing: 0.08em;
  text-align: center;
}

/* Avatares */
.plan-card__avatars {
  display: flex; gap: -4px;
}
.mini-avatar {
  width: 28px; height: 28px; border-radius: 50%;
  background: #1a1a2e; color: #fff;
  font-size: 9px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  border: 2px solid #fff; margin-left: -6px; flex-shrink: 0;
}
.mini-avatar:first-child { margin-left: 0; }
.mini-avatar--more { background: #f0efea; color: #888; font-size: 10px; }
.plan-card__no-students { font-size: 11px; color: #ccc; margin: 0; }

/* Footer do card */
.plan-card__footer {
  display: flex; gap: 8px;
  border-top: 1px solid #f5f4f0; padding-top: 14px;
}

/* Buttons */
.btn-primary {
  display: flex; align-items: center; gap: 6px;
  font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600;
  background: #534AB7; color: #fff; border: none;
  border-radius: 8px; padding: 8px 16px;
  cursor: pointer; transition: background 0.15s;
}
.btn-primary:hover { background: #3C3489; }

.btn-primary-sm {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px;
  font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 600;
  background: #534AB7; color: #fff; border: none;
  border-radius: 7px; padding: 7px 12px;
  cursor: pointer; transition: background 0.15s;
}
.btn-primary-sm:hover { background: #3C3489; }

.btn-outline {
  display: flex; align-items: center; gap: 6px;
  font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500;
  background: #fff; color: #444; border: 1px solid #ddd;
  border-radius: 8px; padding: 7px 14px;
  cursor: pointer; transition: background 0.15s;
}
.btn-outline:hover { background: #f5f4f0; }

.btn-outline-sm {
  display: flex; align-items: center; gap: 5px;
  font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 500;
  background: transparent; color: #666; border: 1px solid #ddd;
  border-radius: 7px; padding: 7px 10px;
  cursor: pointer; transition: background 0.15s;
}
.btn-outline-sm:hover { background: #f5f4f0; }

.icon-btn {
  width: 28px; height: 28px; border-radius: 7px;
  border: none; background: transparent; padding: 0;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #aaa; transition: background 0.15s, color 0.15s;
}
.icon-btn:hover { background: #f0efea; color: #444; }

/* Empty state */
.empty-state {
  display: flex; flex-direction: column;
  align-items: center; text-align: center;
  padding: 64px 24px; gap: 12px;
}
.empty-state__icon { font-size: 40px; }
.empty-state__title { font-size: 16px; font-weight: 700; color: #1a1a2e; margin: 0; }
.empty-state__desc  { font-size: 13px; color: #aaa; max-width: 360px; margin: 0; line-height: 1.6; }
</style>