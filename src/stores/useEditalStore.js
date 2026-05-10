import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { editalService } from '@/services/edital.service'
import { toast } from 'vue-sonner'
import dayjs from 'dayjs'

export const useEditalStore = defineStore('editais', () => {
  const editais = ref([])
  const editalAtual = ref(null)
  const loading = ref(false)

  function countdown(dataProva) {
    if (!dataProva) return null
    const hoje = dayjs()
    const prova = dayjs(dataProva)
    const diff = prova.diff(hoje, 'day')
    if (diff < 0) return { semanas: 0, dias: 0, passado: true }
    return {
      semanas: Math.floor(diff / 7),
      dias: diff % 7,
      total: diff,
      passado: false,
    }
  }

  async function fetchEditais() {
    loading.value = true
    try {
      editais.value = await editalService.list()
    } finally {
      loading.value = false
    }
  }

  async function fetchEdital(id) {
    loading.value = true
    try {
      editalAtual.value = await editalService.get(id)
      return editalAtual.value
    } finally {
      loading.value = false
    }
  }

  async function createEdital(data) {
    const edital = await editalService.create(data)
    editais.value.push(edital)
    toast.success('Edital cadastrado!')
    return edital
  }

  async function updateEdital(id, patch) {
    const updated = await editalService.update(id, patch)
    const idx = editais.value.findIndex(e => e.id === id)
    if (idx !== -1) editais.value[idx] = updated
    if (editalAtual.value?.id === id) editalAtual.value = updated
    toast.success('Edital atualizado!')
    return updated
  }

  async function removeEdital(id) {
    await editalService.remove(id)
    editais.value = editais.value.filter(e => e.id !== id)
    if (editalAtual.value?.id === id) editalAtual.value = null
    toast.success('Edital removido.')
  }

  return {
    editais, editalAtual, loading,
    countdown,
    fetchEditais, fetchEdital, createEdital, updateEdital, removeEdital,
  }
}, {
  persist: { key: 'editais', paths: ['editais'] }
})
