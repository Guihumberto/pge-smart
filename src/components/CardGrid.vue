<template>
  <v-container>
    <v-row>
      <v-col
        v-for="n in 6"
        :key="n"
        cols="12"
        md="4"
      >
        <v-card class="pa-4">
          <v-card-title>Card {{ n }}</v-card-title>
          <v-card-text>Content for card {{ n }}</v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
</script>

<style scoped>
</style>
