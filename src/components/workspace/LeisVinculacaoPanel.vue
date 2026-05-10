<template>
  <div class="leis-panel">
    <!-- Header -->
    <div class="leis-panel__header">
      <div>
        <h2 class="leis-panel__title">Vinculação de Normas</h2>
        <p class="leis-panel__sub">
          {{ resumo }}
          <span v-if="meta?.geradoEm" class="leis-panel__time">
            · Gerado {{ formatRelative(meta.geradoEm) }}
          </span>
        </p>
      </div>
      <div class="leis-panel__actions">
        <button
          class="btn-outline"
          :disabled="regenerando"
          @click="$emit('voltar')"
        >
          <ChevronLeft :size="14" /> Voltar à priorização
        </button>
        <button
          class="btn-primary"
          :disabled="regenerando"
          :title="meta?.geradoEm ? 'Recalcular sugestões com base na priorização atual' : ''"
          @click="$emit('regerar')"
        >
          <RefreshCw :size="14" :class="{ 'spin': regenerando }" />
          {{ regenerando ? 'Atualizando...' : 'Recalcular sugestões' }}
        </button>
      </div>
    </div>

    <!-- Estado vazio -->
    <div v-if="!normas.length && !regenerando" class="leis-panel__empty">
      <p>Nenhuma norma identificada na priorização.</p>
    </div>

    <!-- Loading inicial -->
    <div v-else-if="regenerando && !normas.length" class="leis-panel__loading">
      <Loader2 :size="24" class="spin" />
      <p>Buscando candidatos no índice de normas...</p>
    </div>

    <!-- Grupos de normas -->
    <div v-else class="leis-panel__lista">
      <!-- Ambíguas -->
      <details v-if="grupoAmbiguas.length" class="leis-panel__grupo" open>
        <summary>
          <HelpCircle :size="14" />
          {{ grupoAmbiguas.length }} ambígua{{ grupoAmbiguas.length > 1 ? 's' : '' }} — escolha um candidato
        </summary>
        <div class="leis-panel__items">
          <NormaCard
            v-for="n in grupoAmbiguas"
            :key="n.id"
            :norma="n"
            :loading="loadingNormaId === n.id"
            @confirmar="onConfirmar"
            @desvincular="onDesvincular"
            @vincular="onVincular"
            @mudar-status="onMudarStatus"
            @buscar-manual="onBuscarManual"
          />
        </div>
      </details>

      <!-- Sugeridas -->
      <details v-if="grupoSugeridas.length" class="leis-panel__grupo" open>
        <summary>
          <CheckCircle :size="14" />
          {{ grupoSugeridas.length }} sugerida{{ grupoSugeridas.length > 1 ? 's' : '' }} — confirme se concordar
        </summary>
        <div class="leis-panel__items">
          <NormaCard
            v-for="n in grupoSugeridas"
            :key="n.id"
            :norma="n"
            :loading="loadingNormaId === n.id"
            @confirmar="onConfirmar"
            @vincular="onVincular"
            @mudar-status="onMudarStatus"
            @buscar-manual="onBuscarManual"
          />
        </div>
      </details>

      <!-- Sem correspondência -->
      <details v-if="grupoNaoEncontradas.length" class="leis-panel__grupo">
        <summary>
          <AlertTriangle :size="14" />
          {{ grupoNaoEncontradas.length }} sem correspondência no índice
        </summary>
        <div class="leis-panel__items">
          <NormaCard
            v-for="n in grupoNaoEncontradas"
            :key="n.id"
            :norma="n"
            :loading="loadingNormaId === n.id"
            @vincular="onVincular"
            @mudar-status="onMudarStatus"
            @buscar-manual="onBuscarManual"
          />
        </div>
      </details>

      <!-- Confirmadas obsoletas (aviso) -->
      <details v-if="grupoObsoletas.length" class="leis-panel__grupo leis-panel__grupo--alerta">
        <summary>
          <AlertTriangle :size="14" />
          {{ grupoObsoletas.length }} confirmada{{ grupoObsoletas.length > 1 ? 's' : '' }} anteriormente, fora da priorização atual
        </summary>
        <div class="leis-panel__items">
          <NormaCard
            v-for="n in grupoObsoletas"
            :key="n.id"
            :norma="n"
            :loading="loadingNormaId === n.id"
            @confirmar="onConfirmar"
            @desvincular="onDesvincular"
            @vincular="onVincular"
            @mudar-status="onMudarStatus"
            @buscar-manual="onBuscarManual"
          />
        </div>
      </details>

      <!-- Pendentes -->
      <details v-if="grupoPendentes.length" class="leis-panel__grupo">
        <summary>
          <Pause :size="14" />
          {{ grupoPendentes.length }} pendente{{ grupoPendentes.length > 1 ? 's' : '' }} — aguardando cadastro externo
        </summary>
        <div class="leis-panel__items">
          <NormaCard
            v-for="n in grupoPendentes"
            :key="n.id"
            :norma="n"
            :loading="loadingNormaId === n.id"
            @vincular="onVincular"
            @buscar-manual="onBuscarManual"
          />
        </div>
      </details>

      <!-- Confirmadas -->
      <details v-if="grupoConfirmadas.length" class="leis-panel__grupo">
        <summary>
          <CheckCircle :size="14" />
          {{ grupoConfirmadas.length }} confirmada{{ grupoConfirmadas.length > 1 ? 's' : '' }}
        </summary>
        <div class="leis-panel__items">
          <NormaCard
            v-for="n in grupoConfirmadas"
            :key="n.id"
            :norma="n"
            :loading="loadingNormaId === n.id"
            @desvincular="onDesvincular"
            @buscar-manual="onBuscarManual"
          />
        </div>
      </details>

      <!-- Sub-seção: Por disciplina (granularidade completa, dedupado por lei real) -->
      <details v-if="normasPorDisciplina.length" class="leis-panel__grupo leis-panel__grupo--final" open>
        <summary>
          <Layers :size="14" />
          Por disciplina — {{ normasPorDisciplina.length }} disciplina{{ normasPorDisciplina.length > 1 ? 's' : '' }} · {{ totalLeisDistintas }} lei{{ totalLeisDistintas > 1 ? 's' : '' }} confirmada{{ totalLeisDistintas > 1 ? 's' : '' }}
        </summary>
        <div class="por-disciplina">
          <button class="btn-sm" @click="copiarPorDisciplina">
            <Copy :size="12" /> {{ copiadoPorDisc ? 'Copiado!' : 'Copiar (agrupado por disciplina)' }}
          </button>
          <div v-for="[disc, items] in normasPorDisciplina" :key="disc" class="por-disc-bloco">
            <h4 class="por-disc-bloco__titulo">
              <BookOpen :size="13" /> {{ disc }}
              <span class="por-disc-bloco__count">{{ items.length }} lei{{ items.length > 1 ? 's' : '' }}</span>
            </h4>
            <ul class="por-disc-bloco__normas">
              <li v-for="(item, i) in items" :key="`${disc}-${item.lei.chave}-${i}`" class="por-disc-norma">
                <div class="por-disc-norma__titulo">
                  <strong>{{ item.lei.lawTitle || item.lei.nomeOriginal }}</strong>
                </div>
                <div v-if="item.bloco.assuntos?.length" class="por-disc-norma__linha">
                  <span class="por-disc-norma__label">Assuntos:</span>
                  <span v-for="a in item.bloco.assuntos" :key="a" class="por-disc-norma__tag">{{ a }}</span>
                </div>
                <div v-if="item.bloco.sub_assuntos?.length" class="por-disc-norma__linha">
                  <span class="por-disc-norma__label">Sub-assuntos:</span>
                  <span v-for="s in item.bloco.sub_assuntos" :key="s" class="por-disc-norma__tag por-disc-norma__tag--sub">{{ s }}</span>
                </div>
                <div v-if="item.bloco.dispositivos?.length" class="por-disc-norma__linha">
                  <span class="por-disc-norma__label">Artigos:</span>
                  <span v-for="d in item.bloco.dispositivos" :key="d" class="por-disc-norma__tag por-disc-norma__tag--disp">{{ d }}</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </details>

      <!-- Sub-seção: Lista final consolidada (linear, dedupada por lei real) -->
      <details v-if="confirmadasOrdenadas.length" class="leis-panel__grupo">
        <summary>
          <List :size="14" />
          Lista final consolidada — {{ totalLeisDistintas }} lei{{ totalLeisDistintas > 1 ? 's' : '' }} ({{ totalDispositivos }} dispositivo{{ totalDispositivos === 1 ? '' : 's' }})
        </summary>
        <div class="lista-final">
          <button class="btn-sm" @click="copiarListaFinal">
            <Copy :size="12" /> {{ copiado ? 'Copiado!' : 'Copiar lista' }}
          </button>
          <ol class="lista-final__items">
            <li v-for="n in confirmadasOrdenadas" :key="n.chave" class="lista-final__item">
              <strong>{{ n.lawTitle || n.nomeOriginal }}</strong>
              <span v-if="totalAssuntosLei(n)" class="lista-final__meta">
                · {{ totalAssuntosLei(n) }} assunto{{ totalAssuntosLei(n) > 1 ? 's' : '' }}
              </span>
              <span v-if="totalDispositivosLei(n)" class="lista-final__meta">
                · {{ totalDispositivosLei(n) }} dispositivo{{ totalDispositivosLei(n) > 1 ? 's' : '' }}
              </span>
            </li>
          </ol>
        </div>
      </details>
    </div>

    <!-- Modal de busca manual -->
    <BuscarLeiModal
      :open="modalAberto"
      :norma="normaEmBusca"
      @close="modalAberto = false"
      @select="onSelecionarLeiManual"
    />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import dayjs from 'dayjs'
import { toast } from 'vue-sonner'
import {
  ChevronLeft, RefreshCw, Loader2, AlertTriangle, CheckCircle, HelpCircle, Pause,
  List, Copy, Layers, BookOpen,
} from 'lucide-vue-next'
import NormaCard from './NormaCard.vue'
import BuscarLeiModal from './BuscarLeiModal.vue'

const props = defineProps({
  leisVinculadas: { type: Object, default: () => ({ _meta: {}, normas: [] }) },
  regenerando: { type: Boolean, default: false },
})
const emit = defineEmits(['voltar', 'regerar', 'vincular', 'desvincular', 'mudar-status'])

const meta = computed(() => props.leisVinculadas?._meta || {})
const normas = computed(() => props.leisVinculadas?.normas || [])

const loadingNormaId = ref(null)
const modalAberto = ref(false)
const normaEmBusca = ref(null)
const copiado = ref(false)
const copiadoPorDisc = ref(false)

// Agrupamentos por status — ordem: ambíguas, sugeridas, sem-match, obsoletas, pendentes, confirmadas
const grupoConfirmadas    = computed(() => normas.value.filter(n => n.status === 'confirmada'))
const grupoObsoletas      = computed(() => normas.value.filter(n => n.status === 'confirmada_obsoleta'))
const grupoSugeridas      = computed(() => normas.value.filter(n => n.status === 'sugerida'))
const grupoAmbiguas       = computed(() => normas.value.filter(n => n.status === 'ambigua'))
const grupoNaoEncontradas = computed(() => normas.value.filter(n => n.status === 'nao_encontrada'))
const grupoPendentes      = computed(() => normas.value.filter(n => n.status === 'pendente'))

const resumo = computed(() => {
  const total = meta.value.totalNormas ?? normas.value.length
  if (!total) return ''
  const partes = []
  if (meta.value.confirmadas) partes.push(`${meta.value.confirmadas} confirmada(s)`)
  if (meta.value.sugeridas) partes.push(`${meta.value.sugeridas} sugerida(s)`)
  if (meta.value.ambiguas) partes.push(`${meta.value.ambiguas} ambígua(s)`)
  if (meta.value.pendentes) partes.push(`${meta.value.pendentes} pendente(s)`)
  if (meta.value.nao_encontradas) partes.push(`${meta.value.nao_encontradas} sem match`)
  if (meta.value.confirmadas_obsoletas) partes.push(`${meta.value.confirmadas_obsoletas} obsoleta(s)`)
  return `${total} norma${total > 1 ? 's' : ''} identificada${total > 1 ? 's' : ''} — ${partes.join(', ')}`
})

/**
 * Lista final consolidada — DEDUPADA POR `lawId`.
 * Se 2 normas distintas (ex: "Lei 9.605" e "Lei 9.605/1998 — crimes ambientais")
 * foram vinculadas à mesma lei real, agregamos numa só entrada com todos os
 * contextos do edital onde aparecem.
 */
const confirmadasOrdenadas = computed(() => {
  // Map: lawId → { lawId, lawTitle, lawSubtitle, ano, normas: [norma1, norma2,...], abarcaMerged: [bloco] }
  const byLaw = new Map()

  for (const norma of grupoConfirmadas.value) {
    // Chave canônica de agrupamento: lawId quando há (caminho normal) ou nomeNormalizado como fallback
    const chave = norma.lawId || `_sem_lawid_${norma.nomeNormalizado}`
    if (!byLaw.has(chave)) {
      byLaw.set(chave, {
        chave,
        lawId: norma.lawId,
        lawTitle: norma.lawTitle,
        lawSubtitle: norma.lawSubtitle,
        nomeOriginal: norma.nomeOriginal,
        ano: norma.ano,
        normasIds: [],
        abarcaMerged: [], // blocos de todas as normas com esse lawId
      })
    }
    const entry = byLaw.get(chave)
    entry.normasIds.push(norma.id)
    // Mescla blocos do abarca preservando granularidade por disciplina
    for (const bloco of norma.abarca || []) {
      const existente = entry.abarcaMerged.find(b => b.disciplina === bloco.disciplina)
      if (!existente) {
        entry.abarcaMerged.push({
          disciplina: bloco.disciplina,
          assuntos: [...(bloco.assuntos || [])],
          sub_assuntos: [...(bloco.sub_assuntos || [])],
          dispositivos: [...(bloco.dispositivos || [])],
        })
      } else {
        for (const a of bloco.assuntos || []) if (!existente.assuntos.includes(a)) existente.assuntos.push(a)
        for (const s of bloco.sub_assuntos || []) if (!existente.sub_assuntos.includes(s)) existente.sub_assuntos.push(s)
        for (const d of bloco.dispositivos || []) if (!existente.dispositivos.includes(d)) existente.dispositivos.push(d)
      }
    }
  }

  // Ordena por ano desc + título
  return Array.from(byLaw.values()).sort((a, b) => {
    const anoA = a.ano ?? -Infinity
    const anoB = b.ano ?? -Infinity
    if (anoA !== anoB) return anoB - anoA
    return (a.lawTitle || a.nomeOriginal || '').localeCompare(b.lawTitle || b.nomeOriginal || '')
  })
})

const totalLeisDistintas = computed(() => confirmadasOrdenadas.value.length)

/**
 * Itera disciplinas → leis distintas (não normas). Cada disciplina lista cada
 * lawId apenas uma vez, mesclando os contextos de todas as normas que apontam
 * para a mesma lei real.
 */
const normasPorDisciplina = computed(() => {
  // Reaproveita o agrupamento por lawId já feito em confirmadasOrdenadas
  // e re-itera por disciplina.
  const map = new Map() // disciplinaName → Map<chave, { lei, bloco }>
  for (const lei of confirmadasOrdenadas.value) {
    for (const bloco of lei.abarcaMerged || []) {
      if (!bloco?.disciplina) continue
      const key = bloco.disciplina
      if (!map.has(key)) map.set(key, new Map())
      // Não pode duplicar a mesma lei dentro da mesma disciplina (se já foi mesclada acima, OK)
      if (!map.get(key).has(lei.chave)) {
        map.get(key).set(lei.chave, { lei, bloco })
      }
    }
  }
  // Converte para array e ordena dentro de cada disciplina
  const result = []
  for (const [disc, leisMap] of map.entries()) {
    const items = Array.from(leisMap.values()).sort((a, b) => {
      const anoA = a.lei.ano ?? -Infinity
      const anoB = b.lei.ano ?? -Infinity
      if (anoA !== anoB) return anoB - anoA
      return (a.lei.lawTitle || a.lei.nomeOriginal || '').localeCompare(b.lei.lawTitle || b.lei.nomeOriginal || '')
    })
    result.push([disc, items])
  }
  // Disciplinas em ordem alfabética
  return result.sort(([a], [b]) => a.localeCompare(b))
})

// Helpers para a "lei agrupada" (entrada de confirmadasOrdenadas) que tem `abarcaMerged`
function totalAssuntosLei(lei) {
  return (lei.abarcaMerged || []).reduce((acc, b) => acc + (b.assuntos?.length || 0), 0)
}
function totalDispositivosLei(lei) {
  return (lei.abarcaMerged || []).reduce((acc, b) => acc + (b.dispositivos?.length || 0), 0)
}
const totalDispositivos = computed(() => confirmadasOrdenadas.value.reduce((acc, lei) => acc + totalDispositivosLei(lei), 0))

async function copiarPorDisciplina() {
  const linhas = []
  for (const [disc, items] of normasPorDisciplina.value) {
    linhas.push(`# ${disc}`)
    for (const { lei, bloco } of items) {
      const titulo = lei.lawTitle || lei.nomeOriginal
      linhas.push(`  - ${titulo}`)
      if (bloco.assuntos?.length) {
        linhas.push(`    Assuntos: ${bloco.assuntos.join(', ')}`)
      }
      if (bloco.sub_assuntos?.length) {
        linhas.push(`    Sub-assuntos: ${bloco.sub_assuntos.join(', ')}`)
      }
      if (bloco.dispositivos?.length) {
        linhas.push(`    Artigos: ${bloco.dispositivos.join(', ')}`)
      }
    }
    linhas.push('') // separador em branco entre disciplinas
  }
  const texto = linhas.join('\n').trim()

  if (!navigator.clipboard?.writeText) {
    toast.error('Clipboard não disponível neste navegador. Selecione e copie manualmente.')
    return
  }
  try {
    await navigator.clipboard.writeText(texto)
    copiadoPorDisc.value = true
    setTimeout(() => { copiadoPorDisc.value = false }, 1800)
  } catch (err) {
    console.error('Falha ao copiar agrupado:', err)
    toast.error('Não foi possível copiar — verifique permissões do navegador')
  }
}

async function copiarListaFinal() {
  const linhas = confirmadasOrdenadas.value.map((lei, i) => {
    const t = lei.lawTitle || lei.nomeOriginal
    const disps = totalDispositivosLei(lei)
    return `${i + 1}. ${t}${disps ? ` (${disps} dispositivo${disps > 1 ? 's' : ''})` : ''}`
  }).join('\n')

  if (!navigator.clipboard?.writeText) {
    toast.error('Clipboard não disponível neste navegador. Selecione e copie manualmente.')
    return
  }
  try {
    await navigator.clipboard.writeText(linhas)
    copiado.value = true
    setTimeout(() => { copiado.value = false }, 1800)
  } catch (err) {
    console.error('Falha ao copiar para clipboard:', err)
    toast.error('Não foi possível copiar — verifique permissões do navegador')
  }
}

function formatRelative(iso) {
  if (!iso) return ''
  const diff = dayjs().diff(dayjs(iso), 'minute')
  if (diff < 1) return 'agora'
  if (diff < 60) return `há ${diff} min`
  const h = Math.floor(diff / 60)
  if (h < 24) return `há ${h}h`
  return dayjs(iso).format('DD/MM HH:mm')
}

// ── Handlers ─────────────────────────────────────────────────

async function onConfirmar(norma) {
  if (!norma.lawId) return
  loadingNormaId.value = norma.id
  try {
    await emitAsync('vincular', { normaId: norma.id, lawId: norma.lawId })
  } finally {
    loadingNormaId.value = null
  }
}

async function onDesvincular(norma) {
  loadingNormaId.value = norma.id
  try {
    await emitAsync('desvincular', norma.id)
  } finally {
    loadingNormaId.value = null
  }
}

async function onVincular({ norma, lawId }) {
  loadingNormaId.value = norma.id
  try {
    await emitAsync('vincular', { normaId: norma.id, lawId })
  } finally {
    loadingNormaId.value = null
  }
}

async function onMudarStatus({ norma, status }) {
  loadingNormaId.value = norma.id
  try {
    await emitAsync('mudar-status', { normaId: norma.id, status })
  } finally {
    loadingNormaId.value = null
  }
}

function onBuscarManual(norma) {
  normaEmBusca.value = norma
  modalAberto.value = true
}

async function onSelecionarLeiManual({ norma, law }) {
  modalAberto.value = false
  const n = norma || normaEmBusca.value
  if (!n) return
  loadingNormaId.value = n.id
  try {
    await emitAsync('vincular', { normaId: n.id, lawId: law.id })
  } finally {
    loadingNormaId.value = null
    normaEmBusca.value = null
  }
}

/**
 * Helper — espera o parent processar o emit.
 * CONTRATO: o handler do parent recebe (payload, done) e DEVE chamar done()
 * no finally para liberar a UI. Timeout de 10s como safeguard.
 */
function emitAsync(event, payload) {
  return new Promise((resolve) => {
    let resolved = false
    const safeResolve = () => {
      if (resolved) return
      resolved = true
      resolve()
    }
    const timeoutId = setTimeout(() => {
      if (!resolved) {
        console.warn(`[LeisVinculacaoPanel] handler de '${event}' não chamou done() em 10s — liberando UI`)
        safeResolve()
      }
    }, 10000)
    emit(event, payload, () => {
      clearTimeout(timeoutId)
      safeResolve()
    })
  })
}
</script>

<style scoped>
.leis-panel {
  display: flex; flex-direction: column; gap: 16px;
  font-family: 'DM Sans', sans-serif;
}

.leis-panel__header {
  display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;
  flex-wrap: wrap;
}
.leis-panel__title { font-size: 1.1rem; font-weight: 700; color: #1a1a2e; margin: 0 0 4px; }
.leis-panel__sub { font-size: 12px; color: #64748B; margin: 0; }
.leis-panel__time { color: #94A3B8; }
.leis-panel__actions { display: flex; gap: 8px; flex-wrap: wrap; }

.leis-panel__empty, .leis-panel__loading {
  text-align: center; padding: 48px 24px; color: #94A3B8;
  display: flex; flex-direction: column; align-items: center; gap: 12px;
}

.leis-panel__lista { display: flex; flex-direction: column; gap: 12px; }

.leis-panel__grupo {
  border: 1px solid #ebe9e4; border-radius: 12px; background: #fafaf8;
  overflow: hidden;
}
.leis-panel__grupo--alerta { border-color: #FED7AA; background: #FFFBEB; }
.leis-panel__grupo--final { border-color: #C7D2FE; background: #EEF2FF; }
.leis-panel__grupo > summary {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 16px; cursor: pointer; font-size: 13px; font-weight: 600; color: #1a1a2e;
  list-style: none;
}
.leis-panel__grupo > summary::-webkit-details-marker { display: none; }
.leis-panel__grupo > summary::before {
  content: '›'; transition: transform 0.2s; color: #94A3B8;
  display: inline-block; font-size: 16px; line-height: 1;
}
.leis-panel__grupo[open] > summary::before { transform: rotate(90deg); }
.leis-panel__items {
  display: flex; flex-direction: column; gap: 10px;
  padding: 0 16px 16px;
}

/* Lista final consolidada */
.lista-final { padding: 12px 16px 16px; display: flex; flex-direction: column; gap: 12px; }
.lista-final__items {
  margin: 0; padding-left: 22px;
  display: flex; flex-direction: column; gap: 4px;
  max-height: 320px; overflow-y: auto;
}
.lista-final__item { font-size: 12px; color: #1a1a2e; line-height: 1.5; }
.lista-final__meta { color: #94A3B8; font-size: 11px; }

/* Sub-seção: Por disciplina (agrupado com granularidade) */
.por-disciplina {
  padding: 12px 16px 16px;
  display: flex; flex-direction: column; gap: 16px;
  max-height: 600px; overflow-y: auto;
}
.por-disc-bloco {
  display: flex; flex-direction: column; gap: 8px;
  background: #fff; border: 1px solid #E0E7FF; border-radius: 10px;
  padding: 12px 14px;
}
.por-disc-bloco__titulo {
  display: flex; align-items: center; gap: 6px;
  font-size: 13px; font-weight: 700; color: #1a1a2e;
  margin: 0; padding-bottom: 8px; border-bottom: 1px solid #EEF2FF;
}
.por-disc-bloco__count {
  margin-left: auto;
  font-size: 10px; font-weight: 600; color: #6366F1;
  background: #EEF2FF; padding: 2px 8px; border-radius: 999px;
  text-transform: uppercase; letter-spacing: 0.04em;
}
.por-disc-bloco__normas {
  list-style: none; margin: 0; padding: 0;
  display: flex; flex-direction: column; gap: 8px;
}
.por-disc-norma {
  display: flex; flex-direction: column; gap: 4px;
  padding: 8px 10px; background: #fafaf8; border-radius: 8px;
  border-left: 2px solid #C7D2FE;
}
.por-disc-norma__titulo {
  font-size: 12px; color: #1a1a2e;
}
.por-disc-norma__linha {
  display: flex; flex-wrap: wrap; gap: 4px; align-items: center;
  font-size: 11px;
}
.por-disc-norma__label {
  color: #94A3B8; min-width: 80px; font-size: 10px;
  text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600;
}
.por-disc-norma__tag {
  background: #F1F5F9; color: #475569;
  padding: 1px 6px; border-radius: 4px; font-size: 10px;
}
.por-disc-norma__tag--sub { background: #FAF5FF; color: #6B21A8; }
.por-disc-norma__tag--disp { background: #DBEAFE; color: #1E40AF; font-weight: 600; }

.btn-primary {
  display: flex; align-items: center; gap: 6px;
  font-family: inherit; font-size: 13px; font-weight: 600;
  background: #534AB7; color: #fff; border: none; border-radius: 8px;
  padding: 8px 16px; cursor: pointer; transition: background 0.15s;
}
.btn-primary:hover:not(:disabled) { background: #3C3489; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-outline {
  display: flex; align-items: center; gap: 6px;
  font-family: inherit; font-size: 13px; font-weight: 500;
  background: #fff; color: #444; border: 1px solid #ddd; border-radius: 8px;
  padding: 7px 14px; cursor: pointer; transition: background 0.15s;
}
.btn-outline:hover:not(:disabled) { background: #f5f4f0; }
.btn-outline:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-sm {
  display: flex; align-items: center; gap: 4px;
  font-family: inherit; font-size: 11px; font-weight: 600;
  padding: 6px 12px; border: 1px solid #C7D2FE; border-radius: 6px;
  background: #fff; color: #4338CA; cursor: pointer; transition: all 0.15s;
  width: max-content;
}
.btn-sm:hover { background: #EEF2FF; }

.spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>
