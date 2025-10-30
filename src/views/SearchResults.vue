<template>
  <v-container fluid class="pa-0" style="height: calc(100vh - 48px); overflow: hidden;">
    <v-row style="height: 100%;">
      <!-- Left area: 65% width -->
      <v-col cols="12" md="8">
        <div class="mb-6">
          <!-- Reusable SearchBar component -->
          <SearchBar />
        </div>
        <!-- Search Results -->
        <div v-if="store.loading">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
          <span class="ml-2">Buscando...</span>
        </div>
        <div v-else-if="store.results.length > 0">
          <h2 class="text-h5 mb-4">Resultados para "{{ store.query }}"</h2>
          <v-list>
            <v-list-item
              v-for="result in store.results"
              :key="result.id"
              class="mb-2 pa-4 rounded border"
            >
              <div>
                <h3 class="text-h6">{{ result.title }}</h3>
                <p class="text-body-2 text-grey">{{ result.description }}</p>
                <v-chip size="small" :color="getChipColor(result.type)">
                  {{ getTypeLabel(result.type) }}
                </v-chip>
              </div>
            </v-list-item>
          </v-list>
        </div>
        <div v-else-if="store.query && !store.loading">
          <v-alert type="info">Nenhum resultado encontrado para "{{ store.query }}".</v-alert>
        </div>
      </v-col>
      <!-- Right area: 35% width -->
      <v-col cols="12" md="4">
        <SearchOptions v-if="!showChat" @open-chat="showChat = true" />
        <ChatComponent v-if="showChat" @close-chat="showChat = false" />
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useSearchStore } from '@/stores/search.store'
import SearchBar from '@/components/SearchBar.vue'
import SearchOptions from '@/components/SearchOptions.vue'
import ChatComponent from '@/components/ChatComponent.vue'

const route = useRoute()
const store = useSearchStore()
const showChat = ref(false)

onMounted(async () => {
  const query = route.query.q
  if (query) {
    await store.search(query)
  }
})

const getChipColor = (type) => {
  switch (type) {
    case 'legislation': return 'blue'
    case 'jurisprudence': return 'orange'
    case 'doctrine': return 'green'
    default: return 'grey'
  }
}

const getTypeLabel = (type) => {
  const labels = {
    legislation: 'Legislação',
    jurisprudence: 'Jurisprudência',
    doctrine: 'Doutrina'
  }
  return labels[type] || type
}
</script>

<style scoped>
.border {
  border: 1px solid #e0e0e0;
}
</style>
