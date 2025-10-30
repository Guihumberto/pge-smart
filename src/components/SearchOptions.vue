<template>
  <v-card class="pa-4">
    <v-card-title>Opções de Pesquisa</v-card-title>
     <v-btn
        block
        color="primary"
        size="large"
        @click="openChat"
      >
        <v-icon left>mdi-chat</v-icon>
        Chat AI
      </v-btn>
    <v-card-text>
      <h4 class="text-h6 mb-3">Extrair Menções de:</h4>
      <v-checkbox
        v-model="extractLegislation"
        label="Legislação"
        hide-details
      ></v-checkbox>
      <v-checkbox
        v-model="extractJurisprudence"
        label="Jurisprudência"
        hide-details
      ></v-checkbox>
      <v-checkbox
        v-model="extractDoctrine"
        label="Doutrina"
        hide-details
      ></v-checkbox>
       <v-btn
        block
        color="success"
        size="large"
        @click="extrair"
      >
        <v-icon left>mdi-text</v-icon>
        Extrair
      </v-btn>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref } from 'vue'

const extractLegislation = ref(false)
const extractJurisprudence = ref(false)
const extractDoctrine = ref(false)

const emit = defineEmits(['openChat'])

const openChat = () => {
  emit('openChat')
}
</script>

<style scoped>
</style>
