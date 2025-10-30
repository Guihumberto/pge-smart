<template>
  <div class="login-container">
    <v-row no-gutters class="h-100">
      <v-col v-show="$vuetify.display.mdAndUp" md="6" class="left-panel d-flex align-center justify-center">
        <div class="text-center">
          <h1 class="display-1 font-weight-bold mb-4">PGE SMART</h1>
          <p class="title">Bem-vindo à plataforma inteligente</p>
        </div>
      </v-col>
      <v-col :cols="$vuetify.display.mdAndUp ? 6 : 12" class="right-panel d-flex align-center justify-center">
        <LoginForm />
      </v-col>
    </v-row>
  </div>
</template>

<script setup>
import LoginForm from '@/components/common/LoginForm.vue'
</script>

<style scoped>
.login-container {
  height: 100%;
}

.left-panel {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.right-panel {
  padding: 2rem;
}
</style>
