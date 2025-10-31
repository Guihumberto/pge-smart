<template>
  <div class="text-editor-container">
    <v-card class="editor-card" elevation="2">
      <v-card-title class="editor-header">
        <v-icon start>mdi-text-box-edit</v-icon>
        Editor de Texto
      </v-card-title>

      <v-card-text class="editor-content">
        <!-- Toolbar -->
        <div class="editor-toolbar">
          <div class="toolbar-group">
            <v-btn
              icon="mdi-format-bold"
              variant="text"
              :class="{ active: editor?.isActive('bold') }"
              @click="editor?.chain().toggleBold().focus().run()"
            ></v-btn>
            <v-btn
              icon="mdi-format-italic"
              variant="text"
              :class="{ active: editor?.isActive('italic') }"
              @click="editor?.chain().toggleItalic().focus().run()"
            ></v-btn>
            <v-btn
              icon="mdi-format-underline"
              variant="text"
              :class="{ active: editor?.isActive('underline') }"
              @click="editor?.chain().toggleUnderline().focus().run()"
            ></v-btn>
          </div>

          <v-divider vertical></v-divider>

          <div class="toolbar-group">
            <v-select
              v-model="fontSize"
              :items="fontSizes"
              variant="outlined"
              density="compact"
              @update:model-value="setFontSize"
              class="font-size-select"
            ></v-select>
            <input
              type="color"
              v-model="textColor"
              @input="setTextColor"
              class="color-input"
            />
          </div>

          <v-divider vertical></v-divider>

          <div class="toolbar-group">
            <v-btn
              icon="mdi-format-align-left"
              variant="text"
              :class="{ active: editor?.isActive({ textAlign: 'left' }) }"
              @click="editor?.chain().setTextAlign('left').focus().run()"
            ></v-btn>
            <v-btn
              icon="mdi-format-align-center"
              variant="text"
              :class="{ active: editor?.isActive({ textAlign: 'center' }) }"
              @click="editor?.chain().setTextAlign('center').focus().run()"
            ></v-btn>
            <v-btn
              icon="mdi-format-align-right"
              variant="text"
              :class="{ active: editor?.isActive({ textAlign: 'right' }) }"
              @click="editor?.chain().setTextAlign('right').focus().run()"
            ></v-btn>
          </div>

          <v-divider vertical></v-divider>

          <div class="toolbar-group">
            <v-btn
              icon="mdi-table-plus"
              variant="text"
              @click="insertTable"
            ></v-btn>
            <v-btn
              icon="mdi-table-row-plus-after"
              variant="text"
              @click="insertTableRow"
            ></v-btn>
            <v-btn
              icon="mdi-table-column-plus-after"
              variant="text"
              @click="insertTableColumn"
            ></v-btn>
            <v-btn
              icon="mdi-table-row-remove"
              variant="text"
              @click="removeTableRow"
            ></v-btn>
            <v-btn
              icon="mdi-table-column-remove"
              variant="text"
              @click="removeTableColumn"
            ></v-btn>
          </div>
        </div>

        <!-- Editor Areas as Pages -->
        <div class="editor-pages">
          <div
            v-for="page in pages"
            :key="page"
            class="page"
          >
            <div class="page-content">
              <EditorContent
                v-if="page === 1"
                :editor="editor"
                class="editor"
              />
              <div v-else class="continuation">
                [Página {{ page }} - Conteúdo continua]
              </div>
            </div>
          </div>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          variant="elevated"
          @click="saveDocument"
        >
          <v-icon start>mdi-content-save</v-icon>
          Salvar Documento
        </v-btn>
        <v-btn
          color="grey"
          variant="text"
          @click="clearEditor"
        >
          Limpar
        </v-btn>
      </v-card-actions>
    </v-card>
  </div>
</template>

<script setup>
import { ref, computed, onBeforeUnmount, onMounted } from 'vue'
import { Editor, EditorContent } from '@tiptap/vue-3'
import { StarterKit } from '@tiptap/starter-kit'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Underline } from '@tiptap/extension-underline'
import { TextAlign } from '@tiptap/extension-text-align'
import { Table } from '@tiptap/extension-table'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { TableRow } from '@tiptap/extension-table-row'
import { useWorkspacesStore } from '@/stores/workspaces.store'

// Store
const workspacesStore = useWorkspacesStore()

// Refs
const editor = ref(null)
const fontSize = ref('16px')
const textColor = ref('#000000')

// Font sizes
const fontSizes = [
  '8px', '10px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'
]

// Simulated pages (for demo, we'll show content on page 1 and indicate continuation)
const pages = computed(() => {
  const height = 1056 // A4 height in px
  // For simplicity, split into 3 pages
  return [1, 2, 3]
})

// Editor setup
onMounted(() => {
  editor.value = new Editor({
    content: '<p>Comece a escrever seu documento aqui...</p>',
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    onUpdate: ({ editor }) => {
      // Handle updates if needed
    },
  })
})

onBeforeUnmount(() => {
  if (editor.value) {
    editor.value.destroy()
  }
})

// Methods
const setFontSize = (size) => {
  if (!editor.value) return
  editor.value.chain().setMark('textStyle', { fontSize: size }).focus().run()
}

const setTextColor = () => {
  if (!editor.value) return
  editor.value.chain().setMark('textStyle', { color: textColor.value }).focus().run()
}

const insertTable = () => {
  if (!editor.value) return
  editor.value.chain().insertTable({ rows: 3, cols: 3 }).focus().run()
}

const insertTableRow = () => {
  if (!editor.value) return
  editor.value.chain().addRowAfter().focus().run()
}

const insertTableColumn = () => {
  if (!editor.value) return
  editor.value.chain().addColumnAfter().focus().run()
}

const removeTableRow = () => {
  if (!editor.value) return
  editor.value.chain().deleteRow().focus().run()
}

const removeTableColumn = () => {
  if (!editor.value) return
  editor.value.chain().deleteColumn().focus().run()
}

const saveDocument = () => {
  if (!editor.value) return
  const html = editor.value.getHTML()
  const document = {
    name: `Documento ${new Date().toLocaleString()}`,
    content: html,
    type: 'editor',
    timestamp: new Date().toISOString(),
  }
  workspacesStore.addDocument(document)
}

const clearEditor = () => {
  if (!editor.value) return
  editor.value.chain().clearContent().focus().run()
}
</script>

<style scoped>
.text-editor-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.editor-card {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.editor-header {
  padding: 16px;
  background-color: rgba(var(--v-theme-primary), 0.05);
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
}

.editor-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
  flex-shrink: 0;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.font-size-select {
  width: 80px;
}

.color-input {
  width: 40px;
  height: 32px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 4px;
  cursor: pointer;
}

.active {
  background-color: rgba(var(--v-theme-primary), 0.1);
}

.editor-pages {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.page {
  width: 595px; /* A4 width in px */
  height: 842px; /* A4 height in px */
  margin: 0 auto 16px auto;
  background-color: white;
  color: black;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(0, 0, 0, 0.12);
  padding: 40px;
  font-size: 12pt;
  font-family: 'Arial', sans-serif;
}

.page:first-child {
  border-top: none;
}

.page-content {
  height: 100%;
}

.editor {
  height: 100%;
  outline: none;
}

.editor :deep(.ProseMirror) {
  outline: none;
  height: 100%;
  overflow-y: visible;
}

.continuation {
  color: grey;
  font-style: italic;
  text-align: center;
  padding-top: 200px;
}

v-card-actions {
  flex-shrink: 0;
  padding: 16px;
  border-top: 1px solid rgba(0, 0, 0, 0.12);
}
</style>
