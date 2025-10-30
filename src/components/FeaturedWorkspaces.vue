<template>
  <v-container class="featured-workspaces">
    <h2 class="text-h4 mb-6 text-center font-weight-bold">Trabalhos em destaques</h2>
    <v-row>
      <v-col
        cols="12"
        md="4"
        v-for="workspace in highlightedWorkspaces"
        :key="workspace.id"
      >
        <v-card
          class="featured-card pa-5 mb-4"
          elevation="6"
          hover
          min-height="200"
        >
          <v-card-title class="d-flex align-center pb-2">
            <v-icon class="me-3 text-primary" size="large">mdi-folder-star</v-icon>
            <span class="text-h6 font-weight-medium">{{ workspace.name }}</span>
          </v-card-title>
          <v-card-text class="py-2">
            <p class="text-body-1">{{ workspace.description }}</p>
            <div class="mt-3">
              <v-chip
                small
                color="primary"
                outlined
              >
                <v-icon left small>mdi-calendar</v-icon>
                {{ formatDate(workspace.date) }}
              </v-chip>
            </div>
          </v-card-text>
          <v-card-actions class="pt-0">
            <v-spacer></v-spacer>
            <v-btn color="primary" text small>
              Explores
              <v-icon right>mdi-arrow-right</v-icon>
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { computed } from 'vue'
import { useWorkspacesStore } from '@/stores/workspaces.store'

const workspacesStore = useWorkspacesStore()

const highlightedWorkspaces = computed(() => workspacesStore.highlightedWorkspaces)

function formatDate(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('pt-BR')
}
</script>

<style scoped>
.featured-workspaces {
  margin-top: 2rem;
}

.featured-card.hover {
  transform: translateY(-8px);
  transition: all 0.3s ease;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15) !important;
}

.featured-card {
  transition: all 0.3s ease;
  border-radius: 12px;
  overflow: hidden;
}

.v-card-title .v-icon {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
  100% {
    opacity: 1;
  }
}
</style>
