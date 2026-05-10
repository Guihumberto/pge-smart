import { defineStore } from 'pinia'
import { ref } from 'vue'
import { estatisticaService } from '@/services/estatistica.service'
import { toast } from 'vue-sonner'

export const useEstatisticaStore = defineStore('estatisticas', () => {
  const estatisticas = ref([])
  const loading = ref(false)

  async function fetchEstatisticas(filters = {}) {
    loading.value = true
    try {
      estatisticas.value = await estatisticaService.list(filters)
    } finally {
      loading.value = false
    }
  }

  // `silent` permite ao consumer suprimir o toast genérico do store quando ele já mostra
  // seu próprio toast formatado (ex: a EstatisticasView mostra "Salvo: banca/área/ano").
  async function createEstatistica(data, { silent = false } = {}) {
    const item = await estatisticaService.create(data)
    estatisticas.value.unshift(item)
    if (!silent) toast.success('Estatística cadastrada!')
    return item
  }

  async function updateEstatistica(id, patch, { silent = false } = {}) {
    const updated = await estatisticaService.update(id, patch)
    const idx = estatisticas.value.findIndex(e => e.id === id)
    if (idx !== -1) estatisticas.value[idx] = updated
    if (!silent) toast.success('Estatística atualizada!')
    return updated
  }

  async function removeEstatistica(id) {
    await estatisticaService.remove(id)
    estatisticas.value = estatisticas.value.filter(e => e.id !== id)
    toast.success('Estatística removida.')
  }

  return {
    estatisticas, loading,
    fetchEstatisticas, createEstatistica, updateEstatistica, removeEstatistica,
  }
}, {
  persist: { key: 'estatisticas', paths: ['estatisticas'] }
})
