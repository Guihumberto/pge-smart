import { defineStore } from 'pinia'
import { ref } from 'vue'
import { taskService } from '@/services/task.service'
import { parseArticles } from '@/utils/articleParser'

export const useTaskStore = defineStore('tasks', () => {
  const tasks   = ref([])
  const loading = ref(false)

  async function fetchByPlan(planId) {
    loading.value = true
    try {
      const fetched = await taskService.listByPlan(planId)
      tasks.value = [
        ...tasks.value.filter(t => t.planId !== planId),
        ...fetched,
      ]
    } finally {
      loading.value = false
    }
  }

  async function fetchByDiscipline(disciplineId) {
    loading.value = true
    try {
      const fetched = await taskService.listByDiscipline(disciplineId)
      console.log('fetched', fetched);
      tasks.value = [
        ...tasks.value.filter(t => t.disciplineId !== disciplineId),
        ...fetched,
      ]
    } finally {
      loading.value = false
    }
  }

  async function create(disciplineId, payload) {
    const task = await taskService.create(disciplineId, payload)
    tasks.value.push(task)
    return task
  }

  async function update(disciplineId, id, patch) {
    const updated = await taskService.update(disciplineId, id, patch)
    const idx = tasks.value.findIndex(t => t.id === id)
    if (idx !== -1) tasks.value[idx] = updated
    return updated
  }

  async function remove(planId, id) {
    await taskService.remove(planId, id)
    tasks.value = tasks.value.filter(t => t.id !== id)
  }

  const getById = (id) => tasks.value.find(t => t.id === id)

  const byDiscipline = (disciplineId) => tasks.value.filter(t => t.disciplineId === disciplineId)

  return {
    tasks, loading,
    fetchByPlan, create, update, remove,
    getById, byDiscipline, fetchByDiscipline
  }
}, {
  persist: { key: 'tasks', paths: ['tasks'] }
})