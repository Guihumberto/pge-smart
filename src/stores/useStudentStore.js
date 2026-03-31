import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useEnrollmentStore } from './useEnrollmentStore'
import { usePlanStore } from './usePlanStore'
import { useTaskStore } from './useTaskStore'

export const useStudentStore = defineStore('student', () => {
  const enrollmentStore = useEnrollmentStore()
  const planStore = usePlanStore()
  const taskStore = useTaskStore()

  const loading = ref(false)
  const currentEnrollmentId = ref(null)
  const currentGoalProgressId = ref(null)

  // ── Dados derivados ─────────────────────────────────────

  const myEnrollments = computed(() =>
    enrollmentStore.enrollments.filter(e => e.status === 'active')
  )

  /**
   * Retorna todas as metas visíveis do aluno, agrupadas por enrollment,
   * com dados do plano e progresso resolvidos.
   */
  const myGoals = computed(() => {
    const result = []
    for (const enrollment of myEnrollments.value) {
      const plan = planStore.plans.find(p => p.id === enrollment.planId)
      const visibleGoals = (enrollment.goalProgresses ?? [])
        .filter(gp => gp.status !== 'locked')

      for (const gp of visibleGoals) {
        const goal = planStore.goals.find(g => g.id === gp.goalId)
        if (!goal) continue

        const taskProgresses = gp.taskProgresses ?? []
        const totalTasks = taskProgresses.length
        const doneTasks = taskProgresses.filter(tp => tp.done).length

        result.push({
          enrollmentId: enrollment.id,
          goalProgressId: gp.id,
          goalId: gp.goalId,
          planId: enrollment.planId,
          planTitle: plan?.title ?? 'Plano',
          title: goal.title,
          description: goal.description,
          status: gp.status,
          totalTasks,
          doneTasks,
          progressPct: totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0,
          taskIds: goal.taskIds ?? [],
          taskProgresses,
        })
      }
    }
    return result
  })

  // ── Ações ───────────────────────────────────────────────

  async function loadStudentData() {
    loading.value = true
    try {
      await enrollmentStore.loadMyEnrollments()

      // Carrega planos e goals de cada enrollment
      const planIds = [...new Set(enrollmentStore.enrollments.map(e => e.planId))]
      if (!planStore.plans.length) await planStore.fetchPlans()

      await Promise.all(
        planIds.map(pid => Promise.all([
          planStore.fetchGoals(pid),
          taskStore.fetchByPlan(pid),
        ]))
      )
    } finally {
      loading.value = false
    }
  }

  async function toggleTaskDone(enrollmentId, goalProgressId, taskId) {
    const updated = await enrollmentStore.markTaskDone(enrollmentId, goalProgressId, taskId)
    return updated
  }

  function getGoalTasks(goalData) {
    if (!goalData?.taskIds?.length) return []
    return goalData.taskIds
      .map(id => taskStore.getById(id))
      .filter(Boolean)
  }

  function isTaskDone(goalData, taskId) {
    return goalData.taskProgresses.some(tp => tp.taskId === taskId && tp.done)
  }

  return {
    loading,
    currentEnrollmentId,
    currentGoalProgressId,
    myEnrollments,
    myGoals,
    loadStudentData,
    toggleTaskDone,
    getGoalTasks,
    isTaskDone,
  }
})
