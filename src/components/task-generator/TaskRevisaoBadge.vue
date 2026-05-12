<template>
  <span
    v-if="revisaoDeTaskId"
    :class="['rev-badge', { 'rev-badge--orphan': !taskOriginal }]"
    :title="tooltip"
    :aria-label="tooltip"
  >
    <RotateCcw :size="10" aria-hidden="true" />
    rev. de {{ display }}
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { RotateCcw } from 'lucide-vue-next'
import { useTaskStore } from '@/stores/useTaskStore'

const props = defineProps({
  /** `task.revisaoDeTaskId` — id da task original que esta revisão referencia. */
  revisaoDeTaskId: { type: String, default: null },
})

const taskStore = useTaskStore()

const taskOriginal = computed(() =>
  props.revisaoDeTaskId ? taskStore.getById(props.revisaoDeTaskId) : null,
)

// Truncate seguro pra UTF-16 (surrogate pairs de emoji/acento composto).
function truncar(s, max = 18) {
  const chars = Array.from(s || '')
  return chars.length > max ? chars.slice(0, max).join('') + '…' : (s || '')
}

const display = computed(() => {
  const t = taskOriginal.value
  if (!t) return '?'       // original não está no store (orphan)
  if (t.numero != null) return `#${t.numero}`
  return truncar(t.title, 18)
})

const tooltip = computed(() => {
  const t = taskOriginal.value
  if (!t) return 'Tarefa original não está carregada no momento'
  return `Revisão de "${t.title}"`
})
</script>

<style scoped>
.rev-badge {
  display: inline-flex; align-items: center; gap: 3px;
  font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 600;
  padding: 1px 6px; border-radius: 999px;
  background: #FBEAF0; color: #993556;
  white-space: nowrap;
}
/* Quando a task original não está carregada no store — visual atenuado
 * pra mentor entender que é revisão mesmo sem o link completo. */
.rev-badge--orphan {
  background: #F3F4F6; color: #6B7280;
  border: 1px dashed #D1D5DB;
}
</style>
