import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSearchStore = defineStore('search', () => {
  const query = ref('')
  const results = ref([])
  const loading = ref(false)

  async function search(searchQuery) {
    if (!searchQuery) return

    loading.value = true
    query.value = searchQuery
    results.value = []

    // Simulate API call with delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Mock search results
    results.value = [
      {
        id: 1,
        title: 'Lei nº 8.245, de 1991',
        description: 'Lei de Locação de Imóveis Urbanos. Dispõe sobre locação de imóveis urbanos e os procedimentos pertinentes.',
        type: 'legislation'
      },
      {
        id: 2,
        title: 'Superior Tribunal de Justiça - REsp 1.234.567',
        description: 'Interpretando a lei de locação em casos de despejo.',
        type: 'jurisprudence'
      },
      {
        id: 3,
        title: 'Doutrina sobre Direito Imobiliário',
        description: 'Análise dos direitos e deveres em contratos de locação.',
        type: 'doctrine'
      }
      // Add more mock results as needed
    ]

    loading.value = false
  }

  function clearSearch() {
    query.value = ''
    results.value = []
  }

  return {
    query,
    results,
    loading,
    search,
    clearSearch
  }
})
