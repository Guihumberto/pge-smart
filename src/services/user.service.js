import http from './http.js'

export const userService = {
  async me() {
    const { data } = await http.get('/users/me')
    return data
  },

  async list() {
    const { data } = await http.get('/users')
    return data
  },

  async updateRole(id, role) {
    const { data } = await http.patch(`/users/${id}/role`, { role })
    return data
  },
}