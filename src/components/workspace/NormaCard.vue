<template>
  <div class="norma-card" :class="`norma-card--${norma.status}`">
    <!-- Header -->
    <div class="norma-card__header">
      <div class="norma-card__title">
        <component :is="iconStatus" :size="14" :class="`norma-card__icon norma-card__icon--${norma.status}`" />
        <strong>{{ norma.nomeOriginal }}</strong>
      </div>
      <span class="norma-card__badge" :class="`norma-card__badge--${norma.status}`">
        {{ labelStatus }}
      </span>
    </div>

    <!-- Vinculação atual (confirmada / sugerida / obsoleta) -->
    <div
      v-if="['confirmada', 'sugerida', 'confirmada_obsoleta'].includes(norma.status) && norma.lawTitle"
      class="norma-card__vinculada"
      :class="`norma-card__vinculada--${norma.status}`"
    >
      <div class="norma-card__vinc-header">
        <span class="norma-card__vinc-label">{{ labelVinculo }}</span>
        <strong class="norma-card__vinc-title">{{ norma.lawTitle }}</strong>
      </div>
      <p v-if="norma.lawSubtitle" class="norma-card__vinc-subtitle">{{ norma.lawSubtitle }}</p>

      <div class="norma-card__actions">
        <button
          v-if="norma.status === 'sugerida'"
          class="btn-sm btn-sm--accent"
          :disabled="loading"
          @click="$emit('confirmar', norma)"
        >
          <Check :size="12" /> Confirmar
        </button>
        <button class="btn-sm" :disabled="loading" @click="$emit('buscar-manual', norma)">
          <Search :size="12" /> Trocar
        </button>
        <button v-if="norma.status === 'confirmada' || norma.status === 'confirmada_obsoleta'"
                class="btn-sm btn-sm--ghost"
                :disabled="loading"
                @click="$emit('desvincular', norma)">
          <X :size="12" /> Desvincular
        </button>
      </div>
    </div>

    <!-- Múltiplos candidatos (ambígua) -->
    <div v-if="norma.status === 'ambigua' && norma.candidatos?.length" class="norma-card__candidatos">
      <div class="norma-card__cand-label">Candidatos — escolha um:</div>
      <button
        v-for="c in norma.candidatos.slice(0, 3)"
        :key="c.id"
        class="norma-card__cand"
        :disabled="loading"
        @click="$emit('vincular', { norma, lawId: c.id })"
      >
        <div class="norma-card__cand-title">{{ c.title }}</div>
        <div v-if="c.subtitle" class="norma-card__cand-subtitle">{{ c.subtitle }}</div>
        <div class="norma-card__cand-meta">
          <span v-if="c.tipo">{{ c.tipo }}</span>
          <span v-if="c.ente">{{ c.ente }}</span>
          <span v-if="c.estado">{{ c.estado }}</span>
          <span class="norma-card__cand-score">score {{ c.score?.toFixed(1) }}</span>
        </div>
      </button>
      <div v-if="norma.candidatos.length > 3" class="norma-card__cand-mais">
        + {{ norma.candidatos.length - 3 }} outros candidatos
      </div>
      <div class="norma-card__actions">
        <button class="btn-sm" :disabled="loading" @click="$emit('buscar-manual', norma)">
          <Search :size="12" /> Buscar manualmente
        </button>
        <button class="btn-sm btn-sm--ghost" :disabled="loading" @click="$emit('mudar-status', { norma, status: 'pendente' })">
          <Pause :size="12" /> Marcar pendente
        </button>
      </div>
    </div>

    <!-- Sem candidatos -->
    <div v-if="norma.status === 'nao_encontrada'" class="norma-card__vazio">
      <p>Sem correspondência no índice de normas.</p>
      <div class="norma-card__actions">
        <button class="btn-sm" :disabled="loading" @click="$emit('buscar-manual', norma)">
          <Search :size="12" /> Buscar manualmente
        </button>
        <button class="btn-sm btn-sm--ghost" :disabled="loading" @click="$emit('mudar-status', { norma, status: 'pendente' })">
          <Pause :size="12" /> Marcar pendente
        </button>
      </div>
    </div>

    <!-- Pendente -->
    <div v-if="norma.status === 'pendente'" class="norma-card__pendente">
      <p>Aguardando cadastro externo.</p>
      <div class="norma-card__actions">
        <button class="btn-sm" :disabled="loading" @click="$emit('buscar-manual', norma)">
          <Search :size="12" /> Tentar buscar
        </button>
      </div>
    </div>

    <!-- Bloco "Abarca" (todas as ocorrências da norma no edital) -->
    <details v-if="norma.abarca?.length" class="norma-card__abarca">
      <summary class="norma-card__abarca-summary">
        <ChevronDown :size="12" />
        <span>Abarca {{ resumoAbarca }}</span>
      </summary>
      <div class="norma-card__abarca-body">
        <div v-for="(b, i) in norma.abarca" :key="i" class="norma-card__abarca-bloco">
          <div class="norma-card__abarca-disc"><BookOpen :size="11" /> {{ b.disciplina }}</div>
          <div v-if="b.assuntos?.length" class="norma-card__abarca-line">
            <span class="norma-card__abarca-label">Assuntos:</span>
            <span v-for="a in b.assuntos" :key="a" class="norma-card__abarca-tag">{{ a }}</span>
          </div>
          <div v-if="b.sub_assuntos?.length" class="norma-card__abarca-line">
            <span class="norma-card__abarca-label">Sub-assuntos:</span>
            <span v-for="s in b.sub_assuntos" :key="s" class="norma-card__abarca-tag norma-card__abarca-tag--sub">{{ s }}</span>
          </div>
          <div v-if="b.dispositivos?.length" class="norma-card__abarca-line">
            <span class="norma-card__abarca-label">Dispositivos:</span>
            <span v-for="d in b.dispositivos" :key="d" class="norma-card__abarca-tag norma-card__abarca-tag--disp">{{ d }}</span>
          </div>
        </div>
      </div>
    </details>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  Check, X, Search, Pause, BookOpen, ChevronDown,
  AlertTriangle, CheckCircle, Info, HelpCircle,
} from 'lucide-vue-next'

const props = defineProps({
  norma: { type: Object, required: true },
  loading: { type: Boolean, default: false },
})

defineEmits(['confirmar', 'desvincular', 'vincular', 'mudar-status', 'buscar-manual'])

const STATUS_MAP = {
  confirmada:           { label: 'Confirmada',         icon: CheckCircle,   vincLabel: 'Vinculada a:' },
  confirmada_obsoleta:  { label: 'Conferir',           icon: AlertTriangle, vincLabel: 'Confirmada anteriormente — verifique se ainda se aplica:' },
  sugerida:             { label: 'Sugerida',           icon: CheckCircle,   vincLabel: 'Sugerida:' },
  ambigua:              { label: 'Ambígua',            icon: HelpCircle,    vincLabel: '' },
  pendente:             { label: 'Pendente',           icon: Info,          vincLabel: '' },
  nao_encontrada:       { label: 'Sem correspondência', icon: AlertTriangle, vincLabel: '' },
}

const labelStatus = computed(() => STATUS_MAP[props.norma.status]?.label || props.norma.status)
const iconStatus = computed(() => STATUS_MAP[props.norma.status]?.icon || Info)
const labelVinculo = computed(() => STATUS_MAP[props.norma.status]?.vincLabel || '')

const resumoAbarca = computed(() => {
  const blocos = props.norma.abarca || []
  if (!blocos.length) return ''
  const totalAss = blocos.reduce((acc, b) => acc + (b.assuntos?.length || 0), 0)
  const totalSub = blocos.reduce((acc, b) => acc + (b.sub_assuntos?.length || 0), 0)
  const partes = [`${blocos.length} disciplina${blocos.length > 1 ? 's' : ''}`]
  if (totalAss) partes.push(`${totalAss} assunto${totalAss > 1 ? 's' : ''}`)
  if (totalSub) partes.push(`${totalSub} sub-assunto${totalSub > 1 ? 's' : ''}`)
  return partes.join(', ')
})
</script>

<style scoped>
.norma-card {
  border: 1px solid #ebe9e4;
  border-radius: 12px;
  background: #fff;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: border-color 0.15s;
  font-family: 'DM Sans', sans-serif;
}

.norma-card--confirmada { border-left: 3px solid #16A34A; }
.norma-card--sugerida   { border-left: 3px solid #65A30D; }
.norma-card--ambigua    { border-left: 3px solid #D97706; }
.norma-card--pendente   { border-left: 3px solid #6B7280; }
.norma-card--nao_encontrada { border-left: 3px solid #DC2626; }
.norma-card--confirmada_obsoleta { border-left: 3px solid #EA580C; background: #FFFBEB; }

.norma-card__header {
  display: flex; justify-content: space-between; align-items: center; gap: 12px;
}
.norma-card__title {
  display: flex; align-items: center; gap: 6px;
  font-size: 13px; color: #1a1a2e;
}
.norma-card__icon--confirmada { color: #16A34A; }
.norma-card__icon--sugerida { color: #65A30D; }
.norma-card__icon--ambigua { color: #D97706; }
.norma-card__icon--pendente { color: #6B7280; }
.norma-card__icon--nao_encontrada { color: #DC2626; }
.norma-card__icon--confirmada_obsoleta { color: #EA580C; }

.norma-card__badge {
  font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 999px;
  text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap;
}
.norma-card__badge--confirmada { background: #F0FDF4; color: #16A34A; }
.norma-card__badge--sugerida   { background: #ECFCCB; color: #65A30D; }
.norma-card__badge--ambigua    { background: #FFFBEB; color: #B45309; }
.norma-card__badge--pendente   { background: #F3F4F6; color: #6B7280; }
.norma-card__badge--nao_encontrada { background: #FEF2F2; color: #DC2626; }
.norma-card__badge--confirmada_obsoleta { background: #FFEDD5; color: #C2410C; }

.norma-card__vinculada {
  background: #F8FAFC; border-radius: 8px; padding: 10px 12px;
}
.norma-card__vinculada--confirmada_obsoleta {
  background: #FFEDD5; border-left: 3px solid #EA580C;
}
.norma-card__vinc-header { display: flex; flex-direction: column; gap: 2px; }
.norma-card__vinc-label { font-size: 11px; color: #64748B; }
.norma-card__vinc-title { font-size: 13px; color: #1a1a2e; }
.norma-card__vinc-subtitle {
  font-size: 11px; color: #64748B; margin: 4px 0 0;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}

.norma-card__candidatos { display: flex; flex-direction: column; gap: 6px; }
.norma-card__cand-label { font-size: 11px; color: #888; font-weight: 600; }
.norma-card__cand {
  display: flex; flex-direction: column; gap: 2px;
  border: 1px solid #ebe9e4; border-radius: 8px; padding: 8px 12px;
  background: #fff; font-family: inherit; cursor: pointer;
  text-align: left; transition: all 0.15s;
}
.norma-card__cand:hover:not(:disabled) {
  border-color: #534AB7; background: #F5F4FF; transform: translateY(-1px);
}
.norma-card__cand:disabled { opacity: 0.5; cursor: not-allowed; }
.norma-card__cand-title { font-size: 12px; font-weight: 600; color: #1a1a2e; }
.norma-card__cand-subtitle {
  font-size: 11px; color: #64748B;
  display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;
}
.norma-card__cand-meta {
  display: flex; gap: 8px; font-size: 10px; color: #94A3B8; margin-top: 2px;
}
.norma-card__cand-score { margin-left: auto; font-variant-numeric: tabular-nums; }
.norma-card__cand-mais { font-size: 11px; color: #94A3B8; padding-left: 12px; }

.norma-card__vazio, .norma-card__pendente {
  font-size: 12px; color: #64748B;
}
.norma-card__vazio p, .norma-card__pendente p { margin: 0 0 8px; }

.norma-card__actions { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; }

/* Bloco Abarca */
.norma-card__abarca { border-top: 1px dashed #ebe9e4; padding-top: 8px; margin-top: 4px; }
.norma-card__abarca-summary {
  display: flex; align-items: center; gap: 6px;
  font-size: 11px; color: #64748B; cursor: pointer; list-style: none; user-select: none;
}
.norma-card__abarca-summary::-webkit-details-marker { display: none; }
.norma-card__abarca[open] .norma-card__abarca-summary svg { transform: rotate(0deg); }
.norma-card__abarca:not([open]) .norma-card__abarca-summary svg { transform: rotate(-90deg); }
.norma-card__abarca-summary svg { transition: transform 0.2s; }
.norma-card__abarca-body {
  margin-top: 8px; display: flex; flex-direction: column; gap: 8px;
  padding: 8px 12px; background: #fafaf8; border-radius: 8px;
}
.norma-card__abarca-bloco {
  display: flex; flex-direction: column; gap: 4px;
  padding-bottom: 8px; border-bottom: 1px dotted #ebe9e4;
}
.norma-card__abarca-bloco:last-child { border-bottom: none; padding-bottom: 0; }
.norma-card__abarca-disc {
  display: flex; align-items: center; gap: 4px;
  font-size: 12px; font-weight: 600; color: #1a1a2e;
}
.norma-card__abarca-line {
  display: flex; flex-wrap: wrap; gap: 4px; align-items: center; font-size: 11px;
}
.norma-card__abarca-label { color: #94A3B8; min-width: 80px; }
.norma-card__abarca-tag {
  background: #F1F5F9; color: #475569;
  padding: 1px 6px; border-radius: 4px; font-size: 10px;
}
.norma-card__abarca-tag--sub { background: #FAF5FF; color: #6B21A8; }
.norma-card__abarca-tag--disp { background: #EEF2FF; color: #4338CA; font-weight: 600; }

/* Botões compartilhados */
.btn-sm {
  display: flex; align-items: center; gap: 4px;
  font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 600;
  padding: 4px 10px; border: 1px solid #ddd; border-radius: 6px;
  background: #fff; color: #444; cursor: pointer; transition: background 0.15s;
}
.btn-sm:hover:not(:disabled) { background: #f5f4f0; }
.btn-sm:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-sm--accent { background: #16A34A; color: #fff; border-color: #16A34A; }
.btn-sm--accent:hover:not(:disabled) { background: #15803D; }
.btn-sm--ghost { border-color: transparent; color: #64748B; }
.btn-sm--ghost:hover:not(:disabled) { background: #F1F5F9; color: #1a1a2e; }
</style>
