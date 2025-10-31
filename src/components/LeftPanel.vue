<template>
  <div class="left-panel-content">
    <v-tabs v-model="activeTab" class="mb-4">
      <v-tab value="loaded">
        <v-icon start>mdi-file-document-multiple</v-icon>
        Documentos
      </v-tab>
      <v-tab value="search">
        <v-icon start>mdi-magnify</v-icon>
        Buscar
      </v-tab>
      <v-tab value="editor">
        <v-icon start>mdi-text-box-edit</v-icon>
        Editor de Texto
      </v-tab>
    </v-tabs>

    <div v-show="activeTab === 'loaded'">
      <DocumentSelector />
    </div>
    <div v-show="activeTab === 'search'">
      <DocumentSearch />
    </div>
    <div v-show="activeTab === 'editor'">
      <TextEditor />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import DocumentSelector from '@/components/workspace/DocumentSelector.vue'
import DocumentSearch from '@/components/workspace/DocumentSearch.vue'
import TextEditor from '@/components/workspace/TextEditor.vue'

// Refs
const activeTab = ref('loaded')
</script>

<style scoped>
.left-panel-content {
  padding: 16px;
}
</style>
