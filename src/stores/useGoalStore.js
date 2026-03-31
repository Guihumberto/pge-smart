// src/stores/useGoalStore.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useGoalStore = defineStore('goals', () => {
  const goals = ref([])

  const totalGoals = computed(() => goals.value.length)

  function addGoal(goal) {
    goals.value.push(goal)
  }

  return { goals, totalGoals, addGoal }
})