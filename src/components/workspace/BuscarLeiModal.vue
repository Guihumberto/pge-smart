<template>
  <Teleport to="body">
    <div v-if="open" class="modal-overlay" @click.self="$emit('close')">
      <div class="modal">
        <div class="modal__header">
          <div>
            <h2 class="modal__title">Buscar norma</h2>
            <p v-if="norma" class="modal__sub">para a norma <strong>{{ norma.nomeOriginal }}</strong></p>
          </div>
          <button class="icon-btn" @click="$emit('close')"><X :size="16" /></button>
        </div>

        <div class="modal__body">
          <div class="search-wrapper">
            <Search :size="14" class="search-wrapper__icon" />
            <input
              ref="inputRef"
              v-model="query"
              class="search-wrapper__input"
              placeholder="Digite título, número, sigla ou apelido (ex: 8112, CTN, ambiental)..."
              @input="onInput"
              @keydown.escape="$emit('close')"
            />
            <Loader2 v-if="loading" :size="14" class="search-wrapper__spin spin" />
          </div>

          <div v-if="results.length" class="results">
            <button
              v-for="r in results"
              :key="r.id"
              class="result"
              @click="selecionar(r)"
            >
              <div class="result__title">{{ r.title }}</div>
              <div v-if="r.subtitle" class="result__subtitle">{{ r.subtitle }}</div>
              <div class="result__meta">
                <span v-if="r.tipo" class="result__tag">{{ r.tipo }}</span>
                <span v-if="r.ente" class="result__tag">{{ r.ente }}</span>
                <span v-if="r.estado" class="result__tag">{{ r.estado }}</span>
                <span v-if="r.ano" class="result__tag">{{ r.ano }}</span>
              </div>
            </button>
          </div>

          <div v-else-if="!loading && queryDebounced && queryDebounced.length >= 2" class="empty">
            Nenhum resultado para <strong>"{{ queryDebounced }}"</strong>.
          </div>

          <div v-else-if="!queryDebounced" class="empty">
            Digite pelo menos 2 caracteres para buscar.
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, nextTick, onUnmounted } from 'vue'
import { X, Search, Loader2 } from 'lucide-vue-next'
import { lawService } from '@/services/law.service'

const props = defineProps({
  open: { type: Boolean, required: true },
  norma: { type: Object, default: null },
})
const emit = defineEmits(['close', 'select'])

const query = ref('')
const queryDebounced = ref('')
const results = ref([])
const loading = ref(false)
const inputRef = ref(null)

let debounceTimer = null
let mounted = true

function onInput() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(async () => {
    if (!mounted) return // modal fechado durante o debounce
    queryDebounced.value = query.value.trim()
    if (queryDebounced.value.length < 2) {
      results.value = []
      return
    }
    loading.value = true
    try {
      const data = await lawService.search(queryDebounced.value)
      if (!mounted) return // request voltou após fechar
      // adapta saída do `lawService.search` (retorna {id, name, subtitle, ...})
      results.value = data.map(r => ({
        id: r.id,
        title: r.name,
        subtitle: r.subtitle,
        tipo: r.tipo,
        ente: r.ente,
        estado: r.estado,
        ano: r.ano,
      }))
    } catch (err) {
      if (mounted) {
        console.error('[buscarLei]', err)
        results.value = []
      }
    } finally {
      if (mounted) loading.value = false
    }
  }, 300)
}

onUnmounted(() => {
  mounted = false
  clearTimeout(debounceTimer)
})

function selecionar(law) {
  emit('select', { norma: props.norma, law })
}

watch(() => props.open, async (val) => {
  if (val) {
    query.value = ''
    queryDebounced.value = ''
    results.value = []
    await nextTick()
    inputRef.value?.focus()
  }
})
</script>

<style scoped>
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 100;
  display: flex; align-items: center; justify-content: center; padding: 20px;
}
.modal {
  background: #fff; border-radius: 16px; width: 100%; max-width: 600px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15); overflow: hidden;
  font-family: 'DM Sans', sans-serif;
  display: flex; flex-direction: column; max-height: 80vh;
}
.modal__header {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 20px 24px; border-bottom: 1px solid #ebe9e4;
}
.modal__title { font-size: 16px; font-weight: 700; color: #1a1a2e; margin: 0; }
.modal__sub { font-size: 12px; color: #64748B; margin: 4px 0 0; }
.modal__body { padding: 16px 24px; overflow-y: auto; }

.search-wrapper {
  position: relative; display: flex; align-items: center; gap: 8px;
  border: 1px solid #ddd; border-radius: 10px; padding: 8px 12px;
  background: #fafaf8;
}
.search-wrapper:focus-within { border-color: #534AB7; background: #fff; }
.search-wrapper__icon { color: #94A3B8; flex-shrink: 0; }
.search-wrapper__input {
  flex: 1; border: none; outline: none; background: transparent;
  font-family: 'DM Sans', sans-serif; font-size: 13px; color: #1a1a2e;
}
.search-wrapper__spin { color: #534AB7; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.results { display: flex; flex-direction: column; gap: 6px; margin-top: 12px; }
.result {
  display: flex; flex-direction: column; gap: 4px;
  border: 1px solid #ebe9e4; border-radius: 10px; padding: 10px 12px;
  background: #fff; font-family: inherit; cursor: pointer; transition: all 0.15s;
  text-align: left;
}
.result:hover { border-color: #534AB7; background: #F5F4FF; }
.result__title { font-size: 13px; font-weight: 600; color: #1a1a2e; }
.result__subtitle {
  font-size: 11px; color: #64748B;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.result__meta { display: flex; gap: 6px; flex-wrap: wrap; }
.result__tag {
  font-size: 10px; color: #475569; background: #F1F5F9;
  padding: 2px 6px; border-radius: 4px;
}

.empty {
  text-align: center; padding: 24px; color: #94A3B8; font-size: 13px;
}

.icon-btn {
  width: 28px; height: 28px; border-radius: 7px; border: none; background: transparent;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #94A3B8;
}
.icon-btn:hover { background: #f0efea; color: #1a1a2e; }
</style>
