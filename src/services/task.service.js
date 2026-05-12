import http from './http.js'

/**
 * Service de tasks.
 *
 * Convenção pós-Onda 1.5:
 * - Listagem por plano:      GET /plans/:planId/tasks (filtra por planId real)
 * - Listagem por disciplina: GET /disciplines/:disciplineId/tasks
 * - CRUD discipline-scoped:  POST/PATCH /disciplines/:disciplineId/tasks[/:id]
 * - GET/DELETE por taskId:   /tasks/:taskId (rota plana, sem path discipline/plan)
 * - Bulk create por plano:   POST /plans/:planId/tasks/bulk
 * - Criar revisão:           POST /tasks/:taskId/revisao
 */
export const taskService = {
  async listByPlan(planId) {
    const { data } = await http.get(`/plans/${planId}/tasks`)
    return data
  },

  async listByDiscipline(disciplineId) {
    const { data } = await http.get(`/disciplines/${disciplineId}/tasks`)
    return data
  },

  async create(disciplineId, payload) {
    const { data } = await http.post(`/disciplines/${disciplineId}/tasks`, payload)
    return data.task ?? data
  },

  async update(disciplineId, id, payload) {
    const { data } = await http.patch(`/disciplines/${disciplineId}/tasks/${id}`, payload)
    return data.task ?? data
  },

  // DELETE por id também usa rota plana
  async remove(id) {
    await http.delete(`/tasks/${id}`)
  },

  // Bulk create de tasks num plano (Onda 1)
  async bulkCreateInPlan(planId, tasks) {
    const { data } = await http.post(`/plans/${planId}/tasks/bulk`, { tasks })
    return data // { tasks, total }
  },

  // Cria revisão de uma task (Onda 1)
  async criarRevisao(taskId, { planId = null, title = null } = {}) {
    const { data } = await http.post(`/tasks/${taskId}/revisao`, { planId, title })
    return data.task
  },
}
