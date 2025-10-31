import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useWorkspacesStore = defineStore('workspaces', () => {
  const workspaces = ref([
    { id: 1, name: 'Workspace 1', description: 'Projetos de design gráfico', date: '2023-10-01', highlighted: true },
    { id: 2, name: 'Workspace 2', description: 'Desenvolvimento web fullstack', date: '2023-09-15', highlighted: true },
    { id: 3, name: 'Workspace 3', description: 'Análises de dados e relatórios', date: '2023-08-20', highlighted: true },
    { id: 4, name: 'Workspace Alpha', description: 'Projetos experimentais', date: '2023-11-05', highlighted: false },
    { id: 5, name: 'Workspace Beta', description: 'Aplicativos móveis', date: '2023-07-12', highlighted: false }
  ])

  const highlightedWorkspaces = computed(() => workspaces.value.filter(ws => ws.highlighted))

  function toggleHighlighted(id) {
    const workspace = workspaces.value.find(ws => ws.id === id)
    if (workspace) {
      workspace.highlighted = !workspace.highlighted
    }
  }

  function addWorkspace(workspace) {
    workspaces.value.push({ id: Date.now(), highlighted: false, ...workspace })
  }

  // Uploaded documents (for current workspace, assuming single workspace for now)
  const uploadedDocuments = ref([])

  // Extracted data from uploaded documents
  const extractedDocuments = ref([])

  function addDocument(document) {
    const newDoc = { id: Date.now(), selected: true, ...document }
    // Generate AI summary and keywords
    newDoc.summary = generateDocumentSummary(newDoc)
    newDoc.keywords = generateDocumentKeywords(newDoc)
    uploadedDocuments.value.push(newDoc)
  }

  function addExtractedData(extractedData) {
    extractedDocuments.value.push({ ...extractedData, id: Date.now() })
  }

  function clearExtractedData() {
    extractedDocuments.value = []
  }

  function removeDocument(id) {
    const index = uploadedDocuments.value.findIndex(doc => doc.id === id)
    if (index !== -1) {
      uploadedDocuments.value.splice(index, 1)
    }
  }

  function toggleDocumentSelection(id) {
    const doc = uploadedDocuments.value.find(d => d.id === id)
    if (doc) {
      doc.selected = !doc.selected
    }
  }

  // Generate AI summary for document
  function generateDocumentSummary(document) {
    let content = ''
    if (document.type === 'text') {
      content = document.content || ''
    } else if (document.type === 'file') {
      // Simulate content based on file name (in real app, would read file)
      content = `Conteúdo do arquivo ${document.name}. Este documento contém informações relevantes sobre o tema proposto no nome do arquivo.`
    }

    // Simulate AI summary generation
    const summaryLength = Math.min(150, content.length / 2)
    let summary = content.substring(0, summaryLength)
    if (content.length > summaryLength) {
      summary += '...'
    }

    // Add some AI-like enhancements
    if (summary.includes('contrato') || summary.includes('acordo')) {
      summary = 'Resumo do documento: Este documento aborda termos contratuais e obrigações legais. ' + summary
    } else if (summary.includes('jurisprudencia') || summary.includes('julgamento')) {
      summary = 'Resumo do documento: Análise jurisprudencial e entendimentos legais estabelecidos em precedentes. ' + summary
    } else {
      summary = 'Resumo do documento gerado por IA: ' + summary
    }

    return summary
  }

  // Computed: get current summary based on selected documents
  const currentSummary = computed(() => {
    const selectedDocs = uploadedDocuments.value.filter(doc => doc.selected)
    if (selectedDocs.length === 0) {
      return null
    }
    // Take the one with highest id (last added)
    const lastDoc = selectedDocs.reduce((max, doc) => doc.id > max.id ? doc : max)
    return lastDoc.summary
  })

  // Computed: get current document id
  const currentDocId = computed(() => {
    const selectedDocs = uploadedDocuments.value.filter(doc => doc.selected)
    if (selectedDocs.length === 0) {
      return null
    }
    // Take the one with highest id (last added)
    const lastDoc = selectedDocs.reduce((max, doc) => doc.id > max.id ? doc : max)
    return lastDoc.id
  })

  // Generate AI keywords for document
  function generateDocumentKeywords(document) {
    let content = ''
    if (document.type === 'text') {
      content = document.content || ''
    } else if (document.type === 'file') {
      // Simulate content based on file name for file uploads
      content = `Conteúdo simulado do arquivo ${document.name}. Este documento contém informações relevantes sobre contrato, jurisprudência, legislação, direitos fundamentais, obrigação civil, responsabilidade jurídica, prazo processual, decisão judicial, doutrina jurídica, lei federal.`
    }

    const baseKeywords = [
      'contrato', 'jurisprudência', 'legislação', 'direitos', 'obrigação', 'responsabilidade',
      'prazo', 'decisão', 'doutrina', 'lei', 'constitucional', 'civil', 'penal', 'trabalhista'
    ];

    // Generate keywords based on content (simulate AI extraction)
    const keywords = [];
    const contentWords = content.toLowerCase().split(/[^\w]+/);

    // Add relevant keywords based on content presence
    baseKeywords.forEach(keyword => {
      if (contentWords.includes(keyword) || Math.random() > 0.6) {
        keywords.push(keyword);
      }
    });

    // Ensure at least 5-10 keywords
    while (keywords.length < 5) {
      const randomKeyword = baseKeywords[Math.floor(Math.random() * baseKeywords.length)];
      if (!keywords.includes(randomKeyword)) {
        keywords.push(randomKeyword);
      }
    }

    // Limit to max 15 keywords
    return keywords.slice(0, 15).map(keyword => ({
      word: keyword.charAt(0).toUpperCase() + keyword.slice(1),
      documentId: document.id
    }));
  }

  // Current filter for keywords (document selection)
  const keywordFilterDocId = ref(null) // null means show all

  // Computed: get filtered keywords
  const filteredKeywords = computed(() => {
    let allKeywords = [];
    uploadedDocuments.value.forEach(doc => {
      if (doc.keywords) {
        allKeywords.push(...doc.keywords);
      }
    });

    if (keywordFilterDocId.value) {
      return allKeywords.filter(kw => kw.documentId === keywordFilterDocId.value);
    }

    return allKeywords;
  });

  // Function to set keyword filter
  function setKeywordFilter(docId) {
    keywordFilterDocId.value = docId;
  }

  function regenerateSummary(docId) {
    const doc = uploadedDocuments.value.find(d => d.id === docId)
    if (doc) {
      doc.summary = generateDocumentSummary(doc) + ' (Regenerado)'
    }
  }

  return {
    workspaces,
    highlightedWorkspaces,
    toggleHighlighted,
    addWorkspace,
    uploadedDocuments,
    addDocument,
    removeDocument,
    toggleDocumentSelection,
    extractedDocuments,
    addExtractedData,
    clearExtractedData,
    currentSummary,
    currentDocId,
    regenerateSummary,
    filteredKeywords,
    keywordFilterDocId,
    setKeywordFilter
  }
})
