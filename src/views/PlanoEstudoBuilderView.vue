<template>
  <div class="plano-builder" style="font-family: 'DM Sans', sans-serif;">

    <!-- Header -->
    <div class="plano-builder__header">
      <button class="btn-ghost" @click="router.push(`/editais/${editalId}/cargos/${cargoId}`)">
        <ChevronLeft :size="16" /> Voltar ao cargo
      </button>
      <div class="plano-builder__info">
        <h1 class="plano-builder__title">Plano de Estudo</h1>
        <p v-if="estadoPlano" class="plano-builder__sub">
          {{ estadoPlano.assuntosCobertos }}/{{ estadoPlano.totalAssuntos }} assuntos cobertos
          <template v-if="estadoPlano.diasRestantes"> · {{ estadoPlano.diasRestantes }} dias até a prova</template>
        </p>
      </div>
    </div>

    <!-- Barra de progresso -->
    <div v-if="estadoPlano" class="progress-section">
      <div class="progress-bar">
        <div class="progress-bar__fill" :style="{ width: progressoPct + '%' }" />
      </div>
      <div class="progress-stats">
        <span>{{ estadoPlano.assuntosCobertos }} cobertos</span>
        <span>{{ estadoPlano.assuntosPendentes }} pendentes</span>
        <span v-if="estadoPlano.metas?.length">{{ estadoPlano.metas.length }} metas criadas</span>
      </div>
    </div>

    <!-- Progresso por disciplina -->
    <div v-if="estadoPlano?.disciplinasDisponiveis?.length || Object.keys(estadoPlano?.progressoPorDisciplina || {}).length" class="disc-progress">
      <h3 class="disc-progress__title">
        <BookOpen :size="14" /> Progresso por disciplina
      </h3>
      <div class="disc-progress__grid">
        <div
          v-for="(p, nome) in estadoPlano.progressoPorDisciplina"
          :key="nome"
          class="disc-progress__item"
          :class="{ 'disc-progress__item--done': p.pendentes === 0 }"
        >
          <div class="disc-progress__header">
            <span class="disc-progress__name">{{ nome }}</span>
            <span class="disc-progress__count">{{ p.cobertos }}/{{ p.total }}</span>
          </div>
          <div class="disc-progress__bar">
            <div
              class="disc-progress__bar-fill"
              :style="{ width: (p.total ? Math.round(p.cobertos / p.total * 100) : 0) + '%' }"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Timeline de metas existentes -->
    <div v-if="estadoPlano?.metas?.length" class="timeline">
      <div v-for="(meta, i) in estadoPlano.metas" :key="meta.id" class="timeline__item">
        <div class="timeline__marker" :class="{ 'timeline__marker--done': true }">
          <CheckCircle :size="14" />
        </div>
        <div class="timeline__content">
          <h3 class="timeline__title">{{ meta.title }}</h3>
          <p class="timeline__desc">{{ meta.description }}</p>
          <span class="timeline__tasks">{{ meta.taskIds?.length || 0 }} tarefas</span>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="carregandoEstado" class="loading-estado">
      <Zap :size="16" class="spin" /> Carregando plano...
    </div>

    <!-- Banner plano criado -->
    <div v-if="planoCriado && !metaCriadaRecente" class="plano-criado-banner">
      <CheckCircle :size="16" />
      <div>
        <strong>Plano criado!</strong>
        <span> Configure as opções abaixo e clique em "Gerar sugestão" para criar sua primeira meta.</span>
      </div>
      <button class="icon-btn" @click="planoCriado = false"><ChevronDown :size="14" /></button>
    </div>

    <!-- Banner de meta criada -->
    <div v-if="metaCriadaRecente" class="meta-criada-banner">
      <CheckCircle :size="16" />
      <span>Meta {{ metaCriadaRecente }} criada com sucesso!</span>
      <button class="btn-primary btn-primary--sm" @click="router.push({ name: 'Workspace', query: { plan: planId } })">
        Ir ao Workspace
      </button>
      <button class="btn-ghost" @click="metaCriadaRecente = null">Continuar aqui</button>
    </div>

    <!-- Configuração para próxima meta -->
    <div class="next-meta-section">
      <h2 class="section-title">
        <CalendarDays :size="16" />
        {{ sugestao ? `Meta ${sugestao.sugestao?.metaNumero || estadoPlano?.metaAtual || 1} — Preview` : 'Configurar próxima meta' }}
      </h2>

      <!-- Config -->
      <div v-if="!sugestao" class="config-area">
        <!-- Toggle desconsiderar horas -->
        <div class="config-toggle" @click="config.ignorarHoras = !config.ignorarHoras">
          <div class="toggle-switch" :class="{ 'toggle-switch--on': config.ignorarHoras }">
            <div class="toggle-switch__dot" />
          </div>
          <div class="config-toggle__text">
            <span class="config-toggle__label">Desconsiderar horas</span>
            <span class="config-toggle__hint">{{ config.ignorarHoras ? 'Monta a meta por quantidade de assuntos, sem limite de horas' : 'Respeita o limite de horas por dia' }}</span>
          </div>
        </div>

        <div class="config-grid">
          <!-- Sempre visíveis -->
          <div class="config-card">
            <label class="config-label">Disciplinas por meta</label>
            <input v-model.number="config.disciplinasPorMeta" class="config-input" type="number" min="1" max="20" />
          </div>
          <div class="config-card">
            <label class="config-label">Assuntos por disciplina</label>
            <input v-model.number="config.assuntosPorDisciplina" class="config-input" type="number" min="1" max="10" />
          </div>
          <div class="config-card">
            <label class="config-label">Duração da meta</label>
            <select v-model="config.duracaoMeta" class="config-input">
              <option value="semanal">Semanal (7 dias)</option>
              <option value="quinzenal">Quinzenal (14 dias)</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>
          <div v-if="config.duracaoMeta === 'custom'" class="config-card">
            <label class="config-label">Dias (custom)</label>
            <input v-model.number="config.diasCustom" class="config-input" type="number" min="1" max="30" />
          </div>

          <!-- Só quando NÃO ignora horas -->
          <template v-if="!config.ignorarHoras">
            <div class="config-card">
              <label class="config-label">Horas por dia</label>
              <input v-model.number="config.horasPorDia" class="config-input" type="number" min="1" max="12" />
            </div>
            <div class="config-card">
              <label class="config-label">Dias por semana</label>
              <input v-model.number="config.diasPorSemana" class="config-input" type="number" min="1" max="7" />
            </div>
          </template>

          <div class="config-card">
            <label class="config-label">Semanas revisão final</label>
            <input v-model.number="config.semanasRevisaoFinal" class="config-input" type="number" min="1" max="4" />
          </div>
        </div>

        <!-- Seleção de disciplinas -->
        <div v-if="estadoPlano?.disciplinasDisponiveis?.length" class="disc-select">
          <div class="disc-select__header">
            <label class="config-label">Disciplinas da meta</label>
            <button class="btn-ghost btn-ghost--xs" @click="toggleTodasDisciplinas">
              {{ config.disciplinasEscolhidas.length ? 'Limpar seleção (todas)' : 'Todas selecionadas' }}
            </button>
          </div>
          <div class="disc-select__list">
            <label
              v-for="d in estadoPlano.disciplinasDisponiveis"
              :key="d.nome"
              class="disc-select__item"
              :class="{ 'disc-select__item--checked': isDisciplinaSelecionada(d.nome) }"
            >
              <input
                type="checkbox"
                :checked="isDisciplinaSelecionada(d.nome)"
                @change="toggleDisciplina(d.nome)"
                class="disc-select__check"
              />
              <span class="disc-select__nome">{{ d.nome }}</span>
              <span class="disc-select__info">{{ d.pendentes }} pendentes · score {{ (d.scoreMax * 100).toFixed(0) }}%</span>
            </label>
          </div>
        </div>
      </div>

      <button v-if="!sugestao" class="btn-primary" :disabled="carregando" @click="gerarSugestao">
        <Zap :size="14" /> {{ carregando ? 'Gerando...' : 'Gerar sugestão da próxima meta' }}
      </button>

      <!-- Alertas -->
      <div v-for="(alerta, i) in (sugestao?.alertas || [])" :key="i" class="alerta" :class="`alerta--${alerta.tipo}`">
        <AlertTriangle :size="14" />
        <span>{{ alerta.mensagem }}</span>
      </div>

      <!-- Preview da meta sugerida -->
      <div v-if="sugestao?.sugestao" class="meta-preview">
        <div class="meta-preview__header">
          <div>
            <h3 class="meta-preview__title">Meta {{ sugestao.sugestao.metaNumero }}</h3>
            <span class="meta-preview__dates">{{ sugestao.sugestao.dataInicio }} a {{ sugestao.sugestao.dataFim }}</span>
          </div>
          <div class="meta-preview__badges">
            <span class="badge badge--info">{{ sugestao.sugestao.horasTotal }}h</span>
            <span class="badge badge--info">{{ sugestao.sugestao.disciplinas?.length }} disciplinas</span>
          </div>
        </div>

        <!-- Projeção -->
        <div v-if="sugestao.projecao" class="projecao">
          <span>Após esta meta: {{ sugestao.projecao.assuntosRestantes }} assuntos restantes</span>
          <span>· ~{{ sugestao.projecao.metasRestantes }} metas para concluir</span>
          <span>· ~{{ sugestao.projecao.diasNecessarios }} dias necessários</span>
        </div>

        <!-- Lista de tasks editável (drag to reorder) -->
        <div class="tasks-list">
          <div
            v-for="(task, ti) in sugestao.sugestao.tasks"
            :key="ti"
            class="task-item"
            :class="[`task-item--${task.origem}`, { 'task-item--dragging': dragIdx === ti, 'task-item--over': dropIdx === ti }]"
            draggable="true"
            @dragstart="onDragStart(ti, $event)"
            @dragover.prevent="onDragOver(ti)"
            @dragleave="dropIdx = null"
            @drop="onDrop(ti)"
            @dragend="dragIdx = null; dropIdx = null"
          >
            <div class="task-item__main" @click="task._aberto = !task._aberto">
              <GripVertical :size="12" class="task-item__grip" />
              <ChevronDown :size="11" class="task-item__toggle" :class="{ 'rotated': !task._aberto }" />
              <select v-model="task.tipo" class="task-item__tipo-select" :class="`tipo-tag--${task.tipo}`" @click.stop>
                <option value="lei_seca">Lei Seca</option>
                <option value="leitura_pdf">Leitura</option>
                <option value="revisao">Revisão</option>
                <option value="questoes">Questões</option>
                <option value="video">Vídeo</option>
                <option value="outras">Outra</option>
              </select>
              <input v-model="task.titulo" class="task-item__titulo" @click.stop />
              <input v-model.number="task.carga" class="task-item__carga" type="number" min="0.25" step="0.25" @click.stop />
              <span class="task-item__h">h</span>
              <button class="icon-btn icon-btn--sm" @click.stop="sugestao.sugestao.tasks.splice(ti, 1)">
                <Trash2 :size="11" />
              </button>
            </div>
            <p v-if="task.disciplina && !task._aberto" class="task-item__disc">{{ task.disciplina }}</p>

            <!-- Campos expandidos -->
            <div v-if="task._aberto" class="task-item__details">
              <div class="task-detail-row">
                <div class="task-detail-field">
                  <label>Disciplina</label>
                  <input v-model="task.disciplina" placeholder="Disciplina" />
                </div>
                <div class="task-detail-field">
                  <label>Carga (horas)</label>
                  <input v-model.number="task.carga" type="number" min="0.25" step="0.25" />
                </div>
              </div>
              <div class="task-detail-field">
                <label>Descrição</label>
                <textarea v-model="task.descricao" rows="2" placeholder="Detalhes, observações..." />
              </div>
              <div class="task-detail-field">
                <label>Link</label>
                <input v-model="task.link" placeholder="https://..." />
              </div>
              <div v-if="task.leisRef?.length" class="task-detail-leis">
                <label>Leis referência</label>
                <div class="task-leis-tags">
                  <span v-for="(lei, li) in task.leisRef" :key="li" class="task-lei-tag">{{ lei }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Adicionar task manual -->
        <button class="btn-outline btn-outline--full" @click="adicionarTask">
          <Plus :size="14" /> Adicionar tarefa
        </button>

        <!-- Ações -->
        <div class="meta-preview__actions">
          <button class="btn-ghost" @click="sugestao = null">
            <ChevronLeft :size="14" /> Voltar à config
          </button>
          <button class="btn-primary btn-primary--accent" :disabled="confirmando" @click="confirmarMeta">
            <CheckCircle :size="14" /> {{ confirmando ? 'Criando...' : 'Confirmar e criar meta' }}
          </button>
        </div>
      </div>

      <!-- Todos assuntos cobertos -->
      <div v-else-if="sugestao && !sugestao.sugestao" class="all-done">
        <CheckCircle :size="40" />
        <h3>{{ sugestao.mensagem }}</h3>
        <p>Todas as disciplinas e assuntos priorizados já foram distribuídos nas metas.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  ChevronLeft, ChevronDown, CalendarDays, Zap, CheckCircle, AlertTriangle,
  Plus, Trash2, GripVertical, BookOpen
} from 'lucide-vue-next'
import { planoEstudoService } from '@/services/planoEstudo.service'
import { toast } from 'vue-sonner'

const router = useRouter()
const route = useRoute()

const editalId = computed(() => route.params.id)
const cargoId = computed(() => route.params.cargoId)

const planId = ref(null)
const estadoPlano = ref(null)
const sugestao = ref(null)
const carregando = ref(false)
const confirmando = ref(false)
const metaCriadaRecente = ref(null)
const planoCriado = ref(false) // true quando o plano acabou de ser criado nesta sessão
const carregandoEstado = ref(true)

const config = ref({
  horasPorDia: 4,
  horasPorDisciplina: 2,
  disciplinasPorDia: 2,
  diasPorSemana: 6,
  duracaoMeta: 'semanal',
  diasCustom: 7,
  semanasRevisaoFinal: 2,
  ignorarHoras: true,
  disciplinasPorMeta: 4,
  assuntosPorDisciplina: 2,
  disciplinasEscolhidas: [],
})

const progressoPct = computed(() => {
  if (!estadoPlano.value) return 0
  const { assuntosCobertos, totalAssuntos } = estadoPlano.value
  return totalAssuntos ? Math.round(assuntosCobertos / totalAssuntos * 100) : 0
})

function taskTipoLabel(tipo) {
  const labels = { lei_seca: 'Lei Seca', leitura_pdf: 'Leitura', revisao: 'Revisão', questoes: 'Questões', outras: 'Outra' }
  return labels[tipo] || tipo
}

// ── Drag to reorder ──────────────────────────────────────────

const dragIdx = ref(null)
const dropIdx = ref(null)

function onDragStart(idx, event) {
  dragIdx.value = idx
  event.dataTransfer.effectAllowed = 'move'
}

function onDragOver(idx) {
  dropIdx.value = idx
}

function onDrop(idx) {
  if (dragIdx.value === null || dragIdx.value === idx) return
  const tasks = sugestao.value.sugestao.tasks
  const [moved] = tasks.splice(dragIdx.value, 1)
  tasks.splice(idx, 0, moved)
  dragIdx.value = null
  dropIdx.value = null
}

function isDisciplinaSelecionada(nome) {
  return !config.value.disciplinasEscolhidas.length || config.value.disciplinasEscolhidas.includes(nome)
}

function toggleDisciplina(nome) {
  const arr = config.value.disciplinasEscolhidas
  const idx = arr.indexOf(nome)
  if (idx >= 0) {
    arr.splice(idx, 1)
  } else {
    arr.push(nome)
  }
}

function toggleTodasDisciplinas() {
  config.value.disciplinasEscolhidas = []
}

function adicionarTask() {
  sugestao.value.sugestao.tasks.push({
    tipo: 'outras',
    titulo: '',
    descricao: '',
    disciplina: '',
    link: '',
    carga: 1,
    leisRef: [],
    origem: 'manual',
    _aberto: true,
  })
}

async function carregarEstado() {
  carregandoEstado.value = true
  try {
    const plan = await planoEstudoService.inicializar(editalId.value, cargoId.value)
    const isNovo = !planId.value && plan.id
    planId.value = plan.id
    estadoPlano.value = await planoEstudoService.estado(editalId.value, cargoId.value, plan.id)

    // Mostra feedback se é a primeira vez (plano recém-criado, sem metas ainda)
    if (isNovo && !estadoPlano.value.metas?.length) {
      planoCriado.value = true
      toast.success('Plano de estudo criado! Configure e gere a primeira meta.')
    }
  } catch (err) {
    toast.error(err.message)
  } finally {
    carregandoEstado.value = false
  }
}

async function gerarSugestao() {
  if (!planId.value) return
  carregando.value = true
  planoCriado.value = false
  try {
    sugestao.value = await planoEstudoService.sugerir(
      editalId.value, cargoId.value, planId.value, config.value
    )
    if (sugestao.value?.sugestao?.tasks?.length) {
      toast.success(`${sugestao.value.sugestao.tasks.filter(t => t.origem === 'priorizado').length} assuntos sugeridos. Revise e confirme.`)
    }
  } catch (err) {
    console.error('Erro ao gerar sugestão:', err)
    toast.error(err.response?.data?.message || err.message || 'Erro ao gerar sugestão da meta')
  } finally {
    carregando.value = false
  }
}

async function confirmarMeta() {
  const tasks = sugestao.value?.sugestao?.tasks
  if (!tasks?.length) {
    toast.error('Nenhuma tarefa para criar.')
    return
  }

  confirmando.value = true
  try {
    // Limpa campos internos do frontend antes de enviar
    const tasksLimpas = tasks.map(t => ({
      tipo: t.tipo || 'outras',
      titulo: t.titulo || 'Sem título',
      descricao: t.descricao || '',
      disciplina: t.disciplina || '',
      link: t.link || '',
      carga: t.carga || 1,
      tipoFonte: t.tipoFonte || [],
      leisRef: t.leisRef || [],
      score: t.score || null,
      origem: t.origem || 'manual',
    }))

    const result = await planoEstudoService.confirmar(
      editalId.value, cargoId.value, planId.value,
      tasksLimpas
    )
    toast.success(`Meta ${result.metaNumero} criada com ${result.totalTasks} tarefas!`)
    sugestao.value = null
    metaCriadaRecente.value = result.metaNumero
    await carregarEstado()
  } catch (err) {
    console.error('Erro ao criar meta:', err)
    toast.error(err.message || 'Erro ao criar meta')
  } finally {
    confirmando.value = false
  }
}

onMounted(carregarEstado)
</script>

<style scoped>
.plano-builder { max-width: 900px; display: flex; flex-direction: column; gap: 20px; }

.plano-builder__header { display: flex; align-items: flex-start; gap: 12px; }
.plano-builder__info { flex: 1; }
.plano-builder__title { font-size: 1.25rem; font-weight: 700; color: #1a1a2e; margin: 0; }
.plano-builder__sub { font-size: 12px; color: #888; margin: 4px 0 0; }

/* Progress */
.progress-section { display: flex; flex-direction: column; gap: 6px; }
.progress-bar {
  height: 8px; background: #ebe9e4; border-radius: 4px; overflow: hidden;
}
.progress-bar__fill {
  height: 100%; background: #16A34A; border-radius: 4px;
  transition: width 0.5s ease;
}
.progress-stats {
  display: flex; gap: 16px; font-size: 11px; color: #888; font-weight: 600;
}

/* Timeline */
.timeline { display: flex; flex-direction: column; gap: 0; padding-left: 8px; }
.timeline__item {
  display: flex; gap: 12px; position: relative; padding-bottom: 16px;
}
.timeline__item::before {
  content: ''; position: absolute; left: 6px; top: 22px; bottom: 0;
  width: 2px; background: #ebe9e4;
}
.timeline__item:last-child::before { display: none; }
.timeline__marker {
  width: 14px; height: 14px; flex-shrink: 0; margin-top: 4px; color: #9CA3AF;
}
.timeline__marker--done { color: #16A34A; }
.timeline__content { flex: 1; }
.timeline__title { font-size: 13px; font-weight: 700; color: #1a1a2e; margin: 0; }
.timeline__desc { font-size: 11px; color: #888; margin: 2px 0 0; }
.timeline__tasks { font-size: 10px; color: #aaa; }

/* Progresso por disciplina */
.disc-progress { display: flex; flex-direction: column; gap: 8px; }
.disc-progress__title {
  display: flex; align-items: center; gap: 6px;
  font-size: 13px; font-weight: 700; color: #1a1a2e; margin: 0;
}
.disc-progress__grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 6px;
}
.disc-progress__item {
  padding: 8px 12px; border-radius: 8px; background: #fff; border: 1px solid #ebe9e4;
}
.disc-progress__item--done { background: #F0FDF4; border-color: #BBF7D0; }
.disc-progress__header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;
}
.disc-progress__name { font-size: 11px; font-weight: 600; color: #1a1a2e; }
.disc-progress__count { font-size: 11px; font-weight: 700; color: #888; }
.disc-progress__bar {
  height: 4px; background: #ebe9e4; border-radius: 2px; overflow: hidden;
}
.disc-progress__bar-fill {
  height: 100%; background: #16A34A; border-radius: 2px; transition: width 0.3s;
}

/* Config area */
.config-area { display: flex; flex-direction: column; gap: 12px; }

/* Toggle */
.config-toggle {
  display: flex; align-items: center; gap: 10px; cursor: pointer;
  padding: 10px 14px; background: #fff; border: 1px solid #ebe9e4; border-radius: 10px;
}
.config-toggle__text { display: flex; flex-direction: column; }
.config-toggle__label { font-size: 13px; font-weight: 600; color: #1a1a2e; }
.config-toggle__hint { font-size: 11px; color: #888; }
.toggle-switch {
  width: 36px; height: 20px; border-radius: 10px; background: #ddd;
  position: relative; flex-shrink: 0; transition: background 0.2s;
}
.toggle-switch--on { background: #534AB7; }
.toggle-switch__dot {
  width: 16px; height: 16px; border-radius: 50%; background: #fff;
  position: absolute; top: 2px; left: 2px; transition: transform 0.2s;
}
.toggle-switch--on .toggle-switch__dot { transform: translateX(16px); }

/* Seleção de disciplinas */
.disc-select {
  background: #fff; border: 1px solid #ebe9e4; border-radius: 10px; padding: 12px;
}
.disc-select__header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;
}
.disc-select__list { display: flex; flex-direction: column; gap: 2px; }
.disc-select__item {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 8px; border-radius: 6px; cursor: pointer; transition: background 0.1s;
}
.disc-select__item:hover { background: #f5f4f0; }
.disc-select__item--checked { background: #EEF2FF; }
.disc-select__check { accent-color: #534AB7; }
.disc-select__nome { font-size: 12px; font-weight: 600; color: #1a1a2e; flex: 1; }
.disc-select__info { font-size: 10px; color: #888; white-space: nowrap; }

.btn-ghost--xs { font-size: 11px; padding: 2px 6px; }

/* Config */
.section-title {
  display: flex; align-items: center; gap: 8px;
  font-size: 15px; font-weight: 700; color: #1a1a2e; margin: 0 0 12px;
}
.config-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 10px; margin-bottom: 12px;
}
.config-card {
  display: flex; flex-direction: column; gap: 4px;
  background: #fff; border: 1px solid #ebe9e4; border-radius: 10px; padding: 12px;
}
.config-label { font-size: 11px; font-weight: 600; color: #888; }
.config-input {
  padding: 6px 10px; border: 1px solid #ddd; border-radius: 6px;
  font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 700; color: #1a1a2e;
}
.config-input:focus { outline: none; border-color: #534AB7; }

/* Alertas */
.alerta {
  display: flex; align-items: flex-start; gap: 8px; padding: 10px 14px;
  border-radius: 8px; font-size: 12px;
}
.alerta--danger { background: #FEF2F2; color: #991B1B; }
.alerta--warn { background: #FFFBEB; color: #92400E; }

/* Meta preview */
.meta-preview {
  background: #fff; border: 1px solid #ebe9e4; border-radius: 14px;
  padding: 20px; display: flex; flex-direction: column; gap: 14px;
}
.meta-preview__header {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
}
.meta-preview__title { font-size: 16px; font-weight: 700; color: #1a1a2e; margin: 0; }
.meta-preview__dates { font-size: 12px; color: #888; }
.meta-preview__badges { display: flex; gap: 6px; }
.badge--info { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 6px; background: #EEF2FF; color: #4338CA; }

.projecao {
  font-size: 11px; color: #666; background: #F8FAFC; padding: 8px 12px; border-radius: 6px;
  display: flex; gap: 8px; flex-wrap: wrap;
}

/* Tasks list */
.tasks-list { display: flex; flex-direction: column; gap: 4px; }
.task-item {
  padding: 8px 10px; border-radius: 8px; border: 1px solid #f0efea;
}
.task-item--revisao_anterior { background: #FFF7ED; border-color: #FED7AA; }
.task-item--revisao_semanal { background: #FFF7ED; border-color: #FED7AA; }
.task-item--priorizado { background: #fff; }
.task-item--manual { background: #F0F9FF; border-color: #BAE6FD; }

.task-item { cursor: grab; transition: opacity 0.15s, border-color 0.15s; }
.task-item--dragging { opacity: 0.4; }
.task-item--over { border-color: #534AB7; border-style: dashed; }

.task-item__grip {
  flex-shrink: 0; color: #ccc; cursor: grab;
}
.task-item__grip:active { cursor: grabbing; }

.task-item__main {
  display: flex; align-items: center; gap: 6px;
}
.task-item__tipo {
  font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 4px;
  text-transform: uppercase; white-space: nowrap;
}
.tipo-tag--lei_seca { background: #DBEAFE; color: #1E40AF; }
.tipo-tag--leitura_pdf { background: #F3E8FF; color: #6B21A8; }
.tipo-tag--revisao { background: #FEF3C7; color: #92400E; }
.tipo-tag--questoes { background: #D1FAE5; color: #065F46; }
.tipo-tag--outras { background: #F3F4F6; color: #6B7280; }

.task-item__titulo {
  flex: 1; border: none; background: transparent;
  font-family: 'DM Sans', sans-serif; font-size: 13px; color: #1a1a2e;
}
.task-item__titulo:focus { outline: none; background: #fff; border-radius: 4px; padding: 2px 6px; }
.task-item__carga {
  width: 50px; text-align: center; border: 1px solid #eee; border-radius: 4px;
  font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 700; color: #1a1a2e;
  padding: 2px;
}
.task-item__h { font-size: 11px; color: #aaa; }
.task-item__disc { font-size: 10px; color: #9CA3AF; margin: 2px 0 0 0; padding-left: 28px; }

.task-item__toggle {
  flex-shrink: 0; color: #9CA3AF; transition: transform 0.2s;
}
.task-item__toggle.rotated { transform: rotate(-90deg); }

.task-item__tipo-select {
  font-size: 9px; font-weight: 700; padding: 2px 4px; border-radius: 4px;
  border: 1px solid transparent; cursor: pointer;
  font-family: 'DM Sans', sans-serif; text-transform: uppercase;
}
.task-item__tipo-select:focus { outline: none; border-color: #534AB7; }

.task-item__details {
  display: flex; flex-direction: column; gap: 8px;
  padding: 10px 10px 10px 28px; border-top: 1px solid #f0efea;
}
.task-detail-row { display: grid; grid-template-columns: 1fr 120px; gap: 8px; }
.task-detail-field { display: flex; flex-direction: column; gap: 2px; }
.task-detail-field label { font-size: 10px; font-weight: 600; color: #888; }
.task-detail-field input, .task-detail-field textarea {
  padding: 6px 8px; border: 1px solid #eee; border-radius: 6px;
  font-family: 'DM Sans', sans-serif; font-size: 12px; color: #1a1a2e;
}
.task-detail-field input:focus, .task-detail-field textarea:focus {
  outline: none; border-color: #534AB7;
}
.task-detail-field textarea { resize: vertical; min-height: 40px; }

.task-detail-leis { display: flex; flex-direction: column; gap: 2px; }
.task-detail-leis label { font-size: 10px; font-weight: 600; color: #888; }
.task-leis-tags { display: flex; flex-wrap: wrap; gap: 3px; }
.task-lei-tag {
  font-size: 9px; font-weight: 600; background: #F0F9FF; color: #0369A1;
  padding: 2px 6px; border-radius: 3px;
}

.meta-preview__actions {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding-top: 10px; border-top: 1px solid #f0efea;
}

/* All done */
.all-done {
  display: flex; flex-direction: column; align-items: center; text-align: center;
  padding: 40px 20px; gap: 8px; color: #16A34A;
}
.all-done h3 { font-size: 16px; font-weight: 700; margin: 0; color: #1a1a2e; }
.all-done p { font-size: 13px; color: #888; margin: 0; }

/* Loading */
.loading-estado {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; color: #888; padding: 20px 0;
}
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Banner plano criado */
.plano-criado-banner {
  display: flex; align-items: center; gap: 10px; padding: 12px 16px;
  background: #EEF2FF; border: 1px solid #C7D2FE; border-radius: 10px;
  color: #3730A3; font-size: 13px;
}
.plano-criado-banner strong { font-weight: 700; }

/* Shared */
.btn-primary {
  display: flex; align-items: center; gap: 6px;
  font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600;
  background: #534AB7; color: #fff; border: none; border-radius: 8px; padding: 8px 16px;
  cursor: pointer; transition: background 0.15s;
}
.btn-primary:hover { background: #3C3489; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary--accent { background: #16A34A; }
.btn-primary--accent:hover { background: #15803D; }
.btn-primary--sm { font-size: 12px; padding: 5px 12px; }

.meta-criada-banner {
  display: flex; align-items: center; gap: 10px; padding: 12px 16px;
  background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 10px;
  color: #166534; font-size: 13px; font-weight: 600;
}

.btn-outline {
  display: flex; align-items: center; gap: 6px;
  font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500;
  background: #fff; color: #444; border: 1px solid #ddd; border-radius: 8px; padding: 7px 14px;
  cursor: pointer;
}
.btn-outline:hover { background: #f5f4f0; }
.btn-outline--full { width: 100%; justify-content: center; }

.btn-ghost {
  display: flex; align-items: center; gap: 4px;
  font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500;
  background: transparent; border: none; color: #666; cursor: pointer;
  padding: 6px 10px; border-radius: 6px;
}
.btn-ghost:hover { background: #f5f4f0; }

.icon-btn {
  width: 28px; height: 28px; border-radius: 7px; border: none; background: transparent;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #aaa;
}
.icon-btn:hover { background: #f0efea; color: #444; }
.icon-btn--sm { width: 22px; height: 22px; }
</style>
