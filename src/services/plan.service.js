import http from './http.js'

export const planService = {
  async list() {
    const { data } = await http.get('/plans')
    return data
  },

  async get(id) {
    const { data } = await http.get(`/plans/${id}`)
    return data
  },

  async create(payload) {
    const { data } = await http.post('/plans', payload)
    return data
  },

  async update(id, payload) {
    const { data } = await http.patch(`/plans/${id}`, payload)
    return data
  },

  async remove(id) {
    await http.delete(`/plans/${id}`)
  },
}