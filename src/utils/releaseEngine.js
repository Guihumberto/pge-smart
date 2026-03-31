import dayjs from 'dayjs'

/**
 * Retorna quantas metas estão pendentes (unlocked ou in_progress) para um enrollment
 * @param {import('@/types/enrollment').Enrollment} enrollment
 * @returns {number}
 */
export function countPendingGoals(enrollment) {
  return enrollment.goalProgresses.filter(
    gp => gp.status === 'unlocked' || gp.status === 'in_progress'
  ).length
}

/**
 * Retorna a próxima meta ainda locked, em ordem de índice
 * @param {import('@/types/enrollment').Enrollment} enrollment
 * @returns {GoalProgress | null}
 */
export function getNextLockedGoal(enrollment) {
  return enrollment.goalProgresses.find(gp => gp.status === 'locked') ?? null
}

/**
 * Verifica se pode liberar a próxima meta:
 * — máximo 2 pendentes
 * — next existe
 * @param {import('@/types/enrollment').Enrollment} enrollment
 * @returns {boolean}
 */
export function canUnlockNext(enrollment) {
  if (countPendingGoals(enrollment) >= 2) return false
  return !!getNextLockedGoal(enrollment)
}

/**
 * Calcula a data de liberação agendada para uma meta,
 * baseado na data de liberação da meta anterior + config semanal
 * @param {string} fromDate          — ISO date da meta anterior
 * @param {number} weekday           — 0=Dom…6=Sáb
 * @param {string} time              — 'HH:MM'
 * @returns {string}                 — ISO datetime
 */
export function calcScheduledUnlock(fromDate, weekday, time) {
  const [hour, minute] = time.split(':').map(Number)
  let base = dayjs(fromDate).add(1, 'day')

  // Avança até o próximo weekday desejado
  while (base.day() !== weekday) {
    base = base.add(1, 'day')
  }

  return base.hour(hour).minute(minute).second(0).toISOString()
}

/**
 * Processa liberações agendadas pendentes para um enrollment.
 * Deve ser chamado ao carregar o enrollment ou num job periódico.
 * Respeita a regra: só libera a próxima, mesmo que várias estejam no passado.
 * @param {import('@/types/enrollment').Enrollment} enrollment
 * @returns {{ enrollment: Enrollment, unlocked: boolean }}
 */
export function processScheduledReleases(enrollment) {
  if (enrollment.status === 'paused' || enrollment.status === 'blocked') {
    return { enrollment, unlocked: false }
  }

  const now = dayjs()
  const next = getNextLockedGoal(enrollment)

  if (!next) return { enrollment, unlocked: false }
  if (countPendingGoals(enrollment) >= 2) return { enrollment, unlocked: false }

  // Verifica se o scheduledUnlockAt já passou
  if (next.scheduledUnlockAt && dayjs(next.scheduledUnlockAt).isBefore(now)) {
    next.status = 'unlocked'
    next.unlockedAt = now.toISOString()
    return { enrollment, unlocked: true }
  }

  return { enrollment, unlocked: false }
}

/**
 * Marca uma tarefa como concluída e verifica se a meta foi concluída.
 * @param {GoalProgress} goalProgress
 * @param {string} taskId
 * @returns {{ goalCompleted: boolean }}
 */
export function completeTask(goalProgress, taskId) {
  const tp = goalProgress.taskProgresses.find(t => t.taskId === taskId)
  if (tp) {
    tp.done = true
    tp.doneAt = new Date().toISOString()
  }

  const allDone = goalProgress.taskProgresses.every(t => t.done)
  if (allDone) {
    goalProgress.status = 'completed'
    goalProgress.completedAt = new Date().toISOString()
  }

  return { goalCompleted: allDone }
}