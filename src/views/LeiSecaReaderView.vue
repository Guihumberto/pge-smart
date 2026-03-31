<template>
  <div class="lei-reader">
    <!-- Top bar -->
    <div class="reader-bar">
      <button class="reader-bar__back" @click="goBack">
        <ArrowLeft :size="16" />
        <span>Voltar à meta</span>
      </button>
      <div class="reader-bar__badge">
        <Scale :size="13" />
        Lei Seca
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="reader-loading">
      <span class="reader-loading__spinner" />
      Carregando lei...
    </div>

    <!-- Task not found -->
    <div v-else-if="!task" class="reader-empty">
      <p>Tarefa não encontrada.</p>
      <button class="btn-back" @click="goBack">Voltar</button>
    </div>

    <template v-else>
      <!-- Header -->
      <div class="reader-header">
        <div class="reader-header__icon">
          <Scale :size="22" />
        </div>
        <div class="reader-header__info">
          <h1 class="reader-header__title">{{ task.title }}</h1>
          <p v-if="task.description" class="reader-header__desc">{{ task.description }}</p>
          <div class="reader-header__meta">
            <span v-if="task.lawSource" class="meta-tag meta-tag--law">
              <BookOpen :size="11" /> {{ task.lawSource }}
            </span>
            <span v-if="task.articles?.resolved?.length" class="meta-tag">
              {{ formatArticles(task.articles.resolved) }}
            </span>
            <span v-if="task.filterLaw?.compilado" class="meta-tag meta-tag--option">Compilado</span>
            <span v-if="task.filterLaw?.withMarks" class="meta-tag meta-tag--option">Com marcações</span>
          </div>
        </div>
      </div>

      <!-- Orientation -->
      <div v-if="orientation" class="reader-orientation">
        <BookOpen :size="13" class="reader-orientation__icon" />
        <div>
          <strong>{{ orientation.title }}</strong>
          <p>{{ orientation.body }}</p>
        </div>
      </div>

      <!-- Tags filter -->
      <div v-if="task.filterLaw?.withTags && task.filterLaw?.tagsFilter?.length" class="reader-tags">
        <span class="reader-tags__label">
          <Tag :size="11" /> Tags de foco:
        </span>
        <span
          v-for="tag in task.filterLaw.tagsFilter"
          :key="tag"
          class="reader-tag-pill"
        >
          {{ tag }}
        </span>
      </div>

      <!-- Articles section -->
      <div class="articles-section">
        <div class="section-header">
          <h2 class="section-title">
            <FileText :size="15" />
            Artigos para estudo
          </h2>
          <button v-if="articles.length" class="btn-toggle-all" @click="toggleAllArticles">
            {{ allRead ? 'Desmarcar todos' : 'Marcar todos' }}
          </button>
        </div>

        <div v-if="!articles.length" class="articles-empty">
          Nenhum artigo carregado. Consulte a lei diretamente.
        </div>

        <div class="articles-grid">
          <div
            v-for="art in articles"
            :key="art"
            class="article-card"
            :class="{ 'article-card--read': articleRead[art] }"
          >
            <button
              class="article-check"
              :class="{ 'article-check--done': articleRead[art] }"
              @click="articleRead[art] = !articleRead[art]"
            >
              <Check v-if="articleRead[art]" :size="11" />
            </button>
            <span class="article-card__number">Art. {{ art }}</span>
          </div>
        </div>

        <div v-if="articles.length" class="articles-progress">
          <div class="articles-progress__bar">
            <div class="articles-progress__fill" :style="{ width: articlesPct + '%' }" />
          </div>
          <span class="articles-progress__label">
            {{ articlesReadCount }}/{{ articles.length }} lido{{ articlesReadCount !== 1 ? 's' : '' }}
          </span>
        </div>
      </div>

      <!-- Questions section -->
      <div v-if="task.filterLaw?.withQuestions" class="questions-section">
        <h2 class="section-title">
          <HelpCircle :size="15" />
          Questões vinculadas
        </h2>

        <div class="questions-filters">
          <span v-if="questionFilters.tipo" class="qf-tag">
            {{ questionFilters.tipo }}
          </span>
          <span v-for="b in (task.formQuestions?.banca ?? [])" :key="b" class="qf-tag">
            {{ b }}
          </span>
          <span v-for="a in (task.formQuestions?.ano ?? [])" :key="a" class="qf-tag">
            {{ a }}
          </span>
          <span v-if="task.formQuestions?.favoritas" class="qf-tag qf-tag--fav">
            Favoritas
          </span>
        </div>

        <div class="questions-count">
          <template v-if="countLoading">
            <span class="questions-count__spinner" />
            Contando questões...
          </template>
          <template v-else>
            <span class="questions-count__value">{{ questionCount.toLocaleString('pt-BR') }}</span>
            questões encontradas com os filtros configurados
          </template>
        </div>

        <button class="btn-start-questions" @click="startQuestions">
          <HelpCircle :size="14" />
          Iniciar questões
        </button>
      </div>

      <!-- External link -->
      <div v-if="task.link" class="reader-link-section">
        <a :href="task.link" target="_blank" rel="noopener" class="reader-link-btn">
          <ExternalLink :size="14" />
          Abrir material vinculado
        </a>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, reactive, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft, Scale, BookOpen, FileText, Check,
  HelpCircle, ExternalLink, Tag,
} from 'lucide-vue-next'
import { usePlanStore } from '@/stores/usePlanStore'
import { useTaskStore } from '@/stores/useTaskStore'
import { useOrientationStore } from '@/stores/useOrientationStore'
import { questionService } from '@/services/question.service'
import { formatArticles } from '@/utils/articleParser'

const route  = useRoute()
const router = useRouter()

const planStore        = usePlanStore()
const taskStore        = useTaskStore()
const orientationStore = useOrientationStore()

const loading      = ref(true)
const questionCount = ref(0)
const countLoading  = ref(false)

// Persiste artigos lidos por task no localStorage
const STORAGE_KEY = computed(() => `lei_seca_read_${taskId.value}`)
const saved = JSON.parse(localStorage.getItem(`lei_seca_read_${route.params.taskId}`) || '{}')
const articleRead = reactive(saved)

watch(articleRead, (val) => {
  localStorage.setItem(STORAGE_KEY.value, JSON.stringify(val))
}, { deep: true })

const isStudentRoute = computed(() => route.name === 'StudentLeiSeca')
const planId         = computed(() => route.params.planId)
const goalId         = computed(() => route.params.goalId)
const enrollmentId   = computed(() => route.params.enrollmentId)
const goalProgressId = computed(() => route.params.goalProgressId)
const taskId         = computed(() => route.params.taskId)

const task = computed(() => taskStore.getById(taskId.value))

const orientation = computed(() => {
  if (!task.value?.orientationId) return null
  return orientationStore.orientations.find(o => o.id === task.value.orientationId) ?? null
})

const articles = computed(() => task.value?.articles?.resolved ?? [])

const allRead = computed(() =>
  articles.value.length > 0 && articles.value.every(a => articleRead[a])
)

function toggleAllArticles() {
  const markAs = !allRead.value
  articles.value.forEach(a => { articleRead[a] = markAs })
}

const articlesReadCount = computed(() =>
  articles.value.filter(a => articleRead[a]).length
)
const articlesPct = computed(() =>
  articles.value.length ? (articlesReadCount.value / articles.value.length) * 100 : 0
)

const questionTypeLabels = { 1: 'Múltipla escolha', 2: 'Certo ou Errado', 3: 'Discursiva' }
const questionFilters = computed(() => ({
  tipo: questionTypeLabels[task.value?.formQuestions?.typeRespQuestions] ?? '',
}))

function goBack() {
  if (isStudentRoute.value) {
    router.push({
      name: 'StudentGoalDetail',
      params: { enrollmentId: enrollmentId.value, goalProgressId: goalProgressId.value },
    })
  } else {
    router.push({
      name: 'GoalPreview',
      params: { planId: planId.value, goalId: goalId.value },
    })
  }
}

function startQuestions() {
  // Build query params from the task's question filters to pass to a future questions page
  const params = {
    norma: task.value?.lawSource,
    arts: task.value?.filterLaw?.artsFilter?.join(','),
    type: task.value?.formQuestions?.typeRespQuestions,
    banca: task.value?.formQuestions?.banca?.join(','),
    ano: task.value?.formQuestions?.ano?.join(','),
    fav: task.value?.formQuestions?.favoritas ? '1' : '0',
  }
  // For now, open as an alert — the questions view can be added later
  alert(`Questões serão abertas com os filtros:\n${JSON.stringify(params, null, 2)}`)
}

async function loadQuestionCount() {
  if (!task.value?.filterLaw?.withQuestions) return
  countLoading.value = true
  try {
    questionCount.value = await questionService.countByFilters({
      norma:              task.value.lawSource,
      artsFilter:         task.value.filterLaw.artsFilter,
      typeRespQuestions:   task.value.formQuestions?.typeRespQuestions,
      banca:              task.value.formQuestions?.banca,
      ano:                task.value.formQuestions?.ano,
      id_disciplina:      task.value.formQuestions?.id_disciplina,
      id_area:            task.value.formQuestions?.id_area,
      favoritas:          task.value.formQuestions?.favoritas,
    })
  } catch {
    questionCount.value = 0
  } finally {
    countLoading.value = false
  }
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
    await loadQuestionCount()
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.lei-reader {
  max-width: 720px;
  margin: 0 auto;
  padding: 24px 20px 48px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: 100%;
}

/* Top bar */
.reader-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.reader-bar__back {
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
.reader-bar__back:hover { background: #f5f4f0; color: #1a1a2e; }

.reader-bar__badge {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #534AB7;
  background: #EEEDFE;
  border-radius: 6px;
  padding: 5px 10px;
}

/* Loading */
.reader-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 64px 0;
  font-size: 13px;
  color: #aaa;
}
.reader-loading__spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #e0dff8;
  border-top-color: #534AB7;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Empty */
.reader-empty {
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

/* Header */
.reader-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  background: #fff;
  border: 1px solid #ebe9e4;
  border-radius: 14px;
}

.reader-header__icon {
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

.reader-header__title {
  font-size: 1.2rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0 0 4px;
  line-height: 1.3;
}

.reader-header__desc {
  font-size: 13px;
  color: #777;
  margin: 0 0 8px;
  line-height: 1.5;
}

.reader-header__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.meta-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #666;
  background: #f5f4f0;
  border-radius: 5px;
  padding: 3px 8px;
}

.meta-tag--law {
  color: #534AB7;
  background: #EEEDFE;
}

.meta-tag--option {
  color: #854F0B;
  background: #FAEEDA;
}

/* Orientation */
.reader-orientation {
  display: flex;
  gap: 10px;
  padding: 14px 16px;
  background: #faf9f5;
  border: 1px solid #f0efea;
  border-left: 3px solid #534AB7;
  border-radius: 10px;
  font-size: 13px;
  color: #666;
  line-height: 1.5;
}
.reader-orientation__icon {
  color: #534AB7;
  flex-shrink: 0;
  margin-top: 2px;
}
.reader-orientation strong {
  display: block;
  color: #444;
  margin-bottom: 2px;
}
.reader-orientation p {
  margin: 0;
}

/* Tags */
.reader-tags {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.reader-tags__label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.reader-tag-pill {
  font-size: 11px;
  font-weight: 600;
  color: #534AB7;
  background: #EEEDFE;
  border-radius: 12px;
  padding: 3px 10px;
}

/* Articles section */
.articles-section {
  background: #fff;
  border: 1px solid #ebe9e4;
  border-radius: 14px;
  padding: 20px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}

.btn-toggle-all {
  font-family: 'DM Sans', sans-serif;
  font-size: 11px;
  font-weight: 600;
  color: #534AB7;
  background: #EEEDFE;
  border: none;
  border-radius: 6px;
  padding: 5px 12px;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}
.btn-toggle-all:hover { background: #dddcfc; }

.articles-empty {
  font-size: 13px;
  color: #bbb;
  text-align: center;
  padding: 24px 0;
}

.articles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 8px;
  margin-bottom: 16px;
}

.article-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #fafaf8;
  border: 1px solid #ebe9e4;
  border-radius: 8px;
  transition: border-color 0.15s, background 0.15s;
}

.article-card:hover {
  border-color: #d8d6d0;
}

.article-card--read {
  background: #f7f6ff;
  border-color: #dddcfc;
}

.article-check {
  width: 18px;
  height: 18px;
  border-radius: 5px;
  border: 2px solid #d8d6d0;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  color: transparent;
  transition: all 0.2s;
  padding: 0;
}
.article-check:hover {
  border-color: #534AB7;
}
.article-check--done {
  background: #534AB7;
  border-color: #534AB7;
  color: #fff;
}

.article-card__number {
  font-size: 12px;
  font-weight: 600;
  color: #444;
}

/* Articles progress */
.articles-progress {
  display: flex;
  align-items: center;
  gap: 10px;
}

.articles-progress__bar {
  flex: 1;
  height: 5px;
  background: #f0efea;
  border-radius: 3px;
  overflow: hidden;
}

.articles-progress__fill {
  height: 100%;
  background: #534AB7;
  border-radius: 3px;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.articles-progress__label {
  font-size: 11px;
  font-weight: 600;
  color: #999;
  white-space: nowrap;
}

/* Questions section */
.questions-section {
  background: #fff;
  border: 1px solid #ebe9e4;
  border-radius: 14px;
  padding: 20px;
}

.questions-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.qf-tag {
  font-size: 11px;
  font-weight: 600;
  color: #666;
  background: #f5f4f0;
  border-radius: 5px;
  padding: 3px 8px;
}
.qf-tag--fav {
  color: #854F0B;
  background: #FAEEDA;
}

.questions-count {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #777;
  margin-bottom: 14px;
}

.questions-count__spinner {
  width: 14px;
  height: 14px;
  border: 2px solid #e0dff8;
  border-top-color: #534AB7;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

.questions-count__value {
  font-size: 18px;
  font-weight: 700;
  color: #534AB7;
}

.btn-start-questions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: #534AB7;
  border: none;
  border-radius: 8px;
  padding: 10px 18px;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-start-questions:hover { background: #6a62cc; }

/* External link */
.reader-link-section {
  text-align: center;
}

.reader-link-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: #534AB7;
  background: #EEEDFE;
  border: none;
  border-radius: 8px;
  padding: 10px 18px;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.15s;
}
.reader-link-btn:hover { background: #dddcfc; }

@media (max-width: 600px) {
  .lei-reader { padding: 16px 12px 40px; }
  .reader-header { flex-direction: column; gap: 12px; }
  .articles-grid { grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); }
}
</style>
