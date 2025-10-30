<template>
  <div class="w-full max-w-2xl mx-auto">
    <div class="relative">
      <v-text-field
        v-model="searchQuery"
        placeholder="Buscar na legislação..."
        class="h-14 text-base"
        variant="outlined"
        clearable
        prepend-inner-icon="mdi-magnify"
        @keyup.enter="handleSearch"
        @input="handleInput"
      ></v-text-field>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const searchQuery = ref('')

const handleSearch = () => {
  if (searchQuery.value.trim()) {
    router.push({ name: 'SearchResults', query: { q: searchQuery.value } })
  }
}

const handleInput = () => {
  // Optional: handle input changes if needed
}
</script>

<style scoped>
</style>
