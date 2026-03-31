import { defineStore } from 'pinia'
import { ref } from 'vue'
import { nanoid } from 'nanoid'
import { disciplineService } from '@/services/discipline.service'

export const useDisciplineStore = defineStore('disciplines', () => {
  const disciplines = ref([])
  const loading     = ref(false)

  async function fetchAll() {
    loading.value = true
    try {
      disciplines.value = await disciplineService.list()
    } finally {
      loading.value = false
    }
  }

  async function add(name, color = '#888') {
    const d = await disciplineService.create({ name, color })
    disciplines.value.push(d)
    return d
  }

  async function remove(id) {
    await disciplineService.remove(id)
    disciplines.value = disciplines.value.filter(d => d.id !== id)
  }

  async function update(id, patch) {
    const updated = await disciplineService.update(id, patch)
    const idx = disciplines.value.findIndex(d => d.id === id)
    if (idx !== -1) disciplines.value[idx] = updated
  }

  return { disciplines, loading, fetchAll, add, remove, update }
}, {
  persist: { key: 'disciplines', paths: ['disciplines'] }
})