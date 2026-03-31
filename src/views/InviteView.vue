<template>
  <div class="invite-page">

    <!-- Loading -->
    <div v-if="state === 'loading'" class="invite-card invite-card--center">
      <div class="spinner" />
      <p class="invite-muted">Verificando convite...</p>
    </div>

    <!-- Inválido / expirado -->
    <div v-else-if="state === 'invalid'" class="invite-card invite-card--center">
      <div class="invite-icon invite-icon--error">✕</div>
      <h2 class="invite-title">Link inválido</h2>
      <p class="invite-muted">{{ errorMessage }}</p>
    </div>

    <!-- Convite válido -->
    <div v-else-if="state === 'valid'" class="invite-card">

      <!-- Branding -->
      <div class="invite-brand">
        <div class="invite-brand__icon">⚖</div>
        <span class="invite-brand__name">Metas Leges</span>
      </div>

      <!-- Mentor -->
      <div class="invite-mentor">
        <div class="invite-mentor__avatar">{{ mentorInitials }}</div>
        <div>
          <p class="invite-mentor__label">Convite de</p>
          <p class="invite-mentor__name">{{ mentorName }}</p>
        </div>
      </div>

      <!-- Plano -->
      <div class="invite-plan">
        <div class="invite-plan__header">
          <span class="invite-plan__badge">Plano de estudos</span>
          <span v-if="link?.type === 'single'" class="invite-plan__badge invite-plan__badge--single">
            Convite pessoal
          </span>
        </div>
        <h1 class="invite-plan__title">{{ plan?.title }}</h1>
        <p v-if="plan?.description" class="invite-plan__desc">{{ plan.description }}</p>
      </div>

      <!-- Stats do plano -->
      <div class="invite-stats">
        <div class="invite-stat">
          <span class="invite-stat__val">{{ goalCount }}</span>
          <span class="invite-stat__label">Metas</span>
        </div>
        <div class="invite-stat">
          <span class="invite-stat__val">{{ taskCount }}</span>
          <span class="invite-stat__label">Tarefas</span>
        </div>
        <div class="invite-stat">
          <span class="invite-stat__val">{{ studentCount }}</span>
          <span class="invite-stat__label">Alunos</span>
        </div>
      </div>

      <!-- Metas com tarefas (accordion) -->
      <div class="invite-goals">
        <p class="invite-goals__label">O que você vai estudar</p>
        <div class="invite-goals__list">
          <div
            v-for="(goal, i) in planGoals"
            :key="goal.id"
            class="invite-goal-item"
            :class="{ 'invite-goal-item--open': expandedGoal === goal.id }"
          >
            <button class="invite-goal-item__header" @click="toggleGoal(goal.id)">
              <span class="invite-goal-item__num">{{ String(i + 1).padStart(2, '0') }}</span>
              <span class="invite-goal-item__title">{{ goal.title }}</span>
              <span class="invite-goal-item__count">{{ (goal.taskIds ?? []).length }}</span>
              <ChevronDown :size="14" class="invite-goal-item__chevron" />
            </button>

            <div v-if="expandedGoal === goal.id" class="invite-goal-tasks">
              <div
                v-for="task in getGoalTasks(goal)"
                :key="task.id"
                class="invite-task"
              >
                <component :is="taskIcon(task.type)" :size="13" class="invite-task__icon" />
                <div class="invite-task__body">
                  <span class="invite-task__title">{{ task.title }}</span>
                  <span class="invite-task__type">{{ taskLabel(task.type) }}</span>
                </div>
              </div>
              <p v-if="!getGoalTasks(goal).length" class="invite-task__empty">
                Nenhuma tarefa nesta meta
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- CTA -->
      <button class="invite-cta" :disabled="enrolling" @click="acceptInvite">
        {{ enrolling ? 'Inscrevendo...' : authStore.isAuthenticated ? 'Participar deste plano' : 'Aceitar convite e criar conta' }}
        <span v-if="!enrolling" class="invite-cta__arrow">→</span>
      </button>

      <p class="invite-footer">
        <template v-if="authStore.isAuthenticated">
          As metas deste plano serão adicionadas ao seu painel e liberadas gradualmente.
        </template>
        <template v-else>
          Ao aceitar, você será redirecionado para fazer login com sua conta.
          Suas metas serão liberadas gradualmente pelo seu mentor.
        </template>
      </p>

    </div>

    <!-- Já aceito (link single use já utilizado) -->
    <div v-else-if="state === 'used'" class="invite-card invite-card--center">
      <div class="invite-icon invite-icon--warn">!</div>
      <h2 class="invite-title">Convite já utilizado</h2>
      <p class="invite-muted">Este link de convite é de uso único e já foi utilizado.</p>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronDown, FileText, HelpCircle, Video, RefreshCw, Scale, MoreHorizontal } from 'lucide-vue-next'
import { useEnrollmentStore } from '@/stores/useEnrollmentStore'
import { useAuthStore } from '@/stores/auth.store'
import { toast } from 'vue-sonner'

const route  = useRoute()
const router = useRouter()
const enrollmentStore = useEnrollmentStore()
const authStore       = useAuthStore()

const token      = route.params.token
const state      = ref('loading')
const errorMessage = ref('')
const link       = ref(null)
const plan       = ref(null)
const planGoals  = ref([])
const planTasks  = ref([])
const expandedGoal = ref(null)

onMounted(async () => {
  try {
    const result = await enrollmentStore.validateInviteLink(token)

    link.value      = result.link
    plan.value      = result.plan
    planGoals.value = result.goals ?? []
    planTasks.value = result.tasks ?? []

    sessionStorage.setItem('pending_invite_token', token)
    sessionStorage.setItem('pending_invite_plan',  result.plan.id)

    state.value = 'valid'
  } catch (err) {
    const msg = err.message ?? ''
    if (msg.includes('já utilizado') || msg.includes('410')) {
      state.value = 'used'
    } else {
      state.value    = 'invalid'
      errorMessage.value = msg
    }
  }
})

const goalCount    = computed(() => plan.value ? planGoals.value.length : 0)
const taskCount    = computed(() => planGoals.value.reduce((s, g) => s + (g.taskIds?.length ?? 0), 0))
const studentCount = computed(() => link.value ? (link.value.usageCount ?? 0) : 0)

const mentorName     = computed(() => plan.value?.mentorName ?? 'Seu mentor')
const mentorInitials = computed(() =>
  mentorName.value.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
)

function toggleGoal(id) {
  expandedGoal.value = expandedGoal.value === id ? null : id
}

function getGoalTasks(goal) {
  return (goal.taskIds ?? [])
    .map(id => planTasks.value.find(t => t.id === id))
    .filter(Boolean)
}

const TASK_ICONS = {
  leitura_pdf: FileText,
  questoes:    HelpCircle,
  video:       Video,
  revisao:     RefreshCw,
  lei_seca:    Scale,
  outras:      MoreHorizontal,
}

const TASK_LABELS = {
  leitura_pdf: 'Leitura PDF',
  questoes:    'Questões',
  video:       'Vídeo',
  revisao:     'Revisão',
  lei_seca:    'Lei Seca',
  outras:      'Outras',
}

function taskIcon(type)  { return TASK_ICONS[type] ?? MoreHorizontal }
function taskLabel(type) { return TASK_LABELS[type] ?? type }

const enrolling = ref(false)

async function acceptInvite() {
  // Já logado → inscreve direto
  if (authStore.isAuthenticated) {
    if (enrolling.value) return
    enrolling.value = true
    try {
      await enrollmentStore.enrollViaLink(token)
      toast.success('Inscrição realizada! Redirecionando para suas metas...')
      router.push('/metas')
    } catch (err) {
      const msg = err.message ?? ''
      if (msg.includes('já está matriculado') || msg.includes('409')) {
        toast.info('Você já está inscrito neste plano.')
        router.push('/metas')
      } else {
        toast.error(msg || 'Erro ao se inscrever.')
      }
    } finally {
      enrolling.value = false
    }
    return
  }

  // Não logado → salva token e vai pro OAuth
  sessionStorage.setItem('pending_invite_token', token)
  sessionStorage.setItem('pending_invite_plan', plan.value.id)
  await authStore.login()
}
</script>

<style scoped>
.invite-page {
  min-height: 100vh;
  background: #f8f7f4;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  font-family: 'DM Sans', sans-serif;
}

.invite-card {
  background: #fff;
  border: 1px solid #ebe9e4;
  border-radius: 20px;
  padding: 36px;
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.invite-card--center {
  align-items: center;
  text-align: center;
  gap: 16px;
}

/* Branding */
.invite-brand {
  display: flex;
  align-items: center;
  gap: 8px;
}
.invite-brand__icon {
  width: 32px; height: 32px;
  background: #1a1a2e; border-radius: 8px;
  font-size: 16px;
  display: flex; align-items: center; justify-content: center;
}
.invite-brand__name {
  font-size: 13px; font-weight: 700;
  color: #1a1a2e; letter-spacing: 0.02em;
}

/* Mentor */
.invite-mentor {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: #fafaf8;
  border-radius: 12px;
  border: 1px solid #f0efea;
}
.invite-mentor__avatar {
  width: 40px; height: 40px;
  border-radius: 50%; background: #1a1a2e;
  color: #fff; font-size: 13px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.invite-mentor__label { font-size: 11px; color: #aaa; margin: 0; }
.invite-mentor__name  { font-size: 14px; font-weight: 700; color: #1a1a2e; margin: 0; }

/* Plano */
.invite-plan__header {
  display: flex; gap: 6px; margin-bottom: 8px;
}
.invite-plan__badge {
  font-size: 10px; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase;
  background: #EEEDFE; color: #534AB7;
  border-radius: 5px; padding: 2px 8px;
}
.invite-plan__badge--single {
  background: #EAF3DE; color: #3B6D11;
}
.invite-plan__title {
  font-size: 1.6rem; font-weight: 800;
  color: #1a1a2e; letter-spacing: -0.03em;
  line-height: 1.2; margin: 0 0 8px;
}
.invite-plan__desc {
  font-size: 13px; color: #888;
  line-height: 1.6; margin: 0;
}

/* Stats */
.invite-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  background: #fafaf8;
  border: 1px solid #f0efea;
  border-radius: 12px;
  overflow: hidden;
}
.invite-stat {
  display: flex; flex-direction: column;
  align-items: center; padding: 14px 8px; gap: 3px;
  border-right: 1px solid #f0efea;
}
.invite-stat:last-child { border-right: none; }
.invite-stat__val {
  font-size: 1.4rem; font-weight: 800;
  color: #1a1a2e; letter-spacing: -0.02em;
}
.invite-stat__label {
  font-size: 10px; font-weight: 700; color: #bbb;
  text-transform: uppercase; letter-spacing: 0.08em;
}

/* Goals preview */
.invite-goals__label {
  font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.1em;
  color: #aaa; margin: 0 0 10px;
}
.invite-goals__list {
  display: flex; flex-direction: column; gap: 6px;
}
.invite-goal-item {
  background: #fafaf8; border-radius: 8px;
  border: 1px solid #f0efea;
  overflow: hidden;
  transition: border-color 0.15s;
}
.invite-goal-item--open {
  border-color: #d8d6f0;
}
.invite-goal-item__header {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px;
  width: 100%; border: none; background: transparent;
  cursor: pointer; font-family: 'DM Sans', sans-serif;
  text-align: left;
}
.invite-goal-item__header:hover { background: #f5f4f0; }
.invite-goal-item__num {
  font-size: 10px; font-weight: 800; color: #AFA9EC;
  letter-spacing: 0.08em; flex-shrink: 0;
}
.invite-goal-item__title {
  font-size: 13px; font-weight: 600; color: #1a1a2e; flex: 1;
}
.invite-goal-item__count {
  font-size: 10px; font-weight: 700; color: #888;
  background: #eee; border-radius: 10px;
  padding: 1px 7px; flex-shrink: 0;
}
.invite-goal-item__chevron {
  color: #bbb; flex-shrink: 0;
  transition: transform 0.2s;
}
.invite-goal-item--open .invite-goal-item__chevron {
  transform: rotate(180deg);
}

/* Tasks dentro da meta */
.invite-goal-tasks {
  padding: 0 12px 10px;
  display: flex; flex-direction: column; gap: 4px;
}
.invite-task {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 8px 10px;
  background: #fff; border-radius: 6px;
  border: 1px solid #f0efea;
}
.invite-task__icon {
  color: #534AB7; flex-shrink: 0; margin-top: 1px;
}
.invite-task__body {
  display: flex; flex-direction: column; gap: 1px;
  min-width: 0;
}
.invite-task__title {
  font-size: 12px; font-weight: 600; color: #1a1a2e;
}
.invite-task__type {
  font-size: 10px; font-weight: 600; color: #aaa;
  text-transform: uppercase; letter-spacing: 0.06em;
}
.invite-task__empty {
  font-size: 11px; color: #ccc; margin: 0;
  text-align: center; padding: 8px 0;
}

/* CTA */
.invite-cta {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; padding: 14px;
  background: #1a1a2e; color: #fff;
  border: none; border-radius: 12px;
  font-family: 'DM Sans', sans-serif;
  font-size: 15px; font-weight: 700;
  cursor: pointer; transition: background 0.15s;
  letter-spacing: -0.01em;
}
.invite-cta:hover { background: #2d2d4e; }
.invite-cta__arrow { font-size: 18px; }

.invite-footer {
  font-size: 11px; color: #bbb;
  text-align: center; line-height: 1.6; margin: 0;
}

/* States */
.invite-icon {
  width: 52px; height: 52px; border-radius: 50%;
  font-size: 22px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}
.invite-icon--error { background: #FCEBEB; color: #A32D2D; }
.invite-icon--warn  { background: #FAEEDA; color: #854F0B; }

.invite-title {
  font-size: 18px; font-weight: 700; color: #1a1a2e; margin: 0;
}
.invite-muted { font-size: 13px; color: #aaa; margin: 0; }

/* Spinner */
.spinner {
  width: 32px; height: 32px;
  border: 3px solid #f0efea;
  border-top-color: #534AB7;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>