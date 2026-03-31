<template>
  <div class="manage">

    <!-- Header -->
    <div class="manage__header">
      <div class="manage__back">
        <button class="btn-back" @click="router.back()">
          <ChevronLeft :size="16" /> Planos
        </button>
        <span class="manage__sep">/</span>
        <h1 class="manage__title">{{ plan?.title ?? '—' }}</h1>
        <span v-if="plan?.description" class="manage__desc">{{ plan.description }}</span>
      </div>

      <div class="manage__header-actions">
        <button class="btn-outline" @click="router.push('/mentor/alunos')">
          <Users :size="14" /> Ver todos os alunos
        </button>
      </div>
    </div>

    <!-- Stats rápidas -->
    <div class="stats-row">
      <div class="stat-card">
        <span class="stat-card__value">{{ enrollments.length }}</span>
        <span class="stat-card__label">Alunos matriculados</span>
      </div>
      <div class="stat-card">
        <span class="stat-card__value">{{ activeCount }}</span>
        <span class="stat-card__label">Ativos</span>
      </div>
      <div class="stat-card">
        <span class="stat-card__value">{{ avgProgress }}%</span>
        <span class="stat-card__label">Progresso médio</span>
      </div>
      <div class="stat-card">
        <span class="stat-card__value">{{ inviteLinks.length }}</span>
        <span class="stat-card__label">Links ativos</span>
      </div>
    </div>

    <!-- Abas -->
    <div class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="['tab', { 'tab--active': activeTab === tab.id }]"
        @click="activeTab = tab.id"
      >
        <component :is="tab.icon" :size="14" />
        {{ tab.label }}
        <span v-if="tab.count" class="tab__count">{{ tab.count }}</span>
      </button>
    </div>

    <!-- Aba: Alunos -->
    <div v-if="activeTab === 'students'" class="tab-content">
      <div class="table-toolbar">
        <input v-model="search" class="search-input" placeholder="Buscar aluno..." />
        <div class="table-toolbar__actions">
          <button class="btn-outline btn-sm" @click="mentorUnlockAll">
            <Unlock :size="13" /> Liberar próxima para todos
          </button>
        </div>
      </div>

      <div class="students-table">
        <div class="students-table__head">
          <span>Aluno</span>
          <span>Status</span>
          <span>Progresso</span>
          <span>Meta atual</span>
          <span>Entrou em</span>
          <span></span>
        </div>

        <div
          v-for="enrollment in filteredEnrollments"
          :key="enrollment.id"
          class="students-table__row"
          @click="openStudent(enrollment)"
        >
          <div class="student-cell">
            <div class="student-avatar">{{ initials(enrollment.userId) }}</div>
            <div>
              <p class="student-name">{{ userName(enrollment.userId) }}</p>
              <p class="student-email">{{ userEmail(enrollment.userId) }}</p>
            </div>
          </div>

          <div>
            <span :class="['status-badge', `status-badge--${enrollment.status}`]">
              {{ statusLabel(enrollment.status) }}
            </span>
          </div>

          <div class="progress-cell">
            <div class="progress-bar">
              <div
                class="progress-bar__fill"
                :style="{ width: enrollmentStore.getProgress(enrollment.id) + '%' }"
              />
            </div>
            <span class="progress-pct">{{ enrollmentStore.getProgress(enrollment.id) }}%</span>
          </div>

          <div>
            <span class="current-goal">{{ currentGoalTitle(enrollment) }}</span>
          </div>

          <div class="date-cell">{{ formatDate(enrollment.enrolledAt) }}</div>

          <div class="row-actions" @click.stop>
            <button
              class="icon-btn"
              title="Liberar próxima meta"
              @click="enrollmentStore.mentorUnlockForUser(enrollment.id)"
            >
              <Unlock :size="13" />
            </button>
            <button
              v-if="enrollment.status === 'active'"
              class="icon-btn icon-btn--warn"
              title="Pausar"
              @click="enrollmentStore.setEnrollmentStatus(enrollment.id, 'paused')"
            >
              <PauseCircle :size="13" />
            </button>
            <button
              v-else-if="enrollment.status === 'paused'"
              class="icon-btn icon-btn--ok"
              title="Reativar"
              @click="enrollmentStore.setEnrollmentStatus(enrollment.id, 'active')"
            >
              <PlayCircle :size="13" />
            </button>
            <button
              class="icon-btn icon-btn--danger"
              title="Bloquear"
              @click="enrollmentStore.setEnrollmentStatus(enrollment.id, 'blocked')"
            >
              <Ban :size="13" />
            </button>
          </div>
        </div>

        <p v-if="!filteredEnrollments.length" class="table-empty">
          Nenhum aluno encontrado.
        </p>
      </div>
    </div>

    <!-- Aba: Links -->
    <div v-if="activeTab === 'links'" class="tab-content">
      <div class="links-toolbar">
        <button class="btn-primary" @click="showLinkModal = true">
          <Plus :size="14" /> Novo link de convite
        </button>
      </div>

      <div class="links-list">
        <div v-for="link in inviteLinks" :key="link.id" class="link-card">
          <div class="link-card__top">
            <div class="link-card__info">
              <span :class="['link-type', `link-type--${link.type}`]">
                {{ link.type === 'global' ? 'Link global' : 'Link único' }}
              </span>
              <span v-if="link.expiresAt" class="link-expires">
                Expira {{ formatDate(link.expiresAt) }}
              </span>
              <span v-if="link.type === 'single' && link.usedBy" class="link-used">
                Utilizado
              </span>
            </div>
            <div class="link-card__actions">
              <button class="btn-copy" @click="copyLink(link.token)">
                <Copy :size="13" />
                {{ copied === link.token ? 'Copiado!' : 'Copiar link' }}
              </button>
              <button class="icon-btn icon-btn--danger" @click="removeLink(link.id)">
                <Trash2 :size="13" />
              </button>
            </div>
          </div>

          <div class="link-card__url">
            {{ enrollmentStore.getLinkUrl(link.token) }}
          </div>

          <div class="link-card__stats">
            <span>
              <Users :size="11" />
              {{ link.type === 'global' ? `${linkUsageCount(link.token)} uso(s)` : (link.usedBy ? '1 uso' : 'Não utilizado') }}
            </span>
            <span>Criado {{ formatDate(link.createdAt) }}</span>
          </div>
        </div>

        <p v-if="!inviteLinks.length" class="table-empty">
          Nenhum link criado ainda.
        </p>
      </div>
    </div>

    <!-- Aba: Liberação -->
    <div v-if="activeTab === 'release'" class="tab-content">
      <div class="release-section">
        <h3 class="release-section__title">Liberação em massa</h3>
        <p class="release-section__desc">
          Libera a próxima meta para todos os alunos ativos do plano,
          respeitando o limite de 2 metas pendentes por aluno.
        </p>
        <button class="btn-primary" @click="mentorUnlockAll">
          <Unlock :size="14" /> Liberar próxima meta para todos
        </button>
      </div>

      <div class="release-section">
        <h3 class="release-section__title">Liberação por grupo</h3>
        <p class="release-section__desc">Selecione os alunos e libere a próxima meta para eles.</p>

        <div class="group-select">
          <label
            v-for="enrollment in enrollments"
            :key="enrollment.id"
            class="group-item"
          >
            <input
              type="checkbox"
              :value="enrollment.id"
              v-model="selectedGroup"
              class="group-item__check"
            />
            <div class="student-avatar student-avatar--sm">{{ initials(enrollment.userId) }}</div>
            <span class="group-item__name">{{ userName(enrollment.userId) }}</span>
            <span :class="['status-badge', `status-badge--${enrollment.status}`]">
              {{ statusLabel(enrollment.status) }}
            </span>
          </label>
        </div>

        <button
          class="btn-primary"
          :disabled="!selectedGroup.length"
          @click="unlockGroup"
        >
          <Unlock :size="14" /> Liberar para selecionados ({{ selectedGroup.length }})
        </button>
      </div>

      <div class="release-section">
        <h3 class="release-section__title">Agenda de liberações</h3>
        <div class="schedule-list">
          <div
            v-for="item in scheduledQueue"
            :key="item.enrollmentId + item.goalId"
            class="schedule-item"
          >
            <div class="schedule-item__user">{{ userName(item.userId) }}</div>
            <div class="schedule-item__goal">{{ item.goalTitle }}</div>
            <div class="schedule-item__date">{{ formatDate(item.scheduledAt) }}</div>
          </div>
          <p v-if="!scheduledQueue.length" class="table-empty">
            Nenhuma liberação agendada.
          </p>
        </div>
      </div>
    </div>

    <!-- Modal novo link -->
    <ModalNewLink
      v-if="showLinkModal"
      :plan-id="planId"
      @close="showLinkModal = false"
      @created="showLinkModal = false"
    />

    <!-- Drawer detalhe do aluno -->
    <StudentDrawer
      v-if="selectedEnrollment"
      :enrollment="selectedEnrollment"
      @close="selectedEnrollment = null"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ChevronLeft, Users, Unlock, Plus,
  Copy, Trash2, Link2
} from 'lucide-vue-next'
import { usePlanStore } from '@/stores/usePlanStore'
import { useEnrollmentStore } from '@/stores/useEnrollmentStore'
import dayjs from 'dayjs'
import 'dayjs/locale/pt-br'
import ModalNewLink from '@/components/mentor/ModalNewLink.vue'
import StudentDrawer from '@/components/mentor/StudentDrawer.vue'
import { toast } from 'vue-sonner'

dayjs.locale('pt-br')

const route  = useRoute()
const router = useRouter()
const planStore       = usePlanStore()
const enrollmentStore = useEnrollmentStore()
const planId             = route.params.id
const activeTab          = ref('students')
const search             = ref('')
const showLinkModal      = ref(false)
const selectedEnrollment = ref(null)
const selectedGroup      = ref([])
const copied             = ref(null)
const loading            = ref(false)

// ── Carrega ao montar ──────────────────────────────────────
onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([
      // Garante que o plano está carregado
      planStore.plans.length ? null : planStore.fetchPlans(),
      // Carrega metas do plano
      planStore.fetchGoals(planId),
      // Carrega enrollments
      enrollmentStore.fetchByPlan(planId),
      // Carrega links de convite
      enrollmentStore.fetchLinks(planId),
    ])
  } catch (err) {
    toast.error('Erro ao carregar dados do plano.')
  } finally {
    loading.value = false
  }
})

const plan        = computed(() => planStore.plans.find(p => p.id === planId))
const enrollments = computed(() => enrollmentStore.byPlan(planId))
const inviteLinks = computed(() => enrollmentStore.inviteLinks.filter(l => l.planId === planId))

const tabs = computed(() => [
  { id: 'students', label: 'Alunos',    icon: Users,  count: enrollments.value.length },
  { id: 'links',    label: 'Links',     icon: Link2,  count: inviteLinks.value.length },
  { id: 'release',  label: 'Liberação', icon: Unlock, count: null },
])

// Stats
const activeCount = computed(() =>
  enrollments.value.filter(e => e.status === 'active').length
)
const avgProgress = computed(() => {
  if (!enrollments.value.length) return 0
  const total = enrollments.value.reduce(
    (sum, e) => sum + enrollmentStore.getProgress(e.id), 0
  )
  return Math.round(total / enrollments.value.length)
})

const filteredEnrollments = computed(() => {
  const q = search.value.toLowerCase()
  if (!q) return enrollments.value
  return enrollments.value.filter(e => {
    const name  = userName(e.userId).toLowerCase()
    const email = userEmail(e.userId).toLowerCase()
    return name.includes(q) || email.includes(q)
  })
})

const scheduledQueue = computed(() => {
  const items = []
  enrollments.value.forEach(e => {
    e.goalProgresses
      ?.filter(gp => gp.status === 'locked' && gp.scheduledUnlockAt)
      .forEach(gp => {
        const goal = planStore.goals.find(g => g.id === gp.goalId)
        items.push({
          enrollmentId: e.id,
          userId:       e.userId,
          goalId:       gp.goalId,
          goalTitle:    goal?.title ?? '—',
          scheduledAt:  gp.scheduledUnlockAt,
        })
      })
  })
  return items.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
})

// Helpers
const userName = (id) => {
  const e = enrollments.value.find(en => en.userId === id)
  return e?.userName || `Usuário ${id?.slice(0, 4)}`
}
const userEmail = (id) => {
  const e = enrollments.value.find(en => en.userId === id)
  return e?.userEmail || '—'
}
const initials = (id) => {
  const name = userName(id)
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}
const formatDate     = (iso) => iso ? dayjs(iso).format('DD/MM/YY') : '—'
const statusLabel    = (s) => ({ active: 'Ativo', paused: 'Pausado', blocked: 'Bloqueado', completed: 'Concluído' }[s] ?? s)
const getPlanTitle   = (id) => planStore.plans.find(p => p.id === id)?.title ?? '—'
const linkUsageCount = (token) => enrollments.value.filter(e => e.inviteToken === token).length

const currentGoalTitle = (enrollment) => {
  const gp = enrollment.goalProgresses?.find(
    g => g.status === 'in_progress' || g.status === 'unlocked'
  )
  if (!gp) return '—'
  return planStore.goals.find(g => g.id === gp.goalId)?.title ?? '—'
}

// Ações
const mentorUnlockAll = async () => {
  try {
    await enrollmentStore.mentorUnlockForAll(planId)
    await enrollmentStore.fetchByPlan(planId)
  } catch (err) {
    toast.error(err.message)
  }
}

const unlockGroup = async () => {
  await enrollmentStore.mentorUnlockForGroup(selectedGroup.value)
  selectedGroup.value = []
  await enrollmentStore.fetchByPlan(planId)
}

const openStudent = (enrollment) => {
  selectedEnrollment.value = enrollment
}

const removeLink = async (id) => {
  await enrollmentStore.revokeLink(planId, id)
}

const copyLink = async (token) => {
  await navigator.clipboard.writeText(enrollmentStore.getLinkUrl(token))
  copied.value = token
  setTimeout(() => copied.value = null, 2000)
}
</script>

<style scoped>
.manage {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 0 0 48px;
  font-family: 'DM Sans', sans-serif;
  max-width: 1100px;
}

/* Header */
.manage__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.manage__back {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-back {
  display: flex; align-items: center; gap: 4px;
  font-family: 'DM Sans', sans-serif;
  font-size: 13px; font-weight: 500;
  color: #888; background: transparent;
  border: none; cursor: pointer; padding: 0;
  transition: color 0.15s;
}
.btn-back:hover { color: #1a1a2e; }

.manage__sep { color: #ccc; }

.manage__title {
  font-size: 1.2rem; font-weight: 700;
  color: #1a1a2e; margin: 0;
}

.manage__desc {
  font-size: 12px; color: #aaa;
}

.manage__header-actions {
  display: flex; gap: 8px;
}

/* Stats */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

@media (max-width: 700px) {
  .stats-row { grid-template-columns: repeat(2, 1fr); }
}

.stat-card {
  background: #fff;
  border: 1px solid #ebe9e4;
  border-radius: 10px;
  padding: 16px;
  display: flex; flex-direction: column; gap: 4px;
}

.stat-card__value {
  font-size: 1.6rem; font-weight: 800;
  color: #1a1a2e; letter-spacing: -0.02em;
}

.stat-card__label {
  font-size: 11px; font-weight: 600;
  color: #aaa; text-transform: uppercase;
  letter-spacing: 0.08em;
}

/* Tabs */
.tabs {
  display: flex; gap: 4px;
  border-bottom: 1px solid #ebe9e4;
}

.tab {
  display: flex; align-items: center; gap: 6px;
  padding: 10px 16px;
  border: none; background: transparent;
  font-family: 'DM Sans', sans-serif;
  font-size: 13px; font-weight: 500;
  color: #888; cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color 0.15s, border-color 0.15s;
}
.tab:hover { color: #1a1a2e; }
.tab--active { color: #534AB7; border-bottom-color: #534AB7; }

.tab__count {
  background: #f0efea; color: #888;
  font-size: 10px; font-weight: 700;
  border-radius: 10px; padding: 1px 7px;
}
.tab--active .tab__count { background: #EEEDFE; color: #534AB7; }

/* Tab content */
.tab-content {
  display: flex; flex-direction: column; gap: 16px;
}

/* Toolbar */
.table-toolbar {
  display: flex; align-items: center;
  justify-content: space-between; gap: 12px;
}

.search-input {
  font-family: 'DM Sans', sans-serif; font-size: 13px;
  border: 1px solid #ddd; border-radius: 8px;
  padding: 7px 12px; outline: none; width: 240px;
}
.search-input:focus { border-color: #534AB7; }

.table-toolbar__actions { display: flex; gap: 8px; }

/* Table */
.students-table {
  background: #fff;
  border: 1px solid #ebe9e4;
  border-radius: 12px;
  overflow: hidden;
}

.students-table__head {
  display: grid;
  grid-template-columns: 2fr 100px 160px 1fr 90px 100px;
  padding: 10px 16px;
  background: #fafaf8;
  border-bottom: 1px solid #f0efea;
  font-size: 11px; font-weight: 700;
  color: #aaa; text-transform: uppercase;
  letter-spacing: 0.08em;
}

.students-table__row {
  display: grid;
  grid-template-columns: 2fr 100px 160px 1fr 90px 100px;
  padding: 14px 16px;
  border-bottom: 1px solid #f8f7f4;
  align-items: center;
  cursor: pointer;
  transition: background 0.15s;
}
.students-table__row:last-child { border-bottom: none; }
.students-table__row:hover { background: #fafaf8; }

.student-cell { display: flex; align-items: center; gap: 10px; }

.student-avatar {
  width: 32px; height: 32px;
  border-radius: 50%; background: #1a1a2e;
  color: #fff; font-size: 11px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.student-avatar--sm { width: 24px; height: 24px; font-size: 9px; }

.student-name { font-size: 13px; font-weight: 600; color: #1a1a2e; margin: 0; }
.student-email { font-size: 11px; color: #aaa; margin: 0; }

.progress-cell {
  display: flex; align-items: center; gap: 8px;
}

.progress-bar {
  flex: 1; height: 5px;
  background: #f0efea; border-radius: 10px; overflow: hidden;
}

.progress-bar__fill {
  height: 100%; background: #534AB7;
  border-radius: 10px; transition: width 0.3s;
}

.progress-pct { font-size: 11px; font-weight: 700; color: #888; min-width: 30px; }

.current-goal { font-size: 12px; color: #666; }
.date-cell { font-size: 12px; color: #aaa; }

.row-actions { display: flex; gap: 4px; justify-content: flex-end; }

.table-empty {
  font-size: 13px; color: #bbb;
  text-align: center; padding: 32px;
}

/* Status badges */
.status-badge {
  font-size: 10px; font-weight: 700;
  letter-spacing: 0.06em; text-transform: uppercase;
  border-radius: 5px; padding: 2px 8px;
}
.status-badge--active    { background: #EAF3DE; color: #3B6D11; }
.status-badge--paused    { background: #FAEEDA; color: #854F0B; }
.status-badge--blocked   { background: #FCEBEB; color: #A32D2D; }
.status-badge--completed { background: #EEEDFE; color: #534AB7; }

/* Icon buttons */
.icon-btn {
  width: 26px; height: 26px;
  border-radius: 6px; border: none;
  background: transparent; padding: 0;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #999;
  transition: background 0.15s, color 0.15s;
}
.icon-btn:hover { background: #f0efea; color: #444; }
.icon-btn--warn:hover  { background: #FAEEDA; color: #854F0B; }
.icon-btn--ok:hover    { background: #EAF3DE; color: #3B6D11; }
.icon-btn--danger:hover { background: #FCEBEB; color: #A32D2D; }

/* Buttons */
.btn-primary {
  display: flex; align-items: center; gap: 6px;
  font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600;
  background: #534AB7; color: #fff; border: none;
  border-radius: 8px; padding: 8px 16px;
  cursor: pointer; transition: background 0.15s, opacity 0.15s;
}
.btn-primary:hover { background: #3C3489; }
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }

.btn-outline {
  display: flex; align-items: center; gap: 6px;
  font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500;
  background: #fff; color: #444;
  border: 1px solid #ddd; border-radius: 8px; padding: 7px 14px;
  cursor: pointer; transition: background 0.15s;
}
.btn-outline:hover { background: #f5f4f0; }

.btn-sm { font-size: 12px; padding: 6px 12px; }

/* Links */
.links-toolbar { display: flex; justify-content: flex-end; }

.links-list { display: flex; flex-direction: column; gap: 10px; }

.link-card {
  background: #fff; border: 1px solid #ebe9e4;
  border-radius: 12px; padding: 16px;
  display: flex; flex-direction: column; gap: 10px;
}

.link-card__top {
  display: flex; align-items: center;
  justify-content: space-between; gap: 12px;
}

.link-card__info { display: flex; align-items: center; gap: 8px; }

.link-type {
  font-size: 11px; font-weight: 700;
  letter-spacing: 0.06em; text-transform: uppercase;
  border-radius: 5px; padding: 2px 8px;
}
.link-type--global { background: #E6F1FB; color: #185FA5; }
.link-type--single { background: #EEEDFE; color: #534AB7; }

.link-expires { font-size: 11px; color: #aaa; }
.link-used { font-size: 11px; color: #3B6D11; font-weight: 600; }

.link-card__actions { display: flex; gap: 6px; align-items: center; }

.btn-copy {
  display: flex; align-items: center; gap: 5px;
  font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 500;
  background: #f5f4f0; color: #444;
  border: 1px solid #ddd; border-radius: 7px; padding: 5px 10px;
  cursor: pointer; transition: background 0.15s;
}
.btn-copy:hover { background: #ebe9e4; }

.link-card__url {
  font-size: 11px; color: #888;
  background: #fafaf8; border-radius: 7px;
  padding: 8px 12px; word-break: break-all;
  font-family: monospace;
}

.link-card__stats {
  display: flex; gap: 16px;
  font-size: 11px; color: #aaa;
}
.link-card__stats span {
  display: flex; align-items: center; gap: 4px;
}

/* Liberação */
.release-section {
  background: #fff; border: 1px solid #ebe9e4;
  border-radius: 12px; padding: 20px;
  display: flex; flex-direction: column; gap: 12px;
}

.release-section__title {
  font-size: 14px; font-weight: 700; color: #1a1a2e; margin: 0;
}

.release-section__desc {
  font-size: 13px; color: #888; margin: 0; line-height: 1.6;
}

.group-select {
  display: flex; flex-direction: column; gap: 4px;
  max-height: 240px; overflow-y: auto;
}

.group-item {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px; border-radius: 8px;
  cursor: pointer; transition: background 0.15s;
}
.group-item:hover { background: #fafaf8; }

.group-item__check { cursor: pointer; }
.group-item__name { flex: 1; font-size: 13px; font-weight: 500; color: #2a2a2a; }

.schedule-list { display: flex; flex-direction: column; gap: 6px; }

.schedule-item {
  display: grid; grid-template-columns: 1fr 2fr 100px;
  padding: 10px 12px; background: #fafaf8;
  border-radius: 8px; gap: 12px; align-items: center;
}

.schedule-item__user { font-size: 12px; font-weight: 600; color: #444; }
.schedule-item__goal { font-size: 12px; color: #666; }
.schedule-item__date { font-size: 11px; color: #aaa; text-align: right; }
</style>