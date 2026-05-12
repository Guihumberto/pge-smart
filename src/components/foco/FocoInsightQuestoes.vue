<template>
  <div class="insight">
    <!-- Loading inicial -->
    <div v-if="loading" class="insight__loading">
      <span class="spinner" />
      Consultando questões reais...
    </div>

    <!-- Sem dados -->
    <div v-else-if="!data" class="insight__empty">
      Nenhuma questão encontrada para os filtros selecionados.
    </div>

    <template v-else>
      <!-- Total -->
      <div class="insight__total">
        <span class="total-badge">{{ data.total.toLocaleString('pt-BR') }} questão{{ data.total !== 1 ? 'ões' : '' }}</span>
        analisada{{ data.total !== 1 ? 's' : '' }} do banco <strong>questoes_v2</strong>
      </div>

      <!-- Métricas rápidas -->
      <div class="insight__metrics">
        <div class="metric-card">
          <span class="metric-card__value">{{ data.doutrina_pct }}%</span>
          <span class="metric-card__label">exigem doutrina</span>
        </div>
        <div class="metric-card">
          <span class="metric-card__value">{{ data.jurisprudencia_pct }}%</span>
          <span class="metric-card__label">exigem jurisprudência</span>
        </div>
        <div class="metric-card">
          <span class="metric-card__value">{{ data.tipoCobranca.length }}</span>
          <span class="metric-card__label">tipos de cobrança</span>
        </div>
      </div>

      <!-- Tipo cobrança -->
      <div v-if="data.tipoCobranca.length" class="insight__block">
        <h4 class="insight__block-title">Distribuição por tipo de cobrança</h4>
        <div class="tipo-list">
          <div v-for="t in data.tipoCobranca" :key="t.tipo" class="tipo-row">
            <span class="tipo-row__nome">{{ t.tipo }}</span>
            <div class="tipo-row__bar-wrap">
              <div class="tipo-row__bar" :style="{ width: t.pct + '%' }" />
            </div>
            <span class="tipo-row__pct">{{ t.pct }}%</span>
            <span class="tipo-row__qtd">({{ t.qtd }})</span>
          </div>
        </div>
      </div>

      <!-- Top assuntos -->
      <div v-if="data.topAssuntos.length" class="insight__block">
        <h4 class="insight__block-title">Top assuntos por volume de questões</h4>
        <div class="assunto-list">
          <div v-for="(a, idx) in data.topAssuntos" :key="a.nome" class="assunto-row">
            <button class="assunto-row__header" @click="toggleAssunto(idx)">
              <span class="assunto-row__rank">{{ idx + 1 }}</span>
              <span class="assunto-row__nome">{{ a.nome }}</span>
              <div class="assunto-row__bar-wrap">
                <div class="assunto-row__bar" :style="{ width: a.pct + '%' }" />
              </div>
              <span class="assunto-row__pct">{{ a.pct }}%</span>
              <span class="assunto-row__qtd">{{ a.qtd }}q</span>
              <span v-if="a.questoes.length || a.sentencas?.length" class="assunto-row__toggle">
                {{ expanded[idx] ? '−' : '+' }}
              </span>
            </button>
            <div v-if="expanded[idx]" class="assunto-row__questoes">
              <div v-if="a.sentencas?.length" class="sentencas-block">
                <div class="sentencas-block__label">
                  Como a banca cobra
                  <span class="sentencas-block__count">{{ a.sentencas.length }} variaç{{ a.sentencas.length === 1 ? 'ão' : 'ões' }} verdadeira{{ a.sentencas.length === 1 ? '' : 's' }}</span>
                </div>
                <div v-for="(s, i) in a.sentencas" :key="i" class="sentenca-card">
                  <div class="sentenca-card__meta">
                    <span class="sentenca-card__check">✓</span>
                    <span class="sentenca-card__src">{{ s.banca }}{{ s.ano ? ` · ${s.ano}` : '' }}</span>
                  </div>
                  <p class="sentenca-card__text">{{ s.pergunta }}</p>
                </div>
              </div>
              <div v-if="a.questoes.length" class="questoes-block">
                <div class="questoes-block__label">Amostra completa (verdadeiras + falsas)</div>
                <div v-for="q in a.questoes" :key="q.id" class="questao-card">
                  <div class="questao-card__meta">
                    <span class="tag">{{ q.banca }}</span>
                    <span class="tag">{{ q.ano }}</span>
                    <span v-if="q.tipo_cobranca" class="tag tag--tipo">{{ q.tipo_cobranca }}</span>
                  </div>
                  <p class="questao-card__pergunta">{{ q.pergunta }}</p>
                  <p v-if="q.resposta" class="questao-card__resposta">
                    <strong>Gabarito:</strong> {{ q.resposta }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Termos mais característicos -->
      <div v-if="data.termos?.length" class="insight__block">
        <h4 class="insight__block-title">Termos mais característicos</h4>
        <p class="insight__block-desc">
          Expressões estatisticamente mais frequentes nas questões desta banca/disciplina vs. o corpus geral.
        </p>
        <div class="termos-cloud">
          <span
            v-for="t in data.termos.slice(0, 15)"
            :key="t.termo"
            class="termo-tag"
            :style="termoStyle(t)"
            :title="`${t.qtd} ocorrências · score ${t.score}`"
          >{{ t.termo }}</span>
        </div>
      </div>

      <!-- Analisar com IA -->
      <div class="insight__ia-section">
        <div class="ia-divider">
          <span class="ia-divider__line" />
          <span class="ia-divider__label">Análise inteligente</span>
          <span class="ia-divider__line" />
        </div>

        <div v-if="iaResult" class="ia-result-card">
          <div class="ia-result-card__header">
            <span class="ia-badge">IA</span>
            <span class="ia-result-card__title">Padrão de cobrança detectado</span>
          </div>
          <p class="ia-result-card__text">{{ iaResult }}</p>
          <div class="ia-result-card__footer">
            <span v-if="iaSavedLabel" class="ia-result-card__saved">Gerada em {{ iaSavedLabel }}</span>
            <button class="ia-regen-btn" :disabled="iaLoading" @click="analisarIA">
              {{ iaLoading ? 'Atualizando...' : '↺ Reanalisar' }}
            </button>
          </div>
        </div>

        <button v-else class="ia-btn" :disabled="iaLoading" @click="analisarIA">
          <span v-if="iaLoading" class="spinner spinner--light" />
          <span v-else class="ia-btn__icon">✦</span>
          {{ iaLoading ? 'Analisando... pode levar até 30s' : 'Analisar com IA' }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { estatisticaService } from '@/services/estatistica.service.js'
import { toast } from 'vue-sonner'
import { readFocoIa, writeFocoIa } from '@/utils/focoIaCache.js'

const props = defineProps({
  banca:      { type: String, default: '' },
  area:       { type: String, default: '' },
  disciplina: { type: String, default: '' },
  anos:       { type: Array,  default: () => [] },
})

const loading   = ref(false)
const data      = ref(null)
const expanded  = ref({})
const iaLoading = ref(false)
const iaResult  = ref(null)
const iaSavedAt = ref(null)

function loadIaFromCache() {
  if (!props.banca || !props.disciplina) return
  const ctx = { banca: props.banca, area: props.area, disciplina: props.disciplina }
  const cached = readFocoIa(ctx, { currentTotal: data.value?.total })
  if (!cached) return
  iaResult.value = cached.analise
  iaSavedAt.value = cached.savedAt
}
function saveIaToCache(analise) {
  const ctx = { banca: props.banca, area: props.area, disciplina: props.disciplina }
  writeFocoIa(ctx, analise, { total: data.value?.total })
  iaSavedAt.value = new Date().toISOString()
}
const iaSavedLabel = computed(() => {
  if (!iaSavedAt.value) return ''
  const d = new Date(iaSavedAt.value)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
})

const maxScore = computed(() => data.value?.termos?.reduce((m, t) => Math.max(m, t.score), 0) || 1)

function termoStyle(t) {
  const ratio = maxScore.value > 0 ? t.score / maxScore.value : 0
  const size  = 11 + Math.round(ratio * 8)   // 11px → 19px
  const weight = ratio > 0.6 ? 700 : ratio > 0.3 ? 600 : 500
  const alpha  = 0.4 + ratio * 0.6            // opacity 0.4 → 1.0
  return {
    fontSize: `${size}px`,
    fontWeight: weight,
    opacity: alpha,
  }
}

async function carregar() {
  if (!props.banca || !props.disciplina) {
    data.value = null
    iaResult.value = null
    return
  }
  loading.value = true
  iaResult.value = null
  iaSavedAt.value = null
  try {
    const params = { banca: props.banca, disciplina: props.disciplina }
    if (props.area) params.area = props.area
    if (props.anos.length) params.anos = props.anos
    data.value = await estatisticaService.focoInsight(params)
    expanded.value = {}
    loadIaFromCache()
  } catch (err) {
    toast.error(err.message)
    data.value = null
  } finally {
    loading.value = false
  }
}

async function analisarIA() {
  if (!data.value) return
  iaLoading.value = true
  try {
    const payload = {
      banca: props.banca,
      disciplina: props.disciplina,
      total: data.value.total,
      tipoCobranca: data.value.tipoCobranca,
      doutrina_pct: data.value.doutrina_pct,
      jurisprudencia_pct: data.value.jurisprudencia_pct,
      topAssuntos: data.value.topAssuntos.map(({ nome, qtd, pct }) => ({ nome, qtd, pct })),
      termos: data.value.termos?.slice(0, 10) || [],
    }
    const res = await estatisticaService.focoIA(payload)
    iaResult.value = res.analise
    saveIaToCache(res.analise)
  } catch (err) {
    toast.error(err.message)
  } finally {
    iaLoading.value = false
  }
}

function toggleAssunto(idx) {
  expanded.value[idx] = !expanded.value[idx]
}

// `.join(',')` em props.anos: o pai recria o array em cada render mesmo com mesmo conteúdo,
// e Vue compara por referência — sem isso o watch dispara N vezes e refaz a query ES.
watch(
  () => [props.banca, props.area, props.disciplina, (props.anos || []).join(',')],
  carregar,
  { immediate: true },
)
</script>

<style scoped>
.insight { display: flex; flex-direction: column; gap: 20px; }

/* Loading / empty */
.insight__loading {
  display: flex; align-items: center; gap: 10px;
  color: #888; font-size: 13px; padding: 12px 0;
}
.spinner {
  display: inline-block; width: 14px; height: 14px; flex-shrink: 0;
  border: 2px solid #ddd; border-top-color: #6366f1;
  border-radius: 50%; animation: spin 0.7s linear infinite;
}
.spinner--light { border-color: rgba(255,255,255,0.3); border-top-color: #fff; }
@keyframes spin { to { transform: rotate(360deg); } }
.insight__empty { color: #aaa; font-size: 13px; padding: 8px 0; }

/* Total */
.insight__total { font-size: 13px; color: #555; }
.total-badge {
  display: inline-block; background: #EEF2FF; color: #4338CA;
  font-size: 12px; font-weight: 700; padding: 3px 8px; border-radius: 6px; margin-right: 4px;
}

/* Metrics */
.insight__metrics { display: flex; flex-wrap: wrap; gap: 10px; }
.metric-card {
  display: flex; flex-direction: column; gap: 2px;
  padding: 12px 16px; background: #fafaf7;
  border: 1px solid #ebe9e4; border-radius: 10px; min-width: 120px;
}
.metric-card__value { font-size: 22px; font-weight: 700; color: #3730a3; line-height: 1.1; }
.metric-card__label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.04em; }

/* Blocks */
.insight__block { display: flex; flex-direction: column; gap: 10px; }
.insight__block-title {
  font-size: 12px; font-weight: 700; color: #444;
  text-transform: uppercase; letter-spacing: 0.05em;
}
.insight__block-desc { font-size: 12px; color: #888; margin: -4px 0 0; }

/* Tipo cobrança */
.tipo-list { display: flex; flex-direction: column; gap: 6px; }
.tipo-row { display: grid; grid-template-columns: 160px 1fr 48px 40px; align-items: center; gap: 8px; }
.tipo-row__nome { font-size: 12px; color: #555; }
.tipo-row__bar-wrap { height: 6px; background: #f0f0ee; border-radius: 3px; overflow: hidden; }
.tipo-row__bar { height: 100%; background: #6366f1; border-radius: 3px; transition: width 0.4s ease; }
.tipo-row__pct { font-size: 12px; font-weight: 600; color: #333; text-align: right; }
.tipo-row__qtd { font-size: 11px; color: #aaa; }

/* Assuntos */
.assunto-list { display: flex; flex-direction: column; gap: 4px; }
.assunto-row { border: 1px solid #ebe9e4; border-radius: 8px; overflow: hidden; }
.assunto-row__header {
  width: 100%; display: grid;
  grid-template-columns: 24px 1fr 80px 48px 32px 20px;
  align-items: center; gap: 8px;
  padding: 8px 12px; background: #fafaf7; cursor: pointer;
  border: none; text-align: left;
}
.assunto-row__header:hover { background: #f3f4f6; }
.assunto-row__rank { font-size: 11px; font-weight: 700; color: #9ca3af; text-align: right; }
.assunto-row__nome { font-size: 12px; color: #374151; }
.assunto-row__bar-wrap { height: 5px; background: #f0f0ee; border-radius: 3px; overflow: hidden; }
.assunto-row__bar { height: 100%; background: #818cf8; border-radius: 3px; }
.assunto-row__pct { font-size: 12px; font-weight: 600; color: #4338ca; text-align: right; }
.assunto-row__qtd { font-size: 11px; color: #aaa; text-align: right; }
.assunto-row__toggle { font-size: 14px; font-weight: 700; color: #9ca3af; text-align: center; }
.assunto-row__questoes {
  display: flex; flex-direction: column; gap: 10px;
  padding: 12px; background: #fff; border-top: 1px solid #ebe9e4;
}
.questao-card {
  padding: 12px; background: #fafaf7;
  border: 1px solid #ebe9e4; border-radius: 8px;
  display: flex; flex-direction: column; gap: 8px;
}
.questao-card__meta { display: flex; gap: 6px; flex-wrap: wrap; }
.tag { font-size: 10px; font-weight: 600; padding: 2px 7px; background: #e0e7ff; color: #4338ca; border-radius: 4px; }
.tag--tipo { background: #fef3c7; color: #92400e; }
.questao-card__pergunta { font-size: 12px; line-height: 1.55; color: #374151; margin: 0; }
.questao-card__resposta { font-size: 11px; color: #6b7280; margin: 0; }

/* Sentenças de estudo (verdadeiras dedupedas) */
.sentencas-block { display: flex; flex-direction: column; gap: 6px; }
.sentencas-block__label {
  font-size: 10px; font-weight: 700; color: #4338ca;
  text-transform: uppercase; letter-spacing: 0.05em;
  display: flex; align-items: center; gap: 6px;
}
.sentencas-block__count {
  font-weight: 500; color: #9ca3af;
  text-transform: none; letter-spacing: 0;
}
.sentenca-card {
  background: #f5f3ff; border: 1px solid #e0e7ff; border-left: 3px solid #6366f1;
  border-radius: 6px; padding: 8px 10px;
}
.sentenca-card__meta { display: flex; align-items: center; gap: 5px; margin-bottom: 3px; }
.sentenca-card__check { color: #10b981; font-weight: 700; font-size: 12px; }
.sentenca-card__src   { font-size: 10px; color: #6366f1; font-weight: 600; }
.sentenca-card__text  { font-size: 12px; line-height: 1.55; color: #374151; margin: 0; }

.questoes-block { display: flex; flex-direction: column; gap: 10px; margin-top: 4px; }
.questoes-block__label {
  font-size: 9px; font-weight: 700; color: #9ca3af;
  text-transform: uppercase; letter-spacing: 0.05em;
}

/* Termos cloud */
.termos-cloud {
  display: flex; flex-wrap: wrap; gap: 8px 10px;
  padding: 14px 16px;
  background: #fafaf7; border: 1px solid #ebe9e4; border-radius: 10px;
}
.termo-tag {
  font-family: 'DM Sans', sans-serif;
  color: #3730a3;
  cursor: default;
  transition: opacity 0.2s;
  line-height: 1.3;
}
.termo-tag:hover { opacity: 1 !important; color: #4f46e5; }

/* IA section */
.insight__ia-section { display: flex; flex-direction: column; gap: 14px; padding-top: 4px; }

.ia-divider {
  display: flex; align-items: center; gap: 10px;
}
.ia-divider__line { flex: 1; height: 1px; background: #e5e7eb; }
.ia-divider__label {
  font-size: 10px; font-weight: 700; color: #9ca3af;
  text-transform: uppercase; letter-spacing: 0.08em; white-space: nowrap;
}

/* Botão principal de IA */
.ia-btn {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%;
  padding: 10px 20px;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: #fff; border: none; border-radius: 10px;
  font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600;
  cursor: pointer; transition: opacity 0.15s, transform 0.1s;
}
.ia-btn:hover:not(:disabled) { opacity: 0.92; transform: translateY(-1px); }
.ia-btn:active:not(:disabled) { transform: translateY(0); }
.ia-btn:disabled { opacity: 0.65; cursor: not-allowed; }
.ia-btn__icon { font-size: 14px; }

/* Card de resultado */
.ia-result-card {
  display: flex; flex-direction: column; gap: 10px;
  padding: 14px 16px;
  background: #fafaff;
  border: 1px solid #c7d2fe;
  border-left: 4px solid #6366f1;
  border-radius: 10px;
}
.ia-result-card__header { display: flex; align-items: center; gap: 8px; }
.ia-badge {
  display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: #fff; font-size: 9px; font-weight: 800;
  border-radius: 5px; letter-spacing: 0.05em;
}
.ia-result-card__title {
  font-size: 11px; font-weight: 700; color: #4338ca;
  text-transform: uppercase; letter-spacing: 0.05em;
}
.ia-result-card__text {
  font-size: 13px; line-height: 1.65; color: #374151; margin: 0;
}
.ia-result-card__footer {
  display: flex; align-items: center; justify-content: space-between;
  margin-top: 4px; gap: 8px;
}
.ia-result-card__saved { font-size: 10px; color: #9ca3af; }
.ia-regen-btn {
  padding: 4px 12px;
  background: transparent; border: 1px solid #c7d2fe; border-radius: 6px;
  font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 600; color: #6366f1;
  cursor: pointer; transition: background 0.15s;
}
.ia-regen-btn:hover:not(:disabled) { background: #eef2ff; }
.ia-regen-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
