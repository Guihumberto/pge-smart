import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { planService } from '@/services/plan.service'
import { goalService } from '@/services/goal.service'
import { toast } from 'vue-sonner'

export const usePlanStore = defineStore('plans', () => {
  const plans   = ref([])
  const goals   = ref([])
  const loading = ref(false)

  // ── Plans ──────────────────────────────────────────────
  async function fetchPlans() {
    loading.value = true
    try {
      plans.value = await planService.list()
      goals.value = goals.value.filter(g => g != null) // ← sanitiza ao carregar
    } finally {
      loading.value = false
    }
  }

  async function createPlan(title, description = '') {
    const plan = await planService.create({ title, description })
    plans.value.push(plan)
    toast.success('Plano criado!')
    return plan
  }

  async function updatePlan(id, patch) {
    const updated = await planService.update(id, patch)
    const idx = plans.value.findIndex(p => p.id === id)
    if (idx !== -1) plans.value[idx] = updated
    toast.success('Plano atualizado!')
    return updated
  }

  async function removePlan(id) {
    await planService.remove(id)
    plans.value = plans.value.filter(p => p.id !== id)
    goals.value = goals.value.filter(g => g.planId !== id)
    toast.success('Plano removido.')
  }

  // ── Goals ──────────────────────────────────────────────
  async function fetchGoals(planId) {
    const fetched = await goalService.list(planId)
    goals.value = [
      ...goals.value.filter(g => g != null && g.planId !== planId), // ← guard aqui também
      ...fetched.filter(g => g != null),                            // ← e nos dados vindos da API
    ]
    return fetched
  }

  async function createGoal(planId, title, description = '') {
    const goal = await goalService.create(planId, { title, description })
    goals.value.push(goal)
    return goal
  }

  async function updateGoal(planId, id, patch) {
    const updated = await goalService.update(planId, id, patch)
    const idx = goals.value.findIndex(g => g.id === id)
    if (idx !== -1) goals.value[idx] = updated
    return updated
  }

  async function removeGoal(planId, id) {
    await goalService.remove(planId, id)
    goals.value = goals.value.filter(g => g.id !== id)
  }

  async function addTaskToGoal(planId, goalId, taskId) {
    const updated = await goalService.addTask(planId, goalId, taskId)
    const idx = goals.value.findIndex(g => g.id === goalId)
    if (idx !== -1) goals.value[idx] = updated
  }

  async function removeTaskFromGoal(planId, goalId, taskId) {
    const updated = await goalService.removeTask(planId, goalId, taskId)
    const idx = goals.value.findIndex(g => g.id === goalId)
    if (idx !== -1) goals.value[idx] = updated
  }

  async function copyGoalToPlan(planId, goalId, targetPlanId) {
    const original = goals.value.find(g => g.id === goalId)
    if (!original) return
    const copy = await goalService.create(targetPlanId, {
      title:       `${original.title} (cópia)`,
      description: original.description,
      taskIds:     original.taskIds,
    })
    goals.value.push(copy)
    toast.success('Meta copiada!')
    return copy
  }

  const goalsByPlan = computed(() => (planId) =>
    goals.value.filter(g => g.planId === planId)
  )

  return {
    plans, goals, loading,
    fetchPlans, createPlan, updatePlan, removePlan,
    fetchGoals, createGoal, updateGoal, removeGoal,
    addTaskToGoal, removeTaskFromGoal, copyGoalToPlan,
    goalsByPlan,
  }
}, {
  persist: { key: 'plans', paths: ['plans', 'goals'] }
})