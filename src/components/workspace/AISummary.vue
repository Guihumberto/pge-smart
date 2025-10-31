<template>
  <div class="ai-summary-container">
    <v-card class="summary-card" elevation="2">
      <v-card-title class="summary-header">
        <v-icon start>mdi-brain</v-icon>
        Resumo do Documento (IA)
      </v-card-title>

      <v-card-text class="summary-content">
        <v-alert
          v-if="!currentSummary"
          type="info"
          variant="tonal"
          class="no-summary-alert"
        >
          <v-icon start>mdi-information-outline</v-icon>
          Nenhum documento selecionado para gerar resumo. Selecione um documento para visualizar o resumo gerado por IA.
        </v-alert>

        <div v-else class="summary-text">
          <p class="summary-paragraph">{{ currentSummary }}</p>

          <div class="summary-actions">
            <v-btn
              variant="outlined"
              size="small"
              @click="generateNewSummary"
              :loading="isRegenerating"
            >
              <v-icon start>mdi-refresh</v-icon>
              Atualizar Resumo
            </v-btn>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useWorkspacesStore } from '@/stores/workspaces.store'
import { storeToRefs } from 'pinia'

// Store
const workspacesStore = useWorkspacesStore()
const { currentSummary, currentDocId } = storeToRefs(workspacesStore)
const { regenerateSummary } = workspacesStore

// Refs
const isRegenerating = ref(false)

// Methods
const generateNewSummary = () => {
  if (currentDocId.value) {
    isRegenerating.value = true
    // In a real app, this would call an AI API to regenerate the summary
    // For now, just simulate delay and update summary
    setTimeout(() => {
      regenerateSummary(currentDocId.value)
      isRegenerating.value = false
    }, 1000)
  }
}
</script>

<style scoped>
.ai-summary-container {
  margin-bottom: 16px;
}

.summary-card {
  border-radius: 8px;
}

.summary-header {
  padding: 16px;
  background-color: rgba(var(--v-theme-primary), 0.05);
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
}

.summary-content {
  padding: 16px;
}

.no-summary-alert {
  margin-bottom: 0;
}

.summary-text {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.summary-paragraph {
  margin: 0;
  line-height: 1.6;
  font-size: 1rem;
  color: rgba(0, 0, 0, 0.87);
}

.summary-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}
</style>
