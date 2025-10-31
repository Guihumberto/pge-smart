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
    clearExtractedData
  }
})
