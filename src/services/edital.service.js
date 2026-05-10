import http from './http.js'

export const editalService = {
  async list() {
    const { data } = await http.get('/editais')
    return data
  },

  async get(id) {
    const { data } = await http.get(`/editais/${id}`)
    return data
  },

  async create(payload) {
    const { data } = await http.post('/editais', payload)
    return data
  },

  async update(id, payload) {
    const { data } = await http.patch(`/editais/${id}`, payload)
    return data
  },

  async remove(id) {
    await http.delete(`/editais/${id}`)
  },
}
