import { defineStore } from 'pinia'
import { ref } from 'vue'
import { enrollmentService } from '@/services/enrollment.service'
import { inviteService } from '@/services/invite.service'
import { processScheduledReleases } from '@/utils/releaseEngine'
import { toast } from 'vue-sonner'

export const useEnrollmentStore = defineStore('enrollments', () => {
  const enrollments = ref([])
  const inviteLinks = ref([])
  const loading     = ref(false)

  // ── Invite Links ───────────────────────────────────────────

  async function createInviteLink(planId, type = 'global', expiresInDays = null) {
    loading.value = true
    try {
      const link = await inviteService.create(planId, { type, expiresInDays })
      inviteLinks.value.push(link)
      toast.success('Link de convite criado')
      return link
    } catch (err) {
      toast.error(err.message || 'Erro ao criar link de convite')
      throw err
    } finally {
      loading.value = false
    }
  }

  function getLinkUrl(token) {
    return inviteService.getLinkUrl(token)
  }

  async function validateInviteLink(token) {
    loading.value = true
    try {
      const result = await inviteService.validate(token)
      return result
    } catch (err) {
      throw err
    } finally {
      loading.value = false
    }
  }

  async function listInviteLinks(planId) {
    loading.value = true
    try {
      const links = await inviteService.list(planId)
      inviteLinks.value = links
      return links
    } catch (err) {
      toast.error(err.message || 'Erro ao listar convites')
      throw err
    } finally {
      loading.value = false
    }
  }

  async function revokeInviteLink(planId, id) {
    loading.value = true
    try {
      await inviteService.revoke(planId, id)
      inviteLinks.value = inviteLinks.value.filter(l => l.id !== id)
      toast.success('Link revogado')
    } catch (err) {
      toast.error(err.message || 'Erro ao revogar link')
      throw err
    } finally {
      loading.value = false
    }
  }

  // ── Enrollments ────────────────────────────────────────────

  async function enrollViaLink(token) {
    loading.value = true
    try {
      const enrollment = await enrollmentService.enrollViaLink(token)
      enrollments.value.push(enrollment)
      toast.success('Matrícula realizada com sucesso')
      return enrollment
    } catch (err) {
      toast.error(err.message || 'Erro ao se matricular')
      throw err
    } finally {
      loading.value = false
    }
  }

  async function loadMyEnrollments() {
    loading.value = true
    try {
      const data = await enrollmentService.listMine()
      enrollments.value = data
      return data
    } catch (err) {
      toast.error(err.message || 'Erro ao carregar matrículas')
      throw err
    } finally {
      loading.value = false
    }
  }

  async function loadByPlan(planId) {
    loading.value = true
    try {
      const data = await enrollmentService.listByPlan(planId)
      enrollments.value = data
      return data
    } catch (err) {
      toast.error(err.message || 'Erro ao carregar matrículas do plano')
      throw err
    } finally {
      loading.value = false
    }
  }

  async function getEnrollment(id) {
    loading.value = true
    try {
      return await enrollmentService.get(id)
    } catch (err) {
      toast.error(err.message || 'Erro ao carregar matrícula')
      throw err
    } finally {
      loading.value = false
    }
  }

  // ── Progresso do aluno ─────────────────────────────────────

  async function markTaskDone(enrollmentId, goalProgressId, taskId) {
    try {
      const updated = await enrollmentService.markTaskDone(enrollmentId, goalProgressId, taskId)
      const idx = enrollments.value.findIndex(e => e.id === enrollmentId)
      if (idx !== -1) enrollments.value[idx] = updated
      return updated
    } catch (err) {
      toast.error(err.message || 'Erro ao marcar tarefa')
      throw err
    }
  }

  // ── Ações do mentor ────────────────────────────────────────

  async function mentorUnlockForUser(enrollmentId) {
    try {
      const updated = await enrollmentService.unlockNext(enrollmentId)
      const idx = enrollments.value.findIndex(e => e.id === enrollmentId)
      if (idx !== -1) enrollments.value[idx] = updated
      toast.success('Próxima meta liberada')
      return updated
    } catch (err) {
      toast.error(err.message || 'Erro ao liberar meta')
      throw err
    }
  }

  async function mentorUnlockForAll(planId) {
    try {
      const result = await enrollmentService.unlockAll(planId)
      toast.success(`Metas liberadas para ${result.processed} alunos`)
      return result
    } catch (err) {
      toast.error(err.message || 'Erro ao liberar metas')
      throw err
    }
  }

  async function setEnrollmentStatus(enrollmentId, status) {
    try {
      const updated = await enrollmentService.setStatus(enrollmentId, status)
      const idx = enrollments.value.findIndex(e => e.id === enrollmentId)
      if (idx !== -1) enrollments.value[idx] = updated
      return updated
    } catch (err) {
      toast.error(err.message || 'Erro ao alterar status')
      throw err
    }
  }

  // ── Computed / Queries ─────────────────────────────────────

  function byPlan(planId) {
    if (!planId) return []
    return enrollments.value.filter(e => e.planId === planId)
  }

  function byUser(userId) {
    if (!userId) return []
    return enrollments.value.filter(e => e.userId === userId)
  }

  function getVisibleGoals(enrollmentId) {
    const e = enrollments.value.find(e => e.id === enrollmentId)
    if (!e) return []
    return e.goalProgresses.filter(gp => gp.status !== 'locked')
  }

  function tickScheduledReleases() {
    for (const enrollment of enrollments.value) {
      processScheduledReleases(enrollment)
    }
  }

  function getProgress(enrollmentId) {
    const e = enrollments.value.find(e => e.id === enrollmentId)
    if (!e) return 0
    const total = e.goalProgresses.length
    const done = e.goalProgresses.filter(gp => gp.status === 'completed').length
    return total === 0 ? 0 : Math.round((done / total) * 100)
  }

  return {
    enrollments,
    inviteLinks,
    loading,
    // Invite links
    createInviteLink,
    getLinkUrl,
    validateInviteLink,
    listInviteLinks,
    revokeInviteLink,
    // Enrollments
    enrollViaLink,
    loadMyEnrollments,
    loadByPlan,
    getEnrollment,
    markTaskDone,
    // Mentor
    mentorUnlockForUser,
    mentorUnlockForAll,
    setEnrollmentStatus,
    // Scheduled releases
    tickScheduledReleases,
    // Queries
    byPlan,
    byUser,
    getVisibleGoals,
    getProgress,
  }
},
{
  persist: {
    key: 'enrollments',
    paths: ['enrollments', 'inviteLinks'],
  }
})