<template>
  <div class="fj-root">
    <!-- loading -->
    <div v-if="loading" class="fj-loading">
      <span class="fj-spinner"></span>
      Carregando dados de jurisprudência...
    </div>

    <!-- sem dados suficientes -->
    <div v-else-if="!data || data.total === 0" class="fj-empty">
      Nenhuma questão sobre jurisprudência encontrada para esta combinação banca/disciplina.
    </div>

    <template v-else>
      <!-- ── Resumo ─────────────────────────────────── -->
      <div class="fj-metrics">
        <div class="fj-metric">
          <span class="fj-metric__value">{{ data.total }}</span>
          <span class="fj-metric__label">questões sobre jurisprudência</span>
        </div>
        <div class="fj-metric">
          <span class="fj-metric__value">{{ data.totalEstruturada }}</span>
          <span class="fj-metric__label">com julgado vinculado</span>
        </div>
        <div class="fj-metric fj-metric--accent" v-if="data.recentes.topJulgados.length">
          <span class="fj-metric__value">{{ data.recentes.topJulgados.length }}</span>
          <span class="fj-metric__label">cobrados em {{ data.recentes.anos[data.recentes.anos.length - 1] }}–{{ data.recentes.anos[0] }}</span>
        </div>
      </div>

      <!-- ── Tribunais ──────────────────────────────── -->
      <div v-if="data.tribunais.length" class="fj-card">
        <h4 class="fj-card__title">Por Tribunal</h4>
        <div class="fj-bars">
          <div v-for="t in data.tribunais" :key="t.tribunal" class="fj-bar-row">
            <span class="fj-bar-label">{{ t.tribunal }}</span>
            <div class="fj-bar-track">
              <div
                class="fj-bar-fill"
                :style="{ width: barWidth(t.pct, tribunaisMaxPct) + '%' }"
                :data-trib="t.tribunal"
              ></div>
            </div>
            <span class="fj-bar-pct">{{ t.pct }}%</span>
            <span class="fj-bar-qty">{{ t.qtd }}</span>
          </div>
        </div>
      </div>

      <!-- ── Tipo de Decisão ────────────────────────── -->
      <div v-if="data.tipoDecisao.length" class="fj-card">
        <h4 class="fj-card__title">Tipo de Decisão</h4>
        <div class="fj-tipo-list">
          <div v-for="t in data.tipoDecisao" :key="t.tipo" class="fj-tipo-row">
            <span class="fj-tipo-badge" :class="tipoBadgeClass(t.tipo)">{{ t.tipo }}</span>
            <div class="fj-bar-track fj-bar-track--sm">
              <div
                class="fj-bar-fill"
                :style="{ width: barWidth(t.pct, tipoDecisaoMaxPct) + '%' }"
              ></div>
            </div>
            <span class="fj-tipo-count">{{ t.qtd }}</span>
          </div>
        </div>
      </div>

      <!-- ── Top Julgados ───────────────────────────── -->
      <div class="fj-card" v-if="data.topJulgados.length || data.recentes.topJulgados.length">
        <div class="fj-card__header">
          <h4 class="fj-card__title">Julgados Mais Cobrados</h4>
          <div class="fj-toggle">
            <button
              class="fj-toggle__btn"
              :class="{ active: julgadosView === 'all' }"
              @click="julgadosView = 'all'"
            >Todos os tempos</button>
            <button
              class="fj-toggle__btn"
              :class="{ active: julgadosView === 'recent' }"
              @click="julgadosView = 'recent'"
              :title="`Julgados cobrados em ${data.recentes.anos.join(' / ')}`"
            >
              Cobrança recente
              <span v-if="data.recentes.topJulgados.length" class="fj-toggle__badge">{{ data.recentes.topJulgados.length }}</span>
            </button>
          </div>
        </div>

        <div class="fj-filters">
          <label class="fj-filter">
            <input type="checkbox" v-model="hideSuperados" />
            <span>Esconder superados</span>
          </label>
          <label class="fj-filter">
            <input type="checkbox" v-model="onlyWithStudy" />
            <span>Só com material de estudo</span>
          </label>
          <span v-if="filterAppliedCount" class="fj-filter-count">
            {{ filterAppliedCount }} julgado{{ filterAppliedCount === 1 ? '' : 's' }} exibido{{ filterAppliedCount === 1 ? '' : 's' }}
          </span>
        </div>

        <div class="fj-julgados">
          <div
            v-for="j in activeJulgados"
            :key="j.id"
            class="fj-julgado"
            :class="{ expanded: expandedJulgado === j.id }"
          >
            <div class="fj-julgado__header" @click="toggleJulgado(j.id)">
              <div class="fj-julgado__id-group">
                <span class="fj-julgado__trib" :class="`trib-${j.tribunal}`">{{ j.tribunal }}</span>
                <span class="fj-julgado__tipo">{{ j.tipo }}</span>
                <span class="fj-julgado__num">nº {{ j.id }}</span>
                <span v-if="j.rgTema" class="fj-julgado__badge fj-julgado__badge--tema" :title="j.rgDescricao">Tema {{ j.rgTema }}</span>
                <span v-if="j.superada" class="fj-julgado__badge fj-julgado__badge--superado" :title="j.superadaPor ? `Superada por: ${j.superadaPor}` : 'Precedente superado'">SUPERADO</span>
                <span v-else-if="j.situacao && j.situacao !== 'Acórdão Publicado'" class="fj-julgado__badge fj-julgado__badge--situacao">{{ j.situacao }}</span>
                <span v-if="j.ano" class="fj-julgado__ano" :title="`Ano da decisão: ${j.ano}`">decidido em {{ j.ano }}</span>
              </div>
              <div class="fj-julgado__count-group">
                <span v-if="j.anosQuestao && j.anosQuestao.length" class="fj-julgado__anos-q" :title="`Cobrado em: ${j.anosQuestao.join(', ')}`">
                  cobrado em {{ j.anosQuestao.slice(0, 3).join(', ') }}<span v-if="j.anosQuestao.length > 3">…</span>
                </span>
                <span class="fj-julgado__count">{{ j.qtd }}×</span>
                <span class="fj-julgado__pct">{{ j.pct }}%</span>
                <span class="fj-chevron" :class="{ rotated: expandedJulgado === j.id }">›</span>
              </div>
            </div>

            <div v-if="expandedJulgado === j.id" class="fj-julgado__body">
              <!-- Tese (prefere tese_fixada do catálogo; fallback para tese_completa) -->
              <div class="fj-tese" :class="{ 'fj-tese--empty': !(j.teseFixada || j.tese) }">
                <div class="fj-tese__label">{{ j.teseFixada ? 'Tese fixada' : (j.tese ? 'Tese' : '') }}</div>
                <p v-if="j.teseFixada">{{ j.teseFixada }}</p>
                <p v-else-if="j.tese">{{ j.tese }}</p>
                <p v-else class="fj-tese__none">Tese não disponível.</p>

                <div v-if="j.palavrasChave && j.palavrasChave.length" class="fj-keywords">
                  <span v-for="kw in j.palavrasChave.slice(0, 6)" :key="kw" class="fj-keyword">{{ kw }}</span>
                </div>

                <a v-if="j.fonteUrl" :href="j.fonteUrl" target="_blank" rel="noopener" class="fj-fonte">
                  Ver no {{ j.tribunal }} →
                </a>
              </div>

              <!-- Sentenças de estudo (questões verdadeiras dedupedas) -->
              <div v-if="j.sentencas && j.sentencas.length" class="fj-sentencas">
                <div class="fj-sentencas__label">
                  Como a banca cobra
                  <span class="fj-sentencas__count">{{ j.sentencas.length }} variaç{{ j.sentencas.length === 1 ? 'ão' : 'ões' }} real{{ j.sentencas.length === 1 ? '' : 'is' }}</span>
                </div>
                <div v-for="(s, i) in j.sentencas" :key="i" class="fj-sentenca">
                  <div class="fj-sentenca__meta">
                    <span class="fj-sentenca__check">✓</span>
                    <span class="fj-sentenca__source">{{ s.banca }}{{ s.ano ? ` · ${s.ano}` : '' }}</span>
                  </div>
                  <p class="fj-sentenca__text">{{ s.pergunta }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p v-if="activeJulgados.length === 0" class="fj-empty-inline">
          Nenhum julgado recente identificado para esta disciplina.
        </p>
      </div>

      <!-- ── Julgados Relacionados (busca semântica via RAG) ─── -->
      <div v-if="data.vinculada && data.vinculada.topJulgados.length" class="fj-card">
        <div class="fj-card__header">
          <h4 class="fj-card__title">
            Julgados Relacionados
            <span class="fj-card__hint">(vínculo semântico ampliado)</span>
          </h4>
          <span class="fj-vinculada-count">{{ data.vinculada.total }} questões</span>
        </div>
        <p class="fj-card__desc">
          Julgados identificados via similaridade semântica no catálogo — cobertura complementar ao topo curado acima. Pode incluir Temas RG, Acórdãos e Informativos que não estão vinculados explicitamente nas questões.
        </p>

        <div class="fj-julgados">
          <div
            v-for="j in filteredVinculada"
            :key="j.catalogId"
            class="fj-julgado"
            :class="{ expanded: expandedVinculada === j.catalogId }"
          >
            <div class="fj-julgado__header" @click="toggleVinculada(j.catalogId)">
              <div class="fj-julgado__id-group">
                <span class="fj-julgado__trib" :class="`trib-${j.tribunal}`">{{ j.tribunal }}</span>
                <span class="fj-julgado__tipo">{{ j.tipo }}</span>
                <span class="fj-julgado__num">nº {{ j.id }}</span>
                <span v-if="j.rgTema" class="fj-julgado__badge fj-julgado__badge--tema" :title="j.rgDescricao">Tema {{ j.rgTema }}</span>
                <span v-if="j.superada" class="fj-julgado__badge fj-julgado__badge--superado" :title="j.superadaPor ? `Superada por: ${j.superadaPor}` : 'Precedente superado'">SUPERADO</span>
              </div>
              <div class="fj-julgado__count-group">
                <span v-if="j.anosQuestao && j.anosQuestao.length" class="fj-julgado__anos-q">
                  cobrado em {{ j.anosQuestao.slice(0, 3).join(', ') }}<span v-if="j.anosQuestao.length > 3">…</span>
                </span>
                <span class="fj-julgado__count">{{ j.qtd }}×</span>
                <span class="fj-julgado__pct">{{ j.pct }}%</span>
                <span class="fj-chevron" :class="{ rotated: expandedVinculada === j.catalogId }">›</span>
              </div>
            </div>

            <div v-if="expandedVinculada === j.catalogId" class="fj-julgado__body">
              <div class="fj-tese" :class="{ 'fj-tese--empty': !j.teseFixada }">
                <div class="fj-tese__label">{{ j.teseFixada ? 'Tese fixada' : '' }}</div>
                <p v-if="j.teseFixada">{{ j.teseFixada }}</p>
                <p v-else class="fj-tese__none">Tese não disponível no catálogo.</p>

                <div v-if="j.palavrasChave && j.palavrasChave.length" class="fj-keywords">
                  <span v-for="kw in j.palavrasChave.slice(0, 6)" :key="kw" class="fj-keyword">{{ kw }}</span>
                </div>

                <a v-if="j.fonteUrl" :href="j.fonteUrl" target="_blank" rel="noopener" class="fj-fonte">
                  Ver no {{ j.tribunal }} →
                </a>
              </div>

              <div v-if="j.sentencas && j.sentencas.length" class="fj-sentencas">
                <div class="fj-sentencas__label">
                  Como a banca cobra
                  <span class="fj-sentencas__count">{{ j.sentencas.length }} variaç{{ j.sentencas.length === 1 ? 'ão' : 'ões' }} real{{ j.sentencas.length === 1 ? '' : 'is' }}</span>
                </div>
                <div v-for="(s, i) in j.sentencas" :key="i" class="fj-sentenca">
                  <div class="fj-sentenca__meta">
                    <span class="fj-sentenca__check">✓</span>
                    <span class="fj-sentenca__source">{{ s.banca }}{{ s.ano ? ` · ${s.ano}` : '' }}</span>
                  </div>
                  <p class="fj-sentenca__text">{{ s.pergunta }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Linha do Tempo ─────────────────────────── -->
      <div v-if="data.anosDecisao.length" class="fj-card">
        <h4 class="fj-card__title">Julgados por Ano de Decisão</h4>
        <div class="fj-timeline">
          <div
            v-for="a in timeline.items"
            :key="a.ano"
            class="fj-tl-col"
          >
            <div class="fj-tl-bar-wrap">
              <div
                class="fj-tl-bar"
                :style="{ height: timelineHeight(a.qtd) + 'px' }"
                :title="`${a.ano}: ${a.qtd} questões`"
              ></div>
            </div>
            <span class="fj-tl-label">{{ a.ano }}</span>
            <span class="fj-tl-qty">{{ a.qtd }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { toast } from 'vue-sonner'
import { estatisticaService } from '@/services/estatistica.service.js'

const props = defineProps({
  banca:      { type: String, default: '' },
  area:       { type: String, default: '' },
  disciplina: { type: String, default: '' },
})

const data    = ref(null)
const loading = ref(false)
const julgadosView = ref('all')
const expandedJulgado = ref(null)
const expandedVinculada = ref(null)
const hideSuperados = ref(false)
const onlyWithStudy = ref(false)

function applyFilters(list) {
  return list.filter(j => {
    if (hideSuperados.value && j.superada) return false
    if (onlyWithStudy.value && (!j.sentencas || !j.sentencas.length)) return false
    return true
  })
}

async function load() {
  if (!props.banca || !props.disciplina) { data.value = null; return }
  loading.value = true
  try {
    const params = { banca: props.banca, disciplina: props.disciplina }
    if (props.area) params.area = props.area
    data.value = await estatisticaService.focoJurisprudencia(params)
    julgadosView.value = 'all'
    expandedJulgado.value = null
    expandedVinculada.value = null
  } catch (e) {
    toast.error(e.message || 'Erro ao carregar dados de jurisprudência')
  } finally {
    loading.value = false
  }
}

watch(() => [props.banca, props.area, props.disciplina], load, { immediate: true })

const activeJulgados = computed(() => {
  let list
  if (julgadosView.value === 'recent') {
    list = [...(data.value?.recentes?.topJulgados ?? [])].sort((a, b) => {
      const yearDiff = Number(b.anoUltimo || 0) - Number(a.anoUltimo || 0)
      return yearDiff !== 0 ? yearDiff : b.qtd - a.qtd
    })
  } else {
    list = data.value?.topJulgados ?? []
  }
  return applyFilters(list)
})
const filteredVinculada = computed(() => applyFilters(data.value?.vinculada?.topJulgados ?? []))
const filterAppliedCount = computed(() => {
  if (!hideSuperados.value && !onlyWithStudy.value) return 0
  return activeJulgados.value.length + filteredVinculada.value.length
})

const timeline = computed(() => {
  const ordered = [...(data.value?.anosDecisao ?? [])]
    .sort((a, b) => Number(a.ano) - Number(b.ano))
    .slice(-12)
  const max = Math.max(...ordered.map(a => a.qtd), 1)
  return { items: ordered, max }
})
const tribunaisMaxPct   = computed(() => Math.max(...(data.value?.tribunais   ?? []).map(t => t.pct), 1))
const tipoDecisaoMaxPct = computed(() => Math.max(...(data.value?.tipoDecisao ?? []).map(t => t.pct), 1))

function barWidth(value, max) {
  return ((value / max) * 100).toFixed(1)
}

function timelineHeight(qtd) {
  return Math.max(4, Math.round((qtd / timeline.value.max) * 72))
}

function toggleJulgado(id) {
  expandedJulgado.value = expandedJulgado.value === id ? null : id
}
function toggleVinculada(id) {
  expandedVinculada.value = expandedVinculada.value === id ? null : id
}

const TIPO_COLORS = {
  'ADI': 'tipo-adi', 'ADPF': 'tipo-adi',
  'Súmula': 'tipo-sumula', 'Súmula Vinculante': 'tipo-sv',
  'Tema RG': 'tipo-tema', 'RE': 'tipo-re', 'REsp': 'tipo-re',
  'Informativo': 'tipo-info',
}
function tipoBadgeClass(tipo) { return TIPO_COLORS[tipo] || 'tipo-default' }
</script>

<style scoped>
.fj-root { font-family: 'DM Sans', sans-serif; }

/* ── Loading / Empty ──────────────────────────── */
.fj-loading {
  display: flex; align-items: center; gap: 8px;
  padding: 24px 0; color: #6b7280; font-size: 13px;
}
.fj-spinner {
  display: inline-block; width: 14px; height: 14px;
  border: 2px solid #d1d5db; border-top-color: #6366f1;
  border-radius: 50%; animation: fj-spin 0.7s linear infinite;
}
@keyframes fj-spin { to { transform: rotate(360deg); } }
.fj-empty { padding: 20px 0; color: #9ca3af; font-size: 13px; font-style: italic; }
.fj-empty-inline { color: #9ca3af; font-size: 12px; font-style: italic; margin-top: 8px; }

/* ── Metrics ──────────────────────────────────── */
.fj-metrics {
  display: flex; gap: 10px; margin-bottom: 14px; flex-wrap: wrap;
}
.fj-metric {
  flex: 1; min-width: 130px;
  background: #f5f3ff; border: 1px solid #e0e7ff;
  border-radius: 8px; padding: 10px 14px;
  display: flex; flex-direction: column; align-items: center; text-align: center;
}
.fj-metric--accent { background: #ede9fe; border-color: #c4b5fd; }
.fj-metric__value { font-size: 22px; font-weight: 700; color: #6366f1; line-height: 1; }
.fj-metric__label { font-size: 11px; color: #6b7280; margin-top: 4px; }

/* ── Card ─────────────────────────────────────── */
.fj-card {
  background: #fff; border: 1px solid #e5e7eb;
  border-radius: 10px; padding: 14px 16px;
  margin-bottom: 12px;
}
.fj-card__header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.fj-card__title {
  font-size: 11px; font-weight: 600; color: #4338ca;
  text-transform: uppercase; letter-spacing: 0.06em;
  margin-bottom: 12px;
}
.fj-card__header .fj-card__title { margin-bottom: 0; }
.fj-card__hint {
  font-size: 10px; font-weight: 500; color: #9ca3af;
  text-transform: none; letter-spacing: 0; margin-left: 4px;
}
.fj-card__desc {
  font-size: 11px; color: #6b7280; line-height: 1.5;
  margin-top: -4px; margin-bottom: 10px;
}
.fj-vinculada-count {
  font-size: 11px; font-weight: 600; color: #6366f1;
  background: #ede9fe; padding: 3px 9px; border-radius: 4px;
}

/* ── Toggle ───────────────────────────────────── */
.fj-toggle { display: flex; background: #f3f4f6; border-radius: 6px; padding: 2px; }
.fj-toggle__btn {
  padding: 4px 10px; font-size: 11px; font-weight: 500;
  border: none; background: transparent; border-radius: 5px;
  cursor: pointer; color: #6b7280; display: flex; align-items: center; gap: 4px;
  transition: background 0.15s, color 0.15s;
}
.fj-toggle__btn.active { background: #6366f1; color: #fff; }
.fj-toggle__badge {
  background: #c4b5fd; color: #4c1d95; border-radius: 10px;
  padding: 0 5px; font-size: 10px; font-weight: 700;
}
.fj-toggle__btn.active .fj-toggle__badge { background: rgba(255,255,255,0.25); color: #fff; }

/* ── Filtros ──────────────────────────────────── */
.fj-filters {
  display: flex; align-items: center; gap: 14px;
  padding: 8px 0; margin-bottom: 8px;
  border-bottom: 1px dashed #e5e7eb;
  flex-wrap: wrap;
}
.fj-filter {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 11px; color: #4b5563; cursor: pointer;
  user-select: none;
}
.fj-filter input[type="checkbox"] {
  width: 13px; height: 13px; cursor: pointer; accent-color: #6366f1;
}
.fj-filter-count {
  font-size: 10px; color: #6366f1; font-weight: 600;
  margin-left: auto;
}

/* ── Bar chart (tribunais) ────────────────────── */
.fj-bars { display: flex; flex-direction: column; gap: 8px; }
.fj-bar-row { display: flex; align-items: center; gap: 8px; }
.fj-bar-label { width: 80px; flex-shrink: 0; font-size: 12px; font-weight: 600; color: #374151; }
.fj-bar-track { flex: 1; height: 12px; background: #e5e7eb; border-radius: 3px; overflow: hidden; }
.fj-bar-track--sm { height: 8px; }
.fj-bar-fill { height: 100%; border-radius: 3px; background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%); transition: width 0.4s ease; }
.fj-bar-fill[data-trib="STF"] { background: linear-gradient(90deg, #2563eb 0%, #6366f1 100%); }
.fj-bar-fill[data-trib="STJ"] { background: linear-gradient(90deg, #0891b2 0%, #6366f1 100%); }
.fj-bar-fill[data-trib="TST"] { background: linear-gradient(90deg, #7c3aed 0%, #8b5cf6 100%); }
.fj-bar-pct { width: 38px; text-align: right; font-size: 11px; font-weight: 600; color: #6366f1; flex-shrink: 0; }
.fj-bar-qty { width: 28px; text-align: right; font-size: 10px; color: #9ca3af; flex-shrink: 0; }

/* ── Tipo de decisão ─────────────────────────── */
.fj-tipo-list { display: flex; flex-direction: column; gap: 7px; }
.fj-tipo-row { display: flex; align-items: center; gap: 8px; }
.fj-tipo-badge {
  width: 120px; flex-shrink: 0;
  font-size: 10px; font-weight: 600; padding: 2px 8px;
  border-radius: 4px; text-align: center;
}
.tipo-adi  { background: #fee2e2; color: #991b1b; }
.tipo-sumula { background: #dbeafe; color: #1e40af; }
.tipo-sv   { background: #ede9fe; color: #5b21b6; }
.tipo-tema { background: #d1fae5; color: #065f46; }
.tipo-re   { background: #fef3c7; color: #92400e; }
.tipo-info { background: #f0fdf4; color: #166534; }
.tipo-default { background: #f3f4f6; color: #374151; }
.fj-tipo-count { width: 30px; text-align: right; font-size: 11px; color: #6b7280; flex-shrink: 0; }

/* ── Julgados ─────────────────────────────────── */
.fj-julgados { display: flex; flex-direction: column; gap: 4px; }
.fj-julgado {
  border: 1px solid #e5e7eb; border-radius: 7px;
  overflow: hidden; transition: border-color 0.15s;
}
.fj-julgado.expanded { border-color: #6366f1; }
.fj-julgado__header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 12px; cursor: pointer; gap: 8px;
  background: #fafafa;
}
.fj-julgado.expanded .fj-julgado__header { background: #f5f3ff; }
.fj-julgado__header:hover { background: #f5f3ff; }

.fj-julgado__id-group { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.fj-julgado__trib {
  font-size: 9px; font-weight: 700; padding: 2px 6px;
  border-radius: 4px; letter-spacing: 0.05em; flex-shrink: 0;
}
.trib-STF { background: #dbeafe; color: #1e40af; }
.trib-STJ { background: #cffafe; color: #155e75; }
.trib-TST { background: #ede9fe; color: #5b21b6; }
.trib-     { background: #f3f4f6; color: #6b7280; }

.fj-julgado__tipo {
  font-size: 9px; padding: 2px 6px; border-radius: 4px;
  background: #f3f4f6; color: #6b7280; flex-shrink: 0;
}
.fj-julgado__num { font-size: 12px; font-weight: 600; color: #1e1b4b; }
.fj-julgado__ano { font-size: 10px; color: #9ca3af; }

.fj-julgado__count-group { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.fj-julgado__anos-q {
  font-size: 10px; color: #6366f1; font-weight: 500;
  background: #ede9fe; padding: 2px 7px; border-radius: 4px;
}
.fj-julgado__count { font-size: 13px; font-weight: 700; color: #6366f1; }
.fj-julgado__pct { font-size: 10px; color: #9ca3af; }
.fj-chevron {
  font-size: 16px; color: #9ca3af; display: inline-block;
  transform: rotate(90deg); transition: transform 0.2s;
}
.fj-chevron.rotated { transform: rotate(270deg); }

/* ── Body do julgado expandido ────────────────── */
.fj-julgado__body {
  border-top: 1px solid #e5e7eb; background: #fafafa;
  padding: 12px 14px;
  display: flex; flex-direction: column; gap: 14px;
}

/* Badges no header */
.fj-julgado__badge {
  font-size: 9px; font-weight: 700; padding: 2px 7px;
  border-radius: 4px; letter-spacing: 0.04em;
  text-transform: uppercase;
}
.fj-julgado__badge--tema     { background: #d1fae5; color: #065f46; }
.fj-julgado__badge--superado { background: #fee2e2; color: #991b1b; }
.fj-julgado__badge--situacao { background: #fef3c7; color: #92400e; }

/* Tese */
.fj-tese { display: flex; flex-direction: column; gap: 6px; }
.fj-tese__label {
  font-size: 9px; font-weight: 700; color: #4338ca;
  text-transform: uppercase; letter-spacing: 0.06em;
}
.fj-tese p { font-size: 12px; line-height: 1.6; color: #1e1b4b; margin: 0; }
.fj-tese__none { color: #9ca3af; font-style: italic; font-size: 11px; }
.fj-tese--empty .fj-tese__label { color: #9ca3af; }

.fj-keywords { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 2px; }
.fj-keyword {
  background: #f3f4f6; color: #6b7280;
  font-size: 10px; padding: 1px 7px; border-radius: 3px;
}

.fj-fonte {
  align-self: flex-start;
  font-size: 11px; font-weight: 600; color: #6366f1;
  text-decoration: none; margin-top: 2px;
  padding: 3px 9px; border: 1px solid #c7d2fe; border-radius: 5px;
  transition: background 0.15s;
}
.fj-fonte:hover { background: #eef2ff; }

/* Sentenças de estudo */
.fj-sentencas { display: flex; flex-direction: column; gap: 6px; }
.fj-sentencas__label {
  font-size: 9px; font-weight: 700; color: #4338ca;
  text-transform: uppercase; letter-spacing: 0.06em;
  display: flex; align-items: center; gap: 8px;
}
.fj-sentencas__count {
  font-weight: 500; color: #6b7280; text-transform: none; letter-spacing: 0;
}
.fj-sentenca {
  background: #fff; border: 1px solid #e0e7ff; border-left: 3px solid #6366f1;
  border-radius: 5px; padding: 7px 10px;
}
.fj-sentenca__meta { display: flex; align-items: center; gap: 6px; margin-bottom: 3px; }
.fj-sentenca__check { color: #10b981; font-weight: 700; }
.fj-sentenca__source { font-size: 10px; color: #6366f1; font-weight: 600; }
.fj-sentenca__text { font-size: 11.5px; line-height: 1.55; color: #374151; margin: 0; }

/* ── Linha do tempo ───────────────────────────── */
.fj-timeline {
  display: flex; align-items: flex-end; gap: 6px;
  overflow-x: auto; padding-bottom: 4px;
  scrollbar-width: thin;
}
.fj-tl-col { display: flex; flex-direction: column; align-items: center; gap: 3px; min-width: 36px; }
.fj-tl-bar-wrap { display: flex; align-items: flex-end; height: 76px; }
.fj-tl-bar {
  width: 22px; border-radius: 3px 3px 0 0;
  background: linear-gradient(180deg, #8b5cf6 0%, #6366f1 100%);
  min-height: 4px; transition: height 0.4s ease;
}
.fj-tl-label { font-size: 9px; color: #6b7280; font-weight: 500; }
.fj-tl-qty   { font-size: 9px; color: #9ca3af; }
</style>
