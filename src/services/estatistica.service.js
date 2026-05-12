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

  async focoInsight(params = {}) {
    const { data } = await http.get('/estatisticas/foco/insight', { params })
    return data
  },

  async focoJurisprudencia(params = {}) {
    const { data } = await http.get('/estatisticas/foco/jurisprudencia', { params })
    return data
  },

  async focoIA(payload = {}) {
    const { data } = await http.post('/estatisticas/foco/ia', payload)
    return data
  },

  async focoPDF(payload = {}) {
    const res = await http.post('/estatisticas/foco/pdf', payload, {
      responseType: 'blob',
      timeout: 90_000,
    })
    return res.data
  },
}
