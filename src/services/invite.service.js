import http from './http.js'

export const inviteService = {
  async list(planId) {
    const { data } = await http.get(`/plans/${planId}/invites`)
    return data
  },

  async create(planId, payload) {
    const { data } = await http.post(`/plans/${planId}/invites`, payload)
    return data
  },

  async revoke(planId, id) {
    await http.delete(`/plans/${planId}/invites/${id}`)
  },

  // Público — lista planos com convites globais ativos
  async listPublic() {
    const { data } = await http.get('/invites/public')
    return data
  },

  // Público — não precisa de token
  async validate(token) {
    const { data } = await http.get(`/invites/${token}/validate`)
    return data
  },

  getLinkUrl(token) {
    return `${window.location.origin}/convite/${token}`
  },
}