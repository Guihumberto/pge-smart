<template>
  <Teleport to="body">
  <div class="modal-overlay" @click.self="handleClose">
    <div ref="modalEl" class="modal" role="dialog" aria-labelledby="tg-title" aria-modal="true" tabindex="-1">
      <!-- Header -->
      <div class="modal__header">
        <div>
          <h3 id="tg-title" class="modal__title">{{ title || 'Criar tarefas' }}</h3>
          <p v-if="subtitle" class="modal__subtitle">{{ subtitle }}</p>
        </div>
        <button class="modal__close" :disabled="saving" @click="handleClose"><X :size="16" /></button>
      </div>

      <!-- Stepper -->
      <ol class="stepper" aria-label="Etapas da criação de tarefas">
        <li
          :class="['step', { 'step--active': step === 1, 'step--done': step > 1 }]"
          :aria-current="step === 1 ? 'step' : undefined"
        >
          <span class="step__num" aria-hidden="true">1</span>
          <span>Plano destino</span>
        </li>
        <span class="step__divider" aria-hidden="true" />
        <li
          :class="['step', { 'step--active': step === 2, 'step--done': step > 2 }]"
          :aria-current="step === 2 ? 'step' : undefined"
        >
          <span class="step__num" aria-hidden="true">2</span>
          <span>Assuntos</span>
        </li>
        <span class="step__divider" aria-hidden="true" />
        <li
          :class="['step', { 'step--active': step === 3 }]"
          :aria-current="step === 3 ? 'step' : undefined"
        >
          <span class="step__num" aria-hidden="true">3</span>
          <span>Configurar</span>
        </li>
      </ol>

      <!-- Step 1: plan picker -->
      <div v-if="step === 1" class="step-body">
        <PlanPickerOrCreate
          :plans="planStore.plans"
          @change="onPlanChange"
        />
      </div>

      <!-- Step 2: seleção de assuntos -->
      <div v-else-if="step === 2" class="step-body">
        <p class="step-hint">
          Selecione os assuntos que vão virar tarefas neste plano.
          <span v-if="candidates.length">
            ({{ candidates.length }} disponíveis)
          </span>
        </p>
        <AssuntoCandidateList
          v-model="selecionados"
          :candidates="candidates"
          :disabled="saving"
        />
      </div>

      <!-- Step 3: configuração default -->
      <div v-else-if="step === 3" class="step-body">
        <div class="field">
          <label class="field__label">Tipo padrão das tarefas</label>
          <TaskTypeSelector v-model="defaultType" :disabled="saving" />
          <p class="hint hint--muted">
            Cada assunto vira uma tarefa deste tipo. Você poderá editar depois no workspace.
          </p>
        </div>

        <div class="field">
          <label class="field__label">Carga padrão (horas, opcional)</label>
          <input
            v-model.number="defaultCargaHoras"
            type="number" min="0" step="0.5"
            class="field__input"
            placeholder="Usa carga sugerida do assunto se vazio"
            :disabled="saving"
          />
        </div>

        <div class="field">
          <label class="field__label">Carga máxima por tarefa (horas, opcional)</label>
          <input
            v-model.number="tetoCargaHoras"
            type="number" min="0" step="0.5"
            class="field__input"
            placeholder="Ex: 2 — assunto de 4h vira 2 tarefas de 2h"
            :disabled="saving"
          />
          <p v-if="avisoTetoBaixo" class="hint hint--warn">
            Teto muito baixo (&lt; 15min). Confirma?
          </p>
          <p v-else-if="tetoAtivo && totalFatias > selecionados.length" class="hint hint--info">
            {{ selecionados.length }} assunto(s) → {{ totalFatias }} tarefa(s)
            (com fatias parte 1/N)
          </p>
          <p v-else-if="tetoSemEfeito" class="hint hint--muted">
            Nenhum assunto excede o limite — nada será fatiado.
          </p>
          <p v-else class="hint hint--muted">
            Se a carga (sugerida ou definida acima) excede o máximo,
            vira várias tarefas ("parte 1/3", "parte 2/3"...).
          </p>
          <p v-if="avisoMuitasTarefas" class="hint hint--warn">
            {{ totalFatias }} tarefas vão ser criadas — revise antes de confirmar.
          </p>
        </div>

        <!-- Preview -->
        <div class="preview">
          <div class="preview__title">Resumo</div>
          <ul class="preview__list">
            <li>
              <strong>Plano:</strong>
              {{ planMode === 'select' ? planSelectedLabel : `Novo: "${planNewTitle}"` }}
            </li>
            <li>
              <strong>Tarefas a criar:</strong>
              {{ totalFatias }}
              <span v-if="totalFatias > selecionados.length" class="preview__muted">
                (de {{ selecionados.length }} assuntos, fatiados)
              </span>
            </li>
            <li><strong>Tipo:</strong> {{ typeLabel(defaultType) }}</li>
            <li v-if="defaultCargaHoras"><strong>Carga padrão:</strong> {{ defaultCargaHoras }}h</li>
            <li v-if="tetoAtivo"><strong>Máx por tarefa:</strong> {{ tetoCargaHoras }}h</li>
          </ul>
        </div>
      </div>

      <!-- Footer -->
      <div class="modal__footer">
        <button
          v-if="step > 1"
          class="btn-ghost"
          :disabled="saving"
          @click="step--"
        >Voltar</button>
        <div class="modal__footer-spacer" />
        <button class="btn-ghost" :disabled="saving" @click="handleClose">Cancelar</button>
        <button
          v-if="step < 3"
          class="btn-primary"
          :disabled="!canAdvance"
          @click="step++"
        >Avançar</button>
        <button
          v-else
          class="btn-primary"
          :disabled="!canConfirm || saving"
          @click="confirmar"
        >{{ saving ? 'Criando...' : (totalFatias > 0 ? `Criar ${totalFatias} tarefa(s)` : 'Criar tarefas') }}</button>
      </div>
    </div>
  </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { X } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import PlanPickerOrCreate from './PlanPickerOrCreate.vue'
import AssuntoCandidateList from './AssuntoCandidateList.vue'
import TaskTypeSelector from './TaskTypeSelector.vue'
import { usePlanStore } from '@/stores/usePlanStore'
import { useTaskStore } from '@/stores/useTaskStore'
import { taskService } from '@/services/task.service'

const props = defineProps({
  /**
   * Lista de candidatos no shape uniforme `AssuntoCandidate`.
   * O caller (CargoConteudoView, EstatisticasView) deve converter sua fonte
   * via adapter antes de passar.
   */
  candidates:    { type: Array,  required: true },
  /** Disciplina destino — ou `id` (preferencial) ou `name` (cria-se-não-existe). */
  disciplineId:   { type: String, default: null },
  disciplineName: { type: String, default: null },
  /** Contexto de plano novo (preenche `banca`/`area` quando criado pelo Foco). */
  contextoPlano: { type: Object, default: () => ({}) },
  /** Metadados de origem que vão em cada task (`origem`, `cargoOrigem`, etc.). */
  origem:        { type: String, default: 'manual' },
  origemDados:   { type: Object, default: null },
  /** Tipo default das tarefas (chip pré-selecionado no step 3). */
  defaultTaskType: { type: String, default: 'lei_seca' },
  /** Texto do modal. */
  title:    { type: String, default: '' },
  subtitle: { type: String, default: '' },
})

const emit = defineEmits([
  'close',
  /**
   * Emitido em 2 cenários:
   *  - Sucesso total: `{ planId, tasks: Task[], partial?: undefined }`
   *  - Sucesso parcial (plano criado mas bulk falhou): `{ planId, tasks: [], partial: true }`
   *
   * Falha total (sem criar plano) NÃO emite `created` — caller só recebe toast.
   * Quando `partial: true`, caller deveria navegar pro workspace do plano pra mentor
   * continuar manual em vez de tentar do zero.
   */
  'created',
])

const planStore = usePlanStore()
const taskStore = useTaskStore()
const step = ref(1)
const saving = ref(false)
const modalEl = ref(null)

// ESC fecha o modal (respeitando saving)
function onKeydown(e) {
  if (e.key === 'Escape') handleClose()
}
onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  // Foco inicial dentro do modal pra navegação por teclado/leitor de tela
  // funcionar. Tenta primeiro input/select/button focável; cai pro container.
  setTimeout(() => {
    const focusable = modalEl.value?.querySelector(
      'input:not([disabled]), select:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
    ;(focusable || modalEl.value)?.focus()
  }, 0)
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

// Step 1 state
const planMode = ref('select')
const planSelectedId = ref('')
const planNewTitle = ref('')
const planConflict = ref(null)

function onPlanChange(payload) {
  planMode.value = payload.mode
  if (payload.mode === 'select') {
    planSelectedId.value = payload.planId || ''
    planNewTitle.value = ''
    planConflict.value = null
  } else {
    planNewTitle.value = payload.title || ''
    planConflict.value = payload.conflict
  }
}

const planSelectedLabel = computed(() => {
  const p = planStore.plans.find(x => x.id === planSelectedId.value)
  return p ? p.title : '—'
})

// Step 2 state
const selecionados = ref([])
// Se o caller trocar a lista de candidates (ex.: usuário muda filtro no Foco
// e reabre o modal sem desmontar), reseta a seleção pra evitar estado fantasma.
watch(() => props.candidates, () => { selecionados.value = [] })

// Step 3 state
const defaultType = ref(props.defaultTaskType)
const defaultCargaHoras = ref(null)
const tetoCargaHoras = ref(null) // se setado, fatia assuntos com carga maior em múltiplas tarefas

const tetoAtivo = computed(() => {
  const t = Number(tetoCargaHoras.value)
  return Number.isFinite(t) && t > 0
})

// Preview do total real de tarefas (considerando fatiamento)
const totalFatias = computed(() => {
  if (!tetoAtivo.value) return selecionados.value.length
  return props.candidates
    .filter(c => selecionados.value.includes(c.nome))
    .reduce((sum, c) => sum + planejarFatias(c).length, 0)
})

// Warnings de UX
const TETO_MIN_HORAS = 0.25      // 15min — abaixo disso é absurdo
const TETO_AVISO_TOTAL = 50      // bulk com >50 itens vale double-check

const avisoTetoBaixo = computed(() =>
  tetoAtivo.value && Number(tetoCargaHoras.value) < TETO_MIN_HORAS,
)
const avisoMuitasTarefas = computed(() =>
  totalFatias.value > TETO_AVISO_TOTAL,
)
const tetoSemEfeito = computed(() =>
  tetoAtivo.value && totalFatias.value === selecionados.value.length,
)

// Avanço entre passos
const canAdvance = computed(() => {
  if (step.value === 1) {
    if (planMode.value === 'select') return !!planSelectedId.value
    return !!planNewTitle.value.trim() && !planConflict.value
  }
  if (step.value === 2) return selecionados.value.length > 0
  return true
})
const canConfirm = computed(() => canAdvance.value && selecionados.value.length > 0)

const typeLabels = {
  lei_seca: 'Lei Seca', questoes: 'Questões', leitura_pdf: 'Leitura PDF',
  video: 'Vídeo', revisao: 'Revisão', outras: 'Outras',
}
function typeLabel(t) { return typeLabels[t] ?? t }

function handleClose() {
  if (saving.value) return
  emit('close')
}

async function resolverPlanoDestino() {
  if (planMode.value === 'select') {
    return { id: planSelectedId.value, criadoAgora: false }
  }
  // Cria plano novo com contexto. Filtra `title`/`description` do contextoPlano
  // pra eles não sobrescreverem o que o user digitou.
  const extra = { ...(props.contextoPlano || {}) }
  delete extra.title
  delete extra.description
  const plan = await planStore.createPlan(
    planNewTitle.value.trim(),
    '',
    extra,
    { silent: true }, // toast final é dado pelo modal, evita "Plano criado!" prematuro
  )
  return { id: plan.id, criadoAgora: true }
}

function buildItems(planId) {
  return props.candidates
    .filter(c => selecionados.value.includes(c.nome))
    .flatMap(c => {
      const fatias = planejarFatias(c)
      const total = fatias.length
      return fatias.map((cargaMins, idx) =>
        buildItemBase(c, cargaMins, total > 1 ? idx + 1 : null, total > 1 ? total : null),
      )
    })
}

/**
 * Decide quantas tarefas vão sair de um candidate e a carga (em minutos) de cada uma.
 * - Sem teto de carga: 1 tarefa com `cargaPraMinutos(c)` (pode ser null)
 * - Com teto: divide a carga total em fatias do tamanho do teto, última ≤ teto
 *   Ex: 5h com teto 2h → [2h, 2h, 1h]
 * - Se carga total é null/0 e tem teto: 1 tarefa (não fatia o que não conhece)
 */
function planejarFatias(c) {
  const cargaTotalMin = cargaPraMinutos(c)
  if (!tetoAtivo.value || !cargaTotalMin) return [cargaTotalMin]
  const tetoMin = Math.round(Number(tetoCargaHoras.value) * 60)
  if (cargaTotalMin <= tetoMin) return [cargaTotalMin]
  const fatias = []
  let restante = cargaTotalMin
  while (restante > 0) {
    fatias.push(Math.min(tetoMin, restante))
    restante -= tetoMin
  }
  return fatias
}

function buildItemBase(c, cargaMinutos, parteIdx, parteTotal) {
  const tituloFatia = parteIdx != null
    ? `${c.nome} (parte ${parteIdx}/${parteTotal})`
    : c.nome

  const item = {
    type: defaultType.value,
    title: tituloFatia,
    description: '',
    ...(props.disciplineId
      ? { disciplineId: props.disciplineId }
      : { disciplineName: props.disciplineName }),
    cargaMinutos,
    tipoFonte: c.tipoFonte ?? null,
    leisReferencia: c.leisReferencia ?? null,
    score: c.score ?? null,
    origem: props.origem,
    origemDados: {
      ...(props.origemDados || {}),
      assuntoOrigem: c.nome,
      ...(c.metadadosOrigem || {}),
      ...(parteIdx != null ? { fatiaIdx: parteIdx, fatiaTotal: parteTotal } : {}),
    },
  }
  // lawIdSugerido vira `lawSource` quando type é lei_seca; senão vai pro origemDados.
  if (c.lawIdSugerido) {
    if (defaultType.value === 'lei_seca') {
      item.lawSource = c.lawIdSugerido
    } else {
      item.origemDados.lawIdSugerido = c.lawIdSugerido
    }
  }
  return item
}

function cargaPraMinutos(c) {
  // Prioridade: override do modal (incluindo 0 explícito) → cargaSugerida → null.
  // `!= null` cuida de `undefined` E `null`; aceita 0 como valor consciente.
  const override = defaultCargaHoras.value
  const horas = (override != null && override !== '') ? override : (c.cargaSugerida ?? null)
  return horas != null ? Math.round(horas * 60) : null
}

async function confirmar() {
  if (!canConfirm.value || saving.value) return

  // Guard: disciplina destino obrigatória (defesa-em-profundidade)
  if (!props.disciplineId && !props.disciplineName) {
    toast.error('Disciplina destino obrigatória.')
    return
  }

  saving.value = true
  let planoCriadoAgora = null   // id do plano se criamos um novo (pra rollback)
  try {
    const { id: planId, criadoAgora } = await resolverPlanoDestino()
    if (criadoAgora) planoCriadoAgora = planId
    const items = buildItems(planId)
    const enviadas = items.length
    const { tasks, total } = await taskService.bulkCreateInPlan(planId, items)

    // Side-effect no store pra UI já refletir as novas tarefas sem refetch
    syncTaskStore(tasks)

    // Reconcilia: se backend retornou contagem diferente do enviado, alerta.
    // Acontece se algum item falhar silenciosamente (improvável com validate-
    // then-create, mas defensivo).
    const recebidas = Array.isArray(tasks) ? tasks.length : 0
    const reportado = typeof total === 'number' ? total : recebidas
    if (recebidas < enviadas) {
      toast.warning(
        `Esperava ${enviadas} tarefa(s), backend criou ${recebidas}.`,
        { description: 'Revise o workspace antes de continuar.' },
      )
    } else {
      toast.success(`${reportado} tarefa(s) criada(s).`)
    }
    emit('created', { planId, tasks })
    emit('close')
  } catch (err) {
    // Bulk falhou. Se acabamos de criar o plano, ele virou órfão — avisa o user
    // pra ele decidir (não deletamos automático pra preservar o trabalho de nomear).
    const msg = err.response?.data?.message || err.message || 'Erro ao criar tarefas.'
    if (planoCriadoAgora) {
      toast.error(
        `Plano criado, mas tarefas falharam. Abra "${planNewTitle.value}" no workspace pra continuar.`,
        { description: msg },
      )
      // emit `created` com tasks vazias pra parent saber que o plano nasceu
      emit('created', { planId: planoCriadoAgora, tasks: [], partial: true })
      emit('close')
    } else {
      // Erro multi-linha vai pro `description` (toast principal fica enxuto)
      const partes = msg.split('\n')
      toast.error(partes[0], partes.length > 1 ? { description: partes.slice(1).join('\n') } : undefined)
    }
  } finally {
    saving.value = false
  }
}

function syncTaskStore(novasTasks) {
  // Insere no store (dedupa por id) — evita refetch desnecessário pelo caller
  const existentes = new Set(taskStore.tasks.map(t => t.id))
  for (const t of novasTasks) {
    if (!existentes.has(t.id)) taskStore.tasks.push(t)
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 200;
  display: flex; align-items: center; justify-content: center; padding: 16px;
}
.modal {
  background: #fff; border-radius: 16px; width: 100%; max-width: 560px;
  padding: 24px; display: flex; flex-direction: column; gap: 16px;
  font-family: 'DM Sans', sans-serif; max-height: 90vh; overflow: hidden;
}
.modal__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.modal__title { font-size: 15px; font-weight: 700; color: #1a1a2e; margin: 0; }
.modal__subtitle { font-size: 12px; color: #888; margin: 2px 0 0; }
.modal__close {
  width: 30px; height: 30px; border-radius: 8px;
  border: 1px solid #ebe9e4; background: transparent;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #888;
}
.modal__close:hover:not(:disabled) { background: #f5f4f0; }
.modal__close:disabled { opacity: 0.4; cursor: not-allowed; }

.stepper {
  list-style: none; margin: 0;
  display: flex; align-items: center; gap: 6px;
  background: #f5f4f0; padding: 8px 12px; border-radius: 8px;
}
.step { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: #999; }
.step__num {
  width: 18px; height: 18px; border-radius: 999px;
  background: #ddd; color: #fff; font-size: 11px; font-weight: 700;
  display: inline-flex; align-items: center; justify-content: center;
}
.step--active { color: #1a1a2e; font-weight: 600; }
.step--active .step__num { background: #534AB7; }
.step--done .step__num { background: #16A34A; }
.step__divider { flex: 1; height: 1px; background: #ddd; }

.step-body {
  display: flex; flex-direction: column; gap: 12px;
  overflow-y: auto;
  min-height: 360px;  /* evita o modal "pular" entre steps com alturas diferentes */
}
.step-hint { font-size: 12px; color: #666; margin: 0; }

.field { display: flex; flex-direction: column; gap: 6px; }
.field__label { font-size: 12px; font-weight: 600; color: #555; }
.field__input {
  font-family: 'DM Sans', sans-serif; font-size: 13px;
  border: 1px solid #ddd; border-radius: 8px; padding: 8px 12px; outline: none;
}
.field__input:focus { border-color: #534AB7; }
.hint { font-size: 11px; margin: 0; }
.hint--muted { color: #999; }
.hint--info { color: #534AB7; font-weight: 500; }
.hint--warn { color: #B45309; font-weight: 500; }

.preview {
  background: #FAFAFE; border: 1px solid #EEEDFE;
  border-radius: 8px; padding: 12px;
}
.preview__title { font-size: 12px; font-weight: 600; color: #534AB7; margin-bottom: 6px; }
.preview__list { list-style: none; padding: 0; margin: 0; font-size: 12px; color: #444; }
.preview__list li { padding: 2px 0; }
.preview__muted { color: #888; font-size: 11px; }

.modal__footer { display: flex; gap: 8px; align-items: center; }
.modal__footer-spacer { flex: 1; }
.btn-ghost {
  font-family: 'DM Sans', sans-serif; font-size: 13px;
  background: transparent; border: 1px solid #ddd;
  border-radius: 8px; padding: 8px 16px; cursor: pointer; color: #666;
}
.btn-ghost:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-primary {
  font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600;
  background: #534AB7; border: none; border-radius: 8px;
  padding: 8px 20px; cursor: pointer; color: #fff;
  transition: background 0.15s, opacity 0.15s;
}
.btn-primary:hover:not(:disabled) { background: #3C3489; }
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
