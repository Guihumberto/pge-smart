<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <div class="modal__header">
        <h3 class="modal__title">Novo link de convite</h3>
        <button class="icon-btn" @click="$emit('close')"><X :size="16" /></button>
      </div>

      <div class="field">
        <label class="field__label">Tipo do link</label>
        <div class="type-row">
          <button :class="['type-opt', { 'type-opt--active': form.type === 'global' }]" @click="form.type = 'global'">
            <Globe :size="16" />
            <div>
              <p class="type-opt__title">Link global</p>
              <p class="type-opt__desc">Qualquer pessoa com o link pode entrar</p>
            </div>
          </button>
          <button :class="['type-opt', { 'type-opt--active': form.type === 'single' }]" @click="form.type = 'single'">
            <UserCheck :size="16" />
            <div>
              <p class="type-opt__title">Link único</p>
              <p class="type-opt__desc">Uso único — ideal para enviar por email</p>
            </div>
          </button>
        </div>
      </div>

      <div class="field">
        <label class="field__label">Expiração</label>
        <select v-model="form.expires" class="field__select">
          <option :value="null">Sem expiração</option>
          <option :value="1">1 dia</option>
          <option :value="7">7 dias</option>
          <option :value="30">30 dias</option>
          <option :value="90">90 dias</option>
        </select>
      </div>

      <div class="modal__footer">
        <button class="btn-ghost" @click="$emit('close')">Cancelar</button>
        <button class="btn-primary" @click="create">Gerar link</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { X, Globe, UserCheck } from 'lucide-vue-next'
import { useEnrollmentStore } from '@/stores/useEnrollmentStore'

const props = defineProps({ planId: String })
const emit = defineEmits(['close', 'created'])

const enrollmentStore = useEnrollmentStore()
const form = ref({ type: 'global', expires: null })

function create() {
  enrollmentStore.createInviteLink(props.planId, form.value.type, form.value.expires)
  emit('created')
}
</script>

<style scoped>
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4);
  z-index: 400; display: flex; align-items: center; justify-content: center; padding: 16px;
}
.modal {
  background: #fff; border-radius: 16px;
  width: 100%; max-width: 440px; padding: 24px;
  display: flex; flex-direction: column; gap: 18px;
  font-family: 'DM Sans', sans-serif;
}
.modal__header { display: flex; align-items: center; justify-content: space-between; }
.modal__title  { font-size: 15px; font-weight: 700; color: #1a1a2e; margin: 0; }
.field { display: flex; flex-direction: column; gap: 8px; }
.field__label { font-size: 12px; font-weight: 600; color: #555; }
.type-row { display: flex; gap: 8px; }
.type-opt {
  flex: 1; display: flex; align-items: flex-start; gap: 10px;
  padding: 12px; border-radius: 10px;
  border: 1.5px solid #ebe9e4; background: #fafaf8;
  cursor: pointer; text-align: left;
  transition: border-color 0.15s, background 0.15s;
  color: #888;
}
.type-opt--active { border-color: #534AB7; background: #f7f6ff; color: #534AB7; }
.type-opt__title { font-size: 12px; font-weight: 700; color: #1a1a2e; margin: 0 0 2px; }
.type-opt__desc  { font-size: 11px; color: #aaa; margin: 0; line-height: 1.4; }
.field__select {
  font-family: 'DM Sans', sans-serif; font-size: 13px;
  border: 1px solid #ddd; border-radius: 8px; padding: 8px 12px;
  outline: none; background: #fff; cursor: pointer;
}
.field__select:focus { border-color: #534AB7; }
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
}
.btn-primary:hover { background: #3C3489; }
.icon-btn {
  width: 30px; height: 30px; border-radius: 8px; border: 1px solid #ebe9e4;
  background: transparent; display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #888; padding: 0;
}
.icon-btn:hover { background: #f5f4f0; }
</style>