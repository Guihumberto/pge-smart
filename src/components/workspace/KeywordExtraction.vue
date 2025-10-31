<template>
  <div class="keyword-extraction-container">
    <v-card class="keyword-card" elevation="2">
      <v-card-title class="keyword-header">
        <v-icon start>mdi-tag-multiple</v-icon>
        Palavras-chave (IA)
      </v-card-title>

      <v-card-text class="keyword-content">
        <!-- Document Filter -->
        <div v-if="uploadedDocuments.length > 0" class="filter-section">
          <v-select
            v-model="selectedDocumentFilter"
            :items="documentFilterOptions"
            label="Filtrar por documento"
            variant="outlined"
            density="compact"
            @update:model-value="handleFilterChange"
            class="filter-select"
          ></v-select>
        </div>

        <!-- Keywords Display -->
        <div v-if="filteredKeywords.length === 0" class="no-keywords">
          <v-icon size="48" color="grey" class="mb-2">mdi-tag-outline</v-icon>
          <p class="text-grey">Nenhuma palavra-chave encontrada.</p>
        </div>

        <div v-else class="keywords-area">
          <!-- Keywords Grid -->
          <div
            class="keywords-grid"
            :class="{ 'expanded': isExpanded }"
          >
            <v-chip
              v-for="keyword in displayedKeywords"
              :key="`${keyword.documentId}-${keyword.word}`"
              :color="getKeywordColor(keyword.word)"
              :text-color="'white'"
              variant="elevated"
              size="small"
              class="keyword-chip"
            >
              {{ keyword.word }}
            </v-chip>
          </div>

          <!-- Show More/Less Button -->
          <div v-if="filteredKeywords.length > displayLimit" class="expansion-controls">
            <v-btn
              variant="outlined"
              size="small"
              @click="toggleExpansion"
              class="expand-btn"
            >
              <v-icon start>{{ isExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
              {{ isExpanded ? 'Mostrar Menos' : `Mostrar Todas (${filteredKeywords.length})` }}
            </v-btn>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useWorkspacesStore } from '@/stores/workspaces.store'
import { storeToRefs } from 'pinia'

// Store
const workspacesStore = useWorkspacesStore()
const { filteredKeywords, keywordFilterDocId, uploadedDocuments, setKeywordFilter } = storeToRefs(workspacesStore)
const { setKeywordFilter: setFilter } = workspacesStore

// Component state
const displayLimit = ref(12) // Limit before showing expand button
const isExpanded = ref(false)

// Computed document filter options
const documentFilterOptions = computed(() => {
  const options = [{ title: 'Todos os documentos', value: null }]
  uploadedDocuments.value.forEach(doc => {
    options.push({
      title: doc.name,
      value: doc.id
    })
  })
  return options
})

// Reactive selected filter
const selectedDocumentFilter = ref(null)

// Displayed keywords based on expansion state
const displayedKeywords = computed(() => {
  if (isExpanded.value) {
    return filteredKeywords.value
  }
  return filteredKeywords.value.slice(0, displayLimit.value)
})

// Methods
const handleFilterChange = (value) => {
  setFilter(value)
}

const toggleExpansion = () => {
  isExpanded.value = !isExpanded.value
}

const getKeywordColor = (keyword) => {
  const colors = [
    'primary', 'secondary', 'success', 'info', 'warning', 'error',
    'blue', 'green', 'orange', 'purple', 'teal', 'pink'
  ]
  // Generate consistent color based on keyword
  let hash = 0
  for (let i = 0; i < keyword.length; i++) {
    hash = keyword.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

// Watch for changes in keywordFilterDocId
const watchKeywordFilterDocId = () => {
  selectedDocumentFilter.value = keywordFilterDocId.value
}

// Initialize on mount
onMounted(() => {
  watchKeywordFilterDocId()
})
</script>

<style scoped>
.keyword-extraction-container {
  margin-bottom: 16px;
}

.keyword-card {
  border-radius: 8px;
}

.keyword-header {
  padding: 16px;
  background-color: rgba(var(--v-theme-secondary), 0.05);
  color: rgb(var(--v-theme-secondary));
  font-weight: 600;
}

.keyword-content {
  padding: 16px;
}

.filter-section {
  margin-bottom: 16px;
}

.filter-select {
  max-width: 300px;
}

.keywords-area {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.keywords-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-height: 100px;
  overflow: hidden;
  transition: max-height 0.3s ease;
}

.keywords-grid.expanded {
  max-height: none;
  overflow: visible;
}

.keyword-chip {
  margin: 2px;
  font-weight: 500;
}

.expansion-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 8px;
}

.expand-btn {
  min-width: 140px;
}

.no-keywords {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}
</style>
