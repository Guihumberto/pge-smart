<template>
  <div class="modal-overlay">
    <div class="modal">

      <!-- Header -->
      <div class="modal__header">
        <h3 class="modal__title">{{ isEditing ? 'Editar Tarefa' : 'Nova Tarefa' }}</h3>
        <button class="modal__close" @click="$emit('close')" title="Fechar">
          <X :size="16" />
        </button>
      </div>

      <!-- Tipo -->
      <div class="field">
        <label class="field__label">Tipo de tarefa</label>
        <div class="type-grid">
          <button
            v-for="t in taskTypes"
            :key="t.value"
            :class="['type-btn', `type-btn--${t.value}`, { 'type-btn--active': form.type === t.value }]"
            @click="form.type = t.value"
          >
            <component :is="t.icon" :size="14" />
            {{ t.label }}
          </button>
        </div>
      </div>

      <div class="divider" />

      <!-- Título -->
      <div class="field">
        <label class="field__label">Título <span class="field__required">*</span></label>
        <input v-model="form.title" class="field__input" placeholder="Ex: Leitura dos art. 1 a 10 da CF" />
      </div>

      <!-- Descrição -->
      <div class="field">
        <label class="field__label">Descrição</label>
        <textarea v-model="form.description" class="field__textarea" placeholder="Contexto ou observações sobre esta tarefa" />
      </div>

      <!-- Link -->
      <div class="field">
        <label class="field__label">Link</label>
        <div class="field__input-icon">
          <Link2 :size="13" class="field__icon" />
          <input v-model="form.link" class="field__input field__input--padded" placeholder="https://..." />
        </div>
      </div>

      <!-- Orientação -->
      <div class="field">
        <label class="field__label">
          Orientação de execução
          <button class="field__label-action" @click="showOrientationManager = !showOrientationManager">
            <Settings2 :size="11" /> Gerenciar
          </button>
        </label>

        <select v-model="form.orientationId" class="field__select">
          <option :value="null">— Nenhuma orientação —</option>
          <option v-for="o in orientationStore.orientations" :key="o.id" :value="o.id">
            {{ o.title }}
          </option>
        </select>

        <!-- Preview da orientação selecionada -->
        <div v-if="selectedOrientation" class="orientation-preview">
          <BookOpen :size="12" />
          {{ selectedOrientation.body }}
        </div>

        <!-- Gerenciador inline de orientações -->
        <div v-if="showOrientationManager" class="orientation-manager">
          <div class="orientation-manager__head">
            <span>Orientações cadastradas</span>
            <button class="btn-add-small" @click="startNewOrientation">
              <Plus :size="11" /> Nova
            </button>
          </div>

          <div v-if="editingOrientation" class="orientation-form">
            <input v-model="orientationForm.title" class="field__input" placeholder="Título da orientação" />
            <textarea v-model="orientationForm.body" class="field__textarea" placeholder="Texto da orientação..." />
            <div class="orientation-form__actions">
              <button class="btn-ghost-sm" @click="editingOrientation = null">Cancelar</button>
              <button class="btn-primary-sm" @click="saveOrientation">Salvar</button>
            </div>
          </div>

          <div
            v-for="o in orientationStore.orientations"
            :key="o.id"
            class="orientation-item"
          >
            <div class="orientation-item__title">{{ o.title }}</div>
            <div class="orientation-item__body">{{ o.body }}</div>
            <div class="orientation-item__actions">
              <button class="btn-link" @click="startEditOrientation(o)"><Pencil :size="11" /> Editar</button>
              <button class="btn-link btn-link--danger" @click="orientationStore.remove(o.id)"><Trash2 :size="11" /> Excluir</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Campos exclusivos: Lei Seca -->
      <template v-if="form.type === 'lei_seca'">
        <div class="divider" />
        <div class="lei-seca-section">
          <div class="lei-seca-section__badge">
            <Scale :size="12" /> Lei Seca
          </div>

          <div class="field">
            <label class="field__label">Lei / Norma</label>
            <div class="autocomplete" @click.stop>
              <input
                v-model="lawSearch"
                class="field__input"
                placeholder="Buscar lei ou norma..."
                @input="onLawSearchInput"
                @focus="showLawDropdown = true"
              />
              <div v-if="selectedLaw" class="autocomplete__selected">
                <span>{{ selectedLaw.name }}</span> 
                <button type="button" class="autocomplete__clear" @click="clearLaw">×</button>
              </div>
              <div v-if="showLawDropdown && (lawResults.length || lawSearchLoading)" class="autocomplete__list">
                <div v-if="lawSearchLoading" class="autocomplete__loading">
                  <span class="autocomplete__spinner"></span> Buscando...
                </div>
                <button
                  v-for="law in lawResults"
                  :key="law.id"
                  type="button"
                  class="autocomplete__option"
                  @click="selectLaw(law)"
                >
                  {{ law.name }}
                </button>
                <div v-if="!lawSearchLoading && !lawResults.length && lawSearch.length >= 2" class="autocomplete__empty">
                  Nenhuma lei encontrada
                </div>
              </div>
            </div>
          </div>

          <div class="field">
            <label class="field__label">
              Artigos a estudar
              <span class="field__hint">Ex: 1 a 5, 45, 100 a 102</span>
            </label>
            <input
              v-model="form.articlesRaw"
              class="field__input"
              :class="{ 'field__input--error': articleError }"
              placeholder="1 a 5, 45, 100 a 102"
              @input="validateArticles"
            />
            <p v-if="articleError" class="field__error">{{ articleError }}</p>

            <!-- Preview dos artigos resolvidos -->
            <div v-if="resolvedArticles.length" class="articles-preview">
              <span class="articles-preview__label">Artigos identificados:</span>
              <div class="articles-preview__tags">
                <span
                  v-for="n in resolvedArticles"
                  :key="n"
                  class="article-tag"
                >
                  {{ n }}
                </span>
              </div>
              <span class="articles-preview__count">{{ resolvedArticles.length }} artigo(s)</span>
            </div>
          </div>

          <!-- ── Configuração de visualização ──────────────── -->
          <div class="law-config">
            <div class="law-config__title">
              <Eye :size="12" /> Configurar visualização da tarefa
            </div>

            <!-- Opções booleanas -->
            <div class="law-config__checks">
              <label class="check-item">
                <input type="checkbox" v-model="form.filterLaw.compilado" />
                <span>Versão compilada</span>
              </label>
              <label class="check-item">
                <input type="checkbox" v-model="form.filterLaw.withMarks" />
                <span>Com marcações</span>
              </label>
            </div>

            <!-- Tags -->
            <div class="law-config__row">
              <label class="check-item">
                <input type="checkbox" v-model="form.filterLaw.withTags" />
                <span>Filtrar por tags</span>
              </label>
              <div v-if="form.filterLaw.withTags" class="tag-input-wrap">
                <div class="tag-pills">
                  <span
                    v-for="(tag, i) in form.filterLaw.tagsFilter"
                    :key="tag"
                    class="tag-pill"
                  >
                    <Tag :size="10" /> {{ tag }}
                    <button type="button" class="tag-pill__remove" @click="removeTag(i)">×</button>
                  </span>
                  <input
                    v-model="tagInput"
                    class="tag-input-field"
                    placeholder="Digite e pressione Enter"
                    @keydown.enter.prevent="addTag"
                    @keydown.exact.prevent.capture="tagInput.endsWith(',') && addTag()"
                  />
                </div>
                <p class="field__hint" style="margin-top:4px">Pressione Enter para adicionar cada tag</p>
              </div>
            </div>

            <!-- Questões -->
            <div class="law-config__row">
              <label class="check-item">
                <input type="checkbox" v-model="form.filterLaw.withQuestions" />
                <span>Incluir questões vinculadas aos artigos</span>
              </label>
            </div>

            <!-- formQuestions (quando withQuestions ativo) -->
            <div v-if="form.filterLaw.withQuestions" class="questions-config" @click.stop>
              <div class="questions-config__title">
                <MessageSquare :size="11" /> Filtros de questões
              </div>

              <!-- Tipo de questão -->
              <div class="field">
                <label class="field__label">Tipo de questão</label>
                <select v-model="form.formQuestions.typeRespQuestions" class="field__select">
                  <option :value="1">Múltipla escolha</option>
                  <option :value="2">Certo ou Errado</option>
                  <option :value="3">Discursiva</option>
                </select>
              </div>

              <!-- Banca -->
              <div class="field">
                <label class="field__label">Banca</label>
                <div class="ms" @click.stop>
                  <button type="button" class="ms__trigger" @click="toggleDropdown('banca')">
                    <span class="ms__label">{{ bancaLabel }}</span>
                    <ChevronDown :size="12" :class="{ 'ms__chevron--open': openDropdown === 'banca' }" class="ms__chevron" />
                  </button>
                  <div v-if="openDropdown === 'banca'" class="ms__list">
                    <label v-for="b in BANCAS" :key="b" class="ms__option">
                      <input type="checkbox" :value="b" v-model="form.formQuestions.banca" />
                      {{ b }}
                    </label>
                  </div>
                </div>
              </div>

              <!-- Disciplina -->
              <div class="field">
                <label class="field__label">Disciplina</label>
                <div class="ms" @click.stop>
                  <button type="button" class="ms__trigger" @click="toggleDropdown('disciplina')">
                    <span class="ms__label">{{ disciplinaLabel }}</span>
                    <ChevronDown :size="12" :class="{ 'ms__chevron--open': openDropdown === 'disciplina' }" class="ms__chevron" />
                  </button>
                  <div v-if="openDropdown === 'disciplina'" class="ms__list ms__list--tall">
                    <div class="ms__search-wrap">
                      <input
                        v-model="discSearch"
                        class="ms__search"
                        placeholder="Buscar disciplina..."
                        @click.stop
                      />
                    </div>
                    <label v-for="d in filteredDisciplinas" :key="d.id" class="ms__option">
                      <input type="checkbox" :value="d.id" v-model="form.formQuestions.id_disciplina" />
                      {{ d.name }}
                    </label>
                  </div>
                </div>
              </div>

              <!-- Área -->
              <div class="field">
                <label class="field__label">Área de atuação</label>
                <div class="ms" @click.stop>
                  <button type="button" class="ms__trigger" @click="toggleDropdown('area')">
                    <span class="ms__label">{{ areaLabel }}</span>
                    <ChevronDown :size="12" :class="{ 'ms__chevron--open': openDropdown === 'area' }" class="ms__chevron" />
                  </button>
                  <div v-if="openDropdown === 'area'" class="ms__list">
                    <label v-for="a in AREAS" :key="a.id" class="ms__option">
                      <input type="checkbox" :value="a.id" v-model="form.formQuestions.id_area" />
                      {{ a.name }}
                    </label>
                  </div>
                </div>
              </div>

              <!-- Ano -->
              <div class="field">
                <label class="field__label">Ano</label>
                <div class="ms" @click.stop>
                  <button type="button" class="ms__trigger" @click="toggleDropdown('ano')">
                    <span class="ms__label">{{ anoLabel }}</span>
                    <ChevronDown :size="12" :class="{ 'ms__chevron--open': openDropdown === 'ano' }" class="ms__chevron" />
                  </button>
                  <div v-if="openDropdown === 'ano'" class="ms__list ms__list--grid">
                    <label v-for="a in ANOS" :key="a" class="ms__option ms__option--compact">
                      <input type="checkbox" :value="a" v-model="form.formQuestions.ano" />
                      {{ a }}
                    </label>
                  </div>
                </div>
              </div>

              <!-- Somente favoritas -->
              <label class="check-item">
                <input type="checkbox" v-model="form.formQuestions.favoritas" />
                <span>Somente questões favoritas</span>
              </label>

              <!-- Contador de questões -->
              <div class="question-count">
                <template v-if="countLoading">
                  <span class="question-count__spinner"></span>
                  Contando questões...
                </template>
                <template v-else>
                  <span class="question-count__value">{{ questionCount.toLocaleString('pt-BR') }}</span>
                  questões encontradas com esses filtros
                </template>
              </div>

              <!-- Gerar Orientação IA -->
              <div v-if="questionCount > 0 && !countLoading" class="orientation-ia-section">
                <template v-if="isEditing && props.task?.id">
                  <template v-if="props.task?.orientationDocId">
                    <button class="btn-orientation" @click="viewOrientation">
                      <Sparkles :size="13" /> Ver Orientação
                    </button>
                    <button class="btn-link" @click="regenerateOrientation" :disabled="orientationGenerating">
                      {{ orientationGenerating ? 'Regenerando...' : 'Regenerar' }}
                    </button>
                  </template>
                  <template v-else>
                    <button
                      class="btn-orientation"
                      :disabled="orientationGenerating"
                      @click="generateOrientation"
                    >
                      <Sparkles :size="13" />
                      {{ orientationGenerating ? 'Gerando orientação...' : 'Gerar Orientação IA' }}
                    </button>
                    <div v-if="orientationGenerating" class="orientation-progress">
                      <span class="question-count__spinner"></span>
                      Analisando questões e gerando orientação... isso pode levar até 1 minuto.
                    </div>
                  </template>
                </template>
                <template v-else>
                  <button class="btn-orientation" disabled title="Salve a tarefa primeiro">
                    <Sparkles :size="13" /> Gerar Orientação IA
                  </button>
                  <p class="field__hint">Salve a tarefa primeiro para gerar a orientação.</p>
                </template>
                <p v-if="orientationError" class="field__error">{{ orientationError }}</p>
              </div>
            </div>
          </div>
        </div>
      </template>

      <div class="divider" />

      <!-- Ações -->
      <div class="modal__footer">
        <button class="btn-ghost" @click="$emit('close')">Cancelar</button>
        <div class="modal__footer-save">
          <button
            class="btn-primary"
            :disabled="!isValid || saving"
            @click="save(true)"
          >
            {{ saving ? 'Salvando...' : (isEditing ? 'Salvar alterações' : 'Criar tarefa') }}
          </button>
          <button
            class="btn-save-stay"
            title="Salvar sem fechar"
            :disabled="!isValid || saving"
            @click.stop="save(false)"
          >
            <Save :size="14" />
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import {
  X, Link2, Settings2, BookOpen, Plus, Pencil,
  Trash2, Scale, FileText, HelpCircle, Video,
  RefreshCw, MoreHorizontal, Eye, Tag, MessageSquare, ChevronDown, Sparkles, Save
} from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useTaskStore } from '@/stores/useTaskStore'
import { useDisciplineStore } from '@/stores/useDisciplineStore'
import { useOrientationStore } from '@/stores/useOrientationStore'
import { parseArticles } from '@/utils/articleParser'
import { questionService } from '@/services/question.service'
import { taskOrientationService } from '@/services/taskOrientation.service'
import { lawService } from '@/services/law.service'
import { BANCAS, DISCIPLINAS, AREAS, ANOS } from '@/utils/questionDicts'
import { toast } from 'vue-sonner'


const props = defineProps({
  task: { type: Object, default: null },
  disciplineId: { type: String, required: true },
})
const emit = defineEmits(['close', 'saved'])

const taskStore = useTaskStore()
const orientationStore = useOrientationStore()
const disciplineStore = useDisciplineStore()

const disciplineName = computed(() =>
  disciplineStore.disciplines.find(d => d.id === props.disciplineId)?.name ?? ''
)

const isEditing = computed(() => !!props.task)

// ── Tipos de tarefa ────────────────────────────────────────
const taskTypes = [
  { value: 'leitura_pdf', label: 'PDF',      icon: FileText   },
  { value: 'questoes',    label: 'Questões',  icon: HelpCircle },
  { value: 'video',       label: 'Vídeo',     icon: Video      },
  { value: 'revisao',     label: 'Revisão',   icon: RefreshCw  },
  { value: 'lei_seca',    label: 'Lei Seca',  icon: Scale      },
  { value: 'outras',      label: 'Outras',    icon: MoreHorizontal },
]

// ── Formulário ─────────────────────────────────────────────
const defaultForm = () => ({
  type:          'leitura_pdf',
  title:         '',
  description:   '',
  link:          '',
  orientationId: null,
  lawSource:     '',
  articlesRaw:   '',
  filterLaw: {
    idLaw:         null,
    compilado:     false,
    withTags:      false,
    tagsFilter:    [],
    withMarks:     false,
    withQuestions: false,
    artsFilter:    [],
  },
  formQuestions: {
    typeRespQuestions: 1,
    banca:             [],
    ano:               [],
    favoritas:         false,
    id_disciplina:     [],
    id_subject:        [],
    id_area:           [],
    name_disciplina:   [],
  },
})

const form = ref(defaultForm())
const selectedLaw = ref(null)

// Preenche form se estiver editando
watch(() => props.task, (task) => {
  if (task) {
    form.value = {
      type:          task.type,
      title:         task.title,
      description:   task.description,
      link:          task.link,
      orientationId: task.orientationId,
      lawSource:     task.lawSource ?? '',
      articlesRaw:   task.articles?.raw ?? '',
      filterLaw: {
        idLaw:         task.filterLaw?.idLaw         ?? null,
        compilado:     task.filterLaw?.compilado     ?? false,
        withTags:      task.filterLaw?.withTags      ?? false,
        tagsFilter:    task.filterLaw?.tagsFilter     ?? [],
        withMarks:     task.filterLaw?.withMarks     ?? false,
        withQuestions: task.filterLaw?.withQuestions ?? false,
        artsFilter:    task.filterLaw?.artsFilter    ?? [],
      },
      formQuestions: {
        typeRespQuestions: task.formQuestions?.typeRespQuestions ?? 1,
        banca:             task.formQuestions?.banca             ?? [],
        ano:               task.formQuestions?.ano               ?? [],
        favoritas:         task.formQuestions?.favoritas         ?? false,
        id_disciplina:     task.formQuestions?.id_disciplina     ?? [],
        id_subject:        task.formQuestions?.id_subject        ?? [],
        id_area:           task.formQuestions?.id_area           ?? [],
        name_disciplina:   task.formQuestions?.name_disciplina   ?? [],
      },
    }
    // Restaura a lei selecionada no autocomplete
    if (task.filterLaw?.idLaw && task.lawSource) {
      selectedLaw.value = { id: task.filterLaw.idLaw, name: task.lawSource }
    } else {
      selectedLaw.value = null
    }

    // Força recálculo dos artigos e contagem de questões,
    // pois os watchers de articlesRaw e formQuestions ainda não
    // estão registrados quando este watcher immediate roda no setup.
    nextTick(() => {
      validateArticles()
      if (form.value.filterLaw.withQuestions) {
        fetchQuestionCount()
      }
    })
  } else {
    form.value = defaultForm()
    selectedLaw.value = null
  }
}, { immediate: true })

// ── Orientações ────────────────────────────────────────────
const showOrientationManager = ref(false)
const editingOrientation = ref(null)
const orientationForm = ref({ title: '', body: '' })

const selectedOrientation = computed(() =>
  orientationStore.orientations.find(o => o.id === form.value.orientationId) ?? null
)

function startNewOrientation() {
  editingOrientation.value = 'new'
  orientationForm.value = { title: '', body: '' }
}

function startEditOrientation(o) {
  editingOrientation.value = o.id
  orientationForm.value = { title: o.title, body: o.body }
}

function saveOrientation() {
  if (!orientationForm.value.title.trim()) return
  if (editingOrientation.value === 'new') {
    orientationStore.add(orientationForm.value.title, orientationForm.value.body)
  } else {
    orientationStore.update(editingOrientation.value, orientationForm.value)
  }
  editingOrientation.value = null
}

// ── Artigos (Lei Seca) ─────────────────────────────────────
const articleError = ref(null)
const resolvedArticles = ref([])

function validateArticles() {
  if (!form.value.articlesRaw.trim()) {
    articleError.value = null
    resolvedArticles.value = []
    return
  }
  const { resolved, error } = parseArticles(form.value.articlesRaw)
  articleError.value = error
  resolvedArticles.value = error ? [] : resolved
}

// Valida ao carregar tarefa existente
watch(() => form.value.articlesRaw, validateArticles)

// Sincroniza artsFilter com os artigos resolvidos
watch(resolvedArticles, (arts) => {
  form.value.filterLaw.artsFilter = [...arts]
})

// ── Tag inputs ─────────────────────────────────────────────
const tagInput = ref('')

function addTag() {
  const val = tagInput.value.trim().replace(/,+$/, '')
  if (val && !form.value.filterLaw.tagsFilter.includes(val)) {
    form.value.filterLaw.tagsFilter.push(val)
  }
  tagInput.value = ''
}

function removeTag(index) {
  form.value.filterLaw.tagsFilter.splice(index, 1)
}

// ── Autocomplete Lei/Norma ──────────────────────────────────
const lawSearch = ref('')
const lawResults = ref([])
const lawSearchLoading = ref(false)
const showLawDropdown = ref(false)
let lawSearchTimer = null

function onLawSearchInput() {
  clearTimeout(lawSearchTimer)
  selectedLaw.value = null
  form.value.filterLaw.idLaw = null
  form.value.lawSource = ''

  if (lawSearch.value.trim().length < 2) {
    lawResults.value = []
    return
  }

  lawSearchLoading.value = true
  lawSearchTimer = setTimeout(async () => {
    try {
      lawResults.value = await lawService.search(lawSearch.value.trim(), disciplineName.value)
    } catch {
      lawResults.value = []
    } finally {
      lawSearchLoading.value = false
    }
  }, 400)
}

function selectLaw(law) {
  selectedLaw.value = law
  form.value.filterLaw.idLaw = law.id
  form.value.lawSource = law.id
  lawSearch.value = ''
  lawResults.value = []
  showLawDropdown.value = false
}

function clearLaw() {
  selectedLaw.value = null
  form.value.filterLaw.idLaw = null
  form.value.lawSource = ''
  lawSearch.value = ''
  lawResults.value = []
}

const closeLawDropdown = () => { showLawDropdown.value = false }
onMounted(() => document.addEventListener('click', closeLawDropdown))
onUnmounted(() => document.removeEventListener('click', closeLawDropdown))

// ── Multi-select dropdowns ─────────────────────────────────
const openDropdown = ref(null)

function toggleDropdown(name) {
  openDropdown.value = openDropdown.value === name ? null : name
}

const closeDropdowns = () => { openDropdown.value = null }

onMounted(() => document.addEventListener('click', closeDropdowns))
onUnmounted(() => {
  document.removeEventListener('click', closeDropdowns)
  clearTimeout(lawSearchTimer)
  clearTimeout(countTimer)
})

// Labels computados para cada campo
const bancaLabel = computed(() => {
  const b = form.value.formQuestions.banca
  if (!b.length) return 'Todas as bancas'
  return b.length === 1 ? b[0] : `${b.length} bancas`
})

const disciplinaLabel = computed(() => {
  const d = form.value.formQuestions.id_disciplina
  if (!d.length) return 'Todas as disciplinas'
  if (d.length === 1) return DISCIPLINAS.find(x => x.id === d[0])?.name ?? String(d[0])
  return `${d.length} disciplinas`
})

const areaLabel = computed(() => {
  const a = form.value.formQuestions.id_area
  if (!a.length) return 'Todas as áreas'
  if (a.length === 1) return AREAS.find(x => x.id === a[0])?.name ?? String(a[0])
  return `${a.length} áreas`
})

const anoLabel = computed(() => {
  const a = form.value.formQuestions.ano
  if (!a.length) return 'Todos os anos'
  if (a.length === 1) return String(a[0])
  const sorted = [...a].sort((x, y) => x - y)
  return `${sorted[0]} – ${sorted[sorted.length - 1]}`
})

// Busca em disciplinas (lista longa)
const discSearch = ref('')
const filteredDisciplinas = computed(() => {
  if (!discSearch.value) return DISCIPLINAS
  const q = discSearch.value.toLowerCase()
  return DISCIPLINAS.filter(d => d.name.toLowerCase().includes(q))
})

// ── Contagem de questões ───────────────────────────────────
const questionCount  = ref(0)
const countLoading   = ref(false)
let countTimer       = null

watch(
  () => ({ ...form.value.formQuestions, norma: form.value.lawSource }),
  () => {
    if (!form.value.filterLaw.withQuestions) return
    clearTimeout(countTimer)
    countTimer = setTimeout(fetchQuestionCount, 700)
  },
  { deep: true }
)

async function fetchQuestionCount() {
  if (!form.value.filterLaw.withQuestions || !form.value.lawSource) return
  countLoading.value = true
  try {
    questionCount.value = await questionService.countByFilters({
      norma:             form.value.lawSource,
      artsFilter:        resolvedArticles.value,
      ...form.value.formQuestions,
    })
  } catch {
    questionCount.value = 0
  } finally {
    countLoading.value = false
  }
}

// ── Orientação IA ─────────────────────────────────────────
const router = useRouter()
const orientationGenerating = ref(false)
const orientationError = ref(null)

async function generateOrientation() {
  orientationGenerating.value = true
  orientationError.value = null
  try {
    await taskOrientationService.generate(props.task.id)
    toast.success('Orientação gerada com sucesso!')
    router.push({ name: 'OrientacaoView', params: { taskId: props.task.id } })
  } catch (err) {
    orientationError.value = err.response?.data?.message || err.message
  } finally {
    orientationGenerating.value = false
  }
}

async function regenerateOrientation() {
  if (!confirm('Isso irá excluir a orientação atual e gerar uma nova. Continuar?')) return
  orientationGenerating.value = true
  orientationError.value = null
  try {
    await taskOrientationService.remove(props.task.id)
    await taskOrientationService.generate(props.task.id)
    toast.success('Orientação regenerada com sucesso!')
    router.push({ name: 'OrientacaoView', params: { taskId: props.task.id } })
  } catch (err) {
    orientationError.value = err.response?.data?.message || err.message
  } finally {
    orientationGenerating.value = false
  }
}

function viewOrientation() {
  router.push({ name: 'OrientacaoView', params: { taskId: props.task.id } })
}

// ── Validação geral ────────────────────────────────────────
const isValid = computed(() => {
  if (!form.value.title.trim()) return false
  if (form.value.type === 'lei_seca' && articleError.value) return false
  return true
})

// ── Salvar ─────────────────────────────────────────────────
const saving = ref(false)

async function save(closeAfter = true) {
  if (!isValid.value || saving.value) return
  saving.value = true

  const isLeiSeca = form.value.type === 'lei_seca'

  const payload = {
    disciplineId:  props.disciplineId,
    type:          form.value.type,
    title:         form.value.title.trim(),
    description:   form.value.description.trim(),
    link:          form.value.link.trim(),
    orientationId:    form.value.orientationId,
    orientationTitle: selectedOrientation.value?.title ?? null,
    orientationBody:  selectedOrientation.value?.body ?? null,
    lawSource:     form.value.lawSource || null,
    articlesRaw:   isLeiSeca ? form.value.articlesRaw : undefined,
    filterLaw:     isLeiSeca ? { ...form.value.filterLaw, artsFilter: resolvedArticles.value } : undefined,
    formQuestions: isLeiSeca && form.value.filterLaw.withQuestions ? { ...form.value.formQuestions } : undefined,
  }

  try {
    if (isEditing.value) {
      await taskStore.update(props.disciplineId, props.task.id, payload)
      toast.success('Tarefa atualizada!')
    } else {
      await taskStore.create(props.disciplineId, payload)
      toast.success('Tarefa criada!')
    }
    if (closeAfter) emit('saved')
  } catch (err) {
    toast.error(err.message)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.modal {
  background: #fff;
  border-radius: 16px;
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  font-family: 'DM Sans', sans-serif;
}

/* Header */
.modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal__title {
  font-size: 16px;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}

.modal__close {
  width: 30px; height: 30px;
  border-radius: 8px;
  border: 1px solid #ebe9e4;
  background: transparent;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #555;
  transition: background 0.15s, color 0.15s;
  flex-shrink: 0;
}
.modal__close:hover { background: #f5f4f0; color: #1a1a2e; }
.modal__close :deep(svg) { display: block; }

.divider {
  height: 1px;
  background: #f0efea;
  margin: 0 -24px;
}

/* Tipos */
.type-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin-top: 6px;
}

.type-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px;
  border-radius: 8px;
  border: 1.5px solid #ebe9e4;
  background: #fafaf8;
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: #888;
  cursor: pointer;
  transition: all 0.15s;
}
.type-btn:hover { border-color: #ccc; color: #444; }

.type-btn--active.type-btn--leitura_pdf { border-color: #185FA5; background: #E6F1FB; color: #185FA5; }
.type-btn--active.type-btn--questoes    { border-color: #3B6D11; background: #EAF3DE; color: #3B6D11; }
.type-btn--active.type-btn--video       { border-color: #854F0B; background: #FAEEDA; color: #854F0B; }
.type-btn--active.type-btn--revisao     { border-color: #993556; background: #FBEAF0; color: #993556; }
.type-btn--active.type-btn--lei_seca    { border-color: #534AB7; background: #EEEDFE; color: #534AB7; }
.type-btn--active.type-btn--outras      { border-color: #5F5E5A; background: #F1EFE8; color: #5F5E5A; }

/* Fields */
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field__label {
  font-size: 12px;
  font-weight: 600;
  color: #555;
  display: flex;
  align-items: center;
  gap: 6px;
}

.field__required { color: #c0392b; }

.field__hint {
  font-weight: 400;
  color: #aaa;
  font-size: 11px;
}

.field__label-action {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  font-weight: 500;
  color: #534AB7;
  background: transparent;
  border: none;
  cursor: pointer;
  margin-left: auto;
  padding: 0;
}
.field__label-action:hover { text-decoration: underline; }

.field__input {
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 8px 12px;
  outline: none;
  transition: border-color 0.15s;
  width: 100%;
}
.field__input:focus { border-color: #534AB7; }
.field__input--error { border-color: #c0392b; }
.field__input--padded { padding-left: 32px; }

.field__input-icon {
  position: relative;
}
.field__icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: #bbb;
}

.field__textarea {
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 8px 12px;
  outline: none;
  resize: vertical;
  min-height: 68px;
  transition: border-color 0.15s;
}
.field__textarea:focus { border-color: #534AB7; }

.field__select {
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 8px 12px;
  outline: none;
  background: #fff;
  cursor: pointer;
}
.field__select:focus { border-color: #534AB7; }

.field__error {
  font-size: 11px;
  color: #c0392b;
  margin: 0;
}

/* Orientation preview */
.orientation-preview {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 12px;
  color: #555;
  background: #f7f6ff;
  border-left: 3px solid #534AB7;
  border-radius: 0 8px 8px 0;
  padding: 8px 12px;
  line-height: 1.5;
}

/* Orientation manager */
.orientation-manager {
  background: #fafaf8;
  border: 1px solid #ebe9e4;
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 4px;
}

.orientation-manager__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #999;
}

.btn-add-small {
  display: flex;
  align-items: center;
  gap: 3px;
  font-family: 'DM Sans', sans-serif;
  font-size: 11px;
  font-weight: 600;
  color: #534AB7;
  background: #EEEDFE;
  border: none;
  border-radius: 6px;
  padding: 3px 8px;
  cursor: pointer;
}

.orientation-form {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.orientation-form__actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}

.orientation-item {
  background: #fff;
  border: 1px solid #ebe9e4;
  border-radius: 8px;
  padding: 10px 12px;
}

.orientation-item__title {
  font-size: 12px;
  font-weight: 700;
  color: #1a1a2e;
  margin-bottom: 3px;
}

.orientation-item__body {
  font-size: 11px;
  color: #888;
  line-height: 1.5;
  margin-bottom: 6px;
}

.orientation-item__actions {
  display: flex;
  gap: 10px;
}

.btn-link {
  display: flex;
  align-items: center;
  gap: 3px;
  font-family: 'DM Sans', sans-serif;
  font-size: 11px;
  font-weight: 500;
  color: #888;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: color 0.15s;
}
.btn-link:hover { color: #534AB7; }
.btn-link--danger:hover { color: #c0392b; }

/* Lei seca section */
.lei-seca-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.lei-seca-section__badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  color: #534AB7;
  background: #EEEDFE;
  border-radius: 6px;
  padding: 5px 10px;
  width: fit-content;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

/* Articles preview */
.articles-preview {
  background: #f7f6ff;
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.articles-preview__label {
  font-size: 11px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.articles-preview__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.article-tag {
  font-size: 11px;
  font-weight: 600;
  background: #EEEDFE;
  color: #3C3489;
  border-radius: 5px;
  padding: 2px 7px;
}

.articles-preview__count {
  font-size: 11px;
  color: #aaa;
  font-weight: 500;
}

/* ── Configuração de visualização ─────────────────────────── */
.law-config {
  background: #fafaf8;
  border: 1px solid #ebe9e4;
  border-radius: 10px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 4px;
}

.law-config__title {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #888;
}

.law-config__checks {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.law-config__row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Checkbox item */
.check-item {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  color: #444;
  cursor: pointer;
  user-select: none;
}

.check-item input[type="checkbox"] {
  width: 15px;
  height: 15px;
  accent-color: #534AB7;
  cursor: pointer;
  flex-shrink: 0;
}

/* Tag input */
.tag-input-wrap {
  display: flex;
  flex-direction: column;
}

.tag-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  align-items: center;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 6px 10px;
  min-height: 36px;
}

.tag-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  background: #EEEDFE;
  color: #534AB7;
  border-radius: 5px;
  padding: 2px 6px 2px 7px;
}

.tag-pill--blue { background: #E6F1FB; color: #185FA5; }
.tag-pill--green { background: #EAF3DE; color: #3B6D11; }

.tag-pill__remove {
  background: transparent;
  border: none;
  padding: 0;
  line-height: 1;
  font-size: 13px;
  cursor: pointer;
  color: inherit;
  opacity: 0.6;
  margin-left: 2px;
}
.tag-pill__remove:hover { opacity: 1; }

.tag-input-field {
  border: none;
  outline: none;
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  color: #444;
  background: transparent;
  min-width: 120px;
  flex: 1;
}

/* Questions config */
.questions-config {
  background: #fff;
  border: 1px solid #e0dff8;
  border-radius: 8px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.questions-config__title {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #534AB7;
}

/* ── Multi-select ─────────────────────────────────────────── */
.ms {
  position: relative;
}

.ms__trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #fff;
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  color: #444;
  cursor: pointer;
  transition: border-color 0.15s;
  text-align: left;
  gap: 8px;
}

.ms__trigger:hover { border-color: #aaa; }

.ms__label {
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.ms__chevron {
  flex-shrink: 0;
  color: #999;
  transition: transform 0.2s ease;
}

.ms__chevron--open {
  transform: rotate(180deg);
}

.ms__list {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 10px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
  z-index: 100;
  max-height: 220px;
  overflow-y: auto;
  padding: 4px;
}

.ms__list--tall {
  max-height: 280px;
}

.ms__list--grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
}

.ms__search-wrap {
  padding: 6px 6px 4px;
  border-bottom: 1px solid #f0efea;
  margin-bottom: 4px;
  position: sticky;
  top: 0;
  background: #fff;
}

.ms__search {
  width: 100%;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  padding: 5px 10px;
  font-size: 12px;
  font-family: 'DM Sans', sans-serif;
  outline: none;
}

.ms__option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 6px;
  font-size: 12.5px;
  color: #444;
  cursor: pointer;
  transition: background 0.1s;
}

.ms__option:hover {
  background: #f5f4f0;
}

.ms__option input[type="checkbox"] {
  accent-color: #534AB7;
  flex-shrink: 0;
  cursor: pointer;
}

.ms__option--compact {
  padding: 5px 8px;
  font-size: 12px;
  justify-content: center;
  gap: 4px;
}

/* ── Contador de questões ─────────────────────────────────── */
.question-count {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  font-size: 12.5px;
  color: #166534;
  font-weight: 500;
}

.question-count__value {
  font-size: 16px;
  font-weight: 800;
  color: #15803d;
}

.question-count__spinner {
  width: 14px;
  height: 14px;
  border: 2px solid #bbf7d0;
  border-top-color: #16a34a;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}

/* Footer */
.modal__footer {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  align-items: center;
  padding-top: 4px;
}

.modal__footer-save {
  display: flex;
  align-items: center;
  gap: 4px;
}

.btn-save-stay {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid #ebe9e4;
  background: #fafaf8;
  color: #534AB7;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.btn-save-stay:hover {
  background: #EEEDFE;
  border-color: #AFA9EC;
}
.btn-save-stay:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.btn-save-stay :deep(svg) {
  color: #534AB7;
  flex-shrink: 0;
}

.btn-ghost {
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  background: transparent;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 8px 16px;
  cursor: pointer;
  color: #666;
  transition: background 0.15s;
}
.btn-ghost:hover { background: #f5f4f0; }

.btn-ghost-sm {
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  background: transparent;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
  color: #666;
}

.btn-primary {
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  background: #534AB7;
  border: none;
  border-radius: 8px;
  padding: 8px 20px;
  cursor: pointer;
  color: #fff;
  font-weight: 600;
  transition: background 0.15s, opacity 0.15s;
}
.btn-primary:hover { background: #3C3489; }
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }

.btn-primary-sm {
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  background: #534AB7;
  border: none;
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
  color: #fff;
}

/* ── Autocomplete ──────────────────────────────────────────── */
.autocomplete {
  position: relative;
}

.autocomplete__selected {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  padding: 6px 10px;
  background: #EEEDFE;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #534AB7;
}

.autocomplete__selected span {
  flex: 1;
}

.autocomplete__clear {
  background: transparent;
  border: none;
  font-size: 16px;
  color: #534AB7;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  opacity: 0.6;
}
.autocomplete__clear:hover { opacity: 1; }

.autocomplete__list {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 10px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
  z-index: 110;
  max-height: 200px;
  overflow-y: auto;
  padding: 4px;
}

.autocomplete__option {
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 12px;
  border: none;
  background: transparent;
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  color: #444;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.1s;
}
.autocomplete__option:hover { background: #f5f4f0; }

.autocomplete__loading {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  font-size: 12px;
  color: #888;
}

.autocomplete__spinner {
  width: 12px;
  height: 12px;
  border: 2px solid #ddd;
  border-top-color: #534AB7;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}

.autocomplete__empty {
  padding: 10px 12px;
  font-size: 12px;
  color: #aaa;
  text-align: center;
}

/* ── Study PDF Section ───────────────────────────────────── */
/* Orientação IA */
.orientation-ia-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
}

.btn-orientation {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 9px 16px;
  border-radius: 8px;
  border: 1.5px dashed #7c3aed;
  background: #f5f3ff;
  font-family: 'DM Sans', sans-serif;
  font-size: 12.5px;
  font-weight: 600;
  color: #7c3aed;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-orientation:hover { background: #ede9fe; border-style: solid; }
.btn-orientation:disabled { opacity: 0.5; cursor: not-allowed; border-style: dashed; }

.orientation-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f5f3ff;
  border: 1px solid #ddd6fe;
  border-radius: 8px;
  font-size: 12px;
  color: #5b21b6;
}
</style>