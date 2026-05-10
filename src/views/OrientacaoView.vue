<template>
  <div class="orientacao" style="font-family: 'DM Sans', sans-serif;">

    <!-- Loading -->
    <div v-if="loading" class="orientacao__loading">
      <span class="spinner"></span>
      Carregando orientação...
    </div>

    <!-- Empty -->
    <div v-else-if="!orientation" class="orientacao__empty">
      <Scale :size="32" />
      <h2>Nenhuma orientação encontrada</h2>
      <p>Gere a orientação a partir do modal de edição da tarefa.</p>
      <button class="btn-primary" @click="router.back()">
        <ChevronLeft :size="14" /> Voltar
      </button>
    </div>

    <!-- Content -->
    <template v-else>
      <!-- Header -->
      <div class="orientacao__header">
        <button class="btn-ghost" @click="router.back()">
          <ChevronLeft :size="16" /> Voltar ao Workspace
        </button>
        <div class="orientacao__header-info">
          <h1 class="orientacao__title">Orientação de Estudo</h1>
          <p class="orientacao__subtitle">
            <template v-if="orientation.context?.articles?.length">
              Art. {{ formatArticleRange(orientation.context.articles) }}
            </template>
            <template v-if="orientation.context?.banca">
              · {{ orientation.context.banca }}
            </template>
            <template v-if="orientation.context?.cargo">
              · {{ orientation.context.cargo }}
            </template>
          </p>
        </div>
        <div class="orientacao__actions">
          <button class="btn-ghost" @click="printPage" title="Imprimir / Salvar PDF">
            <Printer :size="14" /> PDF
          </button>
          <button class="btn-ghost" @click="regenerate" :disabled="regenerating" title="Regenerar orientação">
            <RefreshCw :size="14" :class="{ 'spin': regenerating }" />
            {{ regenerating ? 'Regenerando...' : 'Regenerar' }}
          </button>
        </div>
      </div>

      <!-- Document -->
      <article class="orientacao__document" v-html="renderedContent"></article>

      <!-- Checklist -->
      <section class="orientacao__checklist">
        <div class="checklist__header">
          <h2 class="checklist__title">
            <CheckSquare :size="16" /> Checklist de Estudo
          </h2>
          <span class="checklist__progress">
            {{ checklistDone }}/{{ orientation.checklist.length }} concluído(s)
          </span>
        </div>

        <div class="checklist__bar">
          <div class="checklist__bar-fill" :style="{ width: checklistPct + '%' }"></div>
        </div>

        <div class="checklist__items">
          <div
            v-for="item in orientation.checklist"
            :key="item.id"
            class="checklist__item"
            :class="{ 'checklist__item--done': item.checked }"
          >
            <input
              type="checkbox"
              :checked="item.checked"
              @change="toggleItem(item.id)"
              class="checklist__checkbox"
            />
            <span class="checklist__text">{{ item.text }}</span>
            <span v-if="item.prioridade" class="checklist__priority" :class="`checklist__priority--${item.prioridade}`">
              {{ item.prioridade }}
            </span>
            <button class="checklist__remove" @click="removeItem(item.id)" title="Remover">
              <X :size="12" />
            </button>
          </div>
        </div>

        <!-- Add item -->
        <div class="checklist__add">
          <input
            v-model="newItemText"
            class="checklist__add-input"
            placeholder="Adicionar item ao checklist..."
            @keydown.enter.prevent="addItem"
          />
          <button class="checklist__add-btn" @click="addItem" :disabled="!newItemText.trim()">
            <Plus :size="14" /> Adicionar
          </button>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import {
  ChevronLeft, Scale, Printer, RefreshCw,
  CheckSquare, X, Plus
} from 'lucide-vue-next'
import { taskOrientationService } from '@/services/taskOrientation.service'
import { toast } from 'vue-sonner'

const route = useRoute()
const router = useRouter()
const taskId = route.params.taskId

const loading = ref(true)
const orientation = ref(null)
const regenerating = ref(false)
const newItemText = ref('')

// Markdown rendering
const renderedContent = computed(() => {
  if (!orientation.value?.content) return ''
  return DOMPurify.sanitize(marked.parse(orientation.value.content))
})

// Checklist computed
const checklistDone = computed(() =>
  orientation.value?.checklist?.filter(c => c.checked).length ?? 0
)
const checklistPct = computed(() => {
  const total = orientation.value?.checklist?.length ?? 0
  if (!total) return 0
  return Math.round((checklistDone.value / total) * 100)
})

// Load
onMounted(async () => {
  try {
    orientation.value = await taskOrientationService.get(taskId)
  } catch {
    orientation.value = null
  } finally {
    loading.value = false
  }
})

// Actions
function printPage() {
  window.print()
}

async function regenerate() {
  if (!confirm('Isso irá excluir a orientação atual e gerar uma nova. Continuar?')) return
  regenerating.value = true
  try {
    await taskOrientationService.remove(taskId)
    orientation.value = null
    orientation.value = await taskOrientationService.generate(taskId)
    toast.success('Orientação regenerada!')
  } catch (err) {
    toast.error(err.response?.data?.message || err.message)
  } finally {
    regenerating.value = false
  }
}

async function toggleItem(id) {
  try {
    const result = await taskOrientationService.updateChecklist(taskId, [{ action: 'toggle', id }])
    orientation.value.checklist = result.checklist
  } catch (err) {
    toast.error('Erro ao atualizar item')
  }
}

async function removeItem(id) {
  try {
    const result = await taskOrientationService.updateChecklist(taskId, [{ action: 'remove', id }])
    orientation.value.checklist = result.checklist
  } catch (err) {
    toast.error('Erro ao remover item')
  }
}

async function addItem() {
  const text = newItemText.value.trim()
  if (!text) return
  try {
    const result = await taskOrientationService.updateChecklist(taskId, [{ action: 'add', text }])
    orientation.value.checklist = result.checklist
    newItemText.value = ''
  } catch (err) {
    toast.error('Erro ao adicionar item')
  }
}

function formatArticleRange(articles) {
  if (!articles?.length) return ''
  const sorted = [...articles].sort((a, b) => a - b)
  if (sorted.length <= 3) return sorted.join(', ')
  return `${sorted[0]}-${sorted[sorted.length - 1]}`
}
</script>

<style scoped>
.orientacao {
  max-width: 780px;
  margin: 0 auto;
  padding: 32px 24px 64px;
}

/* Loading & Empty */
.orientacao__loading,
.orientacao__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 40vh;
  gap: 12px;
  color: #6b7280;
}
.orientacao__empty h2 { color: #374151; font-size: 18px; margin: 0; }
.orientacao__empty p { margin: 0; }

.spinner {
  width: 24px; height: 24px;
  border: 3px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Header */
.orientacao__header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 32px;
  flex-wrap: wrap;
}
.orientacao__header-info { flex: 1; min-width: 200px; }
.orientacao__title {
  font-size: 22px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}
.orientacao__subtitle {
  font-size: 13px;
  color: #6b7280;
  margin: 4px 0 0;
}
.orientacao__actions {
  display: flex;
  gap: 8px;
}

/* Document */
.orientacao__document {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 32px;
  font-size: 15px;
  line-height: 1.75;
  color: #374151;
  margin-bottom: 32px;
}
.orientacao__document :deep(h2) {
  font-size: 18px;
  font-weight: 700;
  color: #1e40af;
  margin: 28px 0 12px;
  padding-bottom: 6px;
  border-bottom: 2px solid #dbeafe;
}
.orientacao__document :deep(h2:first-child) { margin-top: 0; }
.orientacao__document :deep(h3) {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  margin: 20px 0 8px;
}
.orientacao__document :deep(hr) {
  border: none;
  border-top: 1px solid #e5e7eb;
  margin: 24px 0;
}
.orientacao__document :deep(ul), .orientacao__document :deep(ol) {
  padding-left: 20px;
}
.orientacao__document :deep(li) { margin-bottom: 4px; }
.orientacao__document :deep(strong) { color: #1e293b; }
.orientacao__document :deep(blockquote) {
  border-left: 3px solid #3b82f6;
  padding: 8px 16px;
  margin: 12px 0;
  background: #f0f9ff;
  border-radius: 0 6px 6px 0;
  color: #1e40af;
}

/* Checklist */
.orientacao__checklist {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
}
.checklist__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.checklist__title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}
.checklist__progress {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}
.checklist__bar {
  height: 6px;
  background: #f3f4f6;
  border-radius: 3px;
  margin-bottom: 16px;
  overflow: hidden;
}
.checklist__bar-fill {
  height: 100%;
  background: #22c55e;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.checklist__items {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.checklist__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  transition: background 0.15s;
}
.checklist__item:hover { background: #f9fafb; }
.checklist__item--done .checklist__text {
  text-decoration: line-through;
  color: #9ca3af;
}
.checklist__checkbox {
  width: 16px;
  height: 16px;
  accent-color: #22c55e;
  cursor: pointer;
  flex-shrink: 0;
}
.checklist__text {
  flex: 1;
  font-size: 14px;
  color: #374151;
}
.checklist__priority {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 4px;
}
.checklist__priority--alta { background: #fef2f2; color: #dc2626; }
.checklist__priority--media { background: #fffbeb; color: #d97706; }
.checklist__priority--baixa { background: #f0fdf4; color: #16a34a; }

.checklist__remove {
  background: none;
  border: none;
  color: #d1d5db;
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  opacity: 0;
  transition: opacity 0.15s, color 0.15s;
}
.checklist__item:hover .checklist__remove { opacity: 1; }
.checklist__remove:hover { color: #ef4444; }

/* Add */
.checklist__add {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f3f4f6;
}
.checklist__add-input {
  flex: 1;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
  font-family: inherit;
  outline: none;
}
.checklist__add-input:focus { border-color: #3b82f6; }
.checklist__add-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #f0f9ff;
  color: #3b82f6;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
}
.checklist__add-btn:hover { background: #dbeafe; }
.checklist__add-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Buttons */
.btn-ghost {
  display: flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 13px;
  color: #374151;
  cursor: pointer;
  font-family: inherit;
}
.btn-ghost:hover { background: #f9fafb; }
.btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-primary {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
}

.spin { animation: spin 1s linear infinite; }

/* Print */
@media print {
  .orientacao__header .btn-ghost,
  .orientacao__actions,
  .checklist__remove,
  .checklist__add,
  .btn-primary {
    display: none !important;
  }
  .orientacao {
    max-width: 100%;
    padding: 0;
    overflow: visible !important;
    height: auto !important;
  }
  .orientacao__document,
  .orientacao__checklist {
    border: none;
    box-shadow: none;
    padding: 16px 0;
    overflow: visible !important;
    page-break-inside: auto;
  }
  .orientacao__document :deep(h2) {
    page-break-after: avoid;
  }
  .orientacao__document :deep(p),
  .orientacao__document :deep(li) {
    orphans: 3;
    widows: 3;
  }
  .checklist__item {
    page-break-inside: avoid;
  }
}
</style>

<!-- Global print overrides to fix parent layout overflow -->
<style>
@media print {
  html, body {
    height: auto !important;
    overflow: visible !important;
  }
  /* DefaultLayout wrappers */
  .app-layout,
  .main-content,
  [class*="layout"] {
    height: auto !important;
    overflow: visible !important;
    position: static !important;
  }
  /* Hide sidebar and topbar */
  .sidebar,
  .topbar,
  nav {
    display: none !important;
  }
}
</style>
