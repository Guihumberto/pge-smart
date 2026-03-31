<template>
  <Transition name="connection-banner">
    <div v-if="showBanner" :class="['connection-banner', `connection-banner--${bannerState}`]">
      <div class="connection-banner__content">
        <WifiOff v-if="bannerState === 'offline'" :size="14" />
        <Wifi v-else :size="14" />
        <span>{{ message }}</span>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed } from 'vue'
import { Wifi, WifiOff } from 'lucide-vue-next'
import { useConnectionStatus } from '@/composables/useConnectionStatus'

const { showBanner, bannerState } = useConnectionStatus()

const message = computed(() =>
  bannerState.value === 'offline'
    ? 'Sem conexão com o servidor'
    : 'Conexão restabelecida'
)
</script>

<style scoped>
.connection-banner {
  width: 100%;
  padding: 6px 16px;
  font-size: 12.5px;
  font-weight: 600;
  font-family: 'DM Sans', sans-serif;
  text-align: center;
  z-index: 100;
  flex-shrink: 0;
}

.connection-banner__content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.connection-banner--offline {
  background: #dc2626;
  color: #fff;
}

.connection-banner--online {
  background: #16a34a;
  color: #fff;
}

/* Slide from top */
.connection-banner-enter-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.connection-banner-leave-active {
  transition: transform 0.4s ease, opacity 0.3s ease;
}

.connection-banner-enter-from {
  transform: translateY(-100%);
  opacity: 0;
}

.connection-banner-enter-to {
  transform: translateY(0);
  opacity: 1;
}

.connection-banner-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
