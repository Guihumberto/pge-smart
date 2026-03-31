import http from './http.js'

export const taskService = {
  async listByPlan(planId) {
    const { data } = await http.get(`/plans/${planId}/tasks`)
    return data
  },

  async listByDiscipline(disciplineId) {
    const { data } = await http.get(`/plans/${disciplineId}/tasks`)
    return data
  },

  async get(planId, id) {
    const { data } = await http.get(`/plans/${planId}/tasks/${id}`)
    return data
  },

  async create(disciplineId, payload) {
    const { data } = await http.post(`/plans/${disciplineId}/tasks`, payload)
    return data
  },

  async update(disciplineId, id, payload) {
    const { data } = await http.patch(`/plans/${disciplineId}/tasks/${id}`, payload)
    return data
  },

  async remove(planId, id) {
    await http.delete(`/plans/${planId}/tasks/${id}`)
  },
}