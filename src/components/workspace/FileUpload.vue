<template>
  <v-card class="upload-card">
    <v-card-title>
      <v-icon start>mdi-cloud-upload</v-icon>
      Upload de Arquivo ou Texto
    </v-card-title>
    
    <v-card-text>
      <v-tabs v-model="activeTab" class="mb-4">
        <v-tab>Upload de Arquivo</v-tab>
        <v-tab>Texto</v-tab>
      </v-tabs>

      <v-tabs-items v-model="activeTab">
        <v-tab-item v-if="activeTab === 0">
          <!-- Área de Drag & Drop -->
          <div
            class="drop-zone"
            :class="{ 'drag-over': isDragging }"
            @drop.prevent="handleDrop"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @dragenter.prevent="isDragging = true"
          >
            <v-icon size="64" color="primary">mdi-cloud-upload-outline</v-icon>
            <h3 class="mt-4">Arraste e solte seu arquivo aqui</h3>
            <p class="text-medium-emphasis">ou</p>

            <!-- Input de arquivo oculto -->
            <input
              ref="fileInput"
              type="file"
              style="display: none"
              @change="handleFileSelect"
              accept="*/*"
            />

            <v-btn
              color="primary"
              variant="outlined"
              @click="openFileDialog"
              class="mt-2"
            >
              <v-icon start>mdi-file-search</v-icon>
              Selecionar Arquivo
            </v-btn>
          </div>
        </v-tab-item>
        <v-tab-item v-if="activeTab === 1">
          <!-- Área de texto -->
          <div class="text-input-section">
            <h4 class="mb-2">Cole/digite o texto diretamente:</h4>
            <v-textarea
              v-model="textContent"
              label="Cole ou digite seu texto aqui"
              variant="outlined"
              rows="6"
              placeholder="Ctrl+V para colar texto"
              @paste="handlePaste"
            ></v-textarea>

            <v-btn
              v-if="textContent"
              color="primary"
              @click="handleTextSubmit"
              class="mt-2"
            >
              <v-icon start>mdi-text-box-check</v-icon>
              Usar este Texto
            </v-btn>
          </div>
        </v-tab-item>
      </v-tabs-items>

      <!-- Preview do arquivo selecionado -->
      <v-alert
        v-if="selectedFile"
        type="success"
        variant="tonal"
        class="mt-4"
        closable
        @click:close="clearFile"
      >
        <div class="d-flex align-center">
          <v-icon start>mdi-file-check</v-icon>
          <div>
            <strong>{{ selectedFile.name }}</strong>
            <div class="text-caption">{{ formatFileSize(selectedFile.size) }}</div>
          </div>
        </div>
      </v-alert>

      <!-- Mensagem de sucesso -->
      <v-alert
        v-if="uploadSuccess"
        type="success"
        variant="tonal"
        class="mt-4"
      >
        {{ uploadSuccess }}
      </v-alert>

      <!-- Mensagem de erro -->
      <v-alert
        v-if="error"
        type="error"
        variant="tonal"
        class="mt-4"
        closable
        @click:close="error = ''"
      >
        {{ error }}
      </v-alert>
    </v-card-text>

    <v-card-actions v-if="activeTab === 0 && selectedFile">
      <v-spacer></v-spacer>
      <v-btn
        color="error"
        variant="text"
        @click="clearFile"
      >
        Cancelar
      </v-btn>
      <v-btn
        color="primary"
        variant="elevated"
        @click="uploadFile"
        :loading="isUploading"
      >
        <v-icon start>mdi-upload</v-icon>
        Fazer Upload
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup>
import { ref } from 'vue';
import { useWorkspacesStore } from '@/stores/workspaces.store';
import { storeToRefs } from 'pinia';

// Refs
const isDragging = ref(false);
const selectedFile = ref(null);
const textContent = ref('');
const fileInput = ref(null);
const isUploading = ref(false);
const error = ref('');
const uploadSuccess = ref('');

// Store
const workspacesStore = useWorkspacesStore();

// Emits
const emit = defineEmits(['file-uploaded', 'text-uploaded']);

// Simulated AI extraction (in real app, this would call an API)
const simulateAIDataExtraction = (content, sourceType) => {
  const fakeExtractedItems = [];

  // Simulate different types of extractions based on content
  const tags = ['jurisprudencia', 'legislacao', 'doutrina'];

  for (let i = 0; i < Math.min(3, Math.floor(content.length / 100) + 1); i++) {
    const tag = tags[Math.floor(Math.random() * tags.length)];
    let title = '';
    let text = '';
    let infoAdd = '';

    switch (tag) {
      case 'jurisprudencia':
        title = 'Entendimento Jurídico Específico';
        text = 'Em análise jurisprudencial, verifica-se que o precedente estabelecido...';
        infoAdd = 'Referência ao julgamento do STF, processo nº 12345/2023';
        break;
      case 'legislacao':
        title = 'Dispositivo Legal Aplicável';
        text = 'Conforme estabelecido no art. 123 do Código Civil, determina-se que...';
        infoAdd = 'Lei nº 10.406/2002 (Código Civil), art. 123';
        break;
      case 'doutrina':
        title = 'Concepção Doutrinária Relevante';
        text = 'Na doutrina especializada, consagra-se o entendimento de que...';
        infoAdd = 'Conforme obra de FULANO DE TAL, Tratado de Direito, 5ª ed.';
        break;
    }

    fakeExtractedItems.push({
      title,
      text,
      tag,
      infoAdd,
      source: sourceType,
      timestamp: new Date().toISOString()
    });
  }

  return fakeExtractedItems;
};

// Tabs
const activeTab = ref(0);

// Métodos
const handleDrop = (e) => {
  isDragging.value = false;
  const files = e.dataTransfer.files;
  
  if (files.length > 0) {
    selectedFile.value = files[0];
    error.value = '';
    uploadSuccess.value = '';
  }
};

const openFileDialog = () => {
  fileInput.value.click();
};

const handleFileSelect = (e) => {
  const files = e.target.files;
  if (files.length > 0) {
    selectedFile.value = files[0];
    error.value = '';
    uploadSuccess.value = '';
  }
};

const handlePaste = (e) => {
  // Limpa mensagens anteriores
  error.value = '';
  uploadSuccess.value = '';
  
  // Verifica se há arquivos colados
  const items = e.clipboardData.items;
  for (let i = 0; i < items.length; i++) {
    if (items[i].kind === 'file') {
      const file = items[i].getAsFile();
      selectedFile.value = file;
      textContent.value = '';
      e.preventDefault();
      return;
    }
  }
};

const handleTextSubmit = () => {
  if (!textContent.value.trim()) {
    error.value = 'Por favor, insira algum texto.';
    return;
  }

  isUploading.value = true;

  // Simula upload do texto
  setTimeout(() => {
    const textDoc = {
      type: 'text',
      name: `Texto ${new Date().toLocaleString()}`,
      content: textContent.value,
      timestamp: new Date().toISOString()
    };
    workspacesStore.addDocument(textDoc);
    emit('text-uploaded', textDoc);

    // Simula extração de dados após upload
    setTimeout(() => {
      const extractedItems = simulateAIDataExtraction(textContent.value, 'text');
      extractedItems.forEach(item => {
        workspacesStore.addExtractedData(item);
      });
    }, 500);

    uploadSuccess.value = 'Texto enviado com sucesso!';
    isUploading.value = false;

    // Limpa o texto após 2 segundos
    setTimeout(() => {
      textContent.value = '';
      uploadSuccess.value = '';
    }, 2000);
  }, 500);
};

const uploadFile = () => {
  if (!selectedFile.value) {
    error.value = 'Nenhum arquivo selecionado.';
    return;
  }

  isUploading.value = true;
  error.value = '';

  // Aqui você faria o upload real para o servidor
  // Exemplo com FormData:
  const formData = new FormData();
  formData.append('file', selectedFile.value);

  // Simula upload
  setTimeout(() => {
    const fileDoc = {
      type: 'file',
      name: selectedFile.value.name,
      file: selectedFile.value,
      size: selectedFile.value.size,
      formData: formData,
      timestamp: new Date().toISOString()
    };
    workspacesStore.addDocument(fileDoc);
    emit('file-uploaded', fileDoc);

    // Simula extração de dados após upload
    setTimeout(() => {
      // Use a simulated content based on file name for file uploads
      // In a real app, you would read the file content or get it from the server
      const simulatedContent = `Conteúdo simulado do arquivo ${selectedFile.value.name}. Este texto representa o conteúdo processado do documento.`;
      const extractedItems = simulateAIDataExtraction(simulatedContent, 'file');
      extractedItems.forEach(item => {
        workspacesStore.addExtractedData(item);
      });
    }, 1000);

    uploadSuccess.value = `Arquivo "${selectedFile.value.name}" enviado com sucesso!`;
    isUploading.value = false;

    // Limpa o arquivo após 2 segundos
    setTimeout(() => {
      clearFile();
      uploadSuccess.value = '';
    }, 2000);
  }, 1500);
};

const clearFile = () => {
  selectedFile.value = null;
  if (fileInput.value) {
    fileInput.value.value = '';
  }
  error.value = '';
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
.upload-card {
  max-width: 700px;
  margin: 0 auto;
}

.drop-zone {
  border: 2px dashed rgb(var(--v-theme-primary));
  border-radius: 8px;
  padding: 48px 24px;
  text-align: center;
  transition: all 0.3s ease;
  background-color: rgba(var(--v-theme-surface), 0.5);
}

.drop-zone.drag-over {
  background-color: rgba(var(--v-theme-primary), 0.1);
  border-color: rgb(var(--v-theme-primary));
  transform: scale(1.02);
}

.text-input-section {
  margin-top: 16px;
}
</style>
