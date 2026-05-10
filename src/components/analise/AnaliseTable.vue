<template>
  <div class="analise-table-wrap">
    <!-- Breadcrumb -->
    <nav v-if="breadcrumb.length > 0" class="breadcrumb" aria-label="Navegação">
      <template v-for="(crumb, i) in breadcrumb" :key="crumb.level">
        <button
          type="button"
          class="breadcrumb__crumb"
          :class="{ 'breadcrumb__crumb--current': i === breadcrumb.length - 1 }"
          :disabled="i === breadcrumb.length - 1"
          :aria-current="i === breadcrumb.length - 1 ? 'page' : undefined"
          @click="$emit('breadcrumb-go', crumb.level)"
        >
          {{ crumb.label }}
        </button>
        <span v-if="i < breadcrumb.length - 1" class="breadcrumb__sep">/</span>
      </template>
      <span v-if="granularidadeLabel" class="breadcrumb__suffix">({{ granularidadeLabel }})</span>
    </nav>

    <!-- Tabela -->
    <div class="table-scroll">
      <table class="dense-table">
        <thead>
          <tr>
            <th v-if="isExpandableMode" class="th-expand" aria-label="Expandir"></th>
            <th class="th-check">
              <input
                type="checkbox"
                :checked="allOnPageSelected"
                :indeterminate.prop="someOnPageSelected && !allOnPageSelected"
                aria-label="Selecionar todos da página"
                @change="toggleAllOnPage($event.target.checked)"
              />
            </th>
            <th
              v-for="col in COLS"
              :key="col.key"
              class="th-sortable"
              :class="{ 'th-num': col.numeric, 'th-active': sort === col.key }"
              :aria-sort="sort === col.key ? (dir === 'desc' ? 'descending' : 'ascending') : 'none'"
              scope="col"
              @click="onSort(col.key)"
            >
              <span class="th-label">{{ col.label }}</span>
              <span v-if="sort === col.key" class="th-arrow" aria-hidden="true">{{ dir === 'desc' ? '↓' : '↑' }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="pagedItems.length === 0">
            <td :colspan="totalColspan" class="empty-row">
              <slot name="empty">Nenhum item.</slot>
            </td>
          </tr>
          <template v-for="item in pagedItems" :key="item.caminhoCompleto">
            <tr
              class="row"
              :class="{
                'row--selected': isSelected(item),
                'row--clickable': isDrillable(item),
              }"
              @click="onRowClick(item, $event)"
            >
              <td v-if="isExpandableMode" class="td-expand" @click.stop>
                <button
                  v-if="hasSubs(item)"
                  type="button"
                  class="chevron-btn"
                  :aria-expanded="expandedAssuntos.has(item.caminhoCompleto)"
                  :aria-label="(expandedAssuntos.has(item.caminhoCompleto) ? 'Colapsar' : 'Expandir') + ' sub-assuntos de ' + item.nome"
                  @click="toggleExpand(item)"
                >{{ expandedAssuntos.has(item.caminhoCompleto) ? '▾' : '▸' }}</button>
                <span v-else class="chevron-empty" aria-hidden="true"></span>
              </td>
              <td class="td-check" @click.stop>
                <input
                  type="checkbox"
                  :checked="isSelected(item)"
                  :aria-label="`Selecionar ${item.nome}`"
                  @change="toggleOne(item, $event.target.checked)"
                />
              </td>
              <td class="td-nome">
                <span class="nome">{{ item.nome }}</span>
                <span
                  v-if="item.boostedBy.length"
                  class="boost-badge"
                  :title="`Inclui dados de: ${item.boostedBy.join(', ')}`"
                >+{{ item.boostedBy.length }} {{ item.boostedBy.length === 1 ? 'banca' : 'bancas' }}</span>
              </td>
              <td class="td-num">{{ pctFormat(item.recorrencia) }}</td>
              <td v-if="hasRecenciaCol" class="td-num">
                <span v-if="item.recencia != null" :title="recenciaTooltip(item)">
                  {{ pctFormat(item.recencia) }}
                </span>
                <span v-else class="trend-empty">—</span>
              </td>
              <td class="td-num">{{ numFormat(item.volumeMedio, 1) }}</td>
              <td class="td-num">{{ item.volumeTotal }}</td>
              <td class="td-num">
                <span
                  :class="{ 'pct-warn': isPctAggregateWarn(item) }"
                  :title="isPctAggregateWarn(item) ? PCT_WARN_TOOLTIP : ''"
                >
                  {{ pctFormat(item.pctMedio) }}
                </span>
              </td>
              <td class="td-num td-trend">
                <template v-if="showTrend(item)">
                  <span class="trend-cell" :title="trendTooltip(item)">
                    <span class="trend-icon" :class="trendIconClass(item)">{{ trendIcon(item) }}</span>
                    <span class="trend-val">{{ slopeFormat(item.slope) }}</span>
                  </span>
                </template>
                <span v-else class="trend-empty">—</span>
              </td>
            </tr>
            <!-- Linhas de sub-assuntos (modo expandível, quando expandido) -->
            <tr
              v-for="sub in expandedSubsFor(item)"
              :key="sub.caminhoCompleto"
              class="row row--sub"
              :class="{ 'row--sub-highlight': sub.passesPreset }"
            >
              <td class="td-expand"></td>
              <td class="td-check"></td>
              <td class="td-nome td-nome--sub">{{ sub.nome }}</td>
              <td class="td-num">{{ pctFormat(sub.recorrencia) }}</td>
              <td v-if="hasRecenciaCol" class="td-num">
                <span v-if="sub.recencia != null" :title="recenciaTooltip(sub)">
                  {{ pctFormat(sub.recencia) }}
                </span>
                <span v-else class="trend-empty">—</span>
              </td>
              <td class="td-num">{{ numFormat(sub.volumeMedio, 1) }}</td>
              <td class="td-num">{{ sub.volumeTotal }}</td>
              <td class="td-num">{{ pctFormat(sub.pctMedio) }}</td>
              <td class="td-num td-trend">
                <span v-if="sub.slope != null">{{ slopeFormat(sub.slope) }}</span>
                <span v-else class="trend-empty">—</span>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <!-- Paginação -->
    <Pagination
      v-if="items.length > 0"
      :current-page="page"
      :total-pages="totalPages"
      :total="items.length"
      :per-page="perPage"
      :per-page-options="PER_PAGE_OPTIONS"
      @update:current-page="$emit('update:page', $event)"
      @update:per-page="$emit('update:perPage', $event)"
    />
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import Pagination from '@/components/common/Pagination.vue'
import { isTendenciaConfiavel } from '@/utils/recurrenceAnalysis'
import { PER_PAGE_OPTIONS, DEFAULT_PER_PAGE } from './constants'

const props = defineProps({
  items: { type: Array, default: () => [] },
  anos: { type: Array, default: () => [] },
  granularidade: { type: String, default: 'assunto' },
  sort: { type: String, default: 'recorrencia' },
  dir: { type: String, default: 'desc' },
  page: { type: Number, default: 1 },
  perPage: { type: Number, default: DEFAULT_PER_PAGE },
  presetName: { type: String, default: 'moderado' },
  breadcrumb: { type: Array, default: () => [] }, // [{ label, level }]
  selectedKeys: { type: Array, default: () => [] },
  // Map<assuntoNome, Item[]> — quando populado, ativa modo expandível
  // Subs trazem flag `passesPreset` (calculada na view) pra destaque visual.
  subsByAssunto: { type: Object, default: () => new Map() },
})

const emit = defineEmits([
  'update:sort',
  'update:dir',
  'update:page',
  'update:perPage',
  'update:selectedKeys',
  'drill-down',
  'breadcrumb-go',
])

const ALL_COLS = [
  { key: 'nome', label: 'Nome', numeric: false },
  { key: 'recorrencia', label: 'Recorrência', numeric: true },
  { key: 'recencia', label: 'Recência', numeric: true, requiresRecencia: true },
  { key: 'volumeMedio', label: 'Vol/ano', numeric: true },
  { key: 'volumeTotal', label: 'Vol total', numeric: true },
  { key: 'pctMedio', label: 'Pct', numeric: true },
  { key: 'slope', label: 'Tendência', numeric: true },
]

// Coluna Recência só aparece quando dataset tem >=3 anos (RECENT_WINDOW).
// Sem isso, recencia == recorrencia ou null — não agrega valor.
const hasRecenciaCol = computed(() => props.anos.length >= 3)
const COLS = computed(() => ALL_COLS.filter((c) => !c.requiresRecencia || hasRecenciaCol.value))

// Modo expandível ativa quando view passa subsByAssunto não-vazio (= filtro de disciplina ativo + gran=assunto)
const isExpandableMode = computed(
  () => props.subsByAssunto && props.subsByAssunto.size > 0,
)
const totalColspan = computed(
  () => COLS.value.length + 1 + (isExpandableMode.value ? 1 : 0),
)

const expandedAssuntos = ref(new Set())
function toggleExpand(item) {
  const next = new Set(expandedAssuntos.value)
  if (next.has(item.caminhoCompleto)) next.delete(item.caminhoCompleto)
  else next.add(item.caminhoCompleto)
  expandedAssuntos.value = next
}
function hasSubs(item) {
  if (!isExpandableMode.value) return false
  const subs = props.subsByAssunto.get(item.nome)
  return Array.isArray(subs) && subs.length > 0
}
function expandedSubsFor(item) {
  if (!isExpandableMode.value || !expandedAssuntos.value.has(item.caminhoCompleto)) return []
  return props.subsByAssunto.get(item.nome) || []
}

// Mudança real de subsByAssunto (troca de disciplina ou modo desativa) → reseta expansões.
// Comparar pela LISTA DE KEYS (nomes dos assuntos pais) — não pela reference do Map. O parent
// recria o Map a cada recompute (ex: quando user troca preset pra ver outro destaque),
// mesmo quando os assuntos são os mesmos. Resetar nesse caso colapsaria expansões à toa.
watch(
  () => Array.from(props.subsByAssunto.keys()).sort().join('|'),
  () => {
    expandedAssuntos.value = new Set()
  },
)

const granularidadeLabel = computed(() => {
  if (props.granularidade === 'disciplina') return 'Disciplinas'
  if (props.granularidade === 'assunto') return 'Assuntos'
  if (props.granularidade === 'sub_assunto') return 'Sub-assuntos'
  return ''
})

const totalPages = computed(() => Math.max(1, Math.ceil(props.items.length / props.perPage)))

const pagedItems = computed(() => {
  const start = (Math.min(props.page, totalPages.value) - 1) * props.perPage
  return props.items.slice(start, start + props.perPage)
})

const selectedSet = computed(() => new Set(props.selectedKeys))
const isSelected = (item) => selectedSet.value.has(item.caminhoCompleto)

const allOnPageSelected = computed(
  () => pagedItems.value.length > 0 && pagedItems.value.every(isSelected),
)
const someOnPageSelected = computed(() => pagedItems.value.some(isSelected))

function toggleOne(item, checked) {
  const next = new Set(props.selectedKeys)
  if (checked) next.add(item.caminhoCompleto)
  else next.delete(item.caminhoCompleto)
  emit('update:selectedKeys', [...next])
}

function toggleAllOnPage(checked) {
  const next = new Set(props.selectedKeys)
  for (const item of pagedItems.value) {
    if (checked) next.add(item.caminhoCompleto)
    else next.delete(item.caminhoCompleto)
  }
  emit('update:selectedKeys', [...next])
}

function onSort(key) {
  if (props.sort === key) {
    emit('update:dir', props.dir === 'desc' ? 'asc' : 'desc')
  } else {
    emit('update:sort', key)
    // Default: numéricas começam desc, nome começa asc
    const col = COLS.value.find((c) => c.key === key)
    emit('update:dir', col && col.numeric ? 'desc' : 'asc')
  }
}

function isDrillable(item) {
  return item.tipo === 'disciplina' || item.tipo === 'assunto'
}

function onRowClick(item, event) {
  // Garante que cliques em controles internos (checkbox) não disparam drill-down (já têm @click.stop nas cells)
  if (event.target.closest('.td-check')) return
  if (isDrillable(item)) {
    emit('drill-down', item)
  }
}

function showTrend(item) {
  return isTendenciaConfiavel(item, props.presetName)
}

function trendIcon(item) {
  const s = item.slope
  if (s == null) return ''
  if (s > 1.0) return '↑↑'
  if (s > 0) return '↑'
  if (s < -1.0) return '↓↓'
  if (s < 0) return '↓'
  return '→'
}

function trendIconClass(item) {
  const s = item.slope
  if (s == null) return 'trend-icon--neutral'
  if (s > 0) return 'trend-icon--up'
  if (s < 0) return 'trend-icon--down'
  return 'trend-icon--neutral'
}

function trendTooltip(item) {
  if (item.slope == null) return ''
  const r2Txt = item.r2 != null ? `R²=${item.r2.toFixed(2)}` : ''
  const yearByYear = props.anos
    .map((a) => {
      const d = item.porAno[a]
      return `${a}: ${d ? `${d.qtd}q (${d.pct.toFixed(1)}%)` : '—'}`
    })
    .join(' · ')
  return `${r2Txt} · ${item.n} anos · ${yearByYear}`
}

function pctFormat(v) {
  if (v == null) return '—'
  return `${Number(v).toFixed(1)}%`
}

function recenciaTooltip(item) {
  const anos = item.recenciaAnos || []
  const cobertos = anos.length > 0 ? anos.join(', ') : 'nenhum'
  return `${anos.length}/3 anos cobertos: ${cobertos}`
}

// Spec §6.2: warning visual quando soma de pct cross-banca passa de 50%. A condição
// é cross-banca (boostedBy não-vazio) + pctMedio > 50. Centralizada aqui pra não
// desincronizar a classe e o tooltip se a regra mudar.
const PCT_WARN_TOOLTIP = 'Soma de pct entre bancas — interpretação aproximada (cross-banca soma simples)'
function isPctAggregateWarn(item) {
  return item.boostedBy.length > 0 && item.pctMedio > 50
}

function numFormat(v, digits = 0) {
  if (v == null) return '—'
  return Number(v).toFixed(digits)
}

function slopeFormat(s) {
  if (s == null) return ''
  const sign = s > 0 ? '+' : ''
  return `${sign}${s.toFixed(2)}`
}
</script>

<style scoped>
.analise-table-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Breadcrumb */
.breadcrumb {
  display: flex; align-items: center; flex-wrap: wrap; gap: 4px;
  font-size: 12px;
}
.breadcrumb__crumb {
  background: transparent; border: none; padding: 4px 6px;
  font-family: 'DM Sans', sans-serif; font-size: 12px;
  color: #534AB7; cursor: pointer; border-radius: 4px;
}
.breadcrumb__crumb:hover:not(:disabled) { background: #EEF2FF; }
.breadcrumb__crumb--current { color: #1a1a2e; font-weight: 600; cursor: default; }
.breadcrumb__sep { color: #aaa; }
.breadcrumb__suffix { color: #888; margin-left: 6px; }

/* Tabela */
.table-scroll {
  overflow-x: auto;
  border: 1px solid #ebe9e4;
  border-radius: 12px;
  background: #fff;
}
.dense-table {
  width: 100%;
  border-collapse: collapse;
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.dense-table thead th {
  position: sticky;
  top: 0;
  background: #fafaf7;
  z-index: 2;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 10px;
  color: #666;
  padding: 8px 10px;
  border-bottom: 1px solid #ebe9e4;
  text-align: left;
  white-space: nowrap;
}

.th-num { text-align: right; }
.th-sortable { cursor: pointer; user-select: none; }
.th-sortable:hover { background: #f0efea; color: #1a1a2e; }
.th-active { color: #534AB7; }
.th-arrow { margin-left: 4px; }
.th-check { width: 32px; }

.dense-table tbody tr {
  height: 32px;
  border-bottom: 1px solid #f5f4f0;
  transition: background 0.1s;
}
.dense-table tbody tr:last-child { border-bottom: none; }
.row:hover { background: #fafaf7; }
.row--clickable { cursor: pointer; }
.row--selected { background: #EEF2FF; }
.row--selected:hover { background: #DDE2FF; }

.dense-table td { padding: 6px 10px; color: #1a1a2e; }
.td-num { text-align: right; }
.td-check { text-align: center; width: 32px; padding: 6px 4px; }
.td-trend { min-width: 90px; }
.td-nome { max-width: 380px; }
.nome { font-weight: 500; }

/* Boost badge */
.boost-badge {
  display: inline-block; margin-left: 8px;
  font-size: 10px; font-weight: 600;
  padding: 1px 6px; border-radius: 8px;
  background: #FEF7E6; color: #7A4A0F;
  cursor: help;
}

/* Pct warning quando ultrapassa 50% (cross-banca soma ingênua) */
.pct-warn {
  background: #FEF3C7;
  padding: 1px 4px;
  border-radius: 3px;
  color: #92400E;
}

/* Tendência */
.trend-cell { display: inline-flex; align-items: center; gap: 4px; cursor: help; }
.trend-icon { font-weight: 700; }
.trend-icon--up { color: #16A34A; }
.trend-icon--down { color: #DC2626; }
.trend-icon--neutral { color: #888; }
.trend-val { font-weight: 600; }
.trend-empty { color: #ccc; }

.empty-row {
  text-align: center;
  color: #aaa;
  padding: 24px !important;
  font-style: italic;
}

/* Modo expandível: chevron + linhas dos sub-assuntos */
.th-expand { width: 28px; padding: 8px 4px !important; }
.td-expand { width: 28px; text-align: center; padding: 0 4px; }
.chevron-btn {
  background: transparent; border: none; cursor: pointer;
  font-size: 12px; color: #666; padding: 4px 6px;
  border-radius: 4px; line-height: 1;
}
.chevron-btn:hover { background: #f0efea; color: #534AB7; }
.chevron-empty { display: inline-block; width: 16px; }

.row--sub { background: #fafaf7; height: 28px; }
.row--sub:hover { background: #f0efea; }
.row--sub-highlight { background: #EEF2FF; font-weight: 500; color: #1a1a2e; }
.row--sub-highlight:hover { background: #DDE2FF; }
/* Subs não-destacados: cinza médio (não muito claro pra preservar legibilidade WCAG AA) */
.row--sub:not(.row--sub-highlight) { color: #555; }
/* Em sub muted, .trend-empty default `#ccc` quase desaparece contra bg `#fafaf7`.
   Subir contraste local pra mínimo 3:1 (segue a row, não o estilo solto da tabela principal). */
.row--sub:not(.row--sub-highlight) .trend-empty { color: #888; }
.td-nome--sub { padding-left: 28px !important; font-size: 11px; }
</style>
