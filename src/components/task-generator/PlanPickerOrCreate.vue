<template>
  <div class="plan-picker">
    <div class="plan-picker__tabs" role="tablist" aria-label="Seleção de plano">
      <button
        id="pp-tab-select"
        type="button"
        role="tab"
        :aria-selected="mode === 'select'"
        :tabindex="mode === 'select' ? 0 : -1"
        aria-controls="pp-panel-select"
        :class="['tab', { 'tab--active': mode === 'select' }]"
        :disabled="disabled || !plans.length"
        @click="mode = 'select'"
      >
        Usar plano existente
      </button>
      <button
        id="pp-tab-create"
        type="button"
        role="tab"
        :aria-selected="mode === 'create'"
        :tabindex="mode === 'create' ? 0 : -1"
        aria-controls="pp-panel-create"
        :class="['tab', { 'tab--active': mode === 'create' }]"
        :disabled="disabled"
        @click="mode = 'create'"
      >
        Criar novo plano
      </button>
    </div>

    <!-- Modo selecionar -->
    <div
      v-if="mode === 'select'"
      id="pp-panel-select"
      role="tabpanel"
      aria-labelledby="pp-tab-select"
      class="field"
    >
      <label class="field__label">Plano destino</label>
      <select
        v-model="selectedId"
        class="field__input"
        :disabled="disabled || !plans.length"
        @change="emitSelected"
      >
        <option value="" disabled>Escolha um plano…</option>
        <option v-for="p in plans" :key="p.id" :value="p.id">{{ p.title }}</option>
      </select>
      <p v-if="!plans.length" class="hint hint--muted">
        Você ainda não tem planos. Mude para "Criar novo plano".
      </p>
    </div>

    <!-- Modo criar -->
    <div
      v-else
      id="pp-panel-create"
      role="tabpanel"
      aria-labelledby="pp-tab-create"
      class="field"
    >
      <label class="field__label">Nome do novo plano <span class="req">*</span></label>
      <input
        v-model="newTitle"
        class="field__input"
        :class="{ 'field__input--invalid': conflito }"
        :placeholder="placeholder || 'Ex: PGE/AL Procurador 2026'"
        :disabled="disabled"
        @input="emitCreate"
      />
      <p v-if="conflito" class="hint hint--error">
        Você já tem um plano chamado "{{ conflito.title }}"
      </p>
      <p v-else-if="!newTitle.trim()" class="hint hint--muted">
        O nome será o filtro principal das tarefas no workspace.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { normalizeText } from '@/utils/strings'

const props = defineProps({
  /** Planos existentes do mentor (já carregados no usePlanStore). */
  plans:       { type: Array,   default: () => [] },
  /** Modo inicial: 'select' se há planos, 'create' caso contrário. */
  initialMode: { type: String,  default: null },
  placeholder: { type: String,  default: '' },
  disabled:    { type: Boolean, default: false },
})

const emit = defineEmits([
  /** ({ mode: 'select', planId }) | ({ mode: 'create', title, conflict }) */
  'change',
])

const mode = ref(props.initialMode || (props.plans.length ? 'select' : 'create'))
const selectedId = ref('')
const newTitle = ref('')

// Detecta colisão de nome no modo create — usa `normalizeText` (strip acentos +
// trim + lowercase + collapse whitespace) pra preview UX. Backend ainda valida
// com critério mais simples (`trim().toLowerCase()`), então duplicatas com
// acentos diferentes ainda passariam server-side; aqui aviso antes de submeter.
const conflito = computed(() => {
  if (mode.value !== 'create') return null
  const k = normalizeText(newTitle.value)
  if (!k) return null
  return props.plans.find(p => normalizeText(p.title) === k) || null
})

function emitSelected() {
  emit('change', { mode: 'select', planId: selectedId.value || null })
}
function emitCreate() {
  emit('change', {
    mode: 'create',
    title: newTitle.value.trim(),
    conflict: conflito.value || null,
  })
}

// Notifica mudança ao alternar tabs (limpa estado da outra)
watch(mode, (m) => {
  if (m === 'select') {
    newTitle.value = ''
    emitSelected()
  } else {
    selectedId.value = ''
    emitCreate()
  }
})

// Emit inicial pra parent receber estado coerente já no mount
onMounted(() => {
  if (mode.value === 'select') emitSelected()
  else emitCreate()
})

// Permite reset externo se preciso
defineExpose({
  reset() {
    selectedId.value = ''
    newTitle.value = ''
    mode.value = props.plans.length ? 'select' : 'create'
  },
})
</script>

<style scoped>
.plan-picker { display: flex; flex-direction: column; gap: 12px; }
.plan-picker__tabs {
  display: flex; gap: 4px;
  background: #f5f4f0; border-radius: 8px; padding: 4px;
}
.tab {
  flex: 1; font-family: 'DM Sans', sans-serif;
  font-size: 12px; font-weight: 600; color: #888;
  background: transparent; border: none; border-radius: 6px;
  padding: 7px 12px; cursor: pointer;
  transition: background 0.12s, color 0.12s;
}
.tab:hover:not(:disabled) { color: #1a1a2e; }
.tab--active {
  background: #fff; color: #534AB7;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
.tab:disabled { opacity: 0.4; cursor: not-allowed; }

.field { display: flex; flex-direction: column; gap: 6px; }
.field__label { font-size: 12px; font-weight: 600; color: #555; }
.field__input {
  font-family: 'DM Sans', sans-serif; font-size: 13px;
  border: 1px solid #ddd; border-radius: 8px; padding: 8px 12px; outline: none;
  background: #fff;
}
.field__input:focus { border-color: #534AB7; }
.field__input--invalid { border-color: #DC2626; }
.field__input:disabled { background: #f5f4f0; cursor: not-allowed; }
.req { color: #c0392b; }
.hint { font-size: 11px; margin: 0; }
.hint--muted { color: #999; }
.hint--error { color: #DC2626; font-weight: 500; }
</style>
