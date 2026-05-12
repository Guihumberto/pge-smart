import { defineStore } from 'pinia'
import { ref } from 'vue'
import { cargoService } from '@/services/cargo.service'
import { toast } from 'vue-sonner'

export const useCargoStore = defineStore('cargos', () => {
  const cargos = ref([])
  const cargoAtual = ref(null)
  const loading = ref(false)
  const parseStatus = ref(null)

  // Cache acumulativo SLIM de cargos por id — usado pra resolver `cargo.nome`
  // de tasks com `origemDados.cargoOrigem` (PanelTasks ctxLabelOf).
  // Guarda apenas `{ id, nome, editalId }` (não o doc inteiro com priorização)
  // pra evitar inflar localStorage com mentor de longo prazo.
  // Cap LRU informal: se passar de CARGOS_CAP_LRU, descarta os mais antigos.
  const cargosById = ref({})
  const CARGOS_CAP_LRU = 200

  // Map de cargoId → Promise pendente — dedup de chamadas paralelas a
  // `ensureCargo`. Compartilhando a Promise, callers paralelos recebem o
  // mesmo resultado (não null como na 1ª versão).
  const inFlightCargos = new Map()

  function _toSlim(c) {
    if (!c?.id) return null
    return { id: c.id, nome: c.nome ?? null, editalId: c.editalId ?? null }
  }

  function _enforceCap() {
    const keys = Object.keys(cargosById.value)
    if (keys.length <= CARGOS_CAP_LRU) return
    // Cap simples: remove os primeiros (mais antigos por ordem de inserção).
    const remover = keys.slice(0, keys.length - CARGOS_CAP_LRU)
    for (const k of remover) delete cargosById.value[k]
  }

  function indexarCargos(list) {
    for (const c of list || []) {
      const slim = _toSlim(c)
      if (slim) cargosById.value[slim.id] = slim
    }
    _enforceCap()
  }

  function getCargoById(id) {
    return cargosById.value[id] || cargos.value.find(c => c.id === id) || null
  }

  /**
   * Busca cargo por id se ainda não está em cache. Idempotente; deduplica
   * chamadas paralelas — todas recebem a mesma Promise (e o mesmo resultado).
   */
  function ensureCargo(editalId, cargoId) {
    if (!cargoId || !editalId) return Promise.resolve(null)
    if (cargosById.value[cargoId]) return Promise.resolve(cargosById.value[cargoId])
    if (inFlightCargos.has(cargoId)) return inFlightCargos.get(cargoId)
    const p = cargoService.get(editalId, cargoId)
      .then(cargo => {
        const slim = _toSlim(cargo)
        if (slim) {
          cargosById.value[slim.id] = slim
          _enforceCap()
        }
        return cargo
      })
      .catch(() => null)
      .finally(() => inFlightCargos.delete(cargoId))
    inFlightCargos.set(cargoId, p)
    return p
  }

  async function fetchCargos(editalId) {
    loading.value = true
    try {
      cargos.value = await cargoService.list(editalId)
      indexarCargos(cargos.value)
    } finally {
      loading.value = false
    }
  }

  async function fetchCargo(editalId, cargoId) {
    loading.value = true
    try {
      cargoAtual.value = await cargoService.get(editalId, cargoId)
      if (cargoAtual.value) indexarCargos([cargoAtual.value])
      return cargoAtual.value
    } finally {
      loading.value = false
    }
  }

  async function createCargo(editalId, data) {
    const cargo = await cargoService.create(editalId, data)
    cargos.value.push(cargo)
    toast.success('Cargo adicionado!')
    return cargo
  }

  async function updateCargo(editalId, cargoId, patch) {
    const updated = await cargoService.update(editalId, cargoId, patch)
    const idx = cargos.value.findIndex(c => c.id === cargoId)
    if (idx !== -1) cargos.value[idx] = updated
    if (cargoAtual.value?.id === cargoId) cargoAtual.value = updated
    toast.success('Cargo atualizado!')
    return updated
  }

  async function removeCargo(editalId, cargoId) {
    await cargoService.remove(editalId, cargoId)
    cargos.value = cargos.value.filter(c => c.id !== cargoId)
    if (cargoAtual.value?.id === cargoId) cargoAtual.value = null
    toast.success('Cargo removido.')
  }

  /**
   * Envia 1 disciplina por chamada para o backend parsear.
   * O backend processa sequencialmente; o front sempre chama com 1 bloco.
   * Em caso de erro, NÃO mostra toast — quem chama (loop da view) decide.
   */
  async function enviarParse(editalId, cargoId, bloco) {
    parseStatus.value = 'processando'
    try {
      const result = await cargoService.parse(editalId, cargoId, { blocos: [bloco] })
      parseStatus.value = 'concluido'
      return result
    } catch (err) {
      parseStatus.value = 'erro'
      throw err
    }
  }

  async function salvarConteudo(editalId, cargoId, conteudoParseado) {
    const updated = await cargoService.update(editalId, cargoId, {
      conteudo_parseado: stripUiFlags(conteudoParseado),
      parse_status: 'concluido',
    })
    const idx = cargos.value.findIndex(c => c.id === cargoId)
    if (idx !== -1) cargos.value[idx] = updated
    if (cargoAtual.value?.id === cargoId) cargoAtual.value = updated
    toast.success('Conteúdo salvo!')
    return updated
  }

  /**
   * Remove flags de UI (props que começam com '_') de qualquer objeto/array,
   * recursivamente. Mantém o domínio limpo no Elasticsearch.
   */
  function stripUiFlags(value) {
    if (Array.isArray(value)) return value.map(stripUiFlags)
    if (value && typeof value === 'object') {
      const out = {}
      for (const [k, v] of Object.entries(value)) {
        if (k.startsWith('_')) continue
        out[k] = stripUiFlags(v)
      }
      return out
    }
    return value
  }

  async function analisarConteudo(editalId, cargoId, { area, disciplinas } = {}) {
    try {
      const result = await cargoService.analisar(editalId, cargoId, { area, disciplinas })
      if (cargoAtual.value?.id === cargoId) cargoAtual.value = result
      const idx = cargos.value.findIndex(c => c.id === cargoId)
      if (idx !== -1) cargos.value[idx] = result
      return result
    } catch (err) {
      toast.error(err.message || 'Erro na análise')
      throw err
    }
  }

  // ── Vinculação de normas ────────────────────────────────────

  async function getLeisSugestoes(editalId, cargoId) {
    try {
      return await cargoService.getLeisSugestoes(editalId, cargoId)
    } catch (err) {
      toast.error(err.message || 'Erro ao buscar sugestões de normas')
      throw err
    }
  }

  async function regerarLeisSugestoes(editalId, cargoId) {
    try {
      const result = await cargoService.regerarLeisSugestoes(editalId, cargoId)
      toast.success('Sugestões recalculadas')
      return result
    } catch (err) {
      toast.error(err.message || 'Erro ao recalcular sugestões')
      throw err
    }
  }

  async function vincularLei(editalId, cargoId, payload) {
    try {
      return await cargoService.vincularLei(editalId, cargoId, payload)
    } catch (err) {
      toast.error(err.message || 'Erro ao vincular norma')
      throw err
    }
  }

  async function mudarStatusLei(editalId, cargoId, normaId, status) {
    try {
      return await cargoService.mudarStatusLei(editalId, cargoId, normaId, status)
    } catch (err) {
      toast.error(err.message || 'Erro ao mudar status')
      throw err
    }
  }

  async function desvincularLei(editalId, cargoId, normaId) {
    try {
      return await cargoService.desvincularLei(editalId, cargoId, normaId)
    } catch (err) {
      toast.error(err.message || 'Erro ao desvincular norma')
      throw err
    }
  }

  return {
    cargos, cargoAtual, loading, parseStatus,
    fetchCargos, fetchCargo, createCargo, updateCargo, removeCargo,
    enviarParse, salvarConteudo, analisarConteudo,
    getLeisSugestoes, regerarLeisSugestoes, vincularLei, mudarStatusLei, desvincularLei,

    // Cache de cargos por id (slim — id/nome/editalId). Use APENAS via
    // `getCargoById(id)` ou `ensureCargo(editalId, id)`. Não mutar direto.
    cargosById,
    getCargoById, ensureCargo,
  }
}, {
  persist: {
    key: 'cargos',
    paths: ['cargos', 'cargosById'],
    // Poda o cap LRU após hidratação — sessões antigas (pré-cap) podem ter
    // localStorage com centenas de entradas. Sem isso, o heap infla até a
    // próxima inserção disparar `_enforceCap`.
    afterRestore: (ctx) => {
      const c = ctx.store.cargosById
      const keys = Object.keys(c || {})
      if (keys.length > 200) {
        const remover = keys.slice(0, keys.length - 200)
        for (const k of remover) delete c[k]
      }
    },
  },
})
