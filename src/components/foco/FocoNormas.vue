<template>
  <div class="normas-wrap">
    <div v-if="!normas.length" class="normas-empty">
      Nenhuma menção a normas jurídicas detectada nos assuntos e sub-assuntos desta disciplina.
    </div>

    <template v-else>
      <!-- Resumo textual -->
      <p class="normas-resumo">
        <strong>{{ normas.length }} norma{{ normas.length !== 1 ? 's' : '' }}</strong>
        detectada{{ normas.length !== 1 ? 's' : '' }} em
        <strong>{{ totalMencoes }}</strong> menção{{ totalMencoes !== 1 ? 'ões' : '' }} nos assuntos.
        {{ normaTopNome }} é a mais citada.
      </p>

      <!-- Grid de cards -->
      <div class="normas-grid">
        <div v-for="norma in normas" :key="norma.id" class="norma-card">
          <div class="norma-card__header">
            <span class="norma-card__nome">{{ norma.nome }}</span>
            <span class="norma-card__count">{{ norma.count }} menção{{ norma.count !== 1 ? 'ões' : '' }}</span>
          </div>

          <!-- Barra de intensidade relativa -->
          <div class="norma-card__bar-track">
            <div
              class="norma-card__bar-fill"
              :style="{ width: barWidth(norma.count) + '%' }"
            />
          </div>

          <!-- Exemplos de assuntos que mencionam a norma -->
          <div class="norma-card__exemplos">
            <div
              v-for="(ex, i) in norma.exemplos.slice(0, expanded[norma.id] ? norma.exemplos.length : 3)"
              :key="i"
              class="norma-card__ex"
              :title="ex"
            >
              {{ truncate(ex, 60) }}
            </div>
            <button
              v-if="norma.exemplos.length > 3"
              class="btn-ghost-sm"
              @click="expanded[norma.id] = !expanded[norma.id]"
            >
              {{ expanded[norma.id] ? 'Recolher' : `+${norma.exemplos.length - 3} mais` }}
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'

const props = defineProps({
  normas: { type: Array, default: () => [] }, // [{ id, nome, count, exemplos }]
})

const expanded = reactive({})

// Limpa estado de expansão ao trocar disciplina para evitar carry-over de cards
watch(() => props.normas, () => {
  for (const key of Object.keys(expanded)) delete expanded[key]
})

const totalMencoes = computed(() => props.normas.reduce((s, n) => s + n.count, 0))
const normaTopNome = computed(() => props.normas[0]?.nome ?? '—')
const maxCount     = computed(() => props.normas[0]?.count ?? 1)

function barWidth(count) {
  return Math.max(4, Math.round((count / maxCount.value) * 100))
}

function truncate(str, n) {
  return str.length > n ? str.slice(0, n - 1) + '…' : str
}
</script>

<style scoped>
.normas-wrap { display: flex; flex-direction: column; gap: 12px; }

.normas-empty { font-size: 13px; color: #aaa; padding: 24px 0; text-align: center; }

.normas-resumo { font-size: 13px; color: #444; margin: 0; line-height: 1.6; }

.normas-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 10px;
}

.norma-card {
  background: #fff;
  border: 1px solid #ebe9e4;
  border-radius: 10px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: border-color 0.15s;
}
.norma-card:hover { border-color: #AFA9EC; }

.norma-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.norma-card__nome {
  font-size: 13px;
  font-weight: 700;
  color: #1a1a2e;
}
.norma-card__count {
  font-size: 11px;
  font-weight: 600;
  color: #534AB7;
  background: #EEF2FF;
  padding: 2px 7px;
  border-radius: 4px;
  white-space: nowrap;
}

.norma-card__bar-track {
  height: 4px;
  background: #f0efea;
  border-radius: 2px;
  overflow: hidden;
}
.norma-card__bar-fill {
  height: 100%;
  background: #534AB7;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.norma-card__exemplos {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.norma-card__ex {
  font-size: 11px;
  color: #666;
  line-height: 1.4;
  padding: 2px 0;
  border-left: 2px solid #EEF2FF;
  padding-left: 6px;
}

.btn-ghost-sm {
  font-family: 'DM Sans', sans-serif;
  font-size: 11px;
  font-weight: 600;
  background: transparent;
  border: none;
  color: #534AB7;
  cursor: pointer;
  padding: 2px 0;
  text-align: left;
}
.btn-ghost-sm:hover { text-decoration: underline; }
</style>
