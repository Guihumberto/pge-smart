<template>
  <div class="type-selector" role="radiogroup" :aria-label="ariaLabel || 'Tipo de tarefa'">
    <button
      v-for="opt in OPTIONS"
      :key="opt.value"
      type="button"
      role="radio"
      :aria-checked="modelValue === opt.value"
      :class="['chip', `chip--${opt.value}`, { 'chip--active': modelValue === opt.value }]"
      :disabled="disabled"
      @click="$emit('update:modelValue', opt.value)"
    >
      <component :is="opt.icon" :size="12" aria-hidden="true" />
      {{ opt.label }}
    </button>
  </div>
</template>

<script setup>
import { BookOpen, FileQuestion, Video, RotateCcw, ScrollText, MoreHorizontal } from 'lucide-vue-next'

defineProps({
  modelValue: { type: String, default: null },
  ariaLabel: { type: String, default: '' },
  disabled:  { type: Boolean, default: false },
})

defineEmits(['update:modelValue'])

// Ordem: lei_seca primeiro (mais comum), depois questões, leitura, vídeo, revisão, outras.
// Cores alinhadas ao `.task-badge--*` em PanelTasks pra consistência visual.
const OPTIONS = [
  { value: 'lei_seca',    label: 'Lei Seca',  icon: ScrollText },
  { value: 'questoes',    label: 'Questões',  icon: FileQuestion },
  { value: 'leitura_pdf', label: 'PDF',       icon: BookOpen },
  { value: 'video',       label: 'Vídeo',     icon: Video },
  { value: 'revisao',     label: 'Revisão',   icon: RotateCcw },
  { value: 'outras',      label: 'Outras',    icon: MoreHorizontal },
]
</script>

<style scoped>
.type-selector {
  display: flex; flex-wrap: wrap; gap: 6px;
}
.chip {
  display: inline-flex; align-items: center; gap: 4px;
  font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 600;
  background: #fff;
  border: 1px solid #ebe9e4; color: #666;
  border-radius: 999px; padding: 5px 10px;
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
}
.chip:hover:not(:disabled) { background: #f5f4f0; }
.chip:disabled { opacity: 0.4; cursor: not-allowed; }
/* Cada chip ativo tem cor própria por tipo (lei_seca, questoes, ...).
 * Cores alinhadas a `.task-badge--*` (PanelTasks) e `.chip-badge--*` (PanelGoals)
 * pra mentor associar "esse roxo = lei seca" em qualquer superfície. */
.chip--lei_seca.chip--active    { background: #EEEDFE; border-color: #534AB7; color: #534AB7; }
.chip--questoes.chip--active    { background: #EAF3DE; border-color: #3B6D11; color: #3B6D11; }
.chip--leitura_pdf.chip--active { background: #E6F1FB; border-color: #185FA5; color: #185FA5; }
.chip--video.chip--active       { background: #FAEEDA; border-color: #854F0B; color: #854F0B; }
.chip--revisao.chip--active     { background: #FBEAF0; border-color: #993556; color: #993556; }
.chip--outras.chip--active      { background: #F1EFE8; border-color: #5F5E5A; color: #5F5E5A; }
</style>
