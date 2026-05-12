<template>
  <div class="pareto-wrap">
    <!-- Métricas de concentração -->
    <div class="pareto-metrics">
      <div class="metric-box">
        <span class="metric-box__label">Pareto 80%</span>
        <span class="metric-box__value">{{ cut80 }} assunto{{ cut80 !== 1 ? 's' : '' }}</span>
        <span class="metric-box__sub">cobrem 80% das questões</span>
      </div>
      <div class="metric-box">
        <span class="metric-box__label">Entropia</span>
        <span
          class="metric-box__value metric-box__value--sm"
          :class="`metric-box__value--${entropiaInfo.nivel}`"
        >
          {{ entropiaInfo.nivel }}
        </span>
        <span class="metric-box__sub">{{ entropiaInfo.desc }}</span>
      </div>
      <div class="metric-box">
        <span class="metric-box__label">Total de assuntos</span>
        <span class="metric-box__value">{{ items.length }}</span>
        <span class="metric-box__sub">detectados nos dados</span>
      </div>
    </div>

    <!-- Combo chart: barras individuais + linha acumulada -->
    <div class="pareto-chart">
      <Chart type="bar" :data="chartData" :options="chartOptions" />
    </div>

    <!-- Lista ranqueada de assuntos -->
    <div class="pareto-lista">
      <div class="pareto-lista__header">
        <span>Assunto</span>
        <span>% na disciplina</span>
      </div>
      <div
        v-for="(item, idx) in items"
        :key="item.nome"
        class="pareto-lista__row"
        :class="{ 'pareto-lista__row--top': idx < cut80 }"
      >
        <span class="pareto-lista__rank">{{ idx + 1 }}</span>
        <span class="pareto-lista__nome">{{ item.nome }}</span>
        <div class="pareto-lista__bar-wrap">
          <div class="pareto-lista__bar" :style="{ width: item.pct + '%' }" />
        </div>
        <span class="pareto-lista__pct">{{ item.pct.toFixed(1) }}%</span>
        <span class="pareto-lista__cum">acum. {{ item.cumulativo.toFixed(0) }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Chart } from 'vue-chartjs'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, Title, Tooltip, Legend,
} from 'chart.js'
import { calcEntropia, entropiaLabel, paretoCut80 } from '@/utils/bancaDisciplinaProfile'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend)

const props = defineProps({
  items: { type: Array, default: () => [] }, // [{ nome, qtd, pct, cumulativo }]
})

const cut80        = computed(() => paretoCut80(props.items))
const entropiaRaw  = computed(() => calcEntropia(props.items))
const entropiaInfo = computed(() => entropiaLabel(entropiaRaw.value, props.items.length))

// Mostra pelo menos os itens do corte 80% + 3 de contexto, mínimo 20.
// Garante que a linha acumulada sempre ultrapassa 80% no gráfico.
const maxBars = computed(() => Math.max(cut80.value + 3, 20))

const itemsVisiveis = computed(() => props.items.slice(0, maxBars.value))

const chartData = computed(() => ({
  labels: itemsVisiveis.value.map(i => truncate(i.nome, 22)),
  datasets: [
    {
      type: 'bar',
      label: '% questões',
      data: itemsVisiveis.value.map(i => i.pct),
      backgroundColor: itemsVisiveis.value.map((_, idx) =>
        idx < cut80.value ? '#534AB730' : '#53535320',
      ),
      borderColor: itemsVisiveis.value.map((_, idx) =>
        idx < cut80.value ? '#534AB7' : '#9CA3AF',
      ),
      borderWidth: 1,
      yAxisID: 'y',
      order: 2,
    },
    {
      type: 'line',
      label: 'Acumulado (%)',
      data: itemsVisiveis.value.map(i => i.cumulativo),
      borderColor: '#E65100',
      backgroundColor: 'transparent',
      borderWidth: 2,
      pointRadius: 3,
      pointBackgroundColor: '#E65100',
      tension: 0.1,
      yAxisID: 'y',
      order: 1,
    },
  ],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: { font: { size: 11, family: 'DM Sans' }, boxWidth: 12 },
    },
    tooltip: {
      callbacks: {
        label: ctx => {
          if (ctx.dataset.label === 'Acumulado (%)') return `Acumulado: ${ctx.raw.toFixed(1)}%`
          return `${ctx.raw.toFixed(1)}% das questões`
        },
        title: ctxs => props.items[ctxs[0].dataIndex]?.nome ?? ctxs[0].label,
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      max: 100,
      title: { display: true, text: '%', font: { size: 11 } },
      ticks: { font: { size: 11 } },
    },
    x: {
      ticks: { font: { size: 10 }, maxRotation: 40 },
    },
  },
}

function truncate(str, n) {
  return str.length > n ? str.slice(0, n - 1) + '…' : str
}
</script>

<style scoped>
.pareto-wrap { display: flex; flex-direction: column; gap: 16px; }

.pareto-metrics { display: flex; gap: 12px; flex-wrap: wrap; }

.metric-box {
  flex: 1; min-width: 140px;
  background: #fff; border: 1px solid #ebe9e4; border-radius: 12px;
  padding: 14px; display: flex; flex-direction: column; gap: 3px;
}
.metric-box__label { font-size: 11px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.04em; }
.metric-box__value { font-size: 1.4rem; font-weight: 700; color: #1a1a2e; line-height: 1.1; }
.metric-box__value--sm { font-size: 1.1rem; }
.metric-box__value--baixa  { color: #534AB7; }
.metric-box__value--média  { color: #D97706; }
.metric-box__value--alta   { color: #DC2626; }
.metric-box__value--indefinido { color: #9CA3AF; }
.metric-box__sub  { font-size: 11px; color: #aaa; line-height: 1.4; }

.pareto-chart { height: 320px; position: relative; }

.pareto-lista {
  border: 1px solid #ebe9e4;
  border-radius: 10px;
  overflow: hidden;
  font-size: 12px;
}

.pareto-lista__header {
  display: flex;
  justify-content: space-between;
  padding: 7px 12px;
  background: #fafaf7;
  font-size: 11px;
  font-weight: 700;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid #ebe9e4;
}

.pareto-lista__row {
  display: grid;
  grid-template-columns: 28px 1fr 80px 52px 64px;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-bottom: 1px solid #f0efea;
  transition: background 0.12s;
}
.pareto-lista__row:last-child { border-bottom: none; }
.pareto-lista__row:hover { background: #f8f7f4; }
.pareto-lista__row--top { background: #f5f4ff; }
.pareto-lista__row--top:hover { background: #eceaff; }

.pareto-lista__rank {
  font-size: 11px;
  font-weight: 700;
  color: #aaa;
  text-align: right;
  .pareto-lista__row--top & { color: #534AB7; }
}
.pareto-lista__row--top .pareto-lista__rank { color: #534AB7; }

.pareto-lista__nome {
  color: #1a1a2e;
  font-weight: 500;
  line-height: 1.4;
}

.pareto-lista__bar-wrap {
  height: 6px;
  background: #f0efea;
  border-radius: 3px;
  overflow: hidden;
}
.pareto-lista__bar {
  height: 100%;
  background: #534AB7;
  border-radius: 3px;
  max-width: 100%;
}
.pareto-lista__row:not(.pareto-lista__row--top) .pareto-lista__bar { background: #9CA3AF; }

.pareto-lista__pct {
  text-align: right;
  font-weight: 700;
  color: #1a1a2e;
  white-space: nowrap;
}
.pareto-lista__row--top .pareto-lista__pct { color: #534AB7; }

.pareto-lista__cum {
  text-align: right;
  color: #aaa;
  font-size: 10px;
  white-space: nowrap;
}
</style>
