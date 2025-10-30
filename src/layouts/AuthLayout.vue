<template>
  <v-app>
    <appheader v-if="!isLogin" />
    <v-main :class="mainClass">
      <router-view />
    </v-main>
    <appfooter v-if="!isLogin" />
  </v-app>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import appheader from '@/components/layout/AppHeader.vue'
import appfooter from '@/components/layout/AppFooter.vue'

const route = useRoute()

const isLogin = computed(() => route.name === 'Login')

const mainClass = computed(() =>
  isLogin.value
    ? 'fill-height'
    : 'fill-height bg-gradient-to-br from-blue-500 to-purple-600'
)
</script>
