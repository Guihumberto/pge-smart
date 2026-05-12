<template>
  <span
    v-if="origem"
    :class="['origin-badge', `origin-badge--${origem}`]"
    :title="tooltip"
    :aria-label="tooltip"
  >
    <component :is="iconFor(origem)" :size="10" aria-hidden="true" />
    {{ labelFor(origem) }}
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { Target, BarChart3, Pencil, RotateCcw, Sparkles } from 'lucide-vue-next'

const props = defineProps({
  /** Valor de `task.origem`: 'cargo' | 'foco' | 'manual' | 'revisao' | 'ia_legacy' */
  origem: { type: String, default: null },
  /** Metadados (`task.origemDados`) para enriquecer o tooltip. */
  origemDados: { type: Object, default: null },
})

const LABELS = {
  cargo: 'cargo', foco: 'foco', manual: 'manual',
  revisao: 'revisão', ia_legacy: 'IA',
}
const ICONS = {
  cargo: Target, foco: BarChart3, manual: Pencil,
  revisao: RotateCcw, ia_legacy: Sparkles,
}

function labelFor(o) { return LABELS[o] ?? o }
function iconFor(o) { return ICONS[o] ?? Pencil }

const tooltip = computed(() => {
  const base = `Origem: ${labelFor(props.origem)}`
  const d = props.origemDados || {}
  const partes = []
  if (d.bancaOrigem) partes.push(d.bancaOrigem)
  if (d.areaOrigem) partes.push(d.areaOrigem)
  if (d.cargoOrigem) partes.push(`cargo ${d.cargoOrigem}`)
  if (partes.length) return `${base} — ${partes.join(' / ')}`
  return base
})
</script>

<style scoped>
.origin-badge {
  display: inline-flex; align-items: center; gap: 3px;
  font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 600;
  padding: 1px 6px; border-radius: 999px;
  text-transform: lowercase; letter-spacing: 0.02em;
  white-space: nowrap;
}
.origin-badge--cargo     { background: #FEF3C7; color: #92400E; }
.origin-badge--foco      { background: #DBEAFE; color: #1E40AF; }
.origin-badge--manual    { background: #F1F5F9; color: #475569; }
.origin-badge--revisao   { background: #FBEAF0; color: #993556; }
/* `ia_legacy` em lavanda claro pra NÃO colidir com `lei_seca` (que é o
 * lilás indigo). Mentor distingue: indigo = tipo lei seca; lavanda = origem IA. */
.origin-badge--ia_legacy { background: #F3E8FF; color: #6B21A8; }
</style>
