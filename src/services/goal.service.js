import http from './http.js'

export const goalService = {
  async list(planId) {
    const { data } = await http.get(`/plans/${planId}/goals`)
    return data
  },

  async get(planId, id) {
    const { data } = await http.get(`/plans/${planId}/goals/${id}`)
    return data
  },

  async create(planId, payload) {
    const { data } = await http.post(`/plans/${planId}/goals`, payload)
    return data
  },

  async update(planId, id, payload) {
    const { data } = await http.patch(`/plans/${planId}/goals/${id}`, payload)
    return data
  },

  async remove(planId, id) {
    await http.delete(`/plans/${planId}/goals/${id}`)
  },

  async addTask(planId, goalId, taskId) {
    const { data } = await http.post(`/plans/${planId}/goals/${goalId}/tasks`, { taskId })
    return data
  },

  async removeTask(planId, goalId, taskId) {
    const { data } = await http.delete(`/plans/${planId}/goals/${goalId}/tasks/${taskId}`)
    return data
  },
}