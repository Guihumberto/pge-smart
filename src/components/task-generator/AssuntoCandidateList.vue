<template>
  <div class="cand-list">
    <div class="cand-list__toolbar">
      <label class="cand-list__select-all">
        <input
          type="checkbox"
          :checked="allChecked"
          :indeterminate.prop="someChecked && !allChecked"
          :aria-checked="allChecked ? 'true' : (someChecked ? 'mixed' : 'false')"
          :disabled="disabled || !candidates.length"
          @change="toggleAll($event.target.checked)"
        />
        <span>{{ allChecked ? 'Desmarcar todos' : 'Marcar todos' }}</span>
      </label>
      <span class="cand-list__count">
        {{ selectedCount }} / {{ candidates.length }} selecionados
      </span>
    </div>

    <div v-if="!candidates.length" class="cand-list__empty">
      Nenhum candidato disponível.
    </div>

    <ul v-else class="cand-list__items">
      <li
        v-for="(c, i) in candidates"
        :key="(c.nome || i) + '::' + i"
        :class="['cand-item', { 'cand-item--selected': isSelected(c) }]"
      >
        <label class="cand-item__main">
          <input
            type="checkbox"
            :checked="isSelected(c)"
            :disabled="disabled"
            @change="toggle(c)"
          />
          <div class="cand-item__body">
            <div class="cand-item__title">{{ c.nome }}</div>
            <div class="cand-item__meta">
              <span v-if="c.score != null" class="meta-chip meta-chip--score">
                score {{ formatScore(c.score) }}
              </span>
              <span v-else class="meta-chip meta-chip--null">sem match</span>
              <span v-if="c.cargaSugerida != null" class="meta-chip">
                ~{{ formatCarga(c.cargaSugerida) }}
              </span>
              <span v-if="c.leisReferencia?.length" class="meta-chip meta-chip--law">
                {{ formatLeis(c.leisReferencia) }}
              </span>
              <span v-if="c.artigosReferencia" class="meta-chip meta-chip--law">
                arts. {{ c.artigosReferencia }}
              </span>
              <span v-if="c.subAssuntos?.length" class="meta-chip meta-chip--sub">
                {{ c.subAssuntos.length }} sub-assunto(s)
              </span>
            </div>
          </div>
        </label>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  /**
   * Lista uniforme de candidatos. Shape:
   * { nome, score?, cargaSugerida?, leisReferencia?, artigosReferencia?,
   *   lawIdSugerido?, subAssuntos?, metadadosOrigem? }
   *
   * IMPORTANTE: `nome` é a chave de seleção. Adapters (cargo/foco) DEVEM
   * garantir que `nome` é único na lista — caso contrário, marcar um candidato
   * marca todos com o mesmo nome.
   */
  candidates: { type: Array, default: () => [] },
  /** Set ou array de chaves selecionadas. Usa `nome` como chave por padrão. */
  modelValue: { type: [Array, Set], default: () => [] },
  disabled:   { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const selectedSet = computed(() =>
  props.modelValue instanceof Set ? props.modelValue : new Set(props.modelValue),
)
function isSelected(c) { return selectedSet.value.has(c.nome) }

const selectedCount = computed(() => selectedSet.value.size)
const allChecked = computed(() =>
  props.candidates.length > 0 && props.candidates.every(c => selectedSet.value.has(c.nome)),
)
const someChecked = computed(() => selectedCount.value > 0)

function toggle(c) {
  const next = new Set(selectedSet.value)
  if (next.has(c.nome)) next.delete(c.nome)
  else next.add(c.nome)
  emit('update:modelValue', [...next])
}

function toggleAll(checked) {
  if (checked) emit('update:modelValue', props.candidates.map(c => c.nome))
  else emit('update:modelValue', [])
}

function formatScore(s) {
  return (s * 100).toFixed(0)
}
function formatCarga(h) {
  if (h < 1) return `${Math.round(h * 60)}min`
  return `${Number.isInteger(h) ? h : h.toFixed(1)}h`
}
function formatLeis(arr) {
  if (arr.length === 1) return arr[0]
  return `${arr[0]} +${arr.length - 1}`
}
</script>

<style scoped>
.cand-list { display: flex; flex-direction: column; gap: 8px; }
.cand-list__toolbar {
  display: flex; align-items: center; justify-content: space-between;
  font-size: 12px; color: #666;
}
.cand-list__select-all {
  display: inline-flex; align-items: center; gap: 6px;
  cursor: pointer; font-weight: 600;
}
.cand-list__count { color: #888; font-size: 11px; }
.cand-list__empty {
  padding: 24px; text-align: center; color: #aaa; font-size: 13px;
  background: #f9f9f6; border-radius: 8px;
}
.cand-list__items {
  list-style: none; margin: 0; padding: 0;
  display: flex; flex-direction: column; gap: 4px;
  max-height: 360px; overflow-y: auto;
  border: 1px solid #ebe9e4; border-radius: 8px; padding: 6px;
  background: #fafaf7;
}
.cand-item {
  background: #fff; border: 1px solid transparent; border-radius: 6px;
  transition: border-color 0.12s, background 0.12s;
}
.cand-item:hover { border-color: #ebe9e4; }
.cand-item--selected { border-color: #534AB7; background: #FAFAFE; }
.cand-item__main {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 8px 10px; cursor: pointer;
}
.cand-item__body { flex: 1; min-width: 0; }
.cand-item__title { font-size: 13px; color: #1a1a2e; font-weight: 500; line-height: 1.3; }
.cand-item__meta { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
.meta-chip {
  display: inline-flex; align-items: center;
  font-size: 10px; padding: 1px 6px; border-radius: 4px;
  background: #f0eff8; color: #666;
}
.meta-chip--score { background: #EEEDFE; color: #534AB7; font-weight: 600; }
.meta-chip--null  { background: #F3F4F6; color: #9CA3AF; }
.meta-chip--law   { background: #FEF3C7; color: #92400E; }
.meta-chip--sub   { background: #DCFCE7; color: #166534; }
</style>
