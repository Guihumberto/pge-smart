<template>
  <span
    v-if="numero != null"
    class="numero-badge"
    :title="tooltip"
  >
    {{ display }}
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  /** `task.numero` — sequencial por (planId, disciplineId). */
  numero: { type: Number, default: null },
  /** Nome da disciplina para gerar o prefixo abreviado. */
  disciplineName: { type: String, default: '' },
})

/**
 * Gera abreviação da disciplina: primeiras letras de cada palavra ≥3 chars.
 * "Direito Civil" → "DC", "Direito Constitucional (CF/88)" → "DC".
 * Fallback: 2 primeiras letras.
 */
function abreviar(nome) {
  const palavras = (nome || '')
    .replace(/[()]/g, ' ')
    .split(/\s+/)
    .filter(p => p.length >= 3 && /^[A-Za-zÀ-ÿ]/.test(p))
  if (palavras.length >= 2) {
    return palavras.slice(0, 3).map(p => p[0].toUpperCase()).join('')
  }
  return (nome || '??').slice(0, 2).toUpperCase()
}

const display = computed(() => {
  const prefix = props.disciplineName ? abreviar(props.disciplineName) : '#'
  return `${prefix} #${props.numero}`
})

const tooltip = computed(() =>
  `Tarefa #${props.numero}${props.disciplineName ? ' em ' + props.disciplineName : ''} (no plano)`,
)
</script>

<style scoped>
.numero-badge {
  display: inline-flex; align-items: center;
  font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 700;
  letter-spacing: 0.02em;
  padding: 1px 6px; border-radius: 4px;
  background: #1F2937; color: #fff;
  white-space: nowrap;
}
</style>
