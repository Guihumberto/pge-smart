<template>
  <v-container>
    <h1>Minhas Pastas</h1>
    <p>Exemplo de workspaces anteriores criados:</p>

    <!-- Search and Sort Controls -->
    <v-row class="mb-4">
      <v-col cols="12" md="6">
        <v-text-field
          v-model="searchTerm"
          label="Buscar por nome ou descrição"
          outlined
          clearable
          prepend-inner-icon="mdi-magnify"
        ></v-text-field>
      </v-col>
      <v-col cols="12" md="6">
        <v-select
          v-model="sortBy"
          :items="sortOptions"
          label="Organizar por"
          outlined
        ></v-select>
      </v-col>
    </v-row>

    <!-- Workspaces List -->
    <v-list>
      <v-list-item
        v-for="workspace in filteredSortedWorkspaces"
        :key="workspace.id"
        class="mb-2"
      >
        <v-list-item-avatar>
          <v-icon>mdi-folder</v-icon>
        </v-list-item-avatar>
        <v-list-item-content>
          <v-list-item-title>{{ workspace.name }}</v-list-item-title>
          <v-list-item-subtitle>{{ workspace.description }}</v-list-item-subtitle>
        </v-list-item-content>
        <v-list-item-action>
          <v-list-item-action-text>{{ formatDate(workspace.date) }}</v-list-item-action-text>
        </v-list-item-action>
      </v-list-item>
    </v-list>
  </v-container>
</template>

<script setup>
import { ref, computed } from 'vue'

const exampleWorkspaces = ref([
  { id: 1, name: 'Workspace 1', description: 'Projetos de design gráfico', date: '2023-10-01' },
  { id: 2, name: 'Workspace 2', description: 'Desenvolvimento web fullstack', date: '2023-09-15' },
  { id: 3, name: 'Workspace 3', description: 'Análises de dados e relatórios', date: '2023-08-20' },
  { id: 4, name: 'Workspace Alpha', description: 'Projetos experimentais', date: '2023-11-05' },
  { id: 5, name: 'Workspace Beta', description: 'Aplicativos móveis', date: '2023-07-12' }
])

const searchTerm = ref('')
const sortBy = ref('name')

const sortOptions = [
  { text: 'Ordem alfabética', value: 'name' },
  { text: 'Por data', value: 'date' }
]

const filteredSortedWorkspaces = computed(() => {
  let filtered = exampleWorkspaces.value.filter(ws =>
    ws.name.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
    ws.description.toLowerCase().includes(searchTerm.value.toLowerCase())
  )

  if (sortBy.value === 'name') {
    filtered.sort((a, b) => a.name.localeCompare(b.name))
  } else if (sortBy.value === 'date') {
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date))
  }

  return filtered
})

function formatDate(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('pt-BR')
}
</script>

<style scoped>
.v-list-item {
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}
</style>
