import http from './http.js'

export const lawService = {
  /**
   * Busca leis/normas pelo termo digitado (autocomplete).
   * @param {string} query - termo de busca
   * @param {string} disciplina - nome da disciplina para refinar a busca
   * @returns {Promise<Array<{ id: string|number, name: string }>>}
   */
  async search(query, disciplina) {
    const params = { q: query, size: 20 }
    if (disciplina) params.disciplina = disciplina
    const { data } = await http.get('/laws/search', { params })
    // Backend agora retorna { results: [{id, title, subtitle, ...}] }
    // Mapeia para o contrato legado {id, name} esperado pelos callers existentes.
    return (data?.results ?? []).map(r => ({
      id: r.id,
      name: r.title || r.subtitle || r.id,
      // Campos extras opcionais (não-quebrante, callers podem ignorar)
      subtitle: r.subtitle,
      tipo: r.tipo,
      ente: r.ente,
      estado: r.estado,
      ano: r.ano,
    }))
  },

  /**
   * Busca uma lei específica pelo id.
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async getById(id) {
    try {
      const { data } = await http.get(`/laws/${id}`)
      return data
    } catch (err) {
      if (err?.response?.status === 404) return null
      throw err
    }
  },
}
