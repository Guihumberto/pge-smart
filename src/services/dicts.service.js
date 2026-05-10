import http from './http.js'

export const dictsService = {
  async list(tipo) {
    const { data } = await http.get('/dicts', { params: { tipo } })
    return data
  },

  async create(payload) {
    const { data } = await http.post('/dicts', payload)
    return data
  },

  async update(id, payload) {
    const { data } = await http.patch(`/dicts/${id}`, payload)
    return data
  },

  async remove(id) {
    await http.delete(`/dicts/${id}`)
  },

  async seed() {
    const { data } = await http.post('/dicts/seed')
    return data
  },
}
