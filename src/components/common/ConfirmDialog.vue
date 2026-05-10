<template>
  <Teleport to="body">
    <Transition name="cd-fade">
      <div
        v-if="modelValue"
        class="cd-overlay"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        @click.self="onCancel"
      >
        <div class="cd-card">
          <div class="cd-header">
            <h2 :id="titleId" class="cd-title">{{ title }}</h2>
          </div>

          <div v-if="message" class="cd-body">
            <p class="cd-message">{{ message }}</p>
          </div>
          <div v-else class="cd-body">
            <slot />
          </div>

          <div class="cd-footer">
            <button class="cd-btn cd-btn--ghost" @click="onCancel">
              {{ cancelLabel }}
            </button>
            <button
              class="cd-btn"
              :class="confirmBtnClass"
              @click="onConfirm"
              ref="confirmBtnRef"
            >
              {{ confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, required: true },
  message: { type: String, default: '' },
  confirmLabel: { type: String, default: 'Confirmar' },
  cancelLabel: { type: String, default: 'Cancelar' },
  variant: {
    type: String,
    default: 'info',
    validator: (v) => ['danger', 'warning', 'info'].includes(v),
  },
})

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel'])

const titleId = `cd-title-${useId()}`
const confirmBtnRef = ref(null)

const confirmBtnClass = computed(() => {
  return {
    'cd-btn--danger': props.variant === 'danger',
    'cd-btn--warning': props.variant === 'warning',
    'cd-btn--info': props.variant === 'info',
  }
})

function close() {
  emit('update:modelValue', false)
}

function onConfirm() {
  emit('confirm')
  close()
}

function onCancel() {
  emit('cancel')
  close()
}

function onDocumentKeydown(event) {
  if (event.key === 'Escape') {
    event.stopPropagation()
    onCancel()
  }
}

watch(
  () => props.modelValue,
  async (open) => {
    if (open) {
      document.addEventListener('keydown', onDocumentKeydown)
      await nextTick()
      confirmBtnRef.value?.focus()
    } else {
      document.removeEventListener('keydown', onDocumentKeydown)
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onDocumentKeydown)
})
</script>

<style scoped>
.cd-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  font-family: 'DM Sans', sans-serif;
}

.cd-card {
  background: #fff;
  border-radius: 16px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.18);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.cd-header {
  padding: 20px 24px 0;
}

.cd-title {
  font-size: 16px;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}

.cd-body {
  padding: 14px 24px 8px;
}

.cd-message {
  font-size: 13px;
  color: #444;
  line-height: 1.5;
  margin: 0;
}

.cd-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 24px 20px;
}

.cd-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.cd-btn:focus-visible {
  outline: 2px solid #534AB7;
  outline-offset: 2px;
}

.cd-btn--ghost {
  background: #fff;
  color: #444;
  border: 1px solid #ddd;
}

.cd-btn--ghost:hover {
  background: #f5f4f0;
}

.cd-btn--info {
  background: #534AB7;
  color: #fff;
}

.cd-btn--info:hover {
  background: #3C3489;
}

.cd-btn--warning {
  background: #D97706;
  color: #fff;
}

.cd-btn--warning:hover {
  background: #B45309;
}

.cd-btn--danger {
  background: #DC2626;
  color: #fff;
}

.cd-btn--danger:hover {
  background: #B91C1C;
}

.cd-fade-enter-active,
.cd-fade-leave-active {
  transition: opacity 0.15s ease;
}

.cd-fade-enter-from,
.cd-fade-leave-to {
  opacity: 0;
}
</style>
