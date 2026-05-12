import http from './http.js'

export const cargoService = {
  async list(editalId) {
    const { data } = await http.get(`/editais/${editalId}/cargos`)
    return data
  },

  async get(editalId, cargoId) {
    const { data } = await http.get(`/editais/${editalId}/cargos/${cargoId}`)
    return data
  },

  async create(editalId, payload) {
    const { data } = await http.post(`/editais/${editalId}/cargos`, payload)
    return data
  },

  async update(editalId, cargoId, payload) {
    const { data } = await http.patch(`/editais/${editalId}/cargos/${cargoId}`, payload)
    return data
  },

  async remove(editalId, cargoId) {
    await http.delete(`/editais/${editalId}/cargos/${cargoId}`)
  },

  async parse(editalId, cargoId, body) {
    const { data } = await http.post(`/editais/${editalId}/cargos/${cargoId}/parse`, body, {
      timeout: 480000, // 8 min — uma disciplina pesada + margem do AbortController do back (240s)
    })
    return data
  },

  async analisar(editalId, cargoId, body) {
    const { data } = await http.post(`/editais/${editalId}/cargos/${cargoId}/analisar`, body, {
      timeout: 600000, // 10 min — duas fases
    })
    return data
  },

  async reorganizar(editalId, cargoId, config) {
    const { data } = await http.post(`/editais/${editalId}/cargos/${cargoId}/reorganizar`, config)
    return data
  },

  async aplicarReorganizacao(editalId, cargoId, body) {
    const { data } = await http.post(`/editais/${editalId}/cargos/${cargoId}/aplicar-reorganizacao`, body)
    return data
  },

  // ── Vinculação de normas (leis_v3) ────────────────────────────

  async getLeisSugestoes(editalId, cargoId) {
    // Timeout grande pois a 1ª chamada pode disparar a geração inicial
    // (que faz N buscas em laws_v3 e demora). 2ª+ chamadas são rápidas (cache).
    const { data } = await http.get(`/editais/${editalId}/cargos/${cargoId}/leis/sugestoes`, {
      timeout: 180000, // 3 min
    })
    return data?.leis_vinculadas
  },

  async regerarLeisSugestoes(editalId, cargoId) {
    const { data } = await http.post(`/editais/${editalId}/cargos/${cargoId}/leis/sugestoes`, {}, {
      timeout: 180000, // 3 min — N buscas paralelas em laws_v3
    })
    return data?.leis_vinculadas
  },

  async vincularLei(editalId, cargoId, { normaId, lawId }) {
    const { data } = await http.post(`/editais/${editalId}/cargos/${cargoId}/leis/vincular`, { normaId, lawId })
    return data?.norma
  },

  async mudarStatusLei(editalId, cargoId, normaId, status) {
    const { data } = await http.patch(`/editais/${editalId}/cargos/${cargoId}/leis/${normaId}/status`, { status })
    return data?.norma
  },

  async desvincularLei(editalId, cargoId, normaId) {
    const { data } = await http.post(`/editais/${editalId}/cargos/${cargoId}/leis/${normaId}/desvincular`)
    return data?.norma
  },

  // ── Edital verticalizado (PDF) ────────────────────────────────

  async gerarConteudoPdf(editalId, cargoId, opts) {
    const { data } = await http.post(
      `/editais/${editalId}/cargos/${cargoId}/conteudo/pdf`,
      opts,
      { responseType: 'blob', timeout: 60000 }
    )
    return data // Blob
  },
}
