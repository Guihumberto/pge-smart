<template>
  <div class="filter-bar">
    <!-- Busca textual -->
    <div class="filter-bar__row">
      <div class="filter-bar__search">
        <Search :size="12" aria-hidden="true" />
        <input
          v-model="model.q"
          class="filter-bar__input"
          type="search"
          placeholder="Buscar título..."
          @input="emitChange"
        />
      </div>
      <button
        v-if="hasActive"
        class="filter-bar__clear"
        type="button"
        title="Limpar filtros"
        @click="reset"
      >
        <X :size="12" /> Limpar
      </button>
    </div>

    <!-- Escopo do plano: deste plano vs todos -->
    <div class="filter-bar__row" role="radiogroup" aria-label="Escopo do plano">
      <button
        v-for="opt in ESCOPO_OPTIONS"
        :key="opt.value"
        type="button"
        role="radio"
        :aria-checked="model.escopo === opt.value"
        :class="['seg', { 'seg--active': model.escopo === opt.value }]"
        :title="!temPlanoAtivo ? 'Selecione um plano para filtrar' : opt.title"
        :disabled="!temPlanoAtivo"
        @click="setEscopo(opt.value)"
      >{{ opt.label }}</button>
    </div>

    <!-- Status no plano ativo: livres / em-uso / todas -->
    <div class="filter-bar__row" role="radiogroup" aria-label="Status no plano">
      <button
        v-for="opt in STATUS_OPTIONS"
        :key="opt.value"
        type="button"
        role="radio"
        :aria-checked="model.status === opt.value"
        :class="['seg', { 'seg--active': model.status === opt.value }]"
        :title="!temPlanoAtivo && opt.value !== 'todas' ? 'Selecione um plano' : ''"
        :disabled="!temPlanoAtivo && opt.value !== 'todas'"
        @click="setStatus(opt.value)"
      >{{ opt.label }}</button>
    </div>

    <!-- Tipo + origem (chips toggle multi) -->
    <details
      class="filter-bar__more"
      :open="advancedOpen"
      @toggle="advancedOpen = $event.target.open"
    >
      <summary class="filter-bar__more-summary">Filtros avançados</summary>
      <div class="filter-bar__row filter-bar__row--wrap">
        <span class="filter-bar__label">Tipo:</span>
        <button
          v-for="t in TYPES"
          :key="t.value"
          type="button"
          :aria-pressed="model.types.includes(t.value)"
          :class="['chip', { 'chip--on': model.types.includes(t.value) }]"
          @click="toggleType(t.value)"
        >{{ t.label }}</button>
      </div>
      <div class="filter-bar__row filter-bar__row--wrap">
        <span class="filter-bar__label">Origem:</span>
        <button
          v-for="o in ORIGENS"
          :key="o.value"
          type="button"
          :aria-pressed="model.origens.includes(o.value)"
          :class="['chip', { 'chip--on': model.origens.includes(o.value) }]"
          @click="toggleOrigem(o.value)"
        >{{ o.label }}</button>
      </div>

      <!-- Filtros de contexto de origem (banca/cargo) populados dinamicamente -->
      <div v-if="contextosOrigem.length" class="filter-bar__row filter-bar__row--wrap">
        <span class="filter-bar__label">Veio de:</span>
        <button
          v-for="ctx in contextosOrigem"
          :key="ctx.key"
          type="button"
          :aria-pressed="model.contextos.includes(ctx.key)"
          :class="['chip', { 'chip--on': model.contextos.includes(ctx.key) }]"
          :title="ctx.tooltip"
          @click="toggleContexto(ctx.key)"
        >{{ ctx.label }}</button>
      </div>
    </details>
  </div>
</template>

<script setup>
import { reactive, ref, computed, watch } from 'vue'
import { Search, X } from 'lucide-vue-next'

const props = defineProps({
  /** Estado inicial dos filtros. */
  modelValue: { type: Object, default: () => ({}) },
  /**
   * Contextos de origem disponíveis pra filtrar (extraído pelo parent
   * das tasks visíveis). Cada item: { key, label, tooltip? }.
   * key é o valor que vai pro `model.contextos[]`.
   */
  contextosOrigem: { type: Array, default: () => [] },
  /** Se false, desabilita filtros que dependem de plano ativo (escopo, status). */
  temPlanoAtivo: { type: Boolean, default: true },
})

const emit = defineEmits([
  /** Emite estado completo a cada mudança. */
  'update:modelValue',
])

const ESCOPO_OPTIONS = [
  { value: 'plano', label: 'Este plano', title: 'Tasks deste plano (+ tasks livres sem plano)' },
  { value: 'todos', label: 'Todos',     title: 'Tasks da disciplina, todos os planos' },
]

const STATUS_OPTIONS = [
  { value: 'todas',  label: 'Todas' },
  { value: 'livres', label: 'Livres' },     // não estão em nenhuma goal do plano ativo
  { value: 'em_uso', label: 'Em uso' },     // estão em alguma goal do plano ativo
]

const TYPES = [
  { value: 'lei_seca',    label: 'Lei Seca' },
  { value: 'questoes',    label: 'Questões' },
  { value: 'leitura_pdf', label: 'PDF' },
  { value: 'video',       label: 'Vídeo' },
  { value: 'revisao',     label: 'Revisão' },
  { value: 'outras',      label: 'Outras' },
]

// `revisao` desambiguado de `type=revisao`: aqui é "task criada como revisão
// via endpoint dedicado" (origem do schema), não o tipo dela.
const ORIGENS = [
  { value: 'cargo',     label: 'Cargo' },
  { value: 'foco',      label: 'Foco' },
  { value: 'manual',    label: 'Manual' },
  { value: 'revisao',   label: 'Veio de revisão' },
  { value: 'ia_legacy', label: 'IA' },
]

const model = reactive({
  q: props.modelValue.q ?? '',
  escopo: props.modelValue.escopo ?? 'plano',
  status: props.modelValue.status ?? 'todas',
  types: [...(props.modelValue.types ?? [])],
  origens: [...(props.modelValue.origens ?? [])],
  contextos: [...(props.modelValue.contextos ?? [])],
})

// Estado controlado do `<details>` — começa aberto se já há filtros avançados,
// mas respeita interação manual do usuário a partir daí.
const advancedOpen = ref(
  model.types.length > 0 || model.origens.length > 0 || model.contextos.length > 0,
)

const hasActive = computed(() =>
  !!model.q
    || model.escopo !== 'plano'
    || model.status !== 'todas'
    || model.types.length > 0
    || model.origens.length > 0
    || model.contextos.length > 0,
)

// Sincroniza model interno se parent muda modelValue (reset programático).
// Guard contra loop: se valores externos já batem com internos, no-op.
function arraysEq(a, b) {
  if (a === b) return true
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}
watch(() => props.modelValue, (v) => {
  if (!v) return
  const novaQ = v.q ?? ''
  const novoEscopo = v.escopo ?? 'plano'
  const novoStatus = v.status ?? 'todas'
  const novosTypes = v.types ?? []
  const novasOrigens = v.origens ?? []
  const novosContextos = v.contextos ?? []
  if (model.q === novaQ
      && model.escopo === novoEscopo
      && model.status === novoStatus
      && arraysEq(model.types, novosTypes)
      && arraysEq(model.origens, novasOrigens)
      && arraysEq(model.contextos, novosContextos)) return
  model.q = novaQ
  model.escopo = novoEscopo
  model.status = novoStatus
  model.types.splice(0, model.types.length, ...novosTypes)
  model.origens.splice(0, model.origens.length, ...novasOrigens)
  model.contextos.splice(0, model.contextos.length, ...novosContextos)
}, { deep: true })

function emitChange() {
  emit('update:modelValue', {
    q: model.q,
    escopo: model.escopo,
    status: model.status,
    types: [...model.types],
    origens: [...model.origens],
    contextos: [...model.contextos],
  })
}

function setEscopo(v) { model.escopo = v; emitChange() }
function setStatus(v) { model.status = v; emitChange() }

function toggleType(v) {
  const i = model.types.indexOf(v)
  if (i >= 0) model.types.splice(i, 1)
  else model.types.push(v)
  emitChange()
}
function toggleOrigem(v) {
  const i = model.origens.indexOf(v)
  if (i >= 0) model.origens.splice(i, 1)
  else model.origens.push(v)
  emitChange()
}
function toggleContexto(key) {
  const i = model.contextos.indexOf(key)
  if (i >= 0) model.contextos.splice(i, 1)
  else model.contextos.push(key)
  emitChange()
}

function reset() {
  model.q = ''
  model.escopo = 'plano'
  model.status = 'todas'
  model.types.splice(0)
  model.origens.splice(0)
  model.contextos.splice(0)
  emitChange()
}

// Permite parent resetar externamente
defineExpose({ reset })
</script>

<style scoped>
.filter-bar {
  display: flex; flex-direction: column; gap: 6px;
  padding: 8px 10px;
  background: #fafaf7;
  border-bottom: 1px solid #ebe9e4;
}
.filter-bar__row {
  display: flex; align-items: center; gap: 6px;
}
.filter-bar__row--wrap { flex-wrap: wrap; }
.filter-bar__label {
  font-size: 10px; font-weight: 600; color: #888;
  text-transform: uppercase; letter-spacing: 0.05em;
}

.filter-bar__search {
  display: flex; align-items: center; gap: 4px; flex: 1;
  background: #fff; border: 1px solid #ddd; border-radius: 6px;
  padding: 4px 8px; color: #888;
}
.filter-bar__input {
  flex: 1; border: none; outline: none; background: transparent;
  font-family: 'DM Sans', sans-serif; font-size: 12px;
}

.filter-bar__clear {
  display: inline-flex; align-items: center; gap: 3px;
  font-family: 'DM Sans', sans-serif; font-size: 11px;
  background: transparent; border: 1px solid #ddd; border-radius: 6px;
  padding: 3px 8px; cursor: pointer; color: #666;
}
.filter-bar__clear:hover { background: #f5f4f0; }

/* Segmented (status) */
.seg {
  flex: 1; font-family: 'DM Sans', sans-serif;
  font-size: 11px; font-weight: 600; color: #888;
  background: #fff; border: 1px solid #ebe9e4; border-radius: 6px;
  padding: 4px 8px; cursor: pointer;
}
.seg:hover:not(:disabled) { color: #1a1a2e; }
.seg--active { background: #EEEDFE; color: #534AB7; border-color: #534AB7; }
.seg:disabled { opacity: 0.4; cursor: not-allowed; }

/* Chip toggle */
.chip {
  display: inline-flex; align-items: center;
  font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 600;
  background: #fff; border: 1px solid #ebe9e4; color: #888;
  border-radius: 999px; padding: 3px 8px; cursor: pointer;
}
.chip:hover { color: #1a1a2e; }
.chip--on { background: #EEEDFE; color: #534AB7; border-color: #534AB7; }

.filter-bar__more {
  font-size: 11px;
}
.filter-bar__more-summary {
  cursor: pointer; color: #888; font-weight: 600;
  user-select: none; padding: 2px 0;
}
.filter-bar__more-summary:hover { color: #1a1a2e; }
.filter-bar__more[open] > .filter-bar__more-summary { color: #534AB7; }
</style>
