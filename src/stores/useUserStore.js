import { defineStore } from 'pinia'
import { ref } from 'vue'
import { nanoid } from 'nanoid'

export const useUserStore = defineStore('users', () => {
  const users = ref([
    { id: 'u1', name: 'Ana Paula Silva',   email: 'ana@email.com' },
    { id: 'u2', name: 'Carlos Mendes',     email: 'carlos@email.com' },
    { id: 'u3', name: 'Fernanda Rocha',    email: 'fernanda@email.com' },
  ])

  const getById = (id) => users.value.find(u => u.id === id) ?? null

  return { users, getById }
})