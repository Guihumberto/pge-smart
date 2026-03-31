<template>
  <div class="goal-preview">
    <!-- Top bar -->
    <div class="preview-bar">
      <button class="preview-bar__back" @click="goBack">
        <ArrowLeft :size="16" />
        <span>Voltar ao Workspace</span>
      </button>
      <div class="preview-bar__badge">
        <Eye :size="13" />
        Visualização do aluno
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="preview-loading">
      <span class="preview-loading__spinner" />
      Carregando meta...
    </div>

    <!-- Content -->
    <template v-else-if="goal">
      <!-- Goal header -->
      <div class="goal-header">
        <div class="goal-header__icon">
          <Target :size="22" />
        </div>
        <div class="goal-header__info">
          <h1 class="goal-header__title">{{ goal.title }}</h1>
          <p v-if="goal.description" class="goal-header__desc">{{ goal.description }}</p>
          <p v-if="planTitle" class="goal-header__plan">{{ planTitle }}</p>
        </div>
      </div>

      <!-- Progress -->
      <div class="progress-section">
        <div class="progress-bar">
          <div class="progress-bar__fill" :style="{ width: progressPct + '%' }" />
        </div>
        <span class="progress-label">
          {{ completedCount }}/{{ totalCount }} tarefa{{ totalCount !== 1 ? 's' : '' }} concluída{{ completedCount !== 1 ? 's' : '' }}
        </span>
      </div>

      <!-- Task list -->
      <div class="task-list">
        <div
          v-for="(task, idx) in taskItems"
          :key="task.id"
          class="task-item"
          :class="{
            'task-item--done': taskDone[task.id],
            [`task-item--${task.type}`]: true,
          }"
          :style="{ '--delay': idx * 60 + 'ms' }"
        >
          <!-- Checkbox -->
          <button
            class="task-check"
            :class="{ 'task-check--done': taskDone[task.id] }"
            @click="toggleDone(task.id)"
          >
            <Check v-if="taskDone[task.id]" :size="13" />
          </button>

          <!-- Body -->
          <div class="task-body">
            <div class="task-body__top">
              <span class="task-type-badge" :class="`task-type-badge--${task.type}`">
                <component :is="typeIcon(task.type)" :size="11" />
                {{ typeLabel(task.type) }}
              </span>

              <!-- Orientation tooltip -->
              <button
                v-if="getOrientation(task.orientationId)"
                class="task-orientation-btn"
                @click="toggleOrientation(task.id)"
              >
                <BookOpen :size="11" />
                Orientação
              </button>
            </div>

            <p class="task-body__title" :class="{ 'task-body__title--done': taskDone[task.id] }">
              {{ task.title }}
            </p>
            <p v-if="task.description" class="task-body__desc">{{ task.description }}</p>

            <!-- Orientation expanded -->
            <div
              v-if="orientationOpen[task.id] && getOrientation(task.orientationId)"
              class="task-orientation-box"
            >
              <BookOpen :size="12" class="task-orientation-box__icon" />
              <div>
                <strong>{{ getOrientation(task.orientationId).title }}</strong>
                <p>{{ getOrientation(task.orientationId).body }}</p>
              </div>
            </div>

            <!-- Actions row -->
            <div class="task-actions">
              <!-- Link -->
              <a
                v-if="task.link"
                :href="task.link"
                target="_blank"
                rel="noopener"
                class="task-action-btn"
              >
                <ExternalLink :size="12" />
                Abrir conteúdo
              </a>

              <!-- Lei Seca -->
              <button
                v-if="task.type === 'lei_seca' && task.filterLaw?.idLaw"
                class="task-action-btn task-action-btn--lei"
                @click="openLeiSeca(task)"
              >
                <Scale :size="12" />
                Abrir Lei Seca
              </button>

              <!-- Lei seca articles preview -->
              <div v-if="task.type === 'lei_seca' && task.articles?.resolved?.length" class="task-articles">
                <BookOpen :size="11" />
                {{ formatArticles(task.articles.resolved) }}
                <span v-if="task.lawSource" class="task-articles__law">{{ task.lawSource }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Completion message -->
      <div v-if="allDone && totalCount > 0" class="completion-msg">
        <PartyPopper :size="20" />
        <span>Meta concluída! Todas as tarefas foram finalizadas.</span>
      </div>
    </template>

    <!-- Not found -->
    <div v-else class="preview-empty">
      <p>Meta não encontrada.</p>
      <button class="btn-back" @click="goBack">Voltar</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft, Eye, Target, Check, ExternalLink,
  Scale, BookOpen, FileText, HelpCircle, Video,
  RefreshCw, MoreHorizontal, PartyPopper,
} from 'lucide-vue-next'
import { usePlanStore } from '@/stores/usePlanStore'
import { useTaskStore } from '@/stores/useTaskStore'
import { useOrientationStore } from '@/stores/useOrientationStore'
import { formatArticles } from '@/utils/articleParser'

const route  = useRoute()
const router = useRouter()

const planStore        = usePlanStore()
const taskStore        = useTaskStore()
const orientationStore = useOrientationStore()

const loading = ref(true)
const taskDone = reactive({})
const orientationOpen = reactive({})

const planId = computed(() => route.params.planId)
const goalId = computed(() => route.params.goalId)

const goal = computed(() =>
  planStore.goals.find(g => g.id === goalId.value)
)

const planTitle = computed(() =>
  planStore.plans.find(p => p.id === planId.value)?.title ?? ''
)

const taskItems = computed(() => {
  if (!goal.value?.taskIds?.length) return []
  return goal.value.taskIds
    .map(id => taskStore.getById(id))
    .filter(Boolean)
})

const totalCount = computed(() => taskItems.value.length)
const completedCount = computed(() =>
  taskItems.value.filter(t => taskDone[t.id]).length
)
const progressPct = computed(() =>
  totalCount.value ? (completedCount.value / totalCount.value) * 100 : 0
)
const allDone = computed(() =>
  totalCount.value > 0 && completedCount.value === totalCount.value
)

const typeIcons = {
  leitura_pdf: FileText,
  questoes:    HelpCircle,
  video:       Video,
  revisao:     RefreshCw,
  lei_seca:    Scale,
  outras:      MoreHorizontal,
}

const typeLabels = {
  leitura_pdf: 'PDF',
  questoes:    'Questões',
  video:       'Vídeo',
  revisao:     'Revisão',
  lei_seca:    'Lei Seca',
  outras:      'Outras',
}

const typeIcon  = (type) => typeIcons[type] ?? MoreHorizontal
const typeLabel = (type) => typeLabels[type] ?? type

const getOrientation = (id) =>
  id ? orientationStore.orientations.find(o => o.id === id) : null

function toggleDone(taskId) {
  taskDone[taskId] = !taskDone[taskId]
}

function toggleOrientation(taskId) {
  orientationOpen[taskId] = !orientationOpen[taskId]
}

function goBack() {
  router.push({ name: 'Workspace', query: { plan: planId.value } })
}

function openLeiSeca(task) {
  router.push({
    name: 'LeiSecaReader',
    params: {
      planId: planId.value,
      goalId: goalId.value,
      taskId: task.id,
    },
  })
}

onMounted(async () => {
  try {
    if (!planStore.plans.length) await planStore.fetchPlans()
    if (planId.value) {
      await Promise.all([
        planStore.fetchGoals(planId.value),
        taskStore.fetchByPlan(planId.value),
      ])
    }
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.goal-preview {
  max-width: 720px;
  margin: 0 auto;
  padding: 24px 20px 48px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: 100%;
}

/* Top bar */
.preview-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.preview-bar__back {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: #666;
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 8px;
  transition: background 0.15s, color 0.15s;
}
.preview-bar__back:hover { background: #f5f4f0; color: #1a1a2e; }

.preview-bar__badge {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #854F0B;
  background: #FAEEDA;
  border-radius: 6px;
  padding: 5px 10px;
}

/* Loading */
.preview-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 64px 0;
  font-size: 13px;
  color: #aaa;
}
.preview-loading__spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #e0dff8;
  border-top-color: #534AB7;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Goal header */
.goal-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  background: #fff;
  border: 1px solid #ebe9e4;
  border-radius: 14px;
}

.goal-header__icon {
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

.goal-header__title {
  font-size: 1.2rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0 0 4px;
  line-height: 1.3;
}

.goal-header__desc {
  font-size: 13px;
  color: #777;
  margin: 0 0 4px;
  line-height: 1.5;
}

.goal-header__plan {
  font-size: 11px;
  font-weight: 600;
  color: #534AB7;
  margin: 0;
  letter-spacing: 0.03em;
}

/* Progress */
.progress-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-bar {
  flex: 1;
  height: 6px;
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
  font-size: 12px;
  font-weight: 600;
  color: #999;
  white-space: nowrap;
}

/* Task list */
.task-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.task-item {
  display: flex;
  gap: 14px;
  padding: 16px;
  background: #fff;
  border: 1px solid #ebe9e4;
  border-radius: 12px;
  transition: border-color 0.2s, background 0.2s, opacity 0.3s;
  animation: fadeSlideIn 0.3s ease both;
  animation-delay: var(--delay, 0ms);
}

@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.task-item--done {
  background: #fbfbf9;
  border-color: #f0efea;
}

.task-item:hover {
  border-color: #d8d6d0;
}

/* Checkbox */
.task-check {
  width: 24px;
  height: 24px;
  border-radius: 7px;
  border: 2px solid #d8d6d0;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  margin-top: 2px;
  color: transparent;
  transition: all 0.2s;
  padding: 0;
}

.task-check:hover {
  border-color: #534AB7;
  background: #f7f6ff;
}

.task-check--done {
  background: #534AB7;
  border-color: #534AB7;
  color: #fff;
}

.task-check--done:hover {
  background: #6a62cc;
  border-color: #6a62cc;
}

/* Task body */
.task-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.task-body__top {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.task-type-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border-radius: 5px;
  padding: 2px 8px;
}
.task-type-badge--leitura_pdf { background: #E6F1FB; color: #185FA5; }
.task-type-badge--questoes    { background: #EAF3DE; color: #3B6D11; }
.task-type-badge--video       { background: #FAEEDA; color: #854F0B; }
.task-type-badge--revisao     { background: #FBEAF0; color: #993556; }
.task-type-badge--lei_seca    { background: #EEEDFE; color: #534AB7; }
.task-type-badge--outras      { background: #F1EFE8; color: #5F5E5A; }

.task-orientation-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: 'DM Sans', sans-serif;
  font-size: 10px;
  font-weight: 600;
  color: #999;
  background: none;
  border: 1px solid #ebe9e4;
  border-radius: 5px;
  padding: 2px 7px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.task-orientation-btn:hover { background: #f5f4f0; color: #666; }

.task-body__title {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0;
  line-height: 1.4;
  transition: color 0.2s;
}

.task-body__title--done {
  color: #bbb;
  text-decoration: line-through;
}

.task-body__desc {
  font-size: 12px;
  color: #888;
  margin: 0;
  line-height: 1.5;
}

/* Orientation box */
.task-orientation-box {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  background: #faf9f5;
  border: 1px solid #f0efea;
  border-left: 3px solid #534AB7;
  border-radius: 8px;
  font-size: 12px;
  color: #666;
  line-height: 1.5;
  animation: fadeSlideIn 0.2s ease both;
}
.task-orientation-box__icon {
  color: #534AB7;
  flex-shrink: 0;
  margin-top: 1px;
}
.task-orientation-box strong {
  display: block;
  color: #444;
  margin-bottom: 2px;
  font-size: 12px;
}
.task-orientation-box p {
  margin: 0;
}

/* Actions row */
.task-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.task-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: #534AB7;
  background: #EEEDFE;
  border: none;
  border-radius: 7px;
  padding: 6px 12px;
  cursor: pointer;
  text-decoration: none;
  transition: background 0.15s;
}
.task-action-btn:hover { background: #dddcfc; }

.task-action-btn--lei {
  background: #f0efff;
  color: #534AB7;
}
.task-action-btn--lei:hover { background: #dddcfc; }

/* Articles inline */
.task-articles {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: #534AB7;
  background: #f7f6ff;
  border-radius: 6px;
  padding: 4px 8px;
}
.task-articles__law {
  font-weight: 700;
  margin-left: 2px;
}

/* Completion */
.completion-msg {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 20px;
  background: #EEEDFE;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #534AB7;
  animation: fadeSlideIn 0.4s ease both;
}

/* Empty / not found */
.preview-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 64px 0;
  color: #999;
  font-size: 14px;
}

.btn-back {
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: #534AB7;
  background: #EEEDFE;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  cursor: pointer;
}

@media (max-width: 600px) {
  .goal-preview { padding: 16px 12px 40px; }
  .goal-header { flex-direction: column; gap: 12px; }
  .task-item { padding: 12px; gap: 10px; }
}
</style>
