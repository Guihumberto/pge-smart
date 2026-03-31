import http from './http.js'

export const questionService = {
  /**
   * Conta questões que batem com os filtros selecionados.
   */
  async countByFilters(filters) {
    const { data } = await http.get('/questions/count', { params: filters })
    return data?.count ?? data?.total ?? 0
  },

  /**
   * Solicita geração do PDF de estudo via IA.
   * Retorna { taskId, pollUrl }.
   */
  async generateStudyPdf(payload) {
    const { data } = await http.post('/questions/study-pdf', payload)
    return data
  },

  /**
   * Consulta status da geração do PDF.
   */
  async getStudyPdfStatus(taskId) {
    const { data } = await http.get(`/questions/study-pdf/${taskId}/status`)
    return data
  },

  /**
   * Faz download do PDF com token de auth, retorna Blob.
   */
  async downloadStudyPdf(taskId) {
    const { data } = await http.get(`/questions/study-pdf/${taskId}/download`, {
      responseType: 'blob',
    })
    return data
  },
}
