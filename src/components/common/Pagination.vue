<template>
  <div v-if="total > 0" class="pg" role="navigation" aria-label="Paginação">
    <span class="pg__info">
      Mostrando {{ rangeStart }}–{{ rangeEnd }} de {{ total }}
    </span>

    <div v-if="totalPages > 1" class="pg__pages">
      <button
        class="pg__btn"
        :disabled="currentPage <= 1"
        @click="goTo(currentPage - 1)"
        aria-label="Página anterior"
      >
        <ChevronLeft :size="14" />
      </button>

      <button
        v-for="(item, idx) in pageItems"
        :key="`${item}-${idx}`"
        class="pg__btn pg__btn--num"
        :class="{ 'pg__btn--active': item === currentPage, 'pg__btn--ellipsis': item === '...' }"
        :disabled="item === '...'"
        :aria-current="item === currentPage ? 'page' : undefined"
        @click="item !== '...' && goTo(item)"
      >
        {{ item }}
      </button>

      <button
        class="pg__btn"
        :disabled="currentPage >= totalPages"
        @click="goTo(currentPage + 1)"
        aria-label="Próxima página"
      >
        <ChevronRight :size="14" />
      </button>
    </div>

    <div class="pg__perpage">
      <label :for="perPageSelectId">Por página:</label>
      <select
        :id="perPageSelectId"
        :value="perPage"
        class="pg__select"
        @change="onPerPageChange($event)"
      >
        <option v-for="opt in perPageOptions" :key="opt" :value="opt">{{ opt }}</option>
      </select>
    </div>
  </div>
</template>

<script setup>
import { computed, useId } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const perPageSelectId = `pg-perpage-${useId()}`

const props = defineProps({
  currentPage: { type: Number, required: true },
  totalPages: { type: Number, required: true },
  total: { type: Number, required: true },
  perPage: { type: Number, required: true },
  perPageOptions: { type: Array, default: () => [12, 24, 48] },
})

const emit = defineEmits(['update:currentPage', 'update:perPage'])

const rangeStart = computed(() => {
  if (props.total === 0) return 0
  return (props.currentPage - 1) * props.perPage + 1
})

const rangeEnd = computed(() => {
  return Math.min(props.currentPage * props.perPage, props.total)
})

// Gera lista de páginas com elipses: 1 ... C-1 C C+1 ... N
// Mostra sempre primeira, última, atual ±1, e elipses onde couber.
const pageItems = computed(() => {
  const total = props.totalPages
  const current = props.currentPage
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const items = []
  const add = (v) => items.push(v)

  add(1)
  if (current > 3) add('...')

  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let p = start; p <= end; p++) add(p)

  if (current < total - 2) add('...')
  add(total)

  return items
})

function goTo(page) {
  if (page < 1 || page > props.totalPages || page === props.currentPage) return
  emit('update:currentPage', page)
}

function onPerPageChange(event) {
  const value = parseInt(event.target.value, 10)
  if (!Number.isNaN(value)) emit('update:perPage', value)
}
</script>

<style scoped>
.pg {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  font-family: 'DM Sans', sans-serif;
  padding: 16px 4px;
  font-size: 12px;
  color: #555;
}

.pg__info {
  font-weight: 500;
  color: #666;
  white-space: nowrap;
}

.pg__pages {
  display: flex;
  align-items: center;
  gap: 4px;
}

.pg__btn {
  min-width: 32px;
  height: 32px;
  padding: 0 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e5e5e5;
  background: #fff;
  border-radius: 7px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  color: #444;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.pg__btn:hover:not(:disabled):not(.pg__btn--active):not(.pg__btn--ellipsis) {
  background: #f5f4f0;
  border-color: #ccc;
}

.pg__btn:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.pg__btn--active {
  background: #534AB7;
  border-color: #534AB7;
  color: #fff;
  cursor: default;
}

.pg__btn--ellipsis {
  border: none;
  background: transparent;
  cursor: default;
  color: #aaa;
}

.pg__perpage {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.pg__select {
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 7px;
  font-family: inherit;
  font-size: 12px;
  color: #444;
  background: #fff;
  cursor: pointer;
}

.pg__select:focus {
  outline: none;
  border-color: #534AB7;
}
</style>
