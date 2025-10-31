<template>
  <div class="center-panel-content">
    <h2>Ingestão de docs chat</h2>
    <p>Aqui será possível fazer o carregamentos dos documentos e chat com o doc</p>
    <FileUpload />
    <ChatComponent />
  </div>
</template>

<script setup>
    import FileUpload from '@/components/workspace/FileUpload.vue'
    import ChatComponent from '@/components/ChatComponent.vue'
</script>

<style scoped>
.center-panel-content {
  padding: 16px;
}
</style>
