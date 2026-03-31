import http from './http.js'

export const enrollmentService = {
  async listMine() {
    const { data } = await http.get('/enrollments/me')
    return data
  },

  async listByPlan(planId) {
    const { data } = await http.get(`/enrollments/plan/${planId}`)
    return data
  },

  async get(id) {
    const { data } = await http.get(`/enrollments/${id}`)
    return data
  },

  async enrollViaLink(token) {
    const { data } = await http.post('/enrollments/enroll', { token })
    return data
  },

  async markTaskDone(enrollmentId, goalProgressId, taskId) {
    const { data } = await http.post(`/enrollments/${enrollmentId}/task-done`, {
      goalProgressId,
      taskId,
    })
    return data
  },

  async unlockNext(enrollmentId) {
    const { data } = await http.post(`/enrollments/${enrollmentId}/unlock-next`)
    return data
  },

  async unlockAll(planId) {
    const { data } = await http.post(`/enrollments/plan/${planId}/unlock-all`)
    return data
  },

  async setStatus(enrollmentId, status) {
    const { data } = await http.patch(`/enrollments/${enrollmentId}/status`, { status })
    return data
  },
}