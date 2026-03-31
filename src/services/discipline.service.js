import http from './http.js'

export const disciplineService = {
  async list() {
    const { data } = await http.get('/disciplines')
    return data
  },

  async create(payload) {
    const { data } = await http.post('/disciplines', payload)
    return data
  },

  async update(id, payload) {
    const { data } = await http.patch(`/disciplines/${id}`, payload)
    return data
  },

  async remove(id) {
    await http.delete(`/disciplines/${id}`)
  },
}