import http from './http.js'

// Timeout maior para chamadas que envolvem IA (orientações podem demorar)
const TIMEOUT_IA = 120000 // 2 minutos

export const planoEstudoService = {
  async inicializar(editalId, cargoId) {
    const { data } = await http.post(`/editais/${editalId}/cargos/${cargoId}/plano/inicializar`)
    return data
  },

  async estado(editalId, cargoId, planId) {
    const { data } = await http.get(`/editais/${editalId}/cargos/${cargoId}/plano/${planId}/estado`)
    return data
  },

  async sugerir(editalId, cargoId, planId, config) {
    const { data } = await http.post(
      `/editais/${editalId}/cargos/${cargoId}/plano/${planId}/sugerir`,
      config,
      { timeout: TIMEOUT_IA }
    )
    return data
  },

  async confirmar(editalId, cargoId, planId, tasks) {
    const { data } = await http.post(
      `/editais/${editalId}/cargos/${cargoId}/plano/${planId}/confirmar`,
      { tasks },
      { timeout: TIMEOUT_IA }
    )
    return data
  },
}
