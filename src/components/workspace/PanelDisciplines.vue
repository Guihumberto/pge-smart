<template>
  <div class="panel">
    <div class="panel__head">
      <span class="panel__label">Disciplinas</span>
      <button class="panel__icon-btn" title="Nova disciplina" @click="showForm = !showForm">
        <Plus :size="14" />
      </button>
    </div>

    <!-- Form inline -->
    <div v-if="showForm" class="inline-form">
      <input v-model="newName" class="inline-form__input" placeholder="Nome da disciplina" @keyup.enter="add" />
      <div class="inline-form__colors">
        <button
          v-for="c in palette"
          :key="c"
          class="color-dot"
          :style="{
            background: c,
            boxShadow: newColor === c ? `0 0 0 2px #fff, 0 0 0 4px ${c}` : 'none'
          }"
          @click="newColor = c"
        />
      </div>
      <div class="inline-form__actions">
        <button class="btn-ghost" @click="showForm = false">Cancelar</button>
        <button class="btn-primary-sm" @click="add">Adicionar</button>
      </div>
    </div>

    <!-- Lista -->
    <div class="panel__body">
      <button
        v-for="d in store.disciplines"
        :key="d.id"
        :class="['disc-item', { 'disc-item--active': selectedId === d.id }]"
        @click="$emit('select', d.id)"
      >
        <span class="disc-item__dot" :style="{ background: d.color }" />
        <span class="disc-item__name">{{ d.name }}</span>
        <span class="disc-item__count">{{ taskCount(d.id) }}</span>
      </button>

      <p v-if="!store.disciplines.length" class="panel__empty">
        Nenhuma disciplina ainda.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Plus } from 'lucide-vue-next'
import { useDisciplineStore } from '@/stores/useDisciplineStore'
import { useTaskStore } from '@/stores/useTaskStore'

defineProps({ selectedId: String })
defineEmits(['select'])

const store = useDisciplineStore()
const taskStore = useTaskStore()

const showForm = ref(false)
const newName = ref('')
const newColor = ref('#534AB7')

const palette = ['#534AB7','#0F6E56','#854F0B','#993C1D','#185FA5','#993556','#888780']

const taskCount = (id) => taskStore.byDiscipline.value
  ? taskStore.tasks.filter(t => t.disciplineId === id).length
  : 0

function add() {
  if (!newName.value.trim()) return
  store.add(newName.value.trim(), newColor.value)
  newName.value = ''
  showForm.value = false
}
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
  padding: 8px;
}

.panel__empty {
  font-size: 12px;
  color: #bbb;
  text-align: center;
  padding: 24px 0;
}

/* Inline form */
.inline-form {
  padding: 10px 12px;
  border-bottom: 1px solid #f0efea;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.inline-form__input {
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  border: 1px solid #ddd;
  border-radius: 7px;
  padding: 6px 10px;
  outline: none;
}
.inline-form__input:focus { border-color: #534AB7; }

.inline-form__colors {
  display: flex;
  gap: 6px;
}

.color-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  transition: transform 0.15s;
  padding: 0;              /* ← remove padding do button */
  flex-shrink: 0;          /* ← não deixa esmagar */
  appearance: none;        /* ← reseta estilo nativo do button */
  -webkit-appearance: none;
}
.color-dot:hover { transform: scale(1.25); }

.inline-form__actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}

.btn-ghost {
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  background: transparent;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
  color: #666;
}

.btn-primary-sm {
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  background: #534AB7;
  border: none;
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
  color: #fff;
}

/* Discipline items */
.disc-item {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
}
.disc-item:hover { background: #f5f4f0; }
.disc-item--active { background: #EEEDFE; }

.disc-item__dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.disc-item__name {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: #2a2a2a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.disc-item--active .disc-item__name { color: #3C3489; }

.disc-item__count {
  font-size: 11px;
  font-weight: 600;
  color: #bbb;
  background: #f5f4f0;
  border-radius: 10px;
  padding: 1px 7px;
}
</style>