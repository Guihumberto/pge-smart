<template>
  <div class="heatmap-wrap">
    <div v-if="!assuntos.length" class="heatmap-empty">
      Nenhum assunto encontrado para esta disciplina.
    </div>

    <template v-else>
      <div class="heatmap-scroll">
        <table class="heatmap-table">
          <thead>
            <tr>
              <th class="heatmap-th heatmap-th--nome">Assunto</th>
              <th v-for="ano in anos" :key="ano" class="heatmap-th heatmap-th--ano">{{ ano }}</th>
              <th class="heatmap-th heatmap-th--media">Média</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ass in assuntosVisiveis" :key="ass.nome">
              <td class="heatmap-td heatmap-td--nome" :title="ass.nome">
                {{ truncate(ass.nome, 34) }}
              </td>
              <td
                v-for="ano in anos"
                :key="ano"
                class="heatmap-td heatmap-td--val"
                :style="cellStyle(ass.porAno[ano])"
                :title="cellTitle(ass.porAno[ano], ano)"
              >
                <span>{{ cellText(ass.porAno[ano]) }}</span>
              </td>
              <td class="heatmap-td heatmap-td--media">
                {{ ass.media > 0 ? ass.media.toFixed(1) + '%' : '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Legenda -->
      <div class="heatmap-legenda">
        <div class="legenda-item">
          <span class="legenda-swatch" style="background:#EEF2FF; border:1px solid #ddd;"></span> Presente
        </div>
        <div class="legenda-item">
          <span class="legenda-swatch" style="background:#F5F5F5; border:1px solid #eee;"></span> Ausente (disciplina coberta)
        </div>
        <div class="legenda-item">
          <span class="legenda-swatch" style="background:transparent; border:1px dashed #ccc;"></span> Disciplina não testada
        </div>
      </div>

      <!-- Botão "ver mais" se houver assuntos ocultos -->
      <div v-if="assuntos.length > MAX_DEFAULT" class="heatmap-more">
        <button class="btn-ghost" @click="expanded = !expanded">
          {{ expanded ? `Recolher (mostrando ${assuntos.length})` : `Ver mais ${assuntos.length - MAX_DEFAULT} assuntos` }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  assuntos: { type: Array, default: () => [] }, // [{ nome, porAno, media }]
  anos:     { type: Array, default: () => [] }, // [2019, 2021, 2023]
})

const MAX_DEFAULT = 15
const expanded = ref(false)

// Reseta "ver mais" ao trocar de disciplina para não herdar estado anterior
watch(() => props.assuntos, () => { expanded.value = false })

const assuntosVisiveis = computed(() =>
  expanded.value ? props.assuntos : props.assuntos.slice(0, MAX_DEFAULT),
)

// Max pct across all non-null non-zero cells — used for color normalization
const maxPct = computed(() => {
  let max = 0
  for (const ass of props.assuntos) {
    for (const v of Object.values(ass.porAno)) {
      if (v && typeof v === 'object' && v.pct > max) max = v.pct
    }
  }
  return max || 1
})

/**
 * Cell encoding:
 *   { pct, qtd } → assunto presente (colored)
 *   0            → disciplina presente, assunto ausente (explicit zero — light gray)
 *   null         → disciplina ausente naquele ano (dashed/transparent)
 */
function cellStyle(val) {
  if (val === null || val === undefined) {
    // Usa outline (fora do flow de borda colapsada) para não conflitar com border-collapse
    return { background: '#fafaf7', outline: '1px dashed #ddd', color: '#ccc' }
  }
  if (val === 0) {
    return { background: '#F5F7FA', color: '#ddd' }
  }
  const alpha = Math.min(1, val.pct / maxPct.value)
  const textColor = alpha > 0.5 ? '#fff' : '#1a1a2e'
  return {
    background: `rgba(83, 74, 183, ${alpha.toFixed(2)})`,
    color: textColor,
    fontWeight: alpha > 0.3 ? '600' : '400',
  }
}

function cellText(val) {
  if (val === null || val === undefined) return '—'
  if (val === 0) return '·'
  return val.pct.toFixed(1) + '%'
}

function cellTitle(val, ano) {
  if (val === null || val === undefined) return `${ano}: disciplina não testada`
  if (val === 0) return `${ano}: assunto não cobrado`
  return `${ano}: ${val.pct.toFixed(1)}% (${val.qtd} questões)`
}

function truncate(str, n) {
  return str.length > n ? str.slice(0, n - 1) + '…' : str
}
</script>

<style scoped>
.heatmap-wrap { display: flex; flex-direction: column; gap: 10px; }

.heatmap-empty { font-size: 13px; color: #aaa; text-align: center; padding: 32px; }

.heatmap-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }

.heatmap-table {
  border-collapse: collapse;
  width: 100%;
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
}

.heatmap-th {
  padding: 7px 10px;
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  color: #666;
  background: #fafaf7;
  border-bottom: 2px solid #ebe9e4;
  white-space: nowrap;
}
.heatmap-th--nome { text-align: left; min-width: 200px; }
.heatmap-th--ano  { min-width: 60px; }
.heatmap-th--media { min-width: 64px; color: #534AB7; }

.heatmap-td {
  padding: 5px 8px;
  border-bottom: 1px solid #f0efea;
  vertical-align: middle;
}
.heatmap-td--nome {
  font-size: 12px; color: #1a1a2e; max-width: 260px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.heatmap-td--val {
  text-align: center; border-radius: 4px; font-size: 11px;
  transition: background 0.2s;
}
.heatmap-td--media {
  text-align: center; font-size: 11px; font-weight: 700; color: #534AB7;
}

/* Hover highlight da linha */
.heatmap-table tbody tr:hover .heatmap-td--nome { background: #f8f7f4; }

/* Legenda */
.heatmap-legenda {
  display: flex; gap: 16px; flex-wrap: wrap;
  font-size: 11px; color: #666;
}
.legenda-item { display: flex; align-items: center; gap: 5px; }
.legenda-swatch {
  width: 16px; height: 16px; border-radius: 3px; display: inline-block; flex-shrink: 0;
}

.heatmap-more { text-align: center; }
.btn-ghost {
  font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 500;
  background: transparent; border: none; color: #534AB7; cursor: pointer;
  padding: 4px 8px; border-radius: 6px;
}
.btn-ghost:hover { background: #EEF2FF; }
</style>
