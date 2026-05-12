import { defineStore } from 'pinia'
import { ref } from 'vue'
import { taskService } from '@/services/task.service'
import { parseArticles } from '@/utils/articleParser'

export const useTaskStore = defineStore('tasks', () => {
  const tasks   = ref([])
  const loading = ref(false)

  // Quanto tempo uma task `_local` (criada via appendLocal) sobrevive sem
  // aparecer em fetch antes de ser considerada "perdida" e descartada.
  const LOCAL_TTL_MS = 5 * 60 * 1000

  // Funde tasks novas no estado. `keep(t)` decide se uma task atual sobrevive
  // (true = preserva, false = será substituída pela versão de `fetched`).
  // Dedupa por id pra evitar duplicatas em reloads sucessivos.
  //
  // Tasks `_local: true` (criadas via appendLocal) são preservadas mesmo se
  // não vieram do fetch — protege race entre criação e refetch concorrente.
  // Após `LOCAL_TTL_MS` sem confirmação do server, deixam de ser preservadas
  // pra evitar fantasmas se a task foi deletada em outra aba.
  function mergeTasks(fetched, keep) {
    const fetchedIds = new Set(fetched.map(t => t.id))
    const agora = Date.now()
    const preservadas = tasks.value.filter(t => {
      if (fetchedIds.has(t.id)) return false
      if (keep(t)) return true
      if (t._local && (agora - (t._localSince || 0)) < LOCAL_TTL_MS) return true
      return false
    })
    tasks.value = [...preservadas, ...fetched]
  }

  async function fetchByPlan(planId) {
    loading.value = true
    try {
      const fetched = await taskService.listByPlan(planId)
      // Preserva tasks de OUTROS planos; substitui as deste plano (inclui órfãs
      // _viaGoal que vêm do backend agora e poderiam duplicar entre reloads).
      const ownerIds = new Set(fetched.map(t => t.id))
      mergeTasks(fetched, (t) => t.planId !== planId && !ownerIds.has(t.id))
    } finally {
      loading.value = false
    }
  }

  async function fetchByDiscipline(disciplineId) {
    loading.value = true
    try {
      const fetched = await taskService.listByDiscipline(disciplineId)
      mergeTasks(fetched, (t) => t.disciplineId !== disciplineId)
    } finally {
      loading.value = false
    }
  }

  /**
   * Cria task via endpoint discipline-scoped (`POST /disciplines/:id/tasks`).
   * Aceita qualquer `origem` EXCETO `'revisao'` — pra revisões use `criarRevisao`
   * que garante `revisaoDeTaskId` apontando a task real do mentor.
   */
  async function create(disciplineId, payload) {
    const task = await taskService.create(disciplineId, payload)
    tasks.value.push(task)
    return task
  }

  async function update(disciplineId, id, patch) {
    const updated = await taskService.update(disciplineId, id, patch)
    const idx = tasks.value.findIndex(t => t.id === id)
    if (idx !== -1) tasks.value[idx] = updated
    return updated
  }

  async function remove(id) {
    await taskService.remove(id)
    tasks.value = tasks.value.filter(t => t.id !== id)
  }

  const getById = (id) => tasks.value.find(t => t.id === id)

  const byDiscipline = (disciplineId) => tasks.value.filter(t => t.disciplineId === disciplineId)

  // Insere task já criada pelo backend no estado local (dedup por id).
  // Marca `_local: true` pra `mergeTasks` preservar caso um fetch concorrente
  // ainda não tenha a task na resposta (race). A flag tem TTL — após 5min,
  // se a task ainda não apareceu no fetch, deixa o `mergeTasks` removê-la
  // (evita fantasma se o backend deletou em outra aba).
  function appendLocal(task) {
    if (!task?.id) return
    if (tasks.value.find(t => t.id === task.id)) return
    tasks.value.push({ ...task, _local: true, _localSince: Date.now() })
  }

  // Cria revisão via service + appendLocal. Centraliza o fluxo pra evitar
  // duplicação entre PanelTasks e PanelGoals. Caller decide confirm/toast.
  async function criarRevisao(taskId, { planId } = {}) {
    const revisao = await taskService.criarRevisao(taskId, { planId })
    if (!revisao || !revisao.id) {
      throw new Error('Resposta vazia ao criar revisão')
    }
    appendLocal(revisao)
    return revisao
  }

  return {
    tasks, loading,
    fetchByPlan, create, update, remove,
    getById, byDiscipline, fetchByDiscipline,
    appendLocal, criarRevisao,
  }
}, {
  // Strip `_local`/`_localSince` na serialização — evita que uma task local
  // criada por appendLocal "ressuscite" após reload se ela foi deletada
  // server-side em outra aba antes do TTL expirar.
  persist: {
    key: 'tasks',
    paths: ['tasks'],
    serializer: {
      serialize: (state) => JSON.stringify({
        ...state,
        tasks: (state.tasks || []).map(t => {
          // eslint-disable-next-line no-unused-vars
          const { _local, _localSince, ...rest } = t
          return rest
        }),
      }),
      deserialize: JSON.parse,
    },
  },
})