<template>
  <div class="panel">
    <div class="panel__head">
      <span class="panel__label">Metas</span>
      <button class="panel__icon-btn" title="Nova meta" @click="openGoalForm">
        <Plus :size="14" />
      </button>
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
          :class="{ 'goal-card--dragover': dragOverId === goal.id }"
          @dragover.prevent="dragOverId = goal.id"
          @dragleave="dragOverId = null"
          @drop="onDrop(goal.id, $event)"
        >
          <div class="goal-card__head">
            <div class="goal-card__title-row">
              <FolderOpen :size="14" class="goal-card__icon" />
              <span class="goal-card__title">{{ goal.title }}</span>
            </div>
            <div class="goal-card__actions">
              <button class="icon-action" title="Visualizar como aluno" @click="previewGoal(goal.id)">
                <Eye :size="11" />
              </button>
              <button class="icon-action" title="Copiar para outro plano" @click="openCopy(goal)">
                <Copy :size="11" />
              </button>
              <button class="icon-action icon-action--danger" @click="removeGoal(goal.id)">
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
              v-for="taskId in goal.taskIds"
              :key="taskId"
              class="goal-task-chip"
            >
              <span class="goal-task-chip__badge" :class="`chip-badge--${getTask(taskId)?.type}`">
                {{ typeLabel(getTask(taskId)?.type) }}
              </span>
              <span class="goal-task-chip__name">{{ getTask(taskId)?.title ?? '—' }}</span>
              <button class="goal-task-chip__remove" @click="removeChip(goal.id, taskId)">
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
import { Plus, FolderOpen, Trash2, Copy, X, Eye } from 'lucide-vue-next'
import { usePlanStore } from '@/stores/usePlanStore'
import { useTaskStore } from '@/stores/useTaskStore'

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

const goals = computed(() =>
  props.planId ? planStore.goals.filter(g => g?.planId === props.planId) : []
)

const otherPlans = computed(() =>
  planStore.plans.filter(p => p.id !== props.planId)
)

const getTask = (id) => taskStore.getById(id)

const typeLabels = {
  leitura_pdf: 'PDF', questoes: 'Quest.', video: 'Vídeo',
  revisao: 'Rev.', lei_seca: 'Lei', outras: 'Outro',
}
const typeLabel = (type) => typeLabels[type] ?? '?'

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

function removeGoal(id) { planStore.removeGoal(id) }

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
}

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