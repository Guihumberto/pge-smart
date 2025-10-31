<template>
  <div class="extracted-data-container">
    <h3 class="mb-4">Dados Extraídos</h3>

    <div v-if="extractedData.length === 0" class="no-data-message">
      <v-icon size="48" color="grey" class="mb-2">mdi-magnify</v-icon>
      <p class="text-grey">{{ noDataMessage }}</p>
    </div>

    <div v-else class="cards-grid">
      <v-card
        v-for="item in extractedData"
        :key="item.id"
        class="extraction-card"
        elevation="2"
        hover
      >
        <v-card-title class="card-header">
          <div class="title-section">
            <v-icon :icon="getTagIcon(item.tag)" :color="getTagColor(item.tag)" size="small" class="mr-2"></v-icon>
            <span class="card-title">{{ item.title }}</span>
          </div>
          <v-chip
            :color="getTagColor(item.tag)"
            :text-color="'white'"
            size="small"
            class="tag-chip"
          >
            {{ item.tag }}
          </v-chip>
        </v-card-title>

        <v-card-text class="card-content">
          <p class="extraction-text">{{ item.text }}</p>

          <div v-if="item.infoAdd" class="info-additional">
            <h4 class="info-additional-title">Informações Adicionais:</h4>
            <p class="info-additional-text">{{ item.infoAdd }}</p>
          </div>
        </v-card-text>

        <v-card-actions class="card-actions">
          <v-spacer></v-spacer>
          <v-btn
            variant="text"
            size="small"
            @click="handleViewMore(item)"
          >
            <v-icon start>mdi-eye</v-icon>
            Ver Mais
          </v-btn>
        </v-card-actions>
      </v-card>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useWorkspacesStore } from '@/stores/workspaces.store'

const props = defineProps({
  noDataMessage: {
    type: String,
    default: 'Nenhum dado extraído ainda. Faça upload de um documento para começar a extração.'
  }
})

// Store
const workspacesStore = useWorkspacesStore()

// Computed
const extractedData = computed(() => workspacesStore.extractedDocuments)

// Methods
const getTagIcon = (tag) => {
  const icons = {
    jurisprudencia: 'mdi-gavel',
    legislacao: 'mdi-scale-balance',
    doutrina: 'mdi-school'
  }
  return icons[tag] || 'mdi-tag'
}

const getTagColor = (tag) => {
  const colors = {
    jurisprudencia: 'blue',
    legislacao: 'green',
    doutrina: 'orange'
  }
  return colors[tag] || 'grey'
}

const handleViewMore = (item) => {
  // You can emit an event or expand details here
  console.log('View more for item:', item)
  // Implement modal or expanded view if needed
}
</script>

<style scoped>
.extracted-data-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.no-data-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  flex: 1;
}

.cards-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px;
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.3) transparent;
}

.cards-grid::-webkit-scrollbar {
  width: 6px;
}

.cards-grid::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
}

.cards-grid::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 3px;
}

.extraction-card {
  border-radius: 8px;
  transition: all 0.3s ease;
  min-width: 320px;
  max-width: 360px;
  flex-shrink: 0;
}

.extraction-card:hover {
  transform: translateY(-2px);
}

.card-header {
  padding: 16px;
  align-items: flex-start;
  flex-direction: column;
}

.title-section {
  display: flex;
  align-items: center;
  width: 100%;
  margin-bottom: 8px;
}

.card-title {
  font-weight: 600;
  font-size: 1.1em;
  line-height: 1.2;
  flex: 1;
}

.tag-chip {
  align-self: flex-start;
}

.card-content {
  padding: 16px;
  padding-top: 0;
}

.extraction-text {
  margin-bottom: 16px;
  line-height: 1.5;
  color: rgba(0, 0, 0, 0.87);
}

.info-additional {
  margin-top: 16px;
  padding: 12px;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 6px;
}

.info-additional-title {
  font-size: 0.9em;
  font-weight: 600;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(0, 0, 0, 0.7);
}

.info-additional-text {
  margin: 0;
  font-size: 0.9em;
  line-height: 1.4;
  color: rgba(0, 0, 0, 0.8);
}

.card-actions {
  padding: 8px 16px 16px 16px;
}
</style>
