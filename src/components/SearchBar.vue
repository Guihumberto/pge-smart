<template>
  <v-text-field
    v-model="searchQuery"
    label="Buscar"
    prepend-inner-icon="mdi-magnify"
    variant="outlined"
    clearable
    @input="handleSearch"
  ></v-text-field>
</template>

<script setup>
import { ref } from 'vue'

const searchQuery = ref('')

const handleSearch = () => {
  // Implement search functionality here
  console.log('Searching for:', searchQuery.value)
}
</script>

<style scoped>
</style>
