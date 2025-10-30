<template>
  <v-dialog v-model="dialog" max-width="600px">
    <v-card>
      <v-card-title>
        <span class="text-h5">Criar Nova Área de Trabalho</span>
      </v-card-title>

      <v-card-text>
        <v-container>
          <v-row>
            <v-col cols="12">
              <v-text-field
                v-model="workspaceName"
                label="Nome da Área de Trabalho"
                required
              ></v-text-field>
            </v-col>
            <v-col cols="12">
              <v-text-field
                v-model="workspaceDescription"
                label="Descrição (Subtítulo)"
                required
              ></v-text-field>
            </v-col>
            <v-col cols="12">
              <v-file-input
                v-model="uploadedFile"
                label="Carregar Arquivo"
                accept=".pdf,.doc,.docx,.txt"
                show-size
              ></v-file-input>
            </v-col>
            <v-col cols="12">
              <v-textarea
                v-model="pastedText"
                label="Colar Texto"
                hint="Cole aqui o texto copiado"
                rows="4"
              ></v-textarea>
            </v-col>
          </v-row>
        </v-container>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue darken-1" text @click="closeDialog">
          Cancelar
        </v-btn>
        <v-btn color="blue darken-1" text @click="submit">
          Criar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, defineExpose } from 'vue'

const dialog = ref(false)
const workspaceName = ref('')
const workspaceDescription = ref('')
const uploadedFile = ref(null)
const pastedText = ref('')

const openDialog = () => {
  dialog.value = true
}

const closeDialog = () => {
  dialog.value = false
  // Reset fields
  workspaceName.value = ''
  workspaceDescription.value = ''
  uploadedFile.value = null
  pastedText.value = ''
}

const submit = () => {
  // Handle submission logic here
  console.log('Creating workspace:', {
    name: workspaceName.value,
    description: workspaceDescription.value,
    file: uploadedFile.value,
    text: pastedText.value
  })
  // For now, just close the dialog
  closeDialog()
}

defineExpose({
  openDialog
})
</script>

<style scoped>
</style>
