<template>
  <div class="editais" style="font-family: 'DM Sans', sans-serif;">

    <!-- Header -->
    <div class="editais__header">
      <div>
        <h1 class="editais__title">Meus Editais</h1>
        <p class="editais__sub">Cadastre e gerencie seus editais de concurso</p>
      </div>
      <button class="btn-primary" @click="abrirCriarModal">
        <Plus :size="14" /> Novo Edital
      </button>
    </div>

    <!-- Skeleton durante o primeiro fetch -->
    <div v-if="initialLoad && !editalStore.editais.length" class="editais-grid">
      <div v-for="i in 6" :key="i" class="edital-card edital-card--skeleton">
        <div class="skeleton-line skeleton-line--icon" />
        <div class="skeleton-line skeleton-line--title" />
        <div class="skeleton-line skeleton-line--badges" />
        <div class="skeleton-line skeleton-line--countdown" />
        <div class="skeleton-line skeleton-line--footer" />
      </div>
    </div>

    <!-- Lista de editais -->
    <div v-else-if="editalStore.editais.length" class="editais-grid">
      <div
        v-for="edital in editalStore.editais"
        :key="edital.id"
        class="edital-card"
        :class="{ 'edital-card--new': edital.id === lastCreatedId }"
        @click="goToCargos(edital.id)"
      >
        <div class="edital-card__top">
          <div class="edital-card__icon">
            <FileText :size="18" />
          </div>
          <div class="edital-card__meta">
            <h3 class="edital-card__title">{{ edital.nome }}</h3>
            <div class="edital-card__badges">
              <span class="badge badge--orgao">{{ edital.orgao }}</span>
              <span v-if="edital.estado" class="badge badge--estado">{{ edital.estado }}</span>
              <span class="badge badge--banca">{{ edital.banca }}</span>
              <span class="badge badge--ano">{{ edital.ano }}</span>
            </div>
          </div>
          <div class="edital-card__menu" @click.stop>
            <button class="icon-btn" @click="toggleMenu(edital.id)">
              <MoreVertical :size="14" />
            </button>
            <div v-if="openMenu === edital.id" class="dropdown">
              <button class="dropdown__item" @click="editEdital(edital)">
                <Pencil :size="13" /> Editar
              </button>
              <div class="dropdown__divider" />
              <button class="dropdown__item dropdown__item--danger" @click="confirmDelete(edital.id)">
                <Trash2 :size="13" /> Excluir
              </button>
            </div>
          </div>
        </div>

        <!-- Countdown -->
        <div class="edital-card__countdown" :class="countdownClass(edital.data_prova)">
          <Clock :size="14" />
          <span>{{ countdownLabel(edital.data_prova) }}</span>
        </div>

        <!-- Info extra -->
        <div class="edital-card__footer">
          <a v-if="edital.link" :href="edital.link" target="_blank" class="edital-card__link" @click.stop>
            <ExternalLink :size="12" /> Ver edital
          </a>
          <span class="edital-card__cargos-count">
            <Briefcase :size="12" /> {{ cargosCounts[edital.id] || 0 }} cargo(s)
          </span>
        </div>
      </div>
    </div>

    <!-- Empty state — só aparece após o primeiro fetch terminar -->
    <div v-else-if="!initialLoad" class="empty-state">
      <div class="empty-state__icon"><FileText :size="40" /></div>
      <h3 class="empty-state__title">Nenhum edital cadastrado</h3>
      <p class="empty-state__desc">
        Cadastre seu primeiro edital para começar a organizar seus estudos.
      </p>
      <button class="btn-primary" @click="abrirCriarModal">
        <Plus :size="14" /> Cadastrar primeiro edital
      </button>
    </div>

    <!-- Modal Novo/Editar Edital -->
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
            <h2 class="modal__title">{{ editingEdital ? 'Editar Edital' : 'Novo Edital' }}</h2>
            <button class="icon-btn" @click="closeModal"><X :size="16" /></button>
          </div>

          <div class="modal__body">
            <!-- Nome do edital -->
            <div class="field">
              <label class="field__label">Nome do edital</label>
              <input
                ref="nomeInputRef"
                v-model="form.nome"
                class="field__input"
                placeholder="Ex: EDITAL Nº 1 – PGE/AL, DE 31 DE MARÇO DE 2026"
                @input="onNomeChange"
              />
              <span class="field__hint">Cole o nome completo — órgão, estado e ano serão preenchidos automaticamente</span>
            </div>

            <div class="field-row">
              <div class="field">
                <label class="field__label">Órgão</label>
                <input v-model="form.orgao" class="field__input" placeholder="PGE/AL" />
              </div>
              <div class="field">
                <label class="field__label">Estado</label>
                <input v-model="form.estado" class="field__input" placeholder="AL" maxlength="2" />
              </div>
              <div class="field">
                <label class="field__label">Ano</label>
                <input v-model.number="form.ano" class="field__input" type="number" placeholder="2026" />
              </div>
            </div>

            <!-- Banca com autocomplete -->
            <div class="field">
              <label class="field__label">Banca</label>
              <div class="autocomplete">
                <input
                  v-model="bancaSearch"
                  class="field__input"
                  placeholder="Digite para buscar..."
                  @focus="showBancaList = true"
                  @input="showBancaList = true"
                />
                <div v-if="showBancaList && filteredBancas.length" class="autocomplete__list">
                  <button
                    v-for="b in filteredBancas"
                    :key="b.id || b.nome"
                    class="autocomplete__item"
                    @click="selectBanca(b.nome)"
                  >
                    {{ b.nome }}
                  </button>
                </div>
                <div v-if="showBancaList && bancaSearch && !filteredBancas.length" class="autocomplete__list">
                  <button class="autocomplete__item autocomplete__item--create" @click="criarBanca">
                    <Plus :size="12" /> Criar "{{ bancaSearch }}"
                  </button>
                </div>
              </div>
            </div>

            <div class="field-row">
              <div class="field">
                <label class="field__label">Link do edital</label>
                <input v-model="form.link" class="field__input" placeholder="https://..." />
              </div>
              <div class="field">
                <label class="field__label">Data da prova</label>
                <input v-model="form.data_prova" class="field__input" type="date" />
              </div>
            </div>
          </div>

          <div class="modal__footer">
            <button class="btn-outline" @click="closeModal">Cancelar</button>
            <button class="btn-primary" :disabled="!form.nome || saving" @click="salvar">
              {{ saving ? 'Salvando...' : 'Salvar' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, FileText, MoreVertical, Pencil, Trash2, X, Clock, ExternalLink, Briefcase } from 'lucide-vue-next'
import { useEditalStore } from '@/stores/useEditalStore'
import { useDictsStore } from '@/stores/useDictsStore'
import { cargoService } from '@/services/cargo.service'
import { parseNomeEdital } from '@/utils/editalParser'
import { toast } from 'vue-sonner'

const router = useRouter()
const editalStore = useEditalStore()
const dictsStore = useDictsStore()

const showModal = ref(false)
const openMenu = ref(null)
const saving = ref(false)
const editingEdital = ref(null)
const cargosCounts = ref({})
const initialLoad = ref(true)
const lastCreatedId = ref(null)
const nomeInputRef = ref(null)
let lastCreatedTimer = null

const form = ref({ nome: '', ano: null, orgao: '', estado: '', banca: '', link: '', data_prova: '' })
const bancaSearch = ref('')
const showBancaList = ref(false)

const filteredBancas = computed(() => {
  if (!bancaSearch.value) return dictsStore.bancas
  const q = bancaSearch.value.toLowerCase()
  return dictsStore.bancas.filter(b => b.nome.toLowerCase().includes(q))
})

function getCountdown(dataProva) {
  return editalStore.countdown(dataProva)
}

function countdownClass(dataProva) {
  const c = getCountdown(dataProva)
  if (!c) return 'countdown--neutral'
  if (c.passado) return 'countdown--passed'
  if (c.total < 30) return 'countdown--urgent'
  if (c.total < 90) return 'countdown--warning'
  return 'countdown--ok'
}

function countdownLabel(dataProva) {
  const c = getCountdown(dataProva)
  if (!c) return 'Data da prova não definida'
  if (c.passado) return 'Prova já realizada'
  if (c.total === 0) return 'Hoje!'
  if (c.total === 1) return 'Amanhã'
  if (c.total < 7) return `${c.total} dias`
  if (c.total < 30) return `${c.semanas}sem ${c.dias}d (${c.total} dias)`
  return `${c.semanas}sem (${c.total} dias)`
}

function onNomeChange() {
  const parsed = parseNomeEdital(form.value.nome)
  if (parsed.orgao) form.value.orgao = parsed.orgao
  if (parsed.estado) form.value.estado = parsed.estado
  if (parsed.ano) form.value.ano = parsed.ano
}

function selectBanca(nome) {
  form.value.banca = nome
  bancaSearch.value = nome
  showBancaList.value = false
}

async function criarBanca() {
  try {
    await dictsStore.create('banca', bancaSearch.value)
    form.value.banca = bancaSearch.value
    showBancaList.value = false
  } catch (err) {
    toast.error(err.message)
  }
}

async function abrirCriarModal() {
  // Garante state limpo (defesa contra resíduos de modal anterior)
  editingEdital.value = null
  form.value = { nome: '', ano: null, orgao: '', estado: '', banca: '', link: '', data_prova: '' }
  bancaSearch.value = ''
  showModal.value = true
  await nextTick()
  nomeInputRef.value?.focus()
}

async function editEdital(edital) {
  editingEdital.value = edital
  form.value = {
    nome: edital.nome,
    ano: edital.ano,
    orgao: edital.orgao,
    estado: edital.estado,
    banca: edital.banca,
    link: edital.link || '',
    data_prova: edital.data_prova ? edital.data_prova.split('T')[0] : '',
  }
  bancaSearch.value = edital.banca || ''
  openMenu.value = null
  showModal.value = true
  await nextTick()
  nomeInputRef.value?.focus()
}

function closeModal() {
  showModal.value = false
  editingEdital.value = null
  form.value = { nome: '', ano: null, orgao: '', estado: '', banca: '', link: '', data_prova: '' }
  bancaSearch.value = ''
}

async function salvar() {
  if (!form.value.nome.trim() || saving.value) return

  // Se o usuário digitou banca mas não clicou em sugestão/criar,
  // adota o que está escrito como valor final.
  if (bancaSearch.value && !form.value.banca) {
    form.value.banca = bancaSearch.value.trim()
  }

  saving.value = true
  try {
    if (editingEdital.value) {
      await editalStore.updateEdital(editingEdital.value.id, form.value)
    } else {
      const novo = await editalStore.createEdital(form.value)
      // Highlight visual do card recém-criado (animação some após 2s)
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

async function confirmDelete(id) {
  if (!confirm('Excluir este edital? Todos os cargos associados também serão removidos.')) return
  try {
    await editalStore.removeEdital(id)
  } catch (err) {
    toast.error(err.message)
  }
  openMenu.value = null
}

function goToCargos(id) {
  router.push(`/editais/${id}/cargos`)
}

function toggleMenu(id) {
  openMenu.value = openMenu.value === id ? null : id
}

// Fecha menus ao clicar fora — mas não se houver modal aberto (clique no overlay
// já é tratado pelo @click.self do modal)
function handleClickOutside() {
  if (showModal.value) return
  openMenu.value = null
}

// Carrega contagem de cargos por edital (em paralelo)
async function loadCargosCounts() {
  const counts = await Promise.all(
    editalStore.editais.map(async (edital) => {
      try {
        const cargos = await cargoService.list(edital.id)
        return [edital.id, cargos.length]
      } catch {
        return [edital.id, 0]
      }
    })
  )
  cargosCounts.value = Object.fromEntries(counts)
}

onMounted(async () => {
  try {
    await Promise.all([
      editalStore.fetchEditais(),
      dictsStore.fetchByTipo('banca'),
    ])
    await loadCargosCounts()
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
.editais { max-width: 1100px; display: flex; flex-direction: column; gap: 24px; }

.editais__header {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap;
}
.editais__title { font-size: 1.25rem; font-weight: 700; color: #1a1a2e; margin: 0; }
.editais__sub { font-size: 12px; color: #aaa; margin: 4px 0 0; }

/* Grid */
.editais-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 14px;
}

/* Card */
.edital-card {
  background: #fff; border: 1px solid #ebe9e4; border-radius: 14px; padding: 20px;
  display: flex; flex-direction: column; gap: 14px;
  cursor: pointer; transition: border-color 0.15s, transform 0.15s, box-shadow 0.3s;
}
.edital-card:hover { border-color: #AFA9EC; transform: translateY(-2px); }

/* Highlight para card recém-criado */
.edital-card--new {
  animation: cardEnter 0.6s ease-out, cardPulse 2s ease-out 0.6s;
  border-color: #16A34A;
}
@keyframes cardEnter {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes cardPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0); }
  20%      { box-shadow: 0 0 0 6px rgba(22, 163, 74, 0.18); }
}

/* Skeleton durante o primeiro fetch */
.edital-card--skeleton {
  cursor: default; pointer-events: none; gap: 10px;
}
.edital-card--skeleton:hover { transform: none; border-color: #ebe9e4; }
.skeleton-line {
  background: linear-gradient(90deg, #f0efea 0%, #fafaf8 50%, #f0efea 100%);
  background-size: 200% 100%;
  animation: skeletonShine 1.4s ease-in-out infinite;
  border-radius: 6px;
}
.skeleton-line--icon     { width: 38px; height: 38px; border-radius: 10px; }
.skeleton-line--title    { width: 80%;  height: 14px; }
.skeleton-line--badges   { width: 60%;  height: 18px; }
.skeleton-line--countdown { width: 50%; height: 28px; border-radius: 8px; }
.skeleton-line--footer   { width: 70%;  height: 12px; }
@keyframes skeletonShine {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.edital-card__top { display: flex; align-items: flex-start; gap: 12px; }
.edital-card__icon {
  width: 38px; height: 38px; border-radius: 10px; background: #1a1a2e; color: #fff;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.edital-card__meta { flex: 1; min-width: 0; }
.edital-card__title {
  font-size: 14px; font-weight: 700; color: #1a1a2e; margin: 0 0 6px;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}

.edital-card__badges { display: flex; flex-wrap: wrap; gap: 4px; }
.badge {
  font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px;
  text-transform: uppercase; letter-spacing: 0.04em;
}
.badge--orgao { background: #EEF2FF; color: #4338CA; }
.badge--estado { background: #F0FDF4; color: #166534; }
.badge--banca { background: #FFF7ED; color: #9A3412; }
.badge--ano { background: #F8FAFC; color: #475569; }

/* Countdown */
.edital-card__countdown {
  display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600;
  padding: 8px 12px; border-radius: 8px;
}
.countdown--ok { background: #F0FDF4; color: #166534; }
.countdown--warning { background: #FFFBEB; color: #92400E; }
.countdown--urgent { background: #FEF2F2; color: #991B1B; }
.countdown--passed { background: #F8FAFC; color: #94A3B8; }
.countdown--neutral { background: #F8FAFC; color: #94A3B8; }

/* Footer */
.edital-card__footer {
  display: flex; align-items: center; gap: 14px; font-size: 12px; color: #888;
}
.edital-card__link {
  display: flex; align-items: center; gap: 4px; color: #534AB7;
  text-decoration: none; font-weight: 500;
}
.edital-card__link:hover { text-decoration: underline; }
.edital-card__cargos-count { display: flex; align-items: center; gap: 4px; }

/* Menu */
.edital-card__menu { position: relative; }
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

/* Modal */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 100;
  display: flex; align-items: center; justify-content: center; padding: 20px;
}
.modal {
  background: #fff; border-radius: 16px; width: 100%; max-width: 560px;
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

/* Fields */
.field { display: flex; flex-direction: column; gap: 4px; }
.field__label { font-size: 12px; font-weight: 600; color: #666; }
.field__input {
  padding: 8px 12px; border: 1px solid #ddd; border-radius: 8px;
  font-family: 'DM Sans', sans-serif; font-size: 13px; color: #1a1a2e;
  transition: border-color 0.15s;
}
.field__input:focus { outline: none; border-color: #534AB7; }
.field__hint { font-size: 11px; color: #aaa; }
.field-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
@media (max-width: 500px) { .field-row { grid-template-columns: 1fr; } }

/* Autocomplete */
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

/* Buttons */
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

/* Empty state */
.empty-state {
  display: flex; flex-direction: column; align-items: center; text-align: center;
  padding: 64px 24px; gap: 12px; color: #ccc;
}
.empty-state__title { font-size: 16px; font-weight: 700; color: #1a1a2e; margin: 0; }
.empty-state__desc { font-size: 13px; color: #aaa; max-width: 360px; margin: 0; line-height: 1.6; }
</style>
