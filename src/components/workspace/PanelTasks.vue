<template>
  <div class="panel">
    <div class="panel__head">
      <span class="panel__label">
        Tarefas
        <span v-if="discipline" class="panel__label-disc" :style="{ color: discipline.color }">
          — {{ discipline.name }}
        </span>
      </span>
      <div class="panel__head-actions">
        <template v-if="selectedVisibleIds.length > 0">
          <button class="panel__batch-btn panel__batch-btn--duplicate" @click="batchDuplicate">
            <Copy :size="12" /> Duplicar ({{ selectedVisibleIds.length }})
          </button>
          <button class="panel__batch-btn panel__batch-btn--danger" @click="batchDelete">
            <Trash2 :size="12" /> Excluir ({{ selectedVisibleIds.length }})
          </button>
        </template>
        <label v-if="tasks.length" class="panel__select-all" title="Selecionar todas">
          <input
            type="checkbox"
            :checked="allSelected"
            aria-label="Selecionar todas as tarefas visíveis"
            @change="toggleSelectAll"
          />
        </label>
        <button
          v-if="disciplineId"
          class="panel__icon-btn"
          title="Nova tarefa"
          aria-label="Nova tarefa"
          @click="openModal(null)"
        >
          <Plus :size="14" />
        </button>
      </div>
    </div>

    <TaskFilterBar
      v-if="disciplineId"
      v-model="filtros"
      :contextos-origem="contextosOrigem"
      :tem-plano-ativo="!!planId"
    />

    <div class="panel__body">
      <p v-if="!disciplineId" class="panel__empty">
        Selecione uma disciplina para ver as tarefas.
      </p>

      <template v-else>
        <p v-if="!tasksAll.length" class="panel__empty">
          Nenhuma tarefa nesta disciplina.
        </p>
        <p v-else-if="!tasks.length" class="panel__empty">
          Nenhuma tarefa bate com os filtros.
        </p>

        <div
          v-for="task in tasks"
          :key="task.id"
          :class="['task-card', { 'task-card--in-use': taskIdsEmUsoNoPlano.has(task.id) }]"
          draggable="true"
          :title="taskIdsEmUsoNoPlano.has(task.id) ? 'Já em uso em alguma meta deste plano' : ''"
          @dragstart="onDragStart(task, $event)"
          @dragend="$emit('drag-start', null)"
        >
          <div class="task-card__top">
            <label class="task-card__check" @click.stop>
              <input type="checkbox" :checked="selectedIds.has(task.id)" @change="toggleSelect(task.id)" />
            </label>
            <span class="task-badge" :class="`task-badge--${task.type}`">
              {{ typeLabel(task.type) }}
            </span>
            <TaskNumeroBadge
              v-if="task.numero != null"
              :numero="task.numero"
              :discipline-name="discipline?.name"
            />
            <TaskOriginBadge
              v-if="task.origem"
              :origem="task.origem"
              :origem-dados="task.origemDados"
            />
            <TaskRevisaoBadge
              v-if="task.revisaoDeTaskId"
              :revisao-de-task-id="task.revisaoDeTaskId"
            />
            <div class="task-card__actions">
              <button
                class="icon-action"
                title="Criar revisão desta tarefa"
                aria-label="Criar revisão desta tarefa"
                @click="criarRevisao(task)"
              >
                <RotateCcw :size="12" />
              </button>
              <button
                class="icon-action"
                title="Editar"
                aria-label="Editar tarefa"
                @click="openModal(task)"
              ><Pencil :size="12" /></button>
              <button
                class="icon-action icon-action--danger"
                title="Excluir"
                aria-label="Excluir tarefa"
                @click="remove(task.id)"
              ><Trash2 :size="12" /></button>
            </div>
          </div>

          <p class="task-card__title">{{ task.title }}</p>
          <p v-if="task.description" class="task-card__desc">{{ task.description }}</p>

          <div v-if="task.type === 'lei_seca' && task.articles" class="task-card__articles">
            <BookOpen :size="12" />
            {{ formatArticles(task.articles.resolved) }}
            <span v-if="task.lawSource" class="task-card__law">{{ task.lawSource }}</span>
          </div>

          <div
            v-if="task.orientationDocId"
            class="task-card__orientation"
            @click.stop="goToOrientation(task.id)"
          >
            <Sparkles :size="11" />
            <span>Ver Orientação</span>
          </div>

          <div class="task-card__drag-hint">
            <GripVertical :size="12" /> arraste para uma meta
          </div>
        </div>
      </template>
    </div>
  </div>

  <!-- Modal tarefa -->
  <ModalTask
    v-if="modalOpen"
    :task="editingTask"
    :discipline-id="disciplineId"
    @close="modalOpen = false"
    @saved="modalOpen = false"
  />
</template>

<script setup>
import { ref, computed, watch, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Pencil, Trash2, GripVertical, BookOpen, Sparkles, Copy, RotateCcw } from 'lucide-vue-next'
import { normalizeText } from '@/utils/strings'
import { useDisciplineStore } from '@/stores/useDisciplineStore'
import { useTaskStore } from '@/stores/useTaskStore'
import { formatArticles } from '@/utils/articleParser'
import { toast } from 'vue-sonner'
import ModalTask from '@/components/workspace/ModalTask.vue'
import TaskOriginBadge from '@/components/task-generator/TaskOriginBadge.vue'
import TaskNumeroBadge from '@/components/task-generator/TaskNumeroBadge.vue'
import TaskRevisaoBadge from '@/components/task-generator/TaskRevisaoBadge.vue'
import TaskFilterBar from '@/components/task-generator/TaskFilterBar.vue'
import { usePlanStore } from '@/stores/usePlanStore'
import { useCargoStore } from '@/stores/useCargoStore'

const props = defineProps({
  disciplineId: String,
  planId: String,   // ← confirme que está aqui
})
const emit = defineEmits(['drag-start'])

const router = useRouter()
const discStore = useDisciplineStore()
const taskStore = useTaskStore()

const modalOpen = ref(false)
const editingTask = ref(null)
const selectedIds = ref(new Set())

const allSelected = computed(() =>
  tasks.value.length > 0 && tasks.value.every(t => selectedIds.value.has(t.id))
)

function toggleSelect(id) {
  const s = new Set(selectedIds.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  selectedIds.value = s
}

function toggleSelectAll() {
  if (allSelected.value) {
    selectedIds.value = new Set()
  } else {
    selectedIds.value = new Set(tasks.value.map(t => t.id))
  }
}

// Restringe operações batch ao subconjunto de selecionados que ESTÁ visível
// (intersecção com tasks.value), evitando ações silenciosas sobre tasks
// escondidas pelo filtro.
const selectedVisibleIds = computed(() => {
  const visiveis = new Set(tasks.value.map(t => t.id))
  return [...selectedIds.value].filter(id => visiveis.has(id))
})

async function batchDelete() {
  const ids = selectedVisibleIds.value
  if (!ids.length) return
  if (!confirm(`Excluir ${ids.length} tarefa(s) selecionada(s)?`)) return
  try {
    await Promise.all(ids.map(id => taskStore.remove(id)))
    toast.success(`${ids.length} tarefa(s) removida(s).`)
    selectedIds.value = new Set()
  } catch (err) {
    toast.error(err.message)
  }
}

async function batchDuplicate() {
  const ids = selectedVisibleIds.value
  const toDuplicate = tasks.value.filter(t => ids.includes(t.id))
  try {
    for (const task of toDuplicate) {
      const { id, createdAt, updatedAt, orientationDocId, ...rest } = task
      await taskStore.create(props.disciplineId, {
        ...rest,
        title: `${task.title} (cópia)`,
      })
    }
    toast.success(`${toDuplicate.length} tarefa(s) duplicada(s).`)
    selectedIds.value = new Set()
  } catch (err) {
    toast.error(err.message)
  }
}

const discipline = computed(() =>
  discStore.disciplines.find(d => d.id === props.disciplineId)
)

const planStore = usePlanStore()
const cargoStore = useCargoStore()
const filtros = ref({
  q: '',
  escopo: 'plano',   // 'plano' (default: tasks deste plano + livres sem plano) | 'todos'
  status: 'todas',
  types: [],
  origens: [],
  contextos: [],
})

// Tasks crus da disciplina (sem filtro) — usado pra distinguir "nenhuma task"
// de "nenhuma task bate com filtros" no empty state.
const tasksAll = computed(() =>
  props.disciplineId
    ? taskStore.tasks.filter(t => t.disciplineId === props.disciplineId)
    : []
)

// Constrói chave de contexto pra uma task (cargo/banca/área de origem).
// Tasks sem origemDados ou origem manual sem contexto retornam null.
function ctxKeyOf(task) {
  const d = task.origemDados || {}
  if (d.cargoOrigem) return `cargo:${d.cargoOrigem}`
  if (d.bancaOrigem && d.areaOrigem) return `banca:${d.bancaOrigem}|${d.areaOrigem}`
  if (d.bancaOrigem) return `banca:${d.bancaOrigem}`
  return null
}
function ctxLabelOf(task) {
  const d = task.origemDados || {}
  if (d.cargoOrigem) {
    // Lookup no cache acumulativo `cargosById` (persistido em localStorage).
    // Se mentor já abriu o edital do cargo alguma vez, o nome real aparece;
    // caso contrário, fallback truncado e disparamos ensureCargo em background
    // pra próximas renders mostrarem o nome.
    const cargo = cargoStore.getCargoById(d.cargoOrigem)
    if (cargo?.nome) return cargo.nome
    return `cargo ${String(d.cargoOrigem).slice(0, 6)}…`
  }
  if (d.bancaOrigem && d.areaOrigem) return `${d.bancaOrigem} / ${d.areaOrigem}`
  if (d.bancaOrigem) return d.bancaOrigem
  return null
}

// Hidrata `cargosById` em background pros cargos de origem que ainda não
// estão no cache — assim ctxLabelOf passa de truncado pra nome real na
// próxima render (sem block).
function ensureCargosDasTasks() {
  const vistos = new Set()
  for (const t of tasksAll.value) {
    const cargoId = t.origemDados?.cargoOrigem
    const editalId = t.origemDados?.editalOrigem
    if (!cargoId || !editalId || vistos.has(cargoId)) continue
    if (cargoStore.getCargoById(cargoId)) continue
    vistos.add(cargoId)
    cargoStore.ensureCargo(editalId, cargoId)
  }
}
watch(tasksAll, ensureCargosDasTasks, { immediate: true })
function ctxTooltipOf(task) {
  const d = task.origemDados || {}
  const partes = []
  if (d.cargoOrigem) partes.push(`Cargo ${d.cargoOrigem}`)
  if (d.editalOrigem) partes.push(`Edital ${d.editalOrigem}`)
  if (d.bancaOrigem) partes.push(`Banca ${d.bancaOrigem}`)
  if (d.areaOrigem) partes.push(`Área ${d.areaOrigem}`)
  return partes.join(' · ')
}

// Tasks após escopo de plano aplicado (sem outros filtros).
// Usado como base de `contextosOrigem` pra evitar chips fantasmas (de tasks
// de outros planos quando escopo='plano').
const tasksNoEscopo = computed(() => {
  if (filtros.value.escopo === 'todos' || !props.planId) return tasksAll.value
  return tasksAll.value.filter(t => !t.planId || t.planId === props.planId)
})

// Conjunto único de contextos encontrados nas tasks (já filtradas por escopo),
// usado pra popular os chips dinâmicos do filtro "Veio de:".
const contextosOrigem = computed(() => {
  const seen = new Map() // key → { key, label, tooltip }
  for (const t of tasksNoEscopo.value) {
    const key = ctxKeyOf(t)
    if (!key || seen.has(key)) continue
    seen.set(key, {
      key,
      label: ctxLabelOf(t) || key,
      tooltip: ctxTooltipOf(t),
    })
  }
  return [...seen.values()]
})

// Quando contextos disponíveis mudam (ex.: troca de escopo, refetch), poda
// `filtros.contextos` de chaves que não existem mais — evita filtro fantasma.
watch(contextosOrigem, (lista) => {
  const validas = new Set(lista.map(c => c.key))
  const filtrados = filtros.value.contextos.filter(k => validas.has(k))
  if (filtrados.length !== filtros.value.contextos.length) {
    filtros.value = { ...filtros.value, contextos: filtrados }
  }
})

// Set de taskIds que estão em alguma goal do plano ativo (pra filtro de status).
const taskIdsEmUsoNoPlano = computed(() => {
  if (!props.planId) return new Set()
  const set = new Set()
  for (const g of planStore.goals) {
    if (g?.planId === props.planId) {
      for (const tid of g.taskIds || []) set.add(tid)
    }
  }
  return set
})

const tasks = computed(() => {
  if (!props.disciplineId) return []
  const q = normalizeText(filtros.value.q)
  const { escopo, status, types, origens, contextos } = filtros.value
  return tasksAll.value.filter(t => {
    // Escopo: 'plano' (default) mostra só tasks deste plano + livres sem plano;
    //         'todos' mostra tasks da disciplina de qualquer plano (biblioteca)
    if (escopo === 'plano' && props.planId) {
      if (t.planId && t.planId !== props.planId) return false
    }
    if (q && !normalizeText(t.title).includes(q)) return false
    if (types.length && !types.includes(t.type)) return false
    if (origens.length && !origens.includes(t.origem || 'ia_legacy')) return false
    if (contextos.length) {
      const key = ctxKeyOf(t)
      if (!key || !contextos.includes(key)) return false
    }
    if (status !== 'todas' && props.planId) {
      const inUse = taskIdsEmUsoNoPlano.value.has(t.id)
      if (status === 'livres' && inUse) return false
      if (status === 'em_uso' && !inUse) return false
    }
    return true
  })
})

const typeLabels = {
  leitura_pdf: 'PDF',
  questoes:    'Questões',
  video:       'Vídeo',
  revisao:     'Revisão',
  lei_seca:    'Lei Seca',
  outras:      'Outras',
}

const typeLabel = (type) => typeLabels[type] ?? type

function openModal(task) {
  editingTask.value = task
  modalOpen.value = true
}

async function remove(id) {
  if (!confirm('Tem certeza que deseja remover esta tarefa?')) return
  try {
    await taskStore.remove(id)
    toast.success('Tarefa removida.')
  } catch (err) {
    toast.error(err.message)
  }
}

async function criarRevisao(task) {
  if (!props.planId) {
    toast.error('Selecione um plano antes de criar revisão.')
    return
  }
  if (!confirm(`Criar nova tarefa de revisão a partir de "${task.title}"?`)) return
  try {
    const revisao = await taskStore.criarRevisao(task.id, { planId: props.planId })
    toast.success(`Revisão "${revisao.title}" criada.`)
  } catch (err) {
    toast.error(err.response?.data?.message || err.message || 'Erro ao criar revisão.')
  }
}

function goToOrientation(taskId) {
  router.push({ name: 'OrientacaoView', params: { taskId } })
}

function onDragStart(task, event) {
  event.dataTransfer.setData('taskId', task.id)
  emit('drag-start', task)
}

watch(() => props.disciplineId, (newValue) => {
  selectedIds.value = new Set()
  if (!newValue) return // sem disciplina selecionada, não busca (evita URL com 'undefined')
  taskStore.fetchByDiscipline(newValue)
})
</script>

<style scoped>
.panel {
  background: #fff;
  border: 1px solid #ebe9e4;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
  min-height: 0;
}

.panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 10px;
  border-bottom: 1px solid #f0efea;
  flex-shrink: 0;
}

.panel__label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #999;
}

.panel__label-disc {
  text-transform: none;
  font-weight: 600;
  letter-spacing: 0;
}

.panel__head-actions { display: flex; align-items: center; gap: 6px; }
.panel__select-all { cursor: pointer; display: flex; align-items: center; }
.panel__batch-btn {
  display: flex; align-items: center; gap: 4px;
  font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 600;
  padding: 3px 8px; border-radius: 5px; border: none; cursor: pointer;
}
.panel__batch-btn--duplicate { background: #EEEDFE; color: #534AB7; }
.panel__batch-btn--duplicate:hover { background: #E0DFFB; }
.panel__batch-btn--danger { background: #FEE2E2; color: #DC2626; }
.panel__batch-btn--danger:hover { background: #FECACA; }

.task-card__check { cursor: pointer; display: flex; align-items: center; flex-shrink: 0; }

.panel__icon-btn {
  width: 26px; height: 26px;
  border-radius: 6px;
  border: 1px solid #ebe9e4;
  background: transparent;
  display: flex;           /* ← garante que está */
  align-items: center;     /* ← centraliza vertical */
  justify-content: center; /* ← centraliza horizontal */
  cursor: pointer;
  color: #666;
  transition: background 0.15s;
  padding: 0;              /* ← adicione isso — padding padrão do button empurra o ícone */
  line-height: 1;          /* ← adicione isso — reseta line-height do button */
}
.panel__icon-btn:hover { background: #f5f4f0; }

.panel__body {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.panel__empty {
  font-size: 12px;
  color: #bbb;
  text-align: center;
  padding: 32px 0;
}

/* Task card */
.task-card {
  background: #fafaf8;
  border: 1px solid #ebe9e4;
  border-radius: 10px;
  padding: 12px;
  cursor: grab;
  transition: border-color 0.15s, transform 0.15s;
}
.task-card:hover {
  border-color: #AFA9EC;
  transform: translateY(-1px);
}
.task-card:active { cursor: grabbing; }
/* Task em uso em alguma meta do plano ativo — atenua sem esconder */
.task-card--in-use { opacity: 0.55; background: #f3f2ed; }
.task-card--in-use:hover { opacity: 0.85; }

.task-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 6px;
}

.task-card__actions {
  display: flex;
  gap: 4px;
  /* opacity: 0; */
  transition: opacity 0.15s;
}
.task-card:hover .task-card__actions { opacity: 1; }

.icon-action {
  /* width: 22px; height: 22px; */
  border-radius: 5px;
  border: none;
  background: transparent;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #999;
  transition: background 0.15s, color 0.15s;
}
.icon-action:hover { background: #eee; color: #444; }
.icon-action--danger:hover { background: #fee; color: #c0392b; }

.task-card__title {
  font-size: 13px;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0 0 3px;
}

.task-card__desc {
  font-size: 12px;
  color: #888;
  margin: 0 0 6px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.task-card__articles {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: #534AB7;
  background: #EEEDFE;
  border-radius: 6px;
  padding: 3px 8px;
  margin-bottom: 6px;
  width: fit-content;
}

.task-card__law {
  font-weight: 700;
  margin-left: 4px;
}

.task-card__drag-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: #ccc;
  margin-top: 6px;
}

/* Badges por tipo */
.task-badge {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  border-radius: 5px;
  padding: 2px 8px;
  text-transform: uppercase;
}
.task-badge--leitura_pdf { background: #E6F1FB; color: #185FA5; }
.task-badge--questoes    { background: #EAF3DE; color: #3B6D11; }
.task-badge--video       { background: #FAEEDA; color: #854F0B; }
.task-badge--revisao     { background: #FBEAF0; color: #993556; }
.task-badge--lei_seca    { background: #EEEDFE; color: #534AB7; }
.task-badge--outras      { background: #F1EFE8; color: #5F5E5A; }

/* Orientation badge */
.task-card__orientation {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: #7c3aed;
  background: #f5f3ff;
  border: 1px solid #ede9fe;
  border-radius: 6px;
  padding: 3px 8px;
  margin-bottom: 6px;
  width: fit-content;
  cursor: pointer;
  transition: background 0.15s;
}
.task-card__orientation:hover { background: #ede9fe; }
</style>