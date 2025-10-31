<template>
  <v-card class="document-selector">
    <v-card-title>
      <v-icon start>mdi-file-document-multiple</v-icon>
      Documentos Carregados
    </v-card-title>

    <v-card-text>
      <v-list v-if="uploadedDocuments.length > 0" class="document-list">
        <v-list-item
          v-for="doc in uploadedDocuments"
          :key="doc.id"
          class="document-item px-4"
        >
          <div class="d-flex align-center flex-grow-1">
            <v-checkbox
              v-model="doc.selected"
              hide-details=""
              @change="$emit('selection-changed', doc.id, doc.selected)"
              class="mr-2 flex-shrink-0"
            ></v-checkbox>

            <v-icon
              :icon="getDocumentIcon(doc.type)"
              color="primary"
              class="mr-2 flex-shrink-0"
            ></v-icon>

            <div class="flex-grow-1">
              <v-list-item-title>{{ doc.name }}</v-list-item-title>
              <v-list-item-subtitle>
                {{ formatTimestamp(doc.timestamp) }}
                <span v-if="doc.size">• {{ formatFileSize(doc.size) }}</span>
              </v-list-item-subtitle>
            </div>

            <v-btn
              icon="mdi-close"
              size="small"
              color="error"
              variant="text"
              @click="confirmDelete(doc.id)"
              class="flex-shrink-0"
            ></v-btn>
          </div>
        </v-list-item>
      </v-list>

      <div v-else class="text-center py-8">
        <v-icon size="64" color="grey-lighten-1">mdi-file-document-outline</v-icon>
        <h3 class="mt-4 text-grey-lighten-1">Nenhum documento carregado</h3>
        <p class="text-grey-lighten-2">Use o componente de upload acima para adicionar documentos.</p>
      </div>
    </v-card-text>

    <!-- Confirmation Dialog -->
    <ConfirmationDialog
      v-model="showDeleteDialog"
      title="Confirmar Exclusão"
      message="Tem certeza de que deseja excluir este documento?"
      confirm-text="Excluir"
      cancel-text="Cancelar"
      @confirm="handleConfirmDelete"
    />
  </v-card>
</template>

<script setup>
import { ref } from 'vue';
import { useWorkspacesStore } from '@/stores/workspaces.store';
import { storeToRefs } from 'pinia';
import ConfirmationDialog from '@/components/common/ConfirmationDialog.vue';

// Store
const workspacesStore = useWorkspacesStore();
const { uploadedDocuments } = storeToRefs(workspacesStore);

// Emits
const emit = defineEmits(['selection-changed']);

// Refs
const showDeleteDialog = ref(false);
const documentToDelete = ref(null);

// Methods
const confirmDelete = (id) => {
  const doc = uploadedDocuments.value.find(d => d.id === id);
  if (doc) {
    documentToDelete.value = id;
    showDeleteDialog.value = true;
  }
};

const handleConfirmDelete = () => {
  if (documentToDelete.value) {
    workspacesStore.removeDocument(documentToDelete.value);
    documentToDelete.value = null;
  }
};

const getDocumentIcon = (type) => {
  switch (type) {
    case 'text':
      return 'mdi-text-box-outline';
    case 'file':
    default:
      return 'mdi-file-outline';
  }
};

const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};
</script>

<style scoped>
.document-selector {
  max-width: 700px;
  margin: 0 auto;
}

.document-list {
  padding: 0;
}

.document-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
  padding: 8px 16px;
  min-height: 72px;
}

.document-item:last-child {
  border-bottom: none;
}
</style>
