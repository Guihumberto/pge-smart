<template>
  <div class="print-view">
    <!-- ════════════════════════════════════════════════════════ -->
    <!-- Loading skeleton                                          -->
    <!-- ════════════════════════════════════════════════════════ -->
    <div v-if="loading" class="print-view__skeleton">
      <div class="skel-paper">
        <div class="skel-line skel-line--xs" />
        <div class="skel-line skel-line--lg" />
        <div class="skel-line skel-line--lg" />
        <div class="skel-line skel-line--md" />
        <div class="skel-line skel-line--sm" />
        <div class="skel-line skel-line--sm" />
      </div>
    </div>

    <!-- ════════════════════════════════════════════════════════ -->
    <!-- Erro de fetch                                              -->
    <!-- ════════════════════════════════════════════════════════ -->
    <div v-else-if="errorFetch" class="print-view__error">
      <AlertTriangle :size="32" />
      <h2>Não foi possível carregar o cargo</h2>
      <p>{{ errorFetch }}</p>
      <button class="btn-primary" @click="fetchData">Tentar novamente</button>
    </div>

    <!-- ════════════════════════════════════════════════════════ -->
    <!-- Empty state — sem conteúdo parseado                       -->
    <!-- ════════════════════════════════════════════════════════ -->
    <div v-else-if="!temConteudo" class="print-view__empty">
      <FileQuestion :size="40" />
      <h2>Este cargo ainda não tem conteúdo programático estruturado</h2>
      <p>Volte e cole o conteúdo do edital para começar.</p>
      <button class="btn-primary" @click="voltarParaConteudo">
        Voltar e estruturar
      </button>
    </div>

    <!-- ════════════════════════════════════════════════════════ -->
    <!-- Layout principal                                          -->
    <!-- ════════════════════════════════════════════════════════ -->
    <template v-else>
      <!-- Toggle bar (oculta em print) -->
      <div class="toolbar" role="toolbar" aria-label="Opções do edital impresso">
        <button
          class="toolbar__back"
          @click="voltarParaConteudo"
          title="Voltar"
          aria-label="Voltar para edição de conteúdo"
        >
          <ChevronLeft :size="16" />
        </button>

        <div class="toolbar__toggles">
          <label
            class="toggle"
            :class="{ 'toggle--disabled': !temPriorizacao }"
            :title="!temPriorizacao ? 'Análise ainda não foi feita' : ''"
          >
            <input
              type="checkbox"
              v-model="mostrarPriorizacao"
              :disabled="!temPriorizacao || downloadingPdf"
            />
            <span>Priorização</span>
          </label>
          <label class="toggle">
            <input type="checkbox" v-model="mostrarLegislacao" :disabled="downloadingPdf" />
            <span>Legislação</span>
          </label>
          <label class="toggle">
            <input type="checkbox" v-model="mostrarAnotacoes" :disabled="downloadingPdf" />
            <span>Espaço para anotações</span>
          </label>
          <label class="toggle">
            <input type="checkbox" v-model="mostrarCheckbox" :disabled="downloadingPdf" />
            <span>Checkboxes</span>
          </label>
        </div>

        <button
          class="toolbar__download"
          :disabled="downloadingPdf"
          @click="baixarPdf"
        >
          <Loader2 v-if="downloadingPdf" :size="14" class="spin" />
          <Download v-else :size="14" />
          <span>{{ downloadingPdf ? 'Gerando PDF...' : 'Baixar PDF' }}</span>
        </button>
      </div>

      <div v-if="errorDownload" class="toolbar-error">
        <AlertTriangle :size="14" />
        <span>{{ errorDownload }}</span>
      </div>

      <!-- ──────────────────────────────────────────────────── -->
      <!-- Documento — capa + sumário + conteúdo                 -->
      <!-- ──────────────────────────────────────────────────── -->
      <article class="documento">
        <!-- ── Capa ── -->
        <section class="capa">
          <div class="capa__rule-top" />
          <div v-if="subtituloCapa" class="capa__subtitulo">{{ subtituloCapa }}</div>
          <div class="capa__titulo">Edital<br>Verticalizado</div>
          <div class="capa__filete" />
          <div class="capa__cargo">{{ cargo?.nome || 'Cargo' }}</div>

          <div class="capa__stats">
            <div v-if="stats.disciplinas" class="capa__stats-linha">
              <span class="capa__stats-num">{{ stats.disciplinas }}</span>
              {{ stats.disciplinas === 1 ? 'disciplina' : 'disciplinas' }}
            </div>
            <div v-if="stats.assuntos" class="capa__stats-linha">
              <span class="capa__stats-num">{{ stats.assuntos }}</span> assuntos
              <template v-if="stats.subAssuntos">
                · <span class="capa__stats-num">{{ stats.subAssuntos }}</span> sub-assuntos
              </template>
            </div>
            <div v-if="mostrarLegislacao && stats.leis" class="capa__stats-linha">
              <span class="capa__stats-num">{{ stats.leis }}</span>
              {{ stats.leis === 1 ? 'lei referenciada' : 'leis referenciadas' }}
            </div>
            <div v-if="mostrarPriorizacao && stats.cargaHoras" class="capa__stats-linha">
              Carga estimada: <span class="capa__stats-num">{{ stats.cargaHoras }}h</span>
            </div>
          </div>

          <div class="capa__meta">
            Edição do candidato<br>
            Gerado em {{ dataLonga }}
          </div>

          <div v-if="chipsAtivos.length" class="capa__chips">
            <span v-for="c in chipsAtivos" :key="c" class="capa__chip">{{ c }}</span>
          </div>

          <div class="capa__rule-bottom" />
        </section>

        <!-- ── Sumário ── -->
        <section v-if="disciplinasView.length >= 5" class="sumario">
          <h2 class="sumario__titulo">Sumário</h2>
          <div
            v-for="(d, i) in disciplinasView"
            :key="i"
            class="sumario__linha"
          >
            <span class="sumario__romano">{{ toRomano(i + 1) }}</span>
            <span class="sumario__nome">{{ d.nome || 'Disciplina' }}</span>
            <span class="sumario__leaders" />
          </div>
        </section>

        <!-- ── Conteúdo ── -->
        <section
          v-for="(d, di) in disciplinasView"
          :key="di"
          class="disciplina"
        >
          <header class="disciplina__header">
            <div class="disciplina__romano">{{ toRomano(di + 1) }}</div>
            <h2 class="disciplina__nome">{{ d.nome || 'Disciplina' }}</h2>
          </header>

          <div
            v-for="(a, ai) in (d.assuntos || [])"
            :key="ai"
            class="assunto-bloco"
          >
            <div class="assunto-header">
              <span v-if="mostrarCheckbox" class="checkbox" />
              <span v-else class="checkbox-spacer" />
              <span class="assunto-titulo">{{ a.nome }}</span>
              <span
                v-if="mostrarPriorizacao && a.score != null"
                class="score-wrap"
                :aria-label="`Prioridade ${nivelDeBolinhas(a.score)} de 5`"
              >
                <span class="score-bolinhas">{{ scoreParaBolinhas(a.score) }}</span>
                <span class="score-num">{{ Math.round(a.score * 100) }}</span>
                <span v-if="a.tendencia" class="tendencia">{{ a.tendencia }}</span>
              </span>
            </div>

            <div
              v-for="(s, si) in (a.sub_assuntos || [])"
              :key="si"
            >
              <div class="sub-assunto">{{ s.nome }}</div>
              <div
                v-for="(ss, ssi) in normSubSubs(s.sub_sub_assuntos)"
                :key="ssi"
                class="sub-sub"
              >{{ ss }}</div>
            </div>

            <div
              v-if="mostrarLegislacao && a.leis_referencia?.length"
              class="leis-linha"
            >{{ a.leis_referencia.join('; ') }}</div>
            <div
              v-else-if="mostrarLegislacao && a.fontes_explicitas?.length"
              class="fontes-explicitas"
            >{{ a.fontes_explicitas.join('; ') }}</div>

            <div
              v-if="mostrarPriorizacao && a.justificativa"
              class="justificativa"
            >{{ a.justificativa }}</div>

            <div v-if="mostrarAnotacoes" class="anotacoes">
              <div class="anotacoes__linha" />
              <div class="anotacoes__linha" />
              <div class="anotacoes__linha" />
            </div>
          </div>
        </section>
      </article>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ChevronLeft, Download, Loader2, AlertTriangle, FileQuestion,
} from 'lucide-vue-next'
import { cargoService } from '@/services/cargo.service'
import { editalService } from '@/services/edital.service'

const route = useRoute()
const router = useRouter()

const editalId = route.params.id
const cargoId = route.params.cargoId

const cargo = ref(null)
const edital = ref(null)
const loading = ref(true)
const errorFetch = ref(null)
const downloadingPdf = ref(false)
const errorDownload = ref(null)

const temPriorizacao = computed(() => !!cargo.value?.priorizacao?.disciplinas?.length)
const temConteudo = computed(() => !!cargo.value?.conteudo_parseado?.disciplinas?.length)

const mostrarPriorizacao = ref(false)
const mostrarLegislacao = ref(true)
const mostrarAnotacoes = ref(false)
const mostrarCheckbox = ref(true)

const disciplinasView = computed(() => {
  if (!cargo.value) return []
  return mostrarPriorizacao.value
    ? (cargo.value.priorizacao?.disciplinas || [])
    : (cargo.value.conteudo_parseado?.disciplinas || [])
})

const stats = computed(() => {
  let assuntos = 0, subAssuntos = 0, cargaHoras = 0
  const leis = new Set()
  for (const d of disciplinasView.value) {
    assuntos += d.assuntos?.length || 0
    for (const a of (d.assuntos || [])) {
      subAssuntos += a.sub_assuntos?.length || 0
      cargaHoras += Number(a.carga_estimada_horas) || 0
      for (const l of (a.leis_referencia || [])) leis.add(l)
      for (const sub of (a.sub_assuntos || [])) {
        for (const l of (sub.leis_referencia || [])) leis.add(l)
      }
    }
  }
  return {
    disciplinas: disciplinasView.value.length,
    assuntos, subAssuntos,
    leis: leis.size,
    cargaHoras: Math.round(cargaHoras),
  }
})

const dataLonga = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date())

const subtituloCapa = computed(() => {
  if (!edital.value) return ''
  const partes = [edital.value.orgao, edital.value.banca, edital.value.ano]
    .filter(p => p != null && String(p).trim() !== '')
    .map(p => String(p).toUpperCase())
  if (partes.length === 0 && edital.value.nome) return String(edital.value.nome).toUpperCase()
  return partes.join(' · ')
})

const chipsAtivos = computed(() => {
  const cs = []
  if (mostrarPriorizacao.value) cs.push('com priorização')
  if (mostrarLegislacao.value) cs.push('com legislação')
  if (mostrarAnotacoes.value) cs.push('com anotações')
  if (mostrarCheckbox.value) cs.push('com checkboxes')
  return cs
})

const ROMANOS = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI','XXII','XXIII','XXIV','XXV','XXVI','XXVII','XXVIII','XXIX','XXX']
function toRomano(n) {
  if (n < 1) return ''
  if (n <= 30) return ROMANOS[n - 1]
  return String(n)
}

function nivelDeBolinhas(score) {
  if (score == null || Number.isNaN(score)) return 0
  const c = Math.max(0, Math.min(1, Number(score)))
  return Math.max(1, Math.ceil(c * 5))
}

function scoreParaBolinhas(score) {
  const nivel = nivelDeBolinhas(score)
  if (!nivel) return ''
  return '●'.repeat(nivel) + '○'.repeat(5 - nivel)
}

function normSubSubs(arr) {
  return (arr || [])
    .map(s => typeof s === 'string' ? s : (s?.nome || ''))
    .filter(Boolean)
}

async function fetchData() {
  loading.value = true
  errorFetch.value = null
  // Reset defensivo: garante estado limpo em retry após falha parcial
  cargo.value = null
  edital.value = null
  try {
    const [c, e] = await Promise.all([
      cargoService.get(editalId, cargoId),
      editalService.get(editalId),
    ])
    cargo.value = c
    edital.value = e
    mostrarPriorizacao.value = !!c.priorizacao?.disciplinas?.length
  } catch (err) {
    errorFetch.value = err?.message || 'Erro desconhecido'
  } finally {
    loading.value = false
  }
}

async function baixarPdf() {
  if (downloadingPdf.value) return
  downloadingPdf.value = true
  errorDownload.value = null
  try {
    const blob = await cargoService.gerarConteudoPdf(editalId, cargoId, {
      mostrarPriorizacao: mostrarPriorizacao.value,
      mostrarLegislacao: mostrarLegislacao.value,
      mostrarAnotacoes: mostrarAnotacoes.value,
      mostrarCheckbox: mostrarCheckbox.value,
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const slug = (cargo.value?.nome || 'cargo')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    a.download = `edital-verticalizado-${slug}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (err) {
    errorDownload.value = err?.message || 'Não foi possível gerar o PDF. Tente novamente.'
  } finally {
    downloadingPdf.value = false
  }
}

function voltarParaConteudo() {
  router.push(`/editais/${editalId}/cargos/${cargoId}`)
}

onMounted(fetchData)
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=IBM+Plex+Mono:wght@400&family=IBM+Plex+Sans:wght@400;500&display=swap');

.print-view {
  --paper: #FAF7F0;
  --ink: #1A1A1A;
  --ink-soft: #3F3F3F;
  --ink-muted: #86827A;
  --accent: #7C2D2A;
  --rule: #D4CFC2;
  --dotted: #C0BBA8;

  background: #E8E4D7;
  min-height: 100vh;
  padding: 24px 16px 64px;
}

/* ════ Toolbar ════ */
.toolbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 12px;
  padding: 10px 14px;
  margin: 0 auto 24px;
  max-width: 820px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.06);
  font-family: 'IBM Plex Sans', sans-serif;
}
.toolbar__back {
  display: flex; align-items: center; justify-content: center;
  width: 32px; height: 32px;
  background: none; border: 1px solid var(--rule); border-radius: 8px;
  cursor: pointer; color: var(--ink-soft); transition: all 0.15s;
}
.toolbar__back:hover { background: var(--rule); }
.toolbar__toggles {
  flex: 1;
  display: flex; flex-wrap: wrap; gap: 4px 12px;
}
.toggle {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 12px; color: var(--ink-soft); cursor: pointer;
  padding: 4px 8px; border-radius: 6px; transition: background 0.15s;
}
.toggle:hover { background: rgba(124, 45, 42, 0.05); }
.toggle--disabled { opacity: 0.4; cursor: not-allowed; }
.toggle input { accent-color: var(--accent); cursor: pointer; }
.toggle--disabled input { cursor: not-allowed; }

.toolbar__download {
  display: inline-flex; align-items: center; gap: 6px;
  background: var(--accent); color: #fff;
  border: none; border-radius: 8px;
  padding: 8px 14px; font-size: 12px; font-weight: 600;
  font-family: 'IBM Plex Sans', sans-serif;
  cursor: pointer; transition: all 0.15s;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}
.toolbar__download:hover:not(:disabled) {
  background: #5e2220; box-shadow: 0 2px 6px rgba(124,45,42,0.25);
}
.toolbar__download:disabled { opacity: 0.7; cursor: wait; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.toolbar-error {
  display: flex; align-items: center; gap: 8px;
  max-width: 820px; margin: -16px auto 16px;
  padding: 8px 14px;
  background: #FEF2F2; border: 1px solid #FECACA;
  border-radius: 8px; color: #991B1B; font-size: 12px;
}

/* ════ Documento (papel) ════ */
.documento {
  background: var(--paper);
  color: var(--ink);
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 11pt;
  line-height: 1.5;
  width: 794px;          /* A4 width @ 96dpi */
  max-width: 100%;
  margin: 0 auto;
  box-shadow: 0 8px 32px rgba(0,0,0,0.15);
  border-radius: 4px;
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
}

/* ── Capa ── */
.capa {
  padding: 32mm 28mm;
  display: flex; flex-direction: column;
  min-height: 1123px;    /* A4 height @ 96dpi */
  position: relative;
}
.capa__rule-top, .capa__rule-bottom {
  border-top: 1pt solid var(--ink);
  border-bottom: 0.5pt solid var(--ink);
  height: 4pt; margin: 0;
}
.capa__rule-top { margin-bottom: 32mm; }
.capa__rule-bottom { margin-top: auto; }
.capa__subtitulo {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 11pt; font-weight: 500;
  text-transform: uppercase; letter-spacing: 0.18em;
  color: var(--ink-soft); margin-bottom: 18mm;
}
.capa__titulo {
  font-family: 'Cormorant Garamond', serif;
  font-weight: 500; font-style: italic;
  font-size: 64pt; line-height: 1.05; letter-spacing: -0.01em;
  color: var(--ink); margin-bottom: 6mm;
}
.capa__filete {
  width: 40mm; height: 1.5pt;
  background: var(--accent); margin-bottom: 14mm;
}
.capa__cargo {
  font-family: 'Cormorant Garamond', serif;
  font-weight: 600; font-size: 28pt;
  color: var(--ink); margin-bottom: 18mm;
}
.capa__stats { margin-bottom: 14mm; }
.capa__stats-linha {
  font-family: 'Cormorant Garamond', serif;
  font-size: 14pt; color: var(--ink-soft);
  margin-bottom: 2mm;
}
.capa__stats-num { color: var(--accent); font-weight: 600; }
.capa__meta {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 9pt; color: var(--ink-muted);
  line-height: 1.6; margin-bottom: 10mm;
}
.capa__chips { display: flex; flex-wrap: wrap; gap: 2mm; }
.capa__chip {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 9pt;
  border: 0.6pt solid var(--accent);
  color: var(--accent);
  padding: 1mm 3mm; border-radius: 1mm;
  text-transform: lowercase;
}

/* ── Sumário ── */
.sumario {
  padding: 28mm 24mm;
  border-top: 0.5pt solid var(--rule);
}
.sumario__titulo {
  font-family: 'Cormorant Garamond', serif;
  font-weight: 500; font-style: italic;
  font-size: 32pt; color: var(--ink);
  margin-bottom: 14mm;
}
.sumario__linha {
  display: flex; align-items: baseline;
  font-family: 'Cormorant Garamond', serif;
  font-size: 13pt; color: var(--ink);
  margin-bottom: 4mm; gap: 3mm;
}
.sumario__romano {
  color: var(--accent); font-style: italic; min-width: 14mm;
}
.sumario__nome {
  text-transform: uppercase; letter-spacing: 0.05em;
  font-size: 11pt;
  font-family: 'IBM Plex Sans', sans-serif; font-weight: 500;
  flex: 0 0 auto;
}
.sumario__leaders {
  flex: 1; border-bottom: 0.5pt dotted var(--ink-muted);
  margin: 0 2mm 2pt; min-width: 8mm;
}

/* ── Disciplinas / Conteúdo ── */
.disciplina {
  padding: 14mm 20mm 22mm;
  border-top: 0.5pt solid var(--rule);
}
.disciplina__header {
  display: grid;
  grid-template-columns: 26mm 1fr;
  gap: 6mm;
  align-items: end;
  margin-bottom: 8mm;
  padding-bottom: 6mm;
  border-bottom: 0.5pt solid var(--rule);
}
.disciplina__romano {
  font-family: 'Cormorant Garamond', serif;
  font-style: italic; font-weight: 400; font-size: 64pt;
  color: var(--accent); opacity: 0.88;
  line-height: 0.9; text-align: right;
  padding-right: 4mm;
  border-right: 0.6pt solid var(--accent);
}
.disciplina__nome {
  font-family: 'Cormorant Garamond', serif;
  font-weight: 600; font-size: 28pt;
  color: var(--ink); line-height: 1.15;
  padding-bottom: 2mm;
}

.assunto-bloco { margin-bottom: 5mm; }
.assunto-header {
  display: grid;
  grid-template-columns: 7mm 1fr auto;
  gap: 3mm;
  align-items: baseline;
  margin-bottom: 1.5mm;
}
.checkbox {
  width: 4mm; height: 4mm;
  border: 0.7pt solid var(--ink);
  border-radius: 0.5mm;
  display: inline-block;
  margin-top: 1mm;
}
.checkbox-spacer { width: 4mm; }
.assunto-titulo {
  font-family: 'Cormorant Garamond', serif;
  font-weight: 500; font-size: 16pt;
  color: var(--ink); line-height: 1.25;
}
.score-wrap {
  display: inline-flex; align-items: center; gap: 1.5mm;
  color: var(--accent);
  font-family: 'IBM Plex Mono', monospace; font-size: 9pt;
}
.score-bolinhas { font-size: 11pt; letter-spacing: 0.5pt; line-height: 1; }
.score-num { color: var(--ink-muted); }
.tendencia {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 9pt; color: var(--ink-muted); margin-left: 2mm;
}

.sub-assunto {
  display: flex; align-items: baseline; gap: 2mm;
  padding-left: 10mm;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 11pt; color: var(--ink-soft);
  line-height: 1.4; margin-bottom: 0.5mm;
}
.sub-assunto::before {
  content: '·'; color: var(--ink-muted); font-weight: 700;
}
.sub-sub {
  padding-left: 17mm;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 10pt; color: var(--ink-muted);
  font-style: italic; line-height: 1.4;
  margin-bottom: 0.3mm;
}

.leis-linha {
  padding-left: 10mm; margin-top: 1.5mm;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 9pt; color: var(--accent); font-style: italic;
}
.leis-linha::before {
  content: '──── '; color: var(--accent);
  font-style: normal; margin-right: 1mm;
}
.fontes-explicitas {
  padding-left: 10mm; margin-top: 1mm;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 9pt; color: var(--ink-muted);
}
.justificativa {
  margin-top: 2mm; margin-left: 10mm;
  padding: 1mm 0 1mm 4mm;
  border-left: 1pt solid var(--accent);
  font-family: 'Cormorant Garamond', serif;
  font-style: italic; font-size: 10pt;
  color: var(--ink-soft); line-height: 1.45;
}
.anotacoes {
  margin-top: 2mm; margin-left: 10mm; margin-bottom: 2mm;
  min-height: 18mm;
}
.anotacoes__linha {
  border-bottom: 0.5pt dotted var(--dotted);
  height: 6mm;
}

/* ════ Loading / Empty / Error ════ */
.print-view__skeleton, .print-view__empty, .print-view__error {
  max-width: 794px; margin: 24px auto;
  background: var(--paper); border-radius: 4px;
  padding: 48px 32px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
  font-family: 'IBM Plex Sans', sans-serif;
}
.skel-paper { display: flex; flex-direction: column; gap: 12px; }
.skel-line {
  background: linear-gradient(90deg, var(--rule) 0%, #E8E4D7 50%, var(--rule) 100%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite linear;
  border-radius: 4px;
}
.skel-line--xs { height: 12px; width: 30%; }
.skel-line--sm { height: 14px; width: 60%; }
.skel-line--md { height: 18px; width: 75%; }
.skel-line--lg { height: 56px; width: 80%; }
@keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }

.print-view__empty, .print-view__error {
  display: flex; flex-direction: column; align-items: center;
  text-align: center; gap: 14px;
  color: var(--ink-soft);
}
.print-view__empty h2, .print-view__error h2 {
  font-family: 'Cormorant Garamond', serif;
  font-weight: 500; font-size: 22pt;
  color: var(--ink);
}
.print-view__empty p, .print-view__error p {
  color: var(--ink-muted); font-size: 12pt;
}
.btn-primary {
  background: var(--accent); color: #fff;
  border: none; border-radius: 8px;
  padding: 10px 18px; font-size: 13px; font-weight: 600;
  font-family: 'IBM Plex Sans', sans-serif; cursor: pointer;
  transition: background 0.15s;
}
.btn-primary:hover { background: #5e2220; }

/* ════ Responsivo ════ */
@media (max-width: 900px) {
  .print-view { padding: 12px 8px 32px; }
  .toolbar { padding: 8px 10px; gap: 8px; flex-wrap: wrap; }
  .toolbar__toggles { gap: 2px 8px; }
  .toggle { font-size: 11px; padding: 3px 6px; }
  .toolbar__download span { display: none; }
  .toolbar__download { padding: 8px 10px; }

  .documento { width: 100%; }
  .capa { padding: 20mm 14mm; min-height: auto; padding-bottom: 24mm; }
  .capa__titulo { font-size: 44pt; }
  .capa__cargo { font-size: 22pt; }
  .capa__stats-linha { font-size: 12pt; }

  .sumario { padding: 18mm 14mm; }
  .sumario__titulo { font-size: 24pt; }

  .disciplina { padding: 10mm 14mm 16mm; }
  .disciplina__header { grid-template-columns: 18mm 1fr; gap: 4mm; }
  .disciplina__romano { font-size: 42pt; }
  .disciplina__nome { font-size: 22pt; }

  .assunto-titulo { font-size: 14pt; }
  .sub-assunto { padding-left: 6mm; }
  .sub-sub { padding-left: 12mm; }
  .leis-linha, .fontes-explicitas, .justificativa, .anotacoes { margin-left: 6mm; padding-left: 0; }
}

@media (max-width: 480px) {
  .toolbar__back { display: none; }
  .toolbar__toggles { width: 100%; order: 2; }
  .toolbar__download { order: 1; margin-left: auto; }

  /* Capa mais compacta, mantém impacto visual pra screenshot em stories */
  .capa { padding: 16mm 10mm; padding-bottom: 18mm; }
  .capa__subtitulo { font-size: 9pt; letter-spacing: 0.14em; margin-bottom: 10mm; }
  .capa__titulo { font-size: 32pt; line-height: 1.0; }
  .capa__cargo { font-size: 18pt; margin-bottom: 12mm; }
  .capa__stats-linha { font-size: 11pt; }
  .capa__chip { font-size: 8pt; padding: 0.5mm 2.5mm; }

  /* Conteúdo mais denso em mobile */
  .disciplina { padding: 8mm 10mm 12mm; }
  .disciplina__header { grid-template-columns: 14mm 1fr; gap: 3mm; padding-bottom: 4mm; }
  .disciplina__romano { font-size: 32pt; padding-right: 2mm; }
  .disciplina__nome { font-size: 18pt; }
  .assunto-titulo { font-size: 13pt; }
  .assunto-header { grid-template-columns: 5mm 1fr auto; gap: 2mm; }
  .checkbox, .checkbox-spacer { width: 3.5mm; height: 3.5mm; }
  .sub-assunto, .sub-sub { font-size: 10pt; }
  .sub-sub { font-size: 9pt; }
}

/* ════ Print ════ */
@media print {
  .print-view {
    background: #fff; padding: 0;
  }
  .toolbar, .toolbar-error { display: none; }
  .documento {
    box-shadow: none; border-radius: 0;
    width: auto; max-width: none; margin: 0;
  }
  @page { size: A4; margin: 22mm 20mm; }
  .capa, .sumario { page-break-after: always; }
  .capa { min-height: auto; }
  .disciplina + .disciplina { page-break-before: always; }
  .disciplina { border-top: none; }
  .disciplina__header { page-break-after: avoid; }
  .assunto-bloco { page-break-inside: avoid; }
  .justificativa { page-break-inside: avoid; orphans: 2; widows: 2; }
  .leis-linha { page-break-inside: avoid; }
  p, li { orphans: 3; widows: 3; }
}
</style>
