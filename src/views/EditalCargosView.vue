<template>
  <div class="cargos-view" style="font-family: 'DM Sans', sans-serif;">

    <!-- Header -->
    <div class="cargos-view__header">
      <button class="btn-ghost" @click="router.push('/editais')">
        <ChevronLeft :size="16" /> Voltar
      </button>

      <div v-if="edital" class="edital-resumo">
        <h1 class="edital-resumo__title">{{ edital.nome }}</h1>
        <div class="edital-resumo__info">
          <span class="badge badge--orgao">{{ edital.orgao }}</span>
          <span class="badge badge--banca">{{ edital.banca }}</span>
          <span class="badge badge--ano">{{ edital.ano }}</span>
          <div class="countdown-inline" :class="countdownClass">
            <Clock :size="13" />
            <span v-if="cd?.passado">Prova já realizada</span>
            <span v-else-if="cd">{{ cd.semanas }}sem {{ cd.dias }}d ({{ cd.total }} dias)</span>
          </div>
        </div>
      </div>

      <button class="btn-primary" @click="abrirCriarModal">
        <Plus :size="14" /> Adicionar Cargo
      </button>
    </div>

    <!-- Skeleton durante o primeiro fetch -->
    <div v-if="initialLoad && !cargoStore.cargos.length" class="cargos-grid">
      <div v-for="i in 4" :key="i" class="cargo-card cargo-card--skeleton">
        <div class="skeleton-line skeleton-line--icon" />
        <div class="skeleton-line skeleton-line--title" />
        <div class="skeleton-line skeleton-line--tags" />
        <div class="skeleton-line skeleton-line--status" />
        <div class="skeleton-line skeleton-line--actions" />
      </div>
    </div>

    <!-- Lista de cargos -->
    <div v-else-if="cargoStore.cargos.length" class="cargos-grid">
      <div
        v-for="cargo in cargoStore.cargos"
        :key="cargo.id"
        class="cargo-card"
        :class="{ 'cargo-card--new': cargo.id === lastCreatedId }"
        @click="goToConteudo(cargo.id)"
      >
        <div class="cargo-card__top">
          <div class="cargo-card__icon"><Briefcase :size="16" /></div>
          <div class="cargo-card__meta">
            <h3 class="cargo-card__title">{{ cargo.nome }}</h3>
            <div class="cargo-card__details">
              <span v-if="cargo.nivel" class="tag">{{ cargo.nivel }}</span>
              <span v-if="cargo.area" class="tag">{{ cargo.area }}</span>
              <span v-if="cargo.formacao" class="tag tag--light">{{ cargo.formacao }}</span>
            </div>
          </div>
          <div class="cargo-card__menu" @click.stop>
            <button class="icon-btn" @click="toggleMenu(cargo.id)">
              <MoreVertical :size="14" />
            </button>
            <div v-if="openMenu === cargo.id" class="dropdown">
              <button class="dropdown__item" @click="editCargo(cargo)">
                <Pencil :size="13" /> Editar
              </button>
              <div class="dropdown__divider" />
              <button class="dropdown__item dropdown__item--danger" @click="confirmDeleteCargo(cargo.id)">
                <Trash2 :size="13" /> Excluir
              </button>
            </div>
          </div>
        </div>

        <!-- Status do parse -->
        <div class="cargo-card__status">
          <span class="parse-badge" :class="`parse-badge--${cargo.parse_status || 'pendente'}`">
            {{ parseStatusLabel(cargo.parse_status) }}
          </span>
          <span v-if="cargo.conteudo_parseado?.disciplinas" class="cargo-card__disc-count">
            {{ cargo.conteudo_parseado.disciplinas.length }} disciplina(s)
          </span>
        </div>

        <!-- Ações rápidas -->
        <div class="cargo-card__actions">
          <button class="btn-sm" @click.stop="goToConteudo(cargo.id)">
            <FileText :size="12" /> Conteúdo
          </button>
          <button
            v-if="cargo.priorizacao?.disciplinas?.length"
            class="btn-sm btn-sm--accent"
            @click.stop="goToPlano(cargo.id)"
          >
            <CalendarDays :size="12" /> Plano de Estudo
          </button>
          <button
            v-else-if="cargo.conteudo_parseado?.disciplinas?.length"
            class="btn-sm btn-sm--secondary"
            title="Conteúdo parseado — falta analisar para gerar plano de estudo"
            @click.stop="goToConteudo(cargo.id)"
          >
            <Zap :size="12" /> Analisar para priorizar
          </button>
        </div>
      </div>
    </div>

    <!-- Empty state — só após o primeiro fetch -->
    <div v-else-if="!initialLoad" class="empty-state">
      <div class="empty-state__icon"><Briefcase :size="40" /></div>
      <h3 class="empty-state__title">Nenhum cargo cadastrado</h3>
      <p class="empty-state__desc">Adicione os cargos do edital que você deseja estudar.</p>
      <button class="btn-primary" @click="abrirCriarModal">
        <Plus :size="14" /> Adicionar primeiro cargo
      </button>
    </div>

    <!-- Modal Novo/Editar Cargo -->
    <Teleport to="body">
      <div
        v-if="showModal"
        class="modal-overlay"
        tabindex="-1"
        @click.self="closeModal"
        @keydown.esc="closeModal"
      >
        <div class="modal">
          <div class="modal__header">
            <h2 class="modal__title">{{ editingCargo ? 'Editar Cargo' : 'Novo Cargo' }}</h2>
            <button class="icon-btn" @click="closeModal"><X :size="16" /></button>
          </div>
          <div class="modal__body">
            <div class="field">
              <label class="field__label">Nome do cargo</label>
              <input ref="nomeInputRef" v-model="form.nome" class="field__input" placeholder="Ex: Procurador do Estado" />
            </div>
            <div class="field-row">
              <div class="field">
                <label class="field__label">Nível</label>
                <select v-model="form.nivel" class="field__input">
                  <option value="">Selecione</option>
                  <option>Superior</option>
                  <option>Médio</option>
                  <option>Técnico</option>
                </select>
              </div>
              <div class="field">
                <label class="field__label">Área</label>
                <div class="autocomplete">
                  <input
                    v-model="areaSearch"
                    class="field__input"
                    placeholder="Buscar área..."
                    @focus="showAreaList = true"
                    @input="showAreaList = true"
                  />
                  <div v-if="showAreaList && filteredAreas.length" class="autocomplete__list">
                    <button
                      v-for="a in filteredAreas"
                      :key="a.id || a.nome"
                      class="autocomplete__item"
                      @click="selectArea(a.nome)"
                    >
                      {{ a.nome }}
                    </button>
                  </div>
                  <div v-if="showAreaList && areaSearch && !filteredAreas.length" class="autocomplete__list">
                    <button class="autocomplete__item autocomplete__item--create" @click="criarArea">
                      <Plus :size="12" /> Criar "{{ areaSearch }}"
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div class="field">
              <label class="field__label">Formação exigida</label>
              <input v-model="form.formacao" class="field__input" placeholder="Ex: Direito" />
            </div>
          </div>
          <div class="modal__footer">
            <button class="btn-outline" @click="closeModal">Cancelar</button>
            <button class="btn-primary" :disabled="!form.nome || saving" @click="salvarCargo">
              {{ saving ? 'Salvando...' : 'Salvar' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  Plus, ChevronLeft, Briefcase, Clock, MoreVertical,
  Pencil, Trash2, X, FileText, CalendarDays, Zap
} from 'lucide-vue-next'
import { useEditalStore } from '@/stores/useEditalStore'
import { useCargoStore } from '@/stores/useCargoStore'
import { useDictsStore } from '@/stores/useDictsStore'
import { toast } from 'vue-sonner'

const router = useRouter()
const route = useRoute()
const editalStore = useEditalStore()
const cargoStore = useCargoStore()
const dictsStore = useDictsStore()

const editalId = computed(() => route.params.id)
const edital = computed(() => editalStore.editalAtual)
const cd = computed(() => edital.value ? editalStore.countdown(edital.value.data_prova) : null)
const countdownClass = computed(() => {
  if (!cd.value) return 'countdown--neutral'
  if (cd.value.passado) return 'countdown--passed'
  if (cd.value.total < 30) return 'countdown--urgent'
  if (cd.value.total < 90) return 'countdown--warning'
  return 'countdown--ok'
})

const showModal = ref(false)
const openMenu = ref(null)
const saving = ref(false)
const editingCargo = ref(null)
const form = ref({ nome: '', nivel: '', area: '', formacao: '' })
const areaSearch = ref('')
const showAreaList = ref(false)
const initialLoad = ref(true)
const lastCreatedId = ref(null)
const nomeInputRef = ref(null)
let lastCreatedTimer = null

const filteredAreas = computed(() => {
  if (!areaSearch.value) return dictsStore.areas
  const q = areaSearch.value.toLowerCase()
  return dictsStore.areas.filter(a => a.nome.toLowerCase().includes(q))
})

function parseStatusLabel(status) {
  const labels = {
    pendente: 'Pendente',
    processando: 'Processando...',
    concluido: 'Concluído',
    parcial: 'Parcial — algumas falharam',
    erro: 'Erro',
  }
  return labels[status] || 'Pendente'
}

function selectArea(nome) {
  form.value.area = nome
  areaSearch.value = nome
  showAreaList.value = false
}

async function criarArea() {
  try {
    await dictsStore.create('area', areaSearch.value)
    form.value.area = areaSearch.value
    showAreaList.value = false
  } catch (err) {
    toast.error(err.message)
  }
}

async function abrirCriarModal() {
  editingCargo.value = null
  form.value = { nome: '', nivel: '', area: '', formacao: '' }
  areaSearch.value = ''
  showModal.value = true
  await nextTick()
  nomeInputRef.value?.focus()
}

async function editCargo(cargo) {
  editingCargo.value = cargo
  form.value = { nome: cargo.nome, nivel: cargo.nivel || '', area: cargo.area || '', formacao: cargo.formacao || '' }
  areaSearch.value = cargo.area || ''
  openMenu.value = null
  showModal.value = true
  await nextTick()
  nomeInputRef.value?.focus()
}

function closeModal() {
  showModal.value = false
  editingCargo.value = null
  form.value = { nome: '', nivel: '', area: '', formacao: '' }
  areaSearch.value = ''
}

async function salvarCargo() {
  if (!form.value.nome.trim() || saving.value) return

  // Se digitou área mas não clicou em sugestão/criar, adota o digitado
  if (areaSearch.value && !form.value.area) {
    form.value.area = areaSearch.value.trim()
  }

  saving.value = true
  try {
    if (editingCargo.value) {
      await cargoStore.updateCargo(editalId.value, editingCargo.value.id, form.value)
    } else {
      const novo = await cargoStore.createCargo(editalId.value, form.value)
      lastCreatedId.value = novo?.id || null
      if (lastCreatedTimer) clearTimeout(lastCreatedTimer)
      lastCreatedTimer = setTimeout(() => {
        if (lastCreatedId.value === novo?.id) lastCreatedId.value = null
        lastCreatedTimer = null
      }, 2400)
    }
    closeModal()
  } catch (err) {
    toast.error(err.message)
  } finally {
    saving.value = false
  }
}

async function confirmDeleteCargo(cargoId) {
  if (!confirm('Excluir este cargo e seu conteúdo?')) return
  try {
    await cargoStore.removeCargo(editalId.value, cargoId)
  } catch (err) {
    toast.error(err.message)
  }
  openMenu.value = null
}

function goToConteudo(cargoId) {
  router.push(`/editais/${editalId.value}/cargos/${cargoId}`)
}

function goToPlano(cargoId) {
  router.push(`/editais/${editalId.value}/cargos/${cargoId}/plano`)
}

function toggleMenu(id) {
  openMenu.value = openMenu.value === id ? null : id
}

function handleClickOutside() {
  if (showModal.value) return // não fecha menu enquanto modal está aberto
  openMenu.value = null
}

onMounted(async () => {
  try {
    await Promise.all([
      editalStore.fetchEdital(editalId.value),
      cargoStore.fetchCargos(editalId.value),
      dictsStore.fetchByTipo('area'),
    ])
  } finally {
    initialLoad.value = false
  }
  window.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  window.removeEventListener('click', handleClickOutside)
  if (lastCreatedTimer) clearTimeout(lastCreatedTimer)
})
</script>

<style scoped>
.cargos-view { max-width: 1100px; display: flex; flex-direction: column; gap: 24px; }

.cargos-view__header {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap;
}

.btn-ghost {
  display: flex; align-items: center; gap: 4px;
  font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500;
  background: transparent; border: none; color: #666; cursor: pointer;
  padding: 6px 10px; border-radius: 6px; transition: background 0.15s;
}
.btn-ghost:hover { background: #f5f4f0; }

.edital-resumo { flex: 1; min-width: 0; }
.edital-resumo__title { font-size: 1.1rem; font-weight: 700; color: #1a1a2e; margin: 0 0 6px; }
.edital-resumo__info { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }

.countdown-inline {
  display: flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600;
  padding: 2px 8px; border-radius: 4px;
}
.countdown--ok { background: #F0FDF4; color: #166534; }
.countdown--warning { background: #FFFBEB; color: #92400E; }
.countdown--urgent { background: #FEF2F2; color: #991B1B; }
.countdown--passed { background: #F8FAFC; color: #94A3B8; }
.countdown--neutral { background: #F8FAFC; color: #94A3B8; }

.badge {
  font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px;
  text-transform: uppercase; letter-spacing: 0.04em;
}
.badge--orgao { background: #EEF2FF; color: #4338CA; }
.badge--banca { background: #FFF7ED; color: #9A3412; }
.badge--ano { background: #F8FAFC; color: #475569; }

/* Grid */
.cargos-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px;
}

/* Cargo card */
.cargo-card {
  background: #fff; border: 1px solid #ebe9e4; border-radius: 14px; padding: 20px;
  display: flex; flex-direction: column; gap: 12px;
  cursor: pointer; transition: border-color 0.15s, transform 0.15s, box-shadow 0.3s;
}
.cargo-card:hover { border-color: #AFA9EC; transform: translateY(-2px); }

.cargo-card--new {
  animation: cargoEnter 0.6s ease-out, cargoPulse 2s ease-out 0.6s;
  border-color: #16A34A;
}
@keyframes cargoEnter {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes cargoPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0); }
  20%      { box-shadow: 0 0 0 6px rgba(22, 163, 74, 0.18); }
}

/* Skeleton */
.cargo-card--skeleton { cursor: default; pointer-events: none; gap: 10px; }
.cargo-card--skeleton:hover { transform: none; border-color: #ebe9e4; }
.skeleton-line {
  background: linear-gradient(90deg, #f0efea 0%, #fafaf8 50%, #f0efea 100%);
  background-size: 200% 100%;
  animation: skeletonShine 1.4s ease-in-out infinite;
  border-radius: 6px;
}
.skeleton-line--icon    { width: 36px; height: 36px; border-radius: 10px; }
.skeleton-line--title   { width: 75%;  height: 14px; }
.skeleton-line--tags    { width: 55%;  height: 16px; }
.skeleton-line--status  { width: 45%;  height: 22px; border-radius: 999px; }
.skeleton-line--actions { width: 65%;  height: 28px; }
@keyframes skeletonShine {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.cargo-card__top { display: flex; align-items: flex-start; gap: 12px; }
.cargo-card__icon {
  width: 36px; height: 36px; border-radius: 10px; background: #534AB7; color: #fff;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.cargo-card__meta { flex: 1; min-width: 0; }
.cargo-card__title { font-size: 14px; font-weight: 700; color: #1a1a2e; margin: 0 0 6px; }
.cargo-card__details { display: flex; flex-wrap: wrap; gap: 4px; }
.tag {
  font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 4px;
  background: #F3F4F6; color: #4B5563;
}
.tag--light { background: #F9FAFB; color: #9CA3AF; }

.cargo-card__status {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
}
.parse-badge {
  font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 20px;
}
.parse-badge--pendente { background: #F3F4F6; color: #6B7280; }
.parse-badge--processando { background: #EFF6FF; color: #2563EB; animation: pulse 1.5s infinite; }
.parse-badge--concluido { background: #F0FDF4; color: #16A34A; }
.parse-badge--parcial { background: #FFFBEB; color: #B45309; }
.parse-badge--erro { background: #FEF2F2; color: #DC2626; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }

.cargo-card__disc-count { font-size: 11px; color: #aaa; }

.cargo-card__actions {
  display: flex; gap: 6px; border-top: 1px solid #f5f4f0; padding-top: 12px;
}
.btn-sm {
  display: flex; align-items: center; gap: 5px;
  font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 600;
  background: #fff; color: #444; border: 1px solid #ddd; border-radius: 6px;
  padding: 5px 10px; cursor: pointer; transition: background 0.15s;
}
.btn-sm:hover { background: #f5f4f0; }
.btn-sm--accent { background: #F0FDF4; color: #16A34A; border-color: #BBF7D0; }
.btn-sm--accent:hover { background: #DCFCE7; }
.btn-sm--secondary { background: #FFFBEB; color: #B45309; border-color: #FED7AA; }
.btn-sm--secondary:hover { background: #FEF3C7; }

/* Cargo menu */
.cargo-card__menu { position: relative; }

/* Shared styles */
.dropdown {
  position: absolute; top: 30px; right: 0; background: #fff; border: 1px solid #ebe9e4;
  border-radius: 10px; padding: 4px; min-width: 150px; z-index: 50;
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
}
.dropdown__item {
  display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 10px;
  border: none; background: transparent; border-radius: 6px; font-family: 'DM Sans', sans-serif;
  font-size: 13px; color: #444; cursor: pointer; text-align: left; transition: background 0.15s;
}
.dropdown__item:hover { background: #f5f4f0; }
.dropdown__item--danger { color: #c0392b; }
.dropdown__item--danger:hover { background: #fdf0ef; }
.dropdown__divider { height: 1px; background: #f0efea; margin: 4px 0; }

.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 100;
  display: flex; align-items: center; justify-content: center; padding: 20px;
}
.modal {
  background: #fff; border-radius: 16px; width: 100%; max-width: 480px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15); overflow: hidden;
}
.modal__header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px; border-bottom: 1px solid #ebe9e4;
}
.modal__title { font-size: 16px; font-weight: 700; color: #1a1a2e; margin: 0; }
.modal__body { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.modal__footer {
  display: flex; justify-content: flex-end; gap: 8px;
  padding: 16px 24px; border-top: 1px solid #ebe9e4;
}

.field { display: flex; flex-direction: column; gap: 4px; }
.field__label { font-size: 12px; font-weight: 600; color: #666; }
.field__input {
  padding: 8px 12px; border: 1px solid #ddd; border-radius: 8px;
  font-family: 'DM Sans', sans-serif; font-size: 13px; color: #1a1a2e;
  transition: border-color 0.15s;
}
.field__input:focus { outline: none; border-color: #534AB7; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.autocomplete { position: relative; }
.autocomplete__list {
  position: absolute; top: 100%; left: 0; right: 0; background: #fff;
  border: 1px solid #ebe9e4; border-radius: 8px; margin-top: 4px;
  max-height: 200px; overflow-y: auto; z-index: 10;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}
.autocomplete__item {
  display: flex; align-items: center; gap: 6px; width: 100%; padding: 8px 12px;
  border: none; background: transparent; font-family: 'DM Sans', sans-serif;
  font-size: 13px; color: #444; cursor: pointer; text-align: left;
}
.autocomplete__item:hover { background: #f5f4f0; }
.autocomplete__item--create { color: #534AB7; font-weight: 600; }

.btn-primary {
  display: flex; align-items: center; gap: 6px;
  font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600;
  background: #534AB7; color: #fff; border: none; border-radius: 8px; padding: 8px 16px;
  cursor: pointer; transition: background 0.15s;
}
.btn-primary:hover { background: #3C3489; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-outline {
  display: flex; align-items: center; gap: 6px;
  font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500;
  background: #fff; color: #444; border: 1px solid #ddd; border-radius: 8px; padding: 7px 14px;
  cursor: pointer; transition: background 0.15s;
}
.btn-outline:hover { background: #f5f4f0; }

.icon-btn {
  width: 28px; height: 28px; border-radius: 7px; border: none; background: transparent;
  padding: 0; display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #aaa; transition: background 0.15s, color 0.15s;
}
.icon-btn:hover { background: #f0efea; color: #444; }

.empty-state {
  display: flex; flex-direction: column; align-items: center; text-align: center;
  padding: 64px 24px; gap: 12px; color: #ccc;
}
.empty-state__title { font-size: 16px; font-weight: 700; color: #1a1a2e; margin: 0; }
.empty-state__desc { font-size: 13px; color: #aaa; max-width: 360px; margin: 0; line-height: 1.6; }
</style>
