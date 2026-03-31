<template>
  <div class="panel">
    <div class="panel__head">
      <span class="panel__label">
        Tarefas
        <span v-if="discipline" class="panel__label-disc" :style="{ color: discipline.color }">
          — {{ discipline.name }}
        </span>
      </span>
      <button
        v-if="disciplineId"
        class="panel__icon-btn"
        title="Nova tarefa"
        @click="openModal(null)"
      >
        <Plus :size="14" />
      </button>
    </div>

    <div class="panel__body">
      <p v-if="!disciplineId" class="panel__empty">
        Selecione uma disciplina para ver as tarefas.
      </p>

      <template v-else>
        <p v-if="!tasks.length" class="panel__empty">
          Nenhuma tarefa nesta disciplina.
        </p>

        <div
          v-for="task in tasks"
          :key="task.id"
          class="task-card"
          draggable="true"
          @dragstart="onDragStart(task, $event)"
          @dragend="$emit('drag-start', null)"
        >
          <div class="task-card__top">
            <span class="task-badge" :class="`task-badge--${task.type}`">
              {{ typeLabel(task.type) }}
            </span>
            <div class="task-card__actions">
              <button class="icon-action" @click="openModal(task)"><Pencil :size="12" /></button>
              <button class="icon-action icon-action--danger" @click="remove(task.id)"><Trash2 :size="12" /></button>
            </div>
          </div>
          
          <p class="task-card__title">{{ task.title }}</p>
          <p v-if="task.description" class="task-card__desc">{{ task.description }}</p>

          <div v-if="task.type === 'lei_seca' && task.articles" class="task-card__articles">
            <BookOpen :size="12" />
            {{ formatArticles(task.articles.resolved) }}
            <span v-if="task.lawSource" class="task-card__law">{{ task.lawSource }}</span>
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
import { ref, computed, watch } from 'vue'
import { Plus, Pencil, Trash2, GripVertical, BookOpen } from 'lucide-vue-next'
import { useDisciplineStore } from '@/stores/useDisciplineStore'
import { useTaskStore } from '@/stores/useTaskStore'
import { formatArticles } from '@/utils/articleParser'
import { toast } from 'vue-sonner'
import ModalTask from '@/components/workspace/ModalTask.vue'

const props = defineProps({
  disciplineId: String,
  planId: String,   // ← confirme que está aqui
})
const emit = defineEmits(['drag-start'])

const discStore = useDisciplineStore()
const taskStore = useTaskStore()

const modalOpen = ref(false)
const editingTask = ref(null)

const discipline = computed(() =>
  discStore.disciplines.find(d => d.id === props.disciplineId)
)

const tasks = computed(() =>
  props.disciplineId
    ? taskStore.tasks.filter(t => t.disciplineId === props.disciplineId)
    : []
)

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
    await taskStore.remove(props.planId, id)
    toast.success('Tarefa removida.')
  } catch (err) {
    toast.error(err.message)
  }
}

function onDragStart(task, event) {
  event.dataTransfer.setData('taskId', task.id)
  emit('drag-start', task)
}

watch(() => props.disciplineId, (newValue) => {
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

.task-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
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
</style>