<template>
  <div class="center-panel-content">
    <FileUpload />
    <ChatComponent v-if="showChat" />
  </div>
</template>

<script setup>
    import { computed } from 'vue'
    import { useWorkspacesStore } from '@/stores/workspaces.store'
    import { storeToRefs } from 'pinia'

    import FileUpload from '@/components/workspace/FileUpload.vue'
    import ChatComponent from '@/components/ChatComponent.vue'

    const workspacesStore = useWorkspacesStore()
    const { uploadedDocuments } = storeToRefs(workspacesStore)

    const showChat = computed(() =>
      uploadedDocuments.value.length > 0 ||
      uploadedDocuments.value.some(doc => doc.selected)
    )
</script>

<style scoped>
.center-panel-content {
  padding: 16px;
}
</style>
