<template>
  <div class="panel">
    <div class="panel__head">
      <span class="panel__label">Metas</span>
      <div class="panel__head-actions">
        <template v-if="selectedIds.size > 0">
          <button class="panel__batch-btn panel__batch-btn--danger" @click="batchDelete">
            <Trash2 :size="12" /> Excluir ({{ selectedIds.size }})
          </button>
        </template>
        <label v-if="goals.length" class="panel__select-all" title="Selecionar todas">
          <input
            type="checkbox"
            :checked="allSelected"
            aria-label="Selecionar todas as metas"
            @change="toggleSelectAll"
          />
        </label>
        <button class="panel__icon-btn" title="Nova meta" aria-label="Nova meta" @click="openGoalForm">
          <Plus :size="14" />
        </button>
      </div>
    </div>

    <div class="panel__body">
      <p v-if="!planId" class="panel__empty">Selecione um plano.</p>

      <template v-else>
        <p v-if="!goals.length" class="panel__empty">
          Nenhuma meta neste plano. Crie a primeira!
        </p>

        <div
          v-for="goal in goals"
          :key="goal.id"
          class="goal-card"
          :class="{ 'goal-card--dragover': dragOverId === goal.id && !dragChip }"
          @dragover.prevent="onCardDragOver(goal.id, $event)"
          @dragleave="dragOverId = null"
          @drop="onDrop(goal.id, $event)"
        >
          <div class="goal-card__head">
            <div class="goal-card__title-row">
              <label class="goal-card__check" @click.stop>
                <input type="checkbox" :checked="selectedIds.has(goal.id)" @change="toggleSelect(goal.id)" />
              </label>
              <FolderOpen :size="14" class="goal-card__icon" />
              <span class="goal-card__title">{{ goal.title }}</span>
            </div>
            <div class="goal-card__actions">
              <button
                class="icon-action"
                title="Visualizar como aluno"
                aria-label="Visualizar meta como aluno"
                @click="previewGoal(goal.id)"
              >
                <Eye :size="11" />
              </button>
              <button
                class="icon-action"
                title="Copiar para outro plano"
                aria-label="Copiar meta para outro plano"
                @click="openCopy(goal)"
              >
                <Copy :size="11" />
              </button>
              <button
                class="icon-action icon-action--danger"
                title="Excluir meta"
                aria-label="Excluir meta"
                @click="removeGoal(goal.id)"
              >
                <Trash2 :size="11" />
              </button>
            </div>
          </div>

          <!-- Tarefas dentro da meta -->
          <div class="goal-tasks">
            <p v-if="!goal.taskIds.length" class="goal-drop-hint">
              Arraste tarefas aqui
            </p>

            <div
              v-for="(taskId, idx) in goal.taskIds"
              :key="taskId"
              :class="['goal-task-chip', {
                'goal-task-chip--dragging': dragChip?.goalId === goal.id && dragChip?.idx === idx,
                'goal-task-chip--dragover': dragOverChip?.goalId === goal.id && dragOverChip?.idx === idx && !(dragChip?.goalId === goal.id && dragChip?.idx === idx),
              }]"
              draggable="true"
              @dragstart="onChipDragStart(goal.id, idx, $event)"
              @dragover="onChipDragOver(goal.id, idx, $event)"
              @drop="onChipDrop(goal.id, idx, $event)"
              @dragend="onChipDragEnd"
            >
              <span class="goal-task-chip__order" :title="`Ordem de execução: ${idx + 1}`">
                {{ idx + 1 }}
              </span>
              <span class="goal-task-chip__badge" :class="`chip-badge--${getTask(taskId)?.type}`">
                {{ typeLabel(getTask(taskId)?.type) }}
              </span>
              <span class="goal-task-chip__name">{{ getTask(taskId)?.title ?? '—' }}</span>
              <button
                v-if="getTask(taskId)"
                class="goal-task-chip__action"
                title="Criar revisão desta tarefa"
                aria-label="Criar revisão desta tarefa"
                @click.stop="criarRevisaoDaTask(taskId)"
              >
                <RotateCcw :size="10" />
              </button>
              <button
                class="goal-task-chip__remove"
                title="Remover tarefa da meta"
                aria-label="Remover tarefa da meta"
                @click.stop="removeChip(goal.id, taskId)"
              >
                <X :size="10" />
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>

  <!-- Modal nova meta -->
  <div v-if="goalFormOpen" class="modal-overlay" @click.self="goalFormOpen = false">
    <div class="modal">
      <h3 class="modal__title">Nova Meta</h3>
      <p v-if="!planId"> Selecione ou crie um plano antes de adicionar a meta</p>
      <input v-model="goalForm.title" class="modal__input" placeholder="Título da meta" />
      <textarea v-model="goalForm.desc" class="modal__textarea" placeholder="Descrição (opcional)" />
      <div class="modal__actions">
        <button class="btn-ghost" @click="goalFormOpen = false">Cancelar</button>
        <button class="btn-primary-sm" v-if="planId" @click="saveGoal">Criar Meta</button>
      </div>
    </div>
  </div>

  <!-- Modal copiar meta -->
  <div v-if="copyModalOpen" class="modal-overlay" @click.self="copyModalOpen = false">
    <div class="modal">
      <h3 class="modal__title">Copiar meta para outro plano</h3>
      <select v-model="copyTargetPlanId" class="modal__input">
        <option v-for="p in otherPlans" :key="p.id" :value="p.id">{{ p.title }}</option>
      </select>
      <div class="modal__actions">
        <button class="btn-ghost" @click="copyModalOpen = false">Cancelar</button>
        <button class="btn-primary-sm" @click="confirmCopy">Copiar</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, FolderOpen, Trash2, Copy, X, Eye, RotateCcw } from 'lucide-vue-next'
import { usePlanStore } from '@/stores/usePlanStore'
import { useTaskStore } from '@/stores/useTaskStore'
import { toast } from 'vue-sonner'

const props = defineProps({ planId: { type: String, default: null }, draggingTask: Object })
const emit = defineEmits(['drop-done'])

const router = useRouter()
const planStore = usePlanStore()
const taskStore = useTaskStore()

const dragOverId = ref(null)
const goalFormOpen = ref(false)
const goalForm = ref({ title: '', desc: '' })
const copyModalOpen = ref(false)
const copyGoalRef = ref(null)
const copyTargetPlanId = ref(null)
const selectedIds = ref(new Set())

const goals = computed(() =>
  props.planId ? planStore.goals.filter(g => g?.planId === props.planId) : []
)

const otherPlans = computed(() =>
  planStore.plans.filter(p => p.id !== props.planId)
)

const allSelected = computed(() =>
  goals.value.length > 0 && goals.value.every(g => selectedIds.value.has(g.id))
)

const getTask = (id) => taskStore.getById(id)

const typeLabels = {
  leitura_pdf: 'PDF', questoes: 'Quest.', video: 'Vídeo',
  revisao: 'Rev.', lei_seca: 'Lei', outras: 'Outro',
}
const typeLabel = (type) => typeLabels[type] ?? '?'

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
    selectedIds.value = new Set(goals.value.map(g => g.id))
  }
}

async function batchDelete() {
  const count = selectedIds.value.size
  if (!confirm(`Excluir ${count} meta(s) selecionada(s)?`)) return
  try {
    await Promise.all([...selectedIds.value].map(id => planStore.removeGoal(props.planId, id)))
    toast.success(`${count} meta(s) removida(s).`)
    selectedIds.value = new Set()
  } catch (err) {
    toast.error(err.message)
  }
}

function onDrop(goalId, event) {
  const taskId = event.dataTransfer.getData('taskId')
  if (taskId) planStore.addTaskToGoal(props.planId, goalId, taskId)
  dragOverId.value = null
  emit('drop-done')
}

function openGoalForm() {
  goalForm.value = { title: '', desc: '' }
  goalFormOpen.value = true
}

function saveGoal() {
  if (!goalForm.value.title.trim()) return
  planStore.createGoal(props.planId, goalForm.value.title, goalForm.value.desc)
  goalFormOpen.value = false
}

function removeGoal(id) { planStore.removeGoal(props.planId, id) }

function previewGoal(goalId) {
  router.push({ name: 'GoalPreview', params: { planId: props.planId, goalId } })
}

function openCopy(goal) {
  copyGoalRef.value = goal
  copyTargetPlanId.value = otherPlans.value[0]?.id ?? null
  copyModalOpen.value = true
}

function confirmCopy() {
  if (copyTargetPlanId.value) {
    planStore.copyGoalToPlan(props.planId, copyGoalRef.value.id, copyTargetPlanId.value)
  }
  copyModalOpen.value = false
}

const removeChip = (goalId, taskId) =>
  planStore.removeTaskFromGoal(props.planId, goalId, taskId)

// ── Reordenação de tasks dentro de uma goal (drag entre chips) ──────
const dragChip = ref(null)      // { goalId, idx } — chip sendo arrastado
const dragOverChip = ref(null)  // { goalId, idx } — chip alvo do drop

function onChipDragStart(goalId, idx, event) {
  dragChip.value = { goalId, idx }
  // Marca tipo distinto pra goal-card.onDrop não confundir com task externa
  event.dataTransfer.setData('reorder-chip', '1')
  event.dataTransfer.effectAllowed = 'move'
  event.stopPropagation() // evita drag emergir como drop de task no card
}

function onChipDragOver(goalId, idx, event) {
  if (!dragChip.value || dragChip.value.goalId !== goalId) return
  event.preventDefault()
  event.stopPropagation()
  dragOverChip.value = { goalId, idx }
}

async function onChipDrop(goalId, idxDestino, event) {
  event.preventDefault()
  event.stopPropagation()
  const src = dragChip.value
  dragChip.value = null
  dragOverChip.value = null
  if (!src) return
  // Reorder só faz sentido na mesma goal — drop em outra goal mostra dica.
  if (src.goalId !== goalId) {
    toast.info('Pra mover entre metas, remova daqui e arraste a tarefa do painel.')
    return
  }
  if (src.idx === idxDestino) return

  const goal = planStore.goals.find(g => g.id === goalId)
  if (!goal) return
  const ordemAntiga = [...goal.taskIds]
  const novaOrdem = [...ordemAntiga]
  const [moved] = novaOrdem.splice(src.idx, 1)
  novaOrdem.splice(idxDestino, 0, moved)

  // Update otimista: aplica na UI antes do await pra evitar flicker;
  // reverte se backend falhar.
  goal.taskIds = novaOrdem
  try {
    await planStore.updateGoal(props.planId, goalId, { taskIds: novaOrdem })
  } catch (err) {
    goal.taskIds = ordemAntiga
    // Backend rejeita reorder se o conjunto de taskIds mudou desde o último
    // fetch (race: outra aba adicionou/removeu). Detecta e refetcha em vez
    // de jogar mensagem técnica no mentor.
    const msg = err.response?.data?.message || ''
    if (err.response?.status === 400 && /reorden/i.test(msg)) {
      try { await planStore.fetchGoals(props.planId) } catch {}
      toast.warning('Outra aba mudou esta meta. Estado atualizado aqui.')
    } else {
      toast.error(msg || err.message || 'Erro ao reordenar.')
    }
  }
}

function onChipDragEnd() {
  dragChip.value = null
  dragOverChip.value = null
  dragOverId.value = null // limpa highlight do card caso tenha vazado
}

function onCardDragOver(goalId, _event) {
  // Bail-out: se reorder de chip está ativo, NÃO mexer no dragOverId
  // (evita reescrita por frame durante o movimento do mouse).
  if (dragChip.value) return
  dragOverId.value = goalId
}

// ── Criar revisão de uma task já em meta ────────────────────────────
async function criarRevisaoDaTask(taskId) {
  const original = taskStore.getById(taskId)
  const nomeOriginal = original?.title || 'esta tarefa'
  if (!confirm(`Criar nova tarefa de revisão a partir de "${nomeOriginal}"?`)) return
  try {
    const revisao = await taskStore.criarRevisao(taskId, { planId: props.planId })
    toast.success(`Revisão "${revisao.title}" criada. Arraste para uma meta.`)
  } catch (err) {
    toast.error(err.response?.data?.message || err.message || 'Erro ao criar revisão.')
  }
}
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

.panel__head-actions {
  display: flex; align-items: center; gap: 6px;
}

.panel__batch-btn {
  display: flex; align-items: center; gap: 4px;
  font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 600;
  border: none; border-radius: 6px; padding: 4px 10px; cursor: pointer;
}
.panel__batch-btn--danger { background: #FEE2E2; color: #DC2626; }
.panel__batch-btn--danger:hover { background: #FECACA; }

.panel__select-all {
  display: flex; align-items: center; cursor: pointer;
}
.panel__select-all input { accent-color: #534AB7; cursor: pointer; }

.panel__icon-btn {
  width: 26px; height: 26px;
  border-radius: 6px;
  border: 1px solid #ebe9e4;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #666;
  transition: background 0.15s;
  padding: 0;
  line-height: 1;
}
.panel__icon-btn:hover { background: #f5f4f0; }

.panel__body {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.panel__empty {
  font-size: 12px;
  color: #bbb;
  text-align: center;
  padding: 32px 0;
}

/* Goal card */
.goal-card {
  border: 1.5px dashed #e0dedb;
  border-radius: 10px;
  padding: 12px;
  transition: border-color 0.15s, background 0.15s;
}
.goal-card--dragover {
  border-color: #534AB7;
  background: #f7f6ff;
}

.goal-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.goal-card__title-row {
  display: flex;
  align-items: center;
  gap: 7px;
}

.goal-card__check {
  display: flex; align-items: center; cursor: pointer;
}
.goal-card__check input { accent-color: #534AB7; cursor: pointer; }

.goal-card__icon { color: #534AB7; }

.goal-card__title {
  font-size: 13px;
  font-weight: 700;
  color: #1a1a2e;
}

.goal-card__actions {
  display: flex;
  gap: 4px;
  /* opacity: 0; */
  transition: opacity 0.15s;
}
.goal-card:hover .goal-card__actions { opacity: 1; }

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

/* Goal tasks */
.goal-tasks {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 32px;
}

.goal-drop-hint {
  font-size: 11px;
  color: #ccc;
  margin: 0;
  align-self: center;
}

.goal-task-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  background: #f5f4f0;
  border: 1px solid #ebe9e4;
  border-radius: 20px;
  padding: 3px 8px 3px 5px;
  font-size: 11px;
  cursor: grab;
  transition: opacity 0.12s, border-color 0.12s, transform 0.12s;
}
.goal-task-chip:active { cursor: grabbing; }
.goal-task-chip--dragging { opacity: 0.4; }
.goal-task-chip--dragover {
  border-color: #534AB7; transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(83, 74, 183, 0.15);
}
.goal-task-chip__order {
  display: inline-flex; align-items: center; justify-content: center;
  width: 16px; height: 16px;
  background: #1F2937; color: #fff;
  font-size: 9px; font-weight: 700;
  border-radius: 999px;
}
.goal-task-chip__action {
  background: transparent; border: none; cursor: pointer; color: #bbb;
  display: flex; align-items: center; padding: 0;
  transition: color 0.12s;
}
.goal-task-chip__action:hover { color: #534AB7; }

.goal-task-chip__badge {
  font-size: 9px;
  font-weight: 700;
  border-radius: 4px;
  padding: 1px 5px;
  text-transform: uppercase;
}

.chip-badge--leitura_pdf { background: #E6F1FB; color: #185FA5; }
.chip-badge--questoes    { background: #EAF3DE; color: #3B6D11; }
.chip-badge--video       { background: #FAEEDA; color: #854F0B; }
.chip-badge--revisao     { background: #FBEAF0; color: #993556; }
.chip-badge--lei_seca    { background: #EEEDFE; color: #534AB7; }
.chip-badge--outras      { background: #F1EFE8; color: #5F5E5A; }

.goal-task-chip__name {
  color: #444;
  font-weight: 500;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.goal-task-chip__remove {
  background: transparent;
  border: none;
  cursor: pointer;
  color: #bbb;
  display: flex; align-items: center;
  padding: 0;
  transition: color 0.15s;
}
.goal-task-chip__remove:hover { color: #c0392b; }

/* Modais */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.35);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal {
  background: #fff;
  border-radius: 14px;
  padding: 24px;
  width: 360px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.modal__title {
  font-size: 15px;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}

.modal__input {
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 8px 12px;
  outline: none;
  width: 100%;
}
.modal__input:focus { border-color: #534AB7; }

.modal__textarea {
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 8px 12px;
  outline: none;
  width: 100%;
  resize: vertical;
  min-height: 72px;
}
.modal__textarea:focus { border-color: #534AB7; }

.modal__actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.btn-ghost {
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  background: transparent;
  border: 1px solid #ddd;
  border-radius: 7px;
  padding: 7px 14px;
  cursor: pointer;
  color: #666;
}

.btn-primary-sm {
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  background: #534AB7;
  border: none;
  border-radius: 7px;
  padding: 7px 14px;
  cursor: pointer;
  color: #fff;
}
</style>