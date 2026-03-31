<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <div class="modal__header">
        <h3 class="modal__title">Novo Plano</h3>
        <button class="modal__close" @click="$emit('close')"><X :size="16" /></button>
      </div>

      <div class="field">
        <label class="field__label">Nome do plano <span class="req">*</span></label>
        <input v-model="title" class="field__input" placeholder="Ex: Sefaz MA 2027, OAB XL" />
      </div>

      <div class="field">
        <label class="field__label">Descrição</label>
        <textarea v-model="description" class="field__textarea" placeholder="Contexto ou objetivo do plano" />
      </div>

      <div class="modal__footer">
        <button class="btn-ghost" @click="$emit('close')">Cancelar</button>
        <button class="btn-primary" :disabled="!title.trim() || saving" @click="save">
          {{ saving ? 'Criando...' : 'Criar Plano' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { X } from 'lucide-vue-next'
import { usePlanStore } from '@/stores/usePlanStore'
import { toast } from 'vue-sonner'

const emit = defineEmits(['close', 'created'])
const planStore = usePlanStore()

const title = ref('')
const description = ref('')
const saving = ref(false)

async function save() {
  if (!title.value.trim() || saving.value) return
  saving.value = true
  try {
    const plan = await planStore.createPlan(title.value.trim(), description.value.trim())
    emit('created', plan.id)
    emit('close')
  } catch (err) {
    toast.error('Erro ao criar plano.')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.4);
  z-index: 200;
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
}
.modal {
  background: #fff;
  border-radius: 16px;
  width: 100%; max-width: 400px;
  padding: 24px;
  display: flex; flex-direction: column; gap: 16px;
  font-family: 'DM Sans', sans-serif;
}
.modal__header { display: flex; align-items: center; justify-content: space-between; }
.modal__title { font-size: 15px; font-weight: 700; color: #1a1a2e; margin: 0; }
.modal__close {
  width: 30px; height: 30px; border-radius: 8px;
  border: 1px solid #ebe9e4; background: transparent;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #888;
}
.modal__close:hover { background: #f5f4f0; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field__label { font-size: 12px; font-weight: 600; color: #555; }
.req { color: #c0392b; }
.field__input {
  font-family: 'DM Sans', sans-serif; font-size: 13px;
  border: 1px solid #ddd; border-radius: 8px; padding: 8px 12px; outline: none;
}
.field__input:focus { border-color: #534AB7; }
.field__textarea {
  font-family: 'DM Sans', sans-serif; font-size: 13px;
  border: 1px solid #ddd; border-radius: 8px; padding: 8px 12px;
  outline: none; resize: vertical; min-height: 68px;
}
.field__textarea:focus { border-color: #534AB7; }
.modal__footer { display: flex; gap: 8px; justify-content: flex-end; }
.btn-ghost {
  font-family: 'DM Sans', sans-serif; font-size: 13px;
  background: transparent; border: 1px solid #ddd;
  border-radius: 8px; padding: 8px 16px; cursor: pointer; color: #666;
}
.btn-primary {
  font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600;
  background: #534AB7; border: none; border-radius: 8px;
  padding: 8px 20px; cursor: pointer; color: #fff;
  transition: background 0.15s, opacity 0.15s;
}
.btn-primary:hover { background: #3C3489; }
.btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
</style>