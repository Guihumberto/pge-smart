<template>
  <div class="foco-toolbar">
    <div class="row">
      <div class="field">
        <label class="field__label">Banca</label>
        <select :value="banca" class="filter-select" @change="$emit('update:banca', $event.target.value)">
          <option value="">Selecione</option>
          <option v-for="b in bancasOptions" :key="b" :value="b">{{ b }}</option>
        </select>
      </div>

      <div class="field">
        <label class="field__label">Área</label>
        <select :value="area" class="filter-select" :disabled="!banca" @change="$emit('update:area', $event.target.value)">
          <option value="">Todas as áreas</option>
          <option v-for="a in areasOptions" :key="a" :value="a">{{ a }}</option>
        </select>
      </div>

      <div class="field field--disc">
        <label class="field__label">Disciplina</label>
        <select :value="disciplina" class="filter-select" :disabled="!banca" @change="$emit('update:disciplina', $event.target.value)">
          <option value="">Selecione a disciplina</option>
          <option v-for="d in disciplinasOptions" :key="d" :value="d">{{ d }}</option>
        </select>
      </div>

      <div v-if="anosDisponiveis.length" class="field field--anos">
        <label class="field__label">Anos disponíveis</label>
        <div class="anos-chips">
          <span v-for="a in anosDisponiveis" :key="a" class="ano-chip">{{ a }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  banca:              { type: String,  default: '' },
  area:               { type: String,  default: '' },
  disciplina:         { type: String,  default: '' },
  bancasOptions:      { type: Array,   default: () => [] },
  areasOptions:       { type: Array,   default: () => [] },
  disciplinasOptions: { type: Array,   default: () => [] },
  anosDisponiveis:    { type: Array,   default: () => [] },
})

defineEmits(['update:banca', 'update:area', 'update:disciplina'])
</script>

<style scoped>
.foco-toolbar {
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

.field { display: flex; flex-direction: column; gap: 4px; min-width: 140px; }
.field--disc { min-width: 220px; flex: 1; }
.field--anos { min-width: 200px; flex: 1; }
.field__label {
  font-size: 11px; font-weight: 600; color: #666;
  text-transform: uppercase; letter-spacing: 0.04em;
}

.filter-select {
  padding: 6px 10px; border: 1px solid #ddd; border-radius: 8px;
  font-family: 'DM Sans', sans-serif; font-size: 12px; color: #444;
  background: #fff; cursor: pointer;
}
.filter-select:disabled { opacity: 0.5; cursor: not-allowed; }

.anos-chips { display: flex; flex-wrap: wrap; gap: 4px; padding-top: 2px; }
.ano-chip {
  font-size: 11px; font-weight: 600; padding: 3px 8px;
  background: #EEF2FF; color: #4338CA; border-radius: 4px;
}
</style>
