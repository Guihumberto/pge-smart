<template>
  <div class="right-panel-content">
    <AISummary />
    <KeywordExtraction />
    <ExtractedData />
  </div>
</template>

<script setup>
import AISummary from './workspace/AISummary.vue'
import KeywordExtraction from './workspace/KeywordExtraction.vue'
import ExtractedData from './workspace/ExtractedData.vue'
</script>

<style scoped>
.right-panel-content {
  padding: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
