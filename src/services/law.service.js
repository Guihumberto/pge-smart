import http from './http.js'

export const lawService = {
  /**
   * Busca leis/normas pelo termo digitado (autocomplete).
   * @param {string} query - termo de busca
   * @param {string} disciplina - nome da disciplina para refinar a busca
   * @returns {Promise<Array<{ id: string|number, name: string }>>}
   */
  async search(query, disciplina) {
    const params = { q: query }
    if (disciplina) params.disciplina = disciplina
    const { data } = await http.get('/laws/search', { params })
    return data ?? []
  },
}
