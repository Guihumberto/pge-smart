<template>
  <v-card class="bg-white border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer group rounded-lg" hover>
    <v-card-text>
        <v-icon :icon="icon" size="3rem" class="mb-5"></v-icon>
        <h3 class="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
          {{ title }}
        </h3>
        <p class="text-sm text-gray-600 line-clamp-2">{{ description }}</p>
    </v-card-text>
  </v-card>
</template>

<script setup>
defineProps({
  icon: {
    type: [Object, Function],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  colorClass: {
    type: String,
    required: true
  }
})
</script>

<style scoped>
</style>
