import http from './http.js'

export const estatisticaService = {
  async list(filters = {}) {
    const { data } = await http.get('/estatisticas', { params: filters })
    return data
  },

  async get(id) {
    const { data } = await http.get(`/estatisticas/${id}`)
    return data
  },

  async create(payload) {
    const { data } = await http.post('/estatisticas', payload)
    return data
  },

  async update(id, payload) {
    const { data } = await http.patch(`/estatisticas/${id}`, payload)
    return data
  },

  async remove(id) {
    await http.delete(`/estatisticas/${id}`)
  },
}
