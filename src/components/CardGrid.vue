<template>
  <v-container>
    <v-row>
      <v-col
        v-for="(card, index) in cards"
        :key="index"
        cols="12"
        md="4"
      >
        <CategoryCard
          :icon="card.icon"
          :title="card.title"
          :description="card.description"
          :colorClass="card.colorClass"
        />
      </v-col>
    </v-row>
    <v-row class="justify-center mt-10">
      <v-btn variant="flat" color="primary" prepend-icon="mdi-plus">Ver mais</v-btn>
    </v-row>
  </v-container>
</template>

<script setup>
import CategoryCard from './CategoryCard.vue'


const cards = [
  {
    icon: 'mdi-scale-balance',
    title: "Jurisprudência",
    description: "Consulte decisões e precedentes judiciais dos tribunais superiores",
    colorClass: "bg-category-jurisprudencia",
  },
  {
    icon: 'mdi-notebook',
    title: "Pareceres",
    description: "Acesse pareceres técnicos e consultivos sobre temas jurídicos",
    colorClass: "bg-category-pareceres",
  },
  {
    icon: 'mdi-book',
    title: "Legislação",
    description: "Busque leis, decretos, portarias e normas atualizadas",
    colorClass: "bg-category-legislacao",
  },
  {
    icon: 'mdi-account-tie-woman',
    title: "TARF",
    description: "Consulte tabelas e regulamentos de atos e receitas federais",
    colorClass: "bg-category-tarf",
  },
  {
    icon: 'mdi-file-document-multiple-outline',
    title: "Informativos",
    description: "Acompanhe informativos jurisprudenciais e boletins",
    colorClass: "bg-category-informativos",
  },
  {
    icon: 'mdi-gavel',
    title: "Decisões Judiciais",
    description: "Pesquise decisões recentes e relevantes dos tribunais",
    colorClass: "bg-category-decisoes",
  },
]
</script>

<style scoped>
</style>
