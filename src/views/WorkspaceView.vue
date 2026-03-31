<template>
  <div class="workspace">
    <!-- Header da página -->
    <div class="workspace__header">
      <div>
        <h1 class="workspace__title">Construtor de Planos</h1>
        <p class="workspace__subtitle">Monte disciplinas, tarefas e metas de forma modular</p>
      </div>

      <!-- Seletor de plano -->
      <div class="plan-selector">
        <select v-model="activePlanId" class="plan-selector__select">
          <option v-for="plan in planStore.plans" :key="plan.id" :value="plan.id">
            {{ plan.title }}
          </option>
        </select>
        <button class="plan-selector__btn" @click="showNewPlan = true">
          <Plus :size="14" /> Novo plano
        </button>
      </div>
    </div>

    <!-- 3 painéis -->
    <div v-if="loading || !activePlanId" class="panels-loading">
      Carregando plano...
    </div>

    <div v-else class="panels">
      <PanelDisciplines
        :selected-id="selectedDisciplineId"
        @select="selectedDisciplineId = $event"
      />
      <PanelTasks
        :discipline-id="selectedDisciplineId"
        :plan-id="activePlanId"
        @drag-start="draggingTask = $event"
      />
      <PanelGoals
        :plan-id="activePlanId"
        :dragging-task="draggingTask"
        @drop-done="draggingTask = null"
      />
    </div>

    <!-- Modal novo plano -->
    <ModalNewPlan v-if="showNewPlan" @close="showNewPlan = false" @created="activePlanId = $event" />
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Plus } from 'lucide-vue-next'
import { usePlanStore } from '@/stores/usePlanStore'
import { useTaskStore } from '@/stores/useTaskStore'
import { useDisciplineStore } from '@/stores/useDisciplineStore'
import PanelDisciplines from '@/components/workspace/PanelDisciplines.vue'
import PanelTasks from '@/components/workspace/PanelTasks.vue'
import PanelGoals from '@/components/workspace/PanelGoals.vue'
import ModalNewPlan from '@/components/workspace/ModalNewPlan.vue'
import { toast } from 'vue-sonner'

const route  = useRoute()

const planStore       = usePlanStore()
const taskStore       = useTaskStore()
const disciplineStore = useDisciplineStore()

const activePlanId           = ref(null)
const selectedDisciplineId   = ref(null)
const draggingTask           = ref(null)
const showNewPlan            = ref(false)
const loading                = ref(false)
const mounted                = ref(false)

// ── Carrega ao montar ──────────────────────────────────────
onMounted(async () => {
  loading.value = true
  try {
    await planStore.fetchPlans()
    await disciplineStore.fetchAll?.()

    const queryPlan = route.query.plan
    const targetId  = queryPlan ?? planStore.plans[0]?.id ?? null

    // Confirma que o plano existe na lista carregada do backend
    if (targetId && planStore.plans.find(p => p.id === targetId)) {
      activePlanId.value = targetId
    } else if (planStore.plans.length) {
      activePlanId.value = planStore.plans[0].id
      if (queryPlan) toast.warning('Plano não encontrado, carregando o primeiro disponível.')
    }

    if (activePlanId.value) {
      await Promise.all([
        planStore.fetchGoals(activePlanId.value),
        taskStore.fetchByPlan(activePlanId.value),
      ])
    }
  } catch (err) {
    toast.error('Erro ao carregar workspace.')
  } finally {
    loading.value = false
    mounted.value = true
  }
})

// ── Carrega metas e tarefas ao trocar de plano ─────────────
watch(activePlanId, async (id) => {
  if (!id || !mounted.value) return
  try {
    await Promise.all([
      planStore.fetchGoals(id),
      taskStore.fetchByPlan(id),
    ])
  } catch (err) {
    toast.error('Erro ao carregar dados do plano.')
  }
})

</script>

<style scoped>
.workspace {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  padding: 20px 24px;
  gap: 16px;
  overflow: hidden;
}

.workspace__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.workspace__title {
  text-align: left;
  font-size: 1.25rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}

.workspace__subtitle {
  font-size: 0.8rem;
  color: #999;
  margin: 2px 0 0;
}

.plan-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.plan-selector__select {
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: #1a1a2e;
  background: #fff;
  border: 1px solid #ebe9e4;
  border-radius: 8px;
  padding: 7px 12px;
  cursor: pointer;
  outline: none;
}

.plan-selector__btn {
  display: flex;
  align-items: center;
  gap: 5px;
  font-family: 'DM Sans', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: #534AB7;
  background: #EEEDFE;
  border: none;
  border-radius: 8px;
  padding: 7px 12px;
  cursor: pointer;
  transition: background 0.15s;
}

.plan-selector__btn:hover { background: #dddcfc; }

.panels-loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #aaa;
  gap: 8px;
}

.panels-loading::before {
  content: '';
  width: 16px;
  height: 16px;
  border: 2px solid #e0dff8;
  border-top-color: #534AB7;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.panels {
  display: grid;
  grid-template-columns: 220px 1fr 1fr;
  gap: 12px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

@media (max-width: 900px) {
  .panels { grid-template-columns: 1fr; overflow-y: auto; }
}
</style>