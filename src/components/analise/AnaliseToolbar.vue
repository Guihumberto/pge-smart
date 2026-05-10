<template>
  <div class="analise-toolbar">
    <!-- Linha 1: filtros -->
    <div class="row row--filters">
      <div class="field">
        <label class="field__label">Banca</label>
        <select :value="banca" class="filter-select" @change="$emit('update:banca', $event.target.value)">
          <option value="">Selecione</option>
          <option v-for="b in bancasOptions" :key="b" :value="b">{{ b }}</option>
        </select>
      </div>

      <div class="field">
        <label class="field__label">Área</label>
        <select :value="area" class="filter-select" @change="$emit('update:area', $event.target.value)">
          <option value="">Todas as áreas</option>
          <option v-for="a in areasOptions" :key="a" :value="a">{{ a }}</option>
        </select>
      </div>

      <div class="field">
        <label class="field__label">Disciplina</label>
        <select :value="disciplina" class="filter-select" @change="$emit('update:disciplina', $event.target.value)">
          <option value="">Todas as disciplinas</option>
          <option v-for="d in disciplinasOptions" :key="d" :value="d">{{ d }}</option>
        </select>
      </div>

      <div class="field">
        <label class="field__label">Granularidade</label>
        <div class="seg" role="tablist" aria-label="Granularidade">
          <button
            v-for="opt in GRAN_OPTS"
            :key="opt.value"
            class="seg__btn"
            :class="{ 'seg__btn--active': granularidade === opt.value }"
            type="button"
            role="tab"
            :aria-selected="granularidade === opt.value"
            @click="$emit('update:granularidade', opt.value)"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>

      <div class="field">
        <label class="field__label">Filtro</label>
        <div class="seg" role="tablist" aria-label="Preset">
          <button
            v-for="opt in PRESET_OPTS"
            :key="opt.value"
            class="seg__btn"
            :class="{ 'seg__btn--active': preset === opt.value }"
            type="button"
            role="tab"
            :aria-selected="preset === opt.value"
            @click="$emit('update:preset', opt.value)"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- Linha 2: cross-banca + ações -->
    <div class="row row--actions">
      <label
        class="cross-toggle"
        :class="{ 'cross-toggle--disabled': !crossBancaAvailable }"
        :title="crossBancaTooltip"
      >
        <input
          type="checkbox"
          :checked="crossBanca"
          :disabled="!crossBancaAvailable"
          @change="$emit('update:crossBanca', $event.target.checked)"
        />
        <span>Incluir bancas similares</span>
        <span v-if="crossBancaAvailable && otherBancasInArea.length" class="cross-toggle__hint">
          ({{ otherBancasInArea.join(', ') }})
        </span>
      </label>

      <div class="counts">
        <span class="counts__main">
          Mostrando <strong>{{ filteredCount }}</strong> de {{ totalCount }}
        </span>
        <span v-if="selectedCount > 0" class="counts__selected">
          · {{ selectedCount }} selecionado{{ selectedCount > 1 ? 's' : '' }}
        </span>
      </div>

      <div class="actions">
        <button
          class="btn-outline"
          type="button"
          :disabled="selectedCount === 0"
          @click="$emit('copy-selected')"
        >
          <Copy :size="13" /> Copiar selecionados
        </button>
        <button
          class="btn-outline"
          type="button"
          :disabled="filteredCount === 0"
          @click="$emit('export-csv')"
        >
          <Download :size="13" /> Exportar CSV
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Copy, Download } from 'lucide-vue-next'

const props = defineProps({
  banca: { type: String, default: '' },
  area: { type: String, default: '' },
  disciplina: { type: String, default: '' },
  granularidade: { type: String, default: 'assunto' },
  preset: { type: String, default: 'moderado' },
  crossBanca: { type: Boolean, default: false },

  bancasOptions: { type: Array, default: () => [] },
  areasOptions: { type: Array, default: () => [] },
  disciplinasOptions: { type: Array, default: () => [] },
  otherBancasInArea: { type: Array, default: () => [] },

  totalCount: { type: Number, default: 0 },
  filteredCount: { type: Number, default: 0 },
  selectedCount: { type: Number, default: 0 },
})

defineEmits([
  'update:banca',
  'update:area',
  'update:disciplina',
  'update:granularidade',
  'update:preset',
  'update:crossBanca',
  'copy-selected',
  'export-csv',
])

const GRAN_OPTS = [
  { value: 'disciplina', label: 'Disciplina' },
  { value: 'assunto', label: 'Assunto' },
  { value: 'sub_assunto', label: 'Sub-assunto' },
]

const PRESET_OPTS = [
  { value: 'conservador', label: 'Conservador' },
  { value: 'moderado', label: 'Moderado' },
  { value: 'permissivo', label: 'Permissivo' },
]

const crossBancaAvailable = computed(() => props.otherBancasInArea.length > 0)
const crossBancaTooltip = computed(() =>
  crossBancaAvailable.value
    ? 'Inclui dados de outras bancas com a mesma área'
    : 'Nenhuma outra banca tem dados para esta área',
)
</script>

<style scoped>
.analise-toolbar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  background: #fafaf7;
  border: 1px solid #ebe9e4;
  border-radius: 12px;
}

.row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-end;
}
.row--actions {
  align-items: center;
  justify-content: space-between;
}

.field { display: flex; flex-direction: column; gap: 4px; min-width: 140px; }
.field__label {
  font-size: 11px; font-weight: 600; color: #666; text-transform: uppercase;
  letter-spacing: 0.04em;
}
.filter-select {
  padding: 6px 10px; border: 1px solid #ddd; border-radius: 8px;
  font-family: 'DM Sans', sans-serif; font-size: 12px; color: #444;
  background: #fff; cursor: pointer;
}

/* Segmented control (granularidade + preset) */
.seg {
  display: inline-flex;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 2px;
  gap: 2px;
}
.seg__btn {
  padding: 5px 10px; border: none; background: transparent; cursor: pointer;
  font-family: 'DM Sans', sans-serif; font-size: 12px; color: #666;
  border-radius: 6px; transition: background 0.15s, color 0.15s;
}
.seg__btn:hover { background: #f0efea; color: #1a1a2e; }
.seg__btn--active {
  background: #534AB7;
  color: #fff;
}
.seg__btn--active:hover { background: #534AB7; color: #fff; }

.cross-toggle {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 12px; color: #444; cursor: pointer;
}
.cross-toggle--disabled { opacity: 0.5; cursor: not-allowed; }
.cross-toggle input { cursor: inherit; }
.cross-toggle__hint { color: #888; font-size: 11px; }

.counts {
  font-size: 12px; color: #666;
}
.counts__main strong { color: #1a1a2e; }
.counts__selected { color: #534AB7; font-weight: 600; }

.actions { display: flex; gap: 8px; }

.btn-outline {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 6px 12px; border: 1px solid #ddd; background: #fff;
  border-radius: 8px; font-family: 'DM Sans', sans-serif; font-size: 12px;
  color: #444; cursor: pointer; transition: background 0.15s;
}
.btn-outline:hover:not(:disabled) { background: #f5f4f0; }
.btn-outline:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
