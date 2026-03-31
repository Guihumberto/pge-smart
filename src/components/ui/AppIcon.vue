<!-- src/components/ui/AppIcon.vue -->
<template>
  <component :is="icon" v-bind="$attrs" />
</template>

<script setup>
defineProps({ icon: { type: Object, required: true } })
</script>