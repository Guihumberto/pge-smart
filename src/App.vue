<template>
  <RouterView />
  <Toaster position="top-right" richColors />
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { Toaster } from 'vue-sonner'
import { useEnrollmentStore } from '@/stores/useEnrollmentStore'

const enrollmentStore = useEnrollmentStore()
let ticker = null

onMounted(() => {
  // Verifica liberações agendadas a cada minuto
  ticker = setInterval(() => {
    enrollmentStore.tickScheduledReleases()
  }, 60_000)
})

onUnmounted(() => clearInterval(ticker))
</script>