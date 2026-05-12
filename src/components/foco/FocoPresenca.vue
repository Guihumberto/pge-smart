<template>
  <div class="presenca-section">
    <!-- Stat cards: média histórica + último ano -->
    <div class="presenca-stats">
      <div class="stat-box">
        <span class="stat-box__label">Média histórica</span>
        <span class="stat-box__value">{{ mediaHistorica.toFixed(1) }}%</span>
        <span class="stat-box__sub">{{ anosComDisciplina }} de {{ dados.length }} ano(s)</span>
      </div>
      <div class="stat-box">
        <span class="stat-box__label">Último com dado ({{ ultimoAno?.ano ?? '—' }})</span>
        <span class="stat-box__value">{{ ultimoAno ? ultimoAno.pct.toFixed(1) + '%' : '—' }}</span>
        <span
          v-if="ultimoAno && deltaUltimo !== null && deltaUltimo !== 0"
          class="stat-box__delta"
          :class="deltaUltimo > 0 ? 'stat-box__delta--up' : 'stat-box__delta--down'"
        >
          {{ deltaUltimo > 0 ? '+' : '' }}{{ deltaUltimo.toFixed(1) }}pp vs média
        </span>
      </div>
      <div class="stat-box">
        <span class="stat-box__label">Total de questões</span>
        <span class="stat-box__value">{{ totalQuestoes }}</span>
        <span class="stat-box__sub">acumulado todos os anos</span>
      </div>
    </div>

    <!-- Gráfico de linha -->
    <div class="chart-wrap">
      <Line :data="chartData" :options="chartOptions" />
    </div>

    <!-- Anos sem disciplina -->
    <p v-if="anosAusentes.length" class="presenca-ausentes">
      Disciplina ausente em: {{ anosAusentes.join(', ') }} (anos com dados importados)
    </p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const props = defineProps({
  dados: { type: Array, default: () => [] }, // [{ ano, pct, qtd, presente }]
})

const anosComDisciplina = computed(() => props.dados.filter(d => d.presente).length)
const anosAusentes      = computed(() => props.dados.filter(d => !d.presente).map(d => d.ano))
const totalQuestoes     = computed(() => props.dados.reduce((s, d) => s + d.qtd, 0))

const mediaHistorica = computed(() => {
  const com = props.dados.filter(d => d.presente)
  if (!com.length) return 0
  return com.reduce((s, d) => s + d.pct, 0) / com.length
})

const ultimoAno = computed(() => {
  const presente = props.dados.filter(d => d.presente)
  return presente.length ? presente[presente.length - 1] : null
})

const deltaUltimo = computed(() => {
  if (!ultimoAno.value || !mediaHistorica.value) return null
  return parseFloat((ultimoAno.value.pct - mediaHistorica.value).toFixed(2))
})

const chartData = computed(() => ({
  labels: props.dados.map(d => String(d.ano)),
  datasets: [
    {
      label: '% da prova',
      data: props.dados.map(d => d.presente ? d.pct : null),
      borderColor: '#534AB7',
      backgroundColor: '#534AB720',
      tension: 0.3,
      fill: true,
      spanGaps: false,
      pointRadius: 5,
      pointBackgroundColor: props.dados.map(d => d.presente ? '#534AB7' : 'transparent'),
      pointBorderColor:     props.dados.map(d => d.presente ? '#534AB7' : 'transparent'),
    },
    {
      label: 'Média histórica',
      data: props.dados.map(() => parseFloat(mediaHistorica.value.toFixed(2))),
      borderColor: '#E65100',
      borderDash: [5, 4],
      borderWidth: 1.5,
      pointRadius: 0,
      fill: false,
    },
  ],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom', labels: { font: { size: 11, family: 'DM Sans' }, boxWidth: 12 } },
    tooltip: {
      callbacks: {
        label: ctx => ctx.raw != null ? `${ctx.dataset.label}: ${ctx.raw.toFixed(1)}%` : 'Sem dado',
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      title: { display: true, text: '% da prova', font: { size: 11 } },
    },
    x: { title: { display: true, text: 'Ano', font: { size: 11 } } },
  },
}
</script>

<style scoped>
.presenca-section { display: flex; flex-direction: column; gap: 16px; }

.presenca-stats { display: flex; gap: 12px; flex-wrap: wrap; }

.stat-box {
  flex: 1; min-width: 140px;
  background: #fff; border: 1px solid #ebe9e4; border-radius: 12px;
  padding: 16px; display: flex; flex-direction: column; gap: 4px;
}
.stat-box__label { font-size: 11px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.04em; }
.stat-box__value { font-size: 1.6rem; font-weight: 700; color: #1a1a2e; line-height: 1; }
.stat-box__sub   { font-size: 11px; color: #aaa; }
.stat-box__delta { font-size: 12px; font-weight: 700; }
.stat-box__delta--up   { color: #16A34A; }
.stat-box__delta--down { color: #DC2626; }

.chart-wrap { height: 280px; position: relative; }

.presenca-ausentes { font-size: 11px; color: #aaa; margin: 0; }
</style>
