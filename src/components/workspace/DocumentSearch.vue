<template>
  <v-card class="search-card">
    <v-card-title>
      <v-icon start>mdi-magnify</v-icon>
      Buscar Documentos
    </v-card-title>

    <v-card-text>
      <!-- Search Input -->
      <v-text-field
        v-model="searchQuery"
        label="Digite os termos de busca"
        variant="outlined"
        placeholder="Busque por documentos legais, jurisprudenciais ou doutrinários..."
        class="mb-4"
      ></v-text-field>

      <v-btn
        color="primary"
        variant="elevated"
        @click="performSearch"
        :loading="isSearching"
        class="mb-4"
      >
        <v-icon start>mdi-magnify</v-icon>
        Buscar Documentos
      </v-btn>

      <!-- Search Results -->
      <div v-if="searchResults.length > 0" class="search-results">
        <h4 class="mb-3">Resultados da Busca ({{ searchResults.length }} encontrados)</h4>
        <v-list class="search-results-list">
          <v-list-item
            v-for="result in searchResults"
            :key="result.id"
            class="search-result-item"
          >
            <div class="d-flex align-start flex-grow-1">
              <v-icon
                :icon="getDocumentIcon(result.type)"
                color="primary"
                class="mr-3 mt-1"
              ></v-icon>

              <div class="flex-grow-1">
                <v-list-item-title>{{ result.name }}</v-list-item-title>
                <v-list-item-subtitle class="mb-2">{{ result.description }}</v-list-item-subtitle>
                <v-chip
                  v-if="result.relevance"
                  size="small"
                  color="success"
                  variant="outlined"
                  class="mb-2"
                >
                  {{ result.relevance }}% relevante
                </v-chip>

                <v-btn
                  variant="outlined"
                  size="small"
                  @click="uploadSearchResult(result)"
                  class="upload-btn"
                >
                  <v-icon start>mdi-plus</v-icon>
                  Indexar Documento
                </v-btn>
              </div>
            </div>
          </v-list-item>
        </v-list>
      </div>

      <div v-else-if="hasSearched && !isSearching" class="no-results">
        <v-icon size="48" color="grey" class="mb-2">mdi-file-search-outline</v-icon>
        <p class="text-grey">Nenhum documento encontrado para os termos fornecidos.</p>
        <p class="text-caption">Experimente diferentes palavras-chave ou termos de busca.</p>
      </div>

      <!-- Messages -->
      <v-alert
        v-if="uploadSuccess"
        type="success"
        variant="tonal"
        class="mt-4"
        closable
        @click:close="uploadSuccess = ''"
      >
        {{ uploadSuccess }}
      </v-alert>

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
  </v-card>
</template>

<script setup>
import { ref } from 'vue';
import { useWorkspacesStore } from '@/stores/workspaces.store';

// Store
const workspacesStore = useWorkspacesStore();

// Emits
const emit = defineEmits(['document-uploaded']);

// Refs
const searchQuery = ref('');
const searchResults = ref([]);
const isSearching = ref(false);
const hasSearched = ref(false);
const uploadSuccess = ref('');
const error = ref('');

// Simulated search results based on FileUpload extraction patterns
const simulateSearchResults = (query) => {
  const results = [];

  // Generate fake search results based on query
  const mockResults = [
    {
      name: 'Jurisprudência - Supremo Tribunal Federal - Habeas Corpus',
      description: 'Decisão sobre habeas corpus em questão penal relativa a...',
      type: 'jurisprudencia',
      content: 'Em análise jurisprudencial, verifica-se que o precedente estabelecido pelo STF no HC 123.456 determina...'
    },
    {
      name: 'Código Civil - Direito de Família',
      description: 'Artigos relacionados à legislação familiar e direitos sucessórios.',
      type: 'legislacao',
      content: 'Conforme estabelecido no art. 1.789 do Código Civil, determina-se que...'
    },
    {
      name: 'Doutrina - Obrigações Contratuais',
      description: 'Estudo doutrinário sobre contratos e obrigações conforme teoria do direito civil.',
      type: 'doutrina',
      content: 'Na doutrina especializada, consagra-se o entendimento de que...'
    }
  ];

  // Filter based on query relevance (simple simulation)
  const queryLower = query.toLowerCase();
  mockResults.forEach((result, index) => {
    const relevance = Math.floor(Math.random() * 60) + 40; // 40-100% relevance
    results.push({
      id: `search_${index + 1}`,
      ...result,
      relevance,
      relevanceScore: relevance / 100
    });
  });

  // Sort by relevance
  return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
};

// Simulated AI extraction (same as FileUpload)
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

// Methods
const performSearch = () => {
  if (!searchQuery.value.trim()) {
    error.value = 'Por favor, insira termos de busca.';
    return;
  }

  isSearching.value = true;
  error.value = '';
  uploadSuccess.value = '';

  // Simulate search delay
  setTimeout(() => {
    searchResults.value = simulateSearchResults(searchQuery.value);
    hasSearched.value = true;
    isSearching.value = false;
  }, 1000);
};

const uploadSearchResult = (result) => {
  // Create document object similar to FileUpload
  const doc = {
    type: result.type,
    name: result.name,
    content: result.content,
    timestamp: new Date().toISOString(),
    source: 'search'
  };

  // Add to store
  workspacesStore.addDocument(doc);
  emit('document-uploaded', doc);

  // Simulate extraction after "upload"
  setTimeout(() => {
    const extractedItems = simulateAIDataExtraction(doc.content, 'search');
    extractedItems.forEach(item => {
      workspacesStore.addExtractedData(item);
    });
  }, 500);

  uploadSuccess.value = `Documento "${result.name}" indexado com sucesso!`;
  searchResults.value = searchResults.value.filter(r => r.id !== result.id);

  // Clear success message
  setTimeout(() => {
    uploadSuccess.value = '';
  }, 3000);
};

const getDocumentIcon = (type) => {
  switch (type) {
    case 'jurisprudencia':
      return 'mdi-gavel';
    case 'legislacao':
      return 'mdi-scale-balance';
    case 'doutrina':
      return 'mdi-school';
    default:
      return 'mdi-file-document-outline';
  }
};
</script>

<style scoped>
.search-card {
  max-width: 700px;
  margin: 0 auto;
}

.search-results {
  margin-top: 16px;
}

.search-results-list {
  padding: 0;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
}

.search-result-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
  padding: 16px;
}

.search-result-item:last-child {
  border-bottom: none;
}

.upload-btn {
  mt: 8px;
}

.no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  text-align: center;
}
</style>
