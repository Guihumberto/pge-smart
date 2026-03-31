<template>
  <div class="drawer-overlay" @click.self="$emit('close')">
    <div class="drawer">

      <!-- Header -->
      <div class="drawer__header">
        <div class="drawer__student">
          <div class="student-avatar">{{ initials }}</div>
          <div>
            <h3 class="drawer__name">{{ user?.name ?? 'Aluno' }}</h3>
            <p class="drawer__email">{{ user?.email ?? '—' }}</p>
          </div>
        </div>
        <button class="icon-btn" @click="$emit('close')"><X :size="16" /></button>
      </div>

      <!-- Planos do aluno -->
      <div class="drawer__plans-tabs">
        <button
          v-for="e in allEnrollments"
          :key="e.id"
          :class="['plan-tab', { 'plan-tab--active': activePlan === e.id }]"
          @click="activePlan = e.id"
        >
          {{ getPlanTitle(e.planId) }}
        </button>
      </div>

      <!-- Progresso geral -->
      <div v-if="activeEnrollment" class="drawer__summary">
        <div class="summary-stat">
          <span class="summary-stat__val">{{ enrollmentStore.getProgress(activeEnrollment.id) }}%</span>
          <span class="summary-stat__label">Concluído</span>
        </div>
        <div class="summary-stat">
          <span class="summary-stat__val">{{ completedGoals }}</span>
          <span class="summary-stat__label">Metas feitas</span>
        </div>
        <div class="summary-stat">
          <span class="summary-stat__val">{{ pendingGoals }}</span>
          <span class="summary-stat__label">Em andamento</span>
        </div>
        <div class="summary-stat">
          <span class="summary-stat__val">{{ lockedGoals }}</span>
          <span class="summary-stat__label">Bloqueadas</span>
        </div>
      </div>

      <!-- Barra de progresso geral -->
      <div class="drawer__progress-bar">
        <div
          class="drawer__progress-bar__fill"
          :style="{ width: enrollmentStore.getProgress(activeEnrollment?.id) + '%' }"
        />
      </div>

      <!-- Timeline de metas -->
      <div class="drawer__body">
        <div
          v-for="(gp, idx) in goalProgresses"
          :key="gp.id"
          :class="['goal-timeline-item', `goal-timeline-item--${gp.status}`]"
        >
          <div class="goal-timeline-item__line" v-if="idx < goalProgresses.length - 1" />

          <div class="goal-timeline-item__dot">
            <CheckCircle2 v-if="gp.status === 'completed'" :size="16" />
            <PlayCircle   v-else-if="gp.status === 'in_progress'" :size="16" />
            <Circle       v-else-if="gp.status === 'unlocked'" :size="16" />
            <Lock         v-else :size="16" />
          </div>

          <div class="goal-timeline-item__content">
            <div class="goal-timeline-item__head">
              <span class="goal-timeline-item__title">
                {{ getGoalTitle(gp.goalId) }}
              </span>
              <span :class="['gp-badge', `gp-badge--${gp.status}`]">
                {{ gpLabel(gp.status) }}
              </span>
            </div>

            <!-- Tarefas -->
            <div v-if="gp.status !== 'locked'" class="task-list">
              <div
                v-for="tp in gp.taskProgresses"
                :key="tp.taskId"
                :class="['task-item', { 'task-item--done': tp.done }]"
              >
                <div class="task-item__check">
                  <CheckCircle2 v-if="tp.done" :size="12" />
                  <Circle v-else :size="12" />
                </div>
                <span class="task-item__name">{{ getTaskTitle(tp.taskId) }}</span>
                <span v-if="tp.doneAt" class="task-item__date">{{ formatDate(tp.doneAt) }}</span>
              </div>
            </div>

            <p v-if="gp.status === 'locked' && gp.scheduledUnlockAt" class="gp-scheduled">
              Liberação agendada: {{ formatDate(gp.scheduledUnlockAt) }}
            </p>

            <p v-if="gp.completedAt" class="gp-completed-at">
              Concluída em {{ formatDate(gp.completedAt) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Ações -->
      <div class="drawer__footer">
        <button
          class="btn-outline-sm"
          @click="enrollmentStore.mentorUnlockForUser(activeEnrollment.id)"
        >
          <Unlock :size="13" /> Liberar próxima meta
        </button>
        <button
          v-if="activeEnrollment?.status === 'active'"
          class="btn-warn-sm"
          @click="enrollmentStore.setEnrollmentStatus(activeEnrollment.id, 'paused')"
        >
          <PauseCircle :size="13" /> Pausar aluno
        </button>
        <button
          v-else-if="activeEnrollment?.status === 'paused'"
          class="btn-ok-sm"
          @click="enrollmentStore.setEnrollmentStatus(activeEnrollment.id, 'active')"
        >
          <PlayCircle :size="13" /> Reativar aluno
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  X, CheckCircle2, PlayCircle, Circle, Lock,
  Unlock, PauseCircle
} from 'lucide-vue-next'
import { useEnrollmentStore } from '@/stores/useEnrollmentStore'
import { usePlanStore } from '@/stores/usePlanStore'
import { useTaskStore } from '@/stores/useTaskStore'
import { useUserStore } from '@/stores/useUserStore'
import dayjs from 'dayjs'

const props = defineProps({ enrollment: { type: Object, required: true } })
defineEmits(['close'])

const enrollmentStore = useEnrollmentStore()
const planStore = usePlanStore()
const taskStore = useTaskStore()
const userStore = useUserStore()

const activePlan = ref(props.enrollment.id)

const user = computed(() => userStore.getById(props.enrollment.userId))
const initials = computed(() =>
  (user.value?.name ?? 'U').split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase()
)

// Todos os enrollments do mesmo usuário
const allEnrollments = computed(() => enrollmentStore.byUser(props.enrollment.userId))

const activeEnrollment = computed(() =>
  allEnrollments.value.find(e => e.id === activePlan.value) ?? props.enrollment
)

const goalProgresses = computed(() => activeEnrollment.value?.goalProgresses ?? [])

const completedGoals = computed(() => goalProgresses.value.filter(g => g.status === 'completed').length)
const pendingGoals   = computed(() => goalProgresses.value.filter(g => g.status === 'in_progress' || g.status === 'unlocked').length)
const lockedGoals    = computed(() => goalProgresses.value.filter(g => g.status === 'locked').length)

const getPlanTitle  = (id) => planStore.plans.find(p => p.id === id)?.title ?? '—'
const getGoalTitle  = (id) => planStore.goals.find(g => g.id === id)?.title ?? '—'
const getTaskTitle  = (id) => taskStore.getById(id)?.title ?? '—'
const formatDate    = (iso) => iso ? dayjs(iso).format('DD/MM/YY') : '—'

const gpLabel = (s) => ({
  locked: 'Bloqueada', unlocked: 'Disponível',
  in_progress: 'Em andamento', completed: 'Concluída'
}[s] ?? s)
</script>

<style scoped>
.drawer-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.3); z-index: 300;
  display: flex; justify-content: flex-end;
}

.drawer {
  width: 440px; max-width: 100%;
  background: #fff; height: 100%;
  display: flex; flex-direction: column;
  overflow: hidden;
  font-family: 'DM Sans', sans-serif;
  border-left: 1px solid #ebe9e4;
}

.drawer__header {
  display: flex; align-items: center;
  justify-content: space-between;
  padding: 20px 20px 16px;
  border-bottom: 1px solid #f0efea;
  flex-shrink: 0;
}

.drawer__student { display: flex; align-items: center; gap: 12px; }

.student-avatar {
  width: 40px; height: 40px; border-radius: 50%;
  background: #1a1a2e; color: #fff;
  font-size: 13px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}

.drawer__name { font-size: 15px; font-weight: 700; color: #1a1a2e; margin: 0; }
.drawer__email { font-size: 12px; color: #aaa; margin: 0; }

/* Plan tabs */
.drawer__plans-tabs {
  display: flex; gap: 4px; padding: 12px 20px 0;
  border-bottom: 1px solid #f0efea;
  flex-shrink: 0; overflow-x: auto;
}

.plan-tab {
  font-family: 'DM Sans', sans-serif;
  font-size: 12px; font-weight: 500;
  color: #888; background: transparent;
  border: none; cursor: pointer;
  padding: 6px 12px;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px; white-space: nowrap;
  transition: color 0.15s, border-color 0.15s;
}
.plan-tab:hover { color: #1a1a2e; }
.plan-tab--active { color: #534AB7; border-bottom-color: #534AB7; }

/* Summary */
.drawer__summary {
  display: grid; grid-template-columns: repeat(4, 1fr);
  gap: 0; border-bottom: 1px solid #f0efea;
  flex-shrink: 0;
}

.summary-stat {
  display: flex; flex-direction: column;
  align-items: center; padding: 14px 8px;
  border-right: 1px solid #f0efea;
  gap: 2px;
}
.summary-stat:last-child { border-right: none; }

.summary-stat__val {
  font-size: 1.3rem; font-weight: 800;
  color: #1a1a2e; letter-spacing: -0.02em;
}
.summary-stat__label {
  font-size: 10px; font-weight: 600;
  color: #bbb; text-transform: uppercase; letter-spacing: 0.08em;
}

/* Progress bar */
.drawer__progress-bar {
  height: 3px; background: #f0efea; flex-shrink: 0;
}
.drawer__progress-bar__fill {
  height: 100%; background: #534AB7;
  transition: width 0.4s;
}

/* Body / Timeline */
.drawer__body {
  flex: 1; overflow-y: auto;
  padding: 16px 20px;
  display: flex; flex-direction: column; gap: 0;
}

.goal-timeline-item {
  display: flex; gap: 12px;
  position: relative; padding-bottom: 20px;
}
.goal-timeline-item:last-child { padding-bottom: 0; }

.goal-timeline-item__line {
  position: absolute;
  left: 7px; top: 18px;
  width: 1px; height: calc(100% - 4px);
  background: #e8e6e0;
}

.goal-timeline-item__dot {
  flex-shrink: 0; width: 16px; height: 16px;
  margin-top: 2px; z-index: 1;
}

.goal-timeline-item--completed .goal-timeline-item__dot { color: #3B6D11; }
.goal-timeline-item--in_progress .goal-timeline-item__dot { color: #534AB7; }
.goal-timeline-item--unlocked .goal-timeline-item__dot { color: #854F0B; }
.goal-timeline-item--locked .goal-timeline-item__dot { color: #ccc; }

.goal-timeline-item__content { flex: 1; min-width: 0; }

.goal-timeline-item__head {
  display: flex; align-items: center;
  justify-content: space-between; gap: 8px;
  margin-bottom: 8px;
}

.goal-timeline-item__title {
  font-size: 13px; font-weight: 700; color: #1a1a2e;
}
.goal-timeline-item--locked .goal-timeline-item__title { color: #bbb; }

/* GP badges */
.gp-badge {
  font-size: 10px; font-weight: 700;
  letter-spacing: 0.05em; text-transform: uppercase;
  border-radius: 5px; padding: 2px 7px; white-space: nowrap;
}
.gp-badge--completed   { background: #EAF3DE; color: #3B6D11; }
.gp-badge--in_progress { background: #EEEDFE; color: #534AB7; }
.gp-badge--unlocked    { background: #FAEEDA; color: #854F0B; }
.gp-badge--locked      { background: #f0efea; color: #aaa; }

/* Task list */
.task-list {
  display: flex; flex-direction: column; gap: 4px;
  background: #fafaf8; border-radius: 8px;
  padding: 8px 10px; margin-bottom: 4px;
}

.task-item {
  display: flex; align-items: center; gap: 7px;
  font-size: 12px; color: #666; padding: 2px 0;
}
.task-item--done { color: #aaa; }
.task-item--done .task-item__name { text-decoration: line-through; }

.task-item__check { flex-shrink: 0; }
.task-item--done .task-item__check { color: #3B6D11; }
.task-item--done .task-item__check { color: #ccc; }

.task-item__name { flex: 1; }
.task-item__date { font-size: 10px; color: #ccc; white-space: nowrap; }

.gp-scheduled  { font-size: 11px; color: #854F0B; margin: 4px 0 0; }
.gp-completed-at { font-size: 11px; color: #aaa; margin: 4px 0 0; }

/* Footer */
.drawer__footer {
  display: flex; gap: 8px; padding: 16px 20px;
  border-top: 1px solid #f0efea; flex-shrink: 0;
  flex-wrap: wrap;
}

.btn-outline-sm, .btn-warn-sm, .btn-ok-sm {
  display: flex; align-items: center; gap: 5px;
  font-family: 'DM Sans', sans-serif;
  font-size: 12px; font-weight: 600;
  border-radius: 7px; padding: 6px 12px; cursor: pointer;
  transition: background 0.15s;
}
.btn-outline-sm { background: transparent; border: 1px solid #ddd; color: #444; }
.btn-outline-sm:hover { background: #f5f4f0; }
.btn-warn-sm  { background: #FAEEDA; border: none; color: #854F0B; }
.btn-warn-sm:hover  { background: #f5d9b0; }
.btn-ok-sm    { background: #EAF3DE; border: none; color: #3B6D11; }
.btn-ok-sm:hover    { background: #cfe8b0; }

.icon-btn {
  width: 28px; height: 28px; border-radius: 6px;
  border: none; background: transparent; padding: 0;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #999; transition: background 0.15s;
}
.icon-btn:hover { background: #f0efea; color: #444; }
</style>