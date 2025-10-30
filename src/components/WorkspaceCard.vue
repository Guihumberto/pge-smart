<template>
  <v-card class="mpx-10 w-100" color="primary">
    <v-card-text class="d-flex justify-space-between align-center">
      <h4 class="text-h5">Área de trabalho</h4>
      <div class="d-flex ga-2">
        <v-btn color="white" variant="outlined" @click="goToNewWorkspace">Novo</v-btn>
        <v-btn color="white" variant="outlined" @click="goToMyFolders">Minhas pastas</v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const goToNewWorkspace = () => {
  router.push('/new-workspace')
}

const goToMyFolders = () => {
  router.push('/my-folders')
}
</script>

<style scoped>
</style>
