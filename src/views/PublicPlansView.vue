<template>
  <div class="public-plans">
    <div class="public-plans__header">
      <div class="header-icon">
        <Compass :size="22" />
      </div>
      <div>
        <h1 class="header-title">Explorar Planos</h1>
        <p class="header-sub">Planos de estudo abertos para qualquer pessoa participar</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="plans-loading">
      <span class="plans-loading__spinner" />
      Carregando planos disponíveis...
    </div>

    <!-- Empty -->
    <div v-else-if="!items.length" class="plans-empty">
      <BookOpen :size="32" class="plans-empty__icon" />
      <p>Nenhum plano disponível no momento.</p>
      <p class="plans-empty__hint">Volte mais tarde — novos planos podem ser publicados a qualquer momento.</p>
    </div>

    <!-- Grid -->
    <div v-else class="plans-grid">
      <div v-for="item in items" :key="item.plan.id" class="plan-card">
        <div class="plan-card__top">
          <div class="plan-card__icon">⚖</div>
          <div class="plan-card__meta">
            <h3 class="plan-card__title">{{ item.plan.title }}</h3>
            <p v-if="item.plan.description" class="plan-card__desc">{{ item.plan.description }}</p>
          </div>
        </div>

        <!-- Stats -->
        <div class="plan-card__stats">
          <div class="plan-stat">
            <span class="plan-stat__val">{{ item.totalGoals }}</span>
            <span class="plan-stat__label">Metas</span>
          </div>
          <div class="plan-stat">
            <span class="plan-stat__val">{{ totalTasks(item) }}</span>
            <span class="plan-stat__label">Tarefas</span>
          </div>
        </div>

        <!-- CTA -->
        <RouterLink :to="`/convite/${item.token}`" class="plan-card__cta">
          Ver plano e participar
          <ArrowRight :size="14" />
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Compass, BookOpen, ArrowRight } from 'lucide-vue-next'
import { inviteService } from '@/services/invite.service'
import { toast } from 'vue-sonner'

const items   = ref([])
const loading = ref(false)

const totalTasks = (item) =>
  item.goals.reduce((sum, g) => sum + (g.taskIds?.length ?? 0), 0)

onMounted(async () => {
  loading.value = true
  try {
    items.value = await inviteService.listPublic()
  } catch (err) {
    toast.error('Erro ao carregar planos disponíveis.')
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.public-plans {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px 20px 48px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.public-plans__header {
  display: flex;
  align-items: center;
  gap: 14px;
}

.header-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #EEEDFE;
  color: #534AB7;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.header-title {
  font-size: 1.3rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0 0 2px;
}

.header-sub {
  font-size: 13px;
  color: #888;
  margin: 0;
}

/* Loading */
.plans-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 64px 0;
  font-size: 13px;
  color: #aaa;
}
.plans-loading__spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #e0dff8;
  border-top-color: #534AB7;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Empty */
.plans-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 64px 0;
  text-align: center;
}
.plans-empty__icon { color: #d8d6d0; }
.plans-empty p { margin: 0; font-size: 14px; color: #999; }
.plans-empty__hint { font-size: 12px !important; color: #bbb !important; }

/* Grid */
.plans-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}
@media (max-width: 900px) {
  .plans-grid { grid-template-columns: repeat(2, 1fr); }
}

/* Card */
.plan-card {
  background: #fff;
  border: 1px solid #ebe9e4;
  border-radius: 14px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition: border-color 0.15s, transform 0.15s;
}
.plan-card:hover {
  border-color: #AFA9EC;
  transform: translateY(-2px);
}

.plan-card__top {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.plan-card__icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: #1a1a2e;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.plan-card__meta { flex: 1; min-width: 0; }

.plan-card__title {
  font-size: 15px;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0 0 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.plan-card__desc {
  font-size: 12px;
  color: #aaa;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.5;
}

/* Stats */
.plan-card__stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  background: #fafaf8;
  border-radius: 10px;
  overflow: hidden;
}

.plan-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 6px;
  gap: 2px;
  border-right: 1px solid #f0efea;
}
.plan-stat:last-child { border-right: none; }

.plan-stat__val {
  font-size: 1.1rem;
  font-weight: 800;
  color: #1a1a2e;
  letter-spacing: -0.02em;
}

.plan-stat__label {
  font-size: 9px;
  font-weight: 700;
  color: #bbb;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

/* CTA — pinned to bottom */
.plan-card__cta {
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  background: #534AB7;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.15s;
}
.plan-card__cta:hover { background: #3C3489; }

@media (max-width: 600px) {
  .public-plans { padding: 16px 12px 40px; }
  .plans-grid { grid-template-columns: 1fr; }
}
</style>
