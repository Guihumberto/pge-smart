<template>
  <div class="all-students" style="font-family: 'DM Sans', sans-serif;">

    <div class="page-header">
      <div>
        <h1 class="page-title">Meus Alunos</h1>
        <p class="page-sub">Visão geral de todos os alunos em todos os planos</p>
      </div>
      <input v-model="search" class="search-input" placeholder="Buscar por nome ou email..." />
    </div>

    <!-- Cards de alunos únicos -->
    <div class="students-grid">
      <div
        v-for="student in filteredStudents"
        :key="student.userId"
        class="student-card"
        @click="openStudent(student)"
      >
        <div class="student-card__top">
          <div class="student-avatar">{{ initials(student) }}</div>
          <div class="student-card__info">
            <p class="student-card__name">{{ student.name || 'Sem nome' }}</p>
            <p class="student-card__email">{{ student.email || '—' }}</p>
          </div>
          <span :class="['status-dot', `status-dot--${dominantStatus(student)}`]" :title="statusLabel(dominantStatus(student))" />
        </div>

        <!-- Planos do aluno -->
        <div class="student-card__plans">
          <div
            v-for="e in student.enrollments"
            :key="e.id"
            class="plan-chip"
          >
            <span class="plan-chip__name">{{ getPlanTitle(e.planId) }}</span>
            <div class="plan-chip__bar">
              <div class="plan-chip__fill" :style="{ width: enrollmentStore.getProgress(e.id) + '%' }" />
            </div>
            <span class="plan-chip__pct">{{ enrollmentStore.getProgress(e.id) }}%</span>
          </div>
        </div>

        <div class="student-card__footer">
          <span class="student-card__plans-count">
            {{ student.enrollments.length }} plano(s)
          </span>
          <span class="student-card__last-active">
            Entrou {{ formatDate(student.enrollments[0]?.enrolledAt) }}
          </span>
        </div>
      </div>
    </div>

    <p v-if="!filteredStudents.length" class="empty">Nenhum aluno encontrado.</p>

    <StudentDrawer
      v-if="selectedEnrollment"
      :enrollment="selectedEnrollment"
      @close="selectedEnrollment = null"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useEnrollmentStore } from '@/stores/useEnrollmentStore'
import { usePlanStore } from '@/stores/usePlanStore'
import StudentDrawer from '@/components/mentor/StudentDrawer.vue'
import dayjs from 'dayjs'
import { toast } from 'vue-sonner'

const enrollmentStore = useEnrollmentStore()
const planStore       = usePlanStore()

const search             = ref('')
const selectedEnrollment = ref(null)
const loading            = ref(false)

// ── Carrega ao montar ──────────────────────────────────────
onMounted(async () => {
  loading.value = true
  try {
    // Garante planos carregados
    if (!planStore.plans.length) await planStore.fetchPlans()

    // Carrega enrollments de todos os planos em paralelo
    await Promise.all(
      planStore.plans.map(p =>
        enrollmentStore.fetchByPlan(p.id).catch(() => null)
      )
    )
  } catch (err) {
    toast.error('Erro ao carregar alunos.')
  } finally {
    loading.value = false
  }
})

// Agrupa por userId, usa nome/email do enrollment
const studentMap = computed(() => {
  const map = {}
  enrollmentStore.enrollments.forEach(e => {
    if (!map[e.userId]) {
      map[e.userId] = {
        userId: e.userId,
        name:   e.userName || '',
        email:  e.userEmail || '',
        enrollments: [],
      }
    }
    // Atualiza com dados mais recentes se disponíveis
    if (e.userName)  map[e.userId].name  = e.userName
    if (e.userEmail) map[e.userId].email = e.userEmail
    map[e.userId].enrollments.push(e)
  })
  return Object.values(map)
})

const filteredStudents = computed(() => {
  const q = search.value.toLowerCase()
  if (!q) return studentMap.value
  return studentMap.value.filter(s => {
    return s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
  })
})

const dominantStatus = (student) => {
  if (student.enrollments.some(e => e.status === 'active'))    return 'active'
  if (student.enrollments.some(e => e.status === 'paused'))    return 'paused'
  if (student.enrollments.some(e => e.status === 'blocked'))   return 'blocked'
  return 'completed'
}

const initials = (student) => {
  if (!student.name) return '?'
  return student.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}
const getPlanTitle = (id) => planStore.plans.find(p => p.id === id)?.title ?? '—'
const formatDate   = (iso) => iso ? dayjs(iso).format('DD/MM/YY') : '—'
const statusLabel  = (s) => ({ active: 'Ativo', paused: 'Pausado', blocked: 'Bloqueado', completed: 'Concluído' }[s] ?? s)

const openStudent = (student) => {
  selectedEnrollment.value = student.enrollments[0]
}
</script>

<style scoped>
.all-students { max-width: 1100px; }

.page-header {
  display: flex; align-items: flex-start;
  justify-content: space-between; gap: 16px;
  margin-bottom: 24px; flex-wrap: wrap;
}
.page-title { font-size: 1.2rem; font-weight: 700; color: #1a1a2e; margin: 0; }
.page-sub   { font-size: 12px; color: #aaa; margin: 4px 0 0; }

.search-input {
  font-family: 'DM Sans', sans-serif; font-size: 13px;
  border: 1px solid #ddd; border-radius: 8px;
  padding: 7px 12px; outline: none; width: 260px;
}
.search-input:focus { border-color: #534AB7; }

.students-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
}

.student-card {
  background: #fff; border: 1px solid #ebe9e4;
  border-radius: 12px; padding: 16px;
  cursor: pointer; transition: border-color 0.15s, transform 0.15s;
  display: flex; flex-direction: column; gap: 12px;
}
.student-card:hover { border-color: #AFA9EC; transform: translateY(-2px); }

.student-card__top {
  display: flex; align-items: center; gap: 10px;
}

.student-avatar {
  width: 36px; height: 36px; border-radius: 50%;
  background: #1a1a2e; color: #fff;
  font-size: 12px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}

.student-card__info { flex: 1; min-width: 0; }
.student-card__name  { font-size: 13px; font-weight: 700; color: #1a1a2e; margin: 0; }
.student-card__email { font-size: 11px; color: #aaa; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.status-dot {
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
}
.status-dot--active    { background: #3B6D11; }
.status-dot--paused    { background: #854F0B; }
.status-dot--blocked   { background: #A32D2D; }
.status-dot--completed { background: #534AB7; }

.student-card__plans {
  display: flex; flex-direction: column; gap: 6px;
}

.plan-chip {
  display: flex; align-items: center; gap: 8px;
}

.plan-chip__name {
  font-size: 11px; font-weight: 600; color: #555;
  min-width: 100px; max-width: 120px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.plan-chip__bar {
  flex: 1; height: 4px; background: #f0efea; border-radius: 10px; overflow: hidden;
}
.plan-chip__fill { height: 100%; background: #534AB7; border-radius: 10px; }

.plan-chip__pct { font-size: 10px; font-weight: 700; color: #aaa; min-width: 28px; text-align: right; }

.student-card__footer {
  display: flex; justify-content: space-between;
  font-size: 11px; color: #bbb;
  border-top: 1px solid #f5f4f0; padding-top: 10px;
}

.empty { font-size: 13px; color: #bbb; text-align: center; padding: 48px 0; }

.status-badge {
  font-size: 10px; font-weight: 700;
  letter-spacing: 0.06em; text-transform: uppercase;
  border-radius: 5px; padding: 2px 8px;
}
.status-badge--active    { background: #EAF3DE; color: #3B6D11; }
.status-badge--paused    { background: #FAEEDA; color: #854F0B; }
.status-badge--blocked   { background: #FCEBEB; color: #A32D2D; }
.status-badge--completed { background: #EEEDFE; color: #534AB7; }
</style>