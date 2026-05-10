import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { dictsService } from '@/services/dicts.service'
import { toast } from 'vue-sonner'

export const useDictsStore = defineStore('dicts', () => {
  const items = ref([])
  const loading = ref(false)

  const bancas = computed(() => items.value.filter(i => i.tipo === 'banca'))
  const disciplinas = computed(() => items.value.filter(i => i.tipo === 'disciplina'))
  const areas = computed(() => items.value.filter(i => i.tipo === 'area'))
  const cargos = computed(() => items.value.filter(i => i.tipo === 'cargo'))

  async function fetchByTipo(tipo) {
    loading.value = true
    try {
      const data = await dictsService.list(tipo)
      // Merge: remove itens antigos do mesmo tipo e adiciona os novos
      items.value = [
        ...items.value.filter(i => i.tipo !== tipo),
        ...data,
      ]
    } finally {
      loading.value = false
    }
  }

  async function fetchAll() {
    loading.value = true
    try {
      const [b, d, a, c] = await Promise.all([
        dictsService.list('banca'),
        dictsService.list('disciplina'),
        dictsService.list('area'),
        dictsService.list('cargo'),
      ])
      items.value = [...b, ...d, ...a, ...c]
    } finally {
      loading.value = false
    }
  }

  async function create(tipo, nome) {
    const item = await dictsService.create({ tipo, nome })
    items.value.push(item)
    toast.success(`${tipo} "${nome}" cadastrado(a)!`)
    return item
  }

  async function update(id, data) {
    const updated = await dictsService.update(id, data)
    const idx = items.value.findIndex(i => i.id === id)
    if (idx !== -1) items.value[idx] = updated
    return updated
  }

  async function remove(id) {
    await dictsService.remove(id)
    items.value = items.value.filter(i => i.id !== id)
  }

  async function seed() {
    await dictsService.seed()
    await fetchAll()
    toast.success('Dicionários populados!')
  }

  return {
    items, loading,
    bancas, disciplinas, areas, cargos,
    fetchByTipo, fetchAll, create, update, remove, seed,
  }
}, {
  persist: { key: 'dicts', paths: ['items'] }
})
