import http from './http.js'

export const questionService = {
  /**
   * Conta questões que batem com os filtros selecionados.
   */
  async countByFilters(filters) {
    const { data } = await http.get('/questions/count', { params: filters })
    return data?.count ?? data?.total ?? 0
  },
}
