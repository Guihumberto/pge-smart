<template>
  <div class="student-goals">
    <div class="student-goals__header">
      <div class="header-icon">
        <Target :size="22" />
      </div>
      <div>
        <h1 class="header-title">Minhas Metas</h1>
        <p class="header-sub">Acompanhe seu progresso nos planos de estudo</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="studentStore.loading" class="goals-loading">
      <span class="goals-loading__spinner" />
      Carregando metas...
    </div>

    <!-- Empty -->
    <div v-else-if="!studentStore.myGoals.length" class="goals-empty">
      <BookOpen :size="32" class="goals-empty__icon" />
      <p>Nenhuma meta disponível.</p>
      <p class="goals-empty__hint">Aguarde seu mentor liberar as metas do plano de estudo.</p>
    </div>

    <!-- Goal list -->
    <div v-else class="goals-list">
      <RouterLink
        v-for="goal in studentStore.myGoals"
        :key="`${goal.enrollmentId}-${goal.goalId}`"
        :to="{
          name: 'StudentGoalDetail',
          params: {
            enrollmentId: goal.enrollmentId,
            goalProgressId: goal.goalProgressId,
          },
        }"
        class="goal-card"
        :class="{
          'goal-card--completed': goal.status === 'completed',
          'goal-card--in-progress': goal.status === 'in_progress',
        }"
      >
        <!-- Status icon -->
        <div class="goal-card__status">
          <CheckCircle2 v-if="goal.status === 'completed'" :size="20" class="status-icon--done" />
          <Circle v-else :size="20" class="status-icon--pending" />
        </div>

        <div class="goal-card__body">
          <span class="goal-card__plan">{{ goal.planTitle }}</span>
          <h3 class="goal-card__title">{{ goal.title }}</h3>
          <p v-if="goal.description" class="goal-card__desc">{{ goal.description }}</p>

          <!-- Progress -->
          <div class="goal-card__progress">
            <div class="progress-bar">
              <div class="progress-bar__fill" :style="{ width: goal.progressPct + '%' }" />
            </div>
            <span class="progress-label">
              {{ goal.doneTasks }}/{{ goal.totalTasks }} tarefa{{ goal.totalTasks !== 1 ? 's' : '' }}
            </span>
          </div>
        </div>

        <ChevronRight :size="16" class="goal-card__arrow" />
      </RouterLink>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { Target, BookOpen, CheckCircle2, Circle, ChevronRight } from 'lucide-vue-next'
import { useStudentStore } from '@/stores/useStudentStore'

const studentStore = useStudentStore()

onMounted(() => {
  studentStore.loadStudentData()
})
</script>

<style scoped>
.student-goals {
  max-width: 720px;
  margin: 0 auto;
  padding: 24px 20px 48px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.student-goals__header {
  display: flex;
  align-items: center;
  gap: 14px;
}

.header-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #EEEDFE;
  color: #534AB7;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.header-title {
  font-size: 1.3rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0 0 2px;
}

.header-sub {
  font-size: 13px;
  color: #888;
  margin: 0;
}

/* Loading */
.goals-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 64px 0;
  font-size: 13px;
  color: #aaa;
}
.goals-loading__spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #e0dff8;
  border-top-color: #534AB7;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Empty */
.goals-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 64px 0;
  text-align: center;
}
.goals-empty__icon {
  color: #d8d6d0;
}
.goals-empty p {
  margin: 0;
  font-size: 14px;
  color: #999;
}
.goals-empty__hint {
  font-size: 12px !important;
  color: #bbb !important;
}

/* Goal list */
.goals-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.goal-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: #fff;
  border: 1px solid #ebe9e4;
  border-radius: 12px;
  text-decoration: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  cursor: pointer;
}

.goal-card:hover {
  border-color: #d8d6d0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.goal-card--completed {
  background: #fbfbf9;
}

.goal-card--in-progress {
  border-left: 3px solid #534AB7;
}

.goal-card__status {
  flex-shrink: 0;
}

.status-icon--done {
  color: #22c55e;
}

.status-icon--pending {
  color: #d8d6d0;
}

.goal-card__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.goal-card__plan {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #534AB7;
}

.goal-card__title {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0;
  line-height: 1.3;
}

.goal-card__desc {
  font-size: 12px;
  color: #888;
  margin: 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.goal-card__progress {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
}

.progress-bar {
  flex: 1;
  height: 5px;
  background: #f0efea;
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar__fill {
  height: 100%;
  background: #534AB7;
  border-radius: 3px;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.progress-label {
  font-size: 11px;
  font-weight: 600;
  color: #999;
  white-space: nowrap;
}

.goal-card__arrow {
  color: #ccc;
  flex-shrink: 0;
}

@media (max-width: 600px) {
  .student-goals { padding: 16px 12px 40px; }
  .goal-card { padding: 12px; gap: 10px; }
}
</style>
