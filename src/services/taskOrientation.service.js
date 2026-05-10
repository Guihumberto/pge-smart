import http from './http.js'

export const taskOrientationService = {
  async generate(taskId) {
    const { data } = await http.post(`/tasks/${taskId}/orientation`, {}, { timeout: 120000 })
    return data
  },

  async get(taskId) {
    const { data } = await http.get(`/tasks/${taskId}/orientation`)
    return data
  },

  async updateChecklist(taskId, operations) {
    const { data } = await http.patch(`/tasks/${taskId}/orientation/checklist`, { operations })
    return data
  },

  async remove(taskId) {
    await http.delete(`/tasks/${taskId}/orientation`)
  },
}
