<template>
  <div class="new-workspace fill-height">
    <div class="workspace-container" ref="container">
      <div class="panel left-panel" :style="{ flex: leftFlex }">
        <LeftPanel />
      </div>
      <div class="divider" @mousedown="startResize($event, 'left')"></div>
      <div class="panel center-panel" :style="{ flex: centerFlex }">
        <CenterPanel />
      </div>
      <div class="divider" @mousedown="startResize($event, 'right')"></div>
      <div class="panel right-panel" :style="{ flex: rightFlex }">
        <RightPanel />
      </div>
    </div>
  </div>
</template>

<script setup>
import LeftPanel from '@/components/LeftPanel.vue'
import CenterPanel from '@/components/CenterPanel.vue'
import RightPanel from '@/components/RightPanel.vue'
import { ref, onMounted, onUnmounted } from 'vue'

const container = ref(null)
const isResizing = ref(false)
const resizeType = ref('')
const lastX = ref(0)
const containerRect = ref({})

const leftFlex = ref(0.3) // 30%
const centerFlex = ref(0.4) // 40%
const rightFlex = ref(0.3) // 30%

const startResize = (e, type) => {
  isResizing.value = true
  resizeType.value = type
  lastX.value = e.clientX
  containerRect.value = container.value.getBoundingClientRect()
  document.addEventListener('mousemove', resize)
  document.addEventListener('mouseup', stopResize)
}

const resize = (e) => {
  if (!isResizing.value) return
  const deltaX = e.clientX - lastX.value
  const totalFlex = leftFlex.value + centerFlex.value + rightFlex.value
  const deltaPercent = (deltaX / containerRect.value.width) * totalFlex
  if (resizeType.value === 'left') {
    const newLeft = leftFlex.value + deltaPercent
    const newCenter = centerFlex.value - deltaPercent
    if (newLeft >= 0.1 && newCenter >= 0.1) {
      leftFlex.value = newLeft
      centerFlex.value = newCenter
      lastX.value = e.clientX
    }
  } else if (resizeType.value === 'right') {
    const newCenter = centerFlex.value + deltaPercent
    const newRight = rightFlex.value - deltaPercent
    if (newCenter >= 0.1 && newRight >= 0.1) {
      centerFlex.value = newCenter
      rightFlex.value = newRight
      lastX.value = e.clientX
    }
  }
}

const stopResize = () => {
  isResizing.value = false
  resizeType.value = ''
  document.removeEventListener('mousemove', resize)
  document.removeEventListener('mouseup', stopResize)
}

onUnmounted(() => {
  document.removeEventListener('mousemove', resize)
  document.removeEventListener('mouseup', stopResize)
})
</script>

<style scoped>
.new-workspace {
  padding: 0;
  overflow: hidden;
}

.workspace-container {
  display: flex;
  height: 100%;
  width: 100%;
}

.panel {
  min-width: 100px;
  overflow: auto;
  height: 100%;
}

.divider {
  width: 4px;
  background-color: #ccc;
  cursor: col-resize;
  flex-shrink: 0;
}

.divider:hover {
  background-color: #999;
}
</style>
