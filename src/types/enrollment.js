/**
 * @typedef {'active' | 'paused' | 'completed' | 'blocked'} EnrollmentStatus
 * @typedef {'pending' | 'unlocked' | 'in_progress' | 'completed' | 'locked'} GoalProgressStatus
 * @typedef {'sequential' | 'scheduled' | 'manual'} ReleaseMode
 */

/**
 * Configuração de liberação de um plano
 * @typedef {Object} ReleaseConfig
 * @property {ReleaseMode} mode
 *
 * — sequential: libera próxima assim que aluno conclui (sem data)
 *
 * — scheduled: libera em dia/hora fixo da semana
 * @property {number|null}  scheduledWeekday   0=Dom … 6=Sáb
 * @property {string|null}  scheduledTime      'HH:MM'
 *
 * — manual: só o mentor libera
 */

/**
 * Vínculo entre um usuário e um plano
 * @typedef {Object} Enrollment
 * @property {string}           id
 * @property {string}           planId
 * @property {string}           userId
 * @property {string}           mentorId
 * @property {EnrollmentStatus} status
 * @property {ReleaseConfig}    releaseConfig
 * @property {GoalProgress[]}   goalProgresses
 * @property {string}           enrolledAt
 */

/**
 * Estado de uma meta para um aluno específico
 * @typedef {Object} GoalProgress
 * @property {string}               id
 * @property {string}               goalId
 * @property {string}               enrollmentId
 * @property {GoalProgressStatus}   status
 * @property {TaskProgress[]}       taskProgresses
 * @property {string|null}          unlockedAt
 * @property {string|null}          completedAt
 * @property {string|null}          scheduledUnlockAt  — data calculada para liberação agendada
 */

/**
 * @typedef {Object} TaskProgress
 * @property {string}  taskId
 * @property {boolean} done
 * @property {string|null} doneAt
 */

/**
 * Link de convite para um plano
 * @typedef {Object} InviteLink
 * @property {string}          id
 * @property {string}          planId
 * @property {string}          token              — uuid único
 * @property {'single' | 'global'} type
 * @property {string|null}     usedBy             — userId (só single use)
 * @property {string|null}     usedAt
 * @property {string|null}     expiresAt
 * @property {string}          createdAt
 */