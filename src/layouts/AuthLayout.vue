<template>
  <v-app>
    <v-main :class="mainClass">
      <router-view />
    </v-main>
  </v-app>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'


const route = useRoute()

const isLogin = computed(() => route.name === 'Login')

const mainClass = computed(() =>
  isLogin.value
    ? 'fill-height'
    : 'fill-height bg-gradient-to-br from-blue-500 to-purple-600'
)
</script>
