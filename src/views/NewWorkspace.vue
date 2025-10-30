<template>
  <v-container>
    <h1>Nova Área de Trabalho</h1>
    <p>Exemplo de página para criar uma nova área de trabalho.</p>
    <v-btn color="primary" @click="openDialog">Criar Nova Área</v-btn>
    <CreateWorkspaceDialog ref="dialogRef" />
  </v-container>
</template>

<script setup>
import CreateWorkspaceDialog from '@/components/CreateWorkspaceDialog.vue'
import { ref } from 'vue'

const dialogRef = ref(null)

const openDialog = () => {
  dialogRef.value.openDialog()
}
</script>

<style scoped>
</style>
