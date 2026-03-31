import http from './http.js'

export const orientationService = {
  async list() {
    const { data } = await http.get('/orientations')
    return data
  },

  async create(payload) {
    const { data } = await http.post('/orientations', payload)
    return data
  },

  async update(id, payload) {
    const { data } = await http.patch(`/orientations/${id}`, payload)
    return data
  },

  async remove(id) {
    await http.delete(`/orientations/${id}`)
  },
}