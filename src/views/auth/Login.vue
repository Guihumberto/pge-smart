<!-- src/views/auth/Login.vue -->
<template>
  <div class="login-page">
    <!-- Painel esquerdo -->
    <div class="login-left">
      <div class="login-left__content">
        <div class="login-logo">
          <div class="login-logo__icon">⚖</div>
          <span class="login-logo__name">Metas Leges</span>
        </div>
        <h1 class="login-left__title">Estudo da Lei</h1>
        <p class="login-left__sub">
          Plataforma inteligente para estudo estruturado de legislação e preparação para concursos.
        </p>
        <div class="login-left__features">
          <div v-for="f in features" :key="f" class="login-feature">
            <span class="login-feature__dot" />
            {{ f }}
          </div>
        </div>
      </div>
      <p class="login-left__footer">© 2025 Metas Leges</p>
    </div>

    <!-- Painel direito -->
    <div class="login-right">
      <LoginForm />
    </div>
  </div>
</template>

<script setup>
import LoginForm from '@/components/common/LoginForm.vue'

const features = [
  'Planos de estudo modulares',
  'Metas liberadas gradualmente',
  'Acompanhamento pelo mentor',
  'Análise de progresso em tempo real',
]
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1fr 1fr;
  font-family: 'DM Sans', sans-serif;
}

@media (max-width: 768px) {
  .login-page { grid-template-columns: 1fr; }
  .login-left  { display: none; }
}

/* Painel esquerdo */
.login-left {
  background: #1a1a2e;
  display: flex; flex-direction: column;
  justify-content: space-between;
  padding: 48px;
}

.login-left__content {
  display: flex; flex-direction: column; gap: 32px;
}

.login-logo {
  display: flex; align-items: center; gap: 10px;
}
.login-logo__icon {
  width: 36px; height: 36px; border-radius: 9px;
  background: rgba(255,255,255,0.1);
  font-size: 18px;
  display: flex; align-items: center; justify-content: center;
}
.login-logo__name {
  font-size: 14px; font-weight: 700;
  color: rgba(255,255,255,0.9); letter-spacing: 0.02em;
}

.login-left__title {
  font-size: clamp(2rem, 3vw, 2.8rem);
  font-weight: 800; color: #fff;
  letter-spacing: -0.03em;
  line-height: 1.15; margin: 0;
}

.login-left__sub {
  font-size: 14px; color: rgba(255,255,255,0.5);
  line-height: 1.7; margin: 0; max-width: 340px;
}

.login-left__features {
  display: flex; flex-direction: column; gap: 12px;
}

.login-feature {
  display: flex; align-items: center; gap: 10px;
  font-size: 13px; color: rgba(255,255,255,0.65);
}
.login-feature__dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: #a5b4fc; flex-shrink: 0;
}

.login-left__footer {
  font-size: 11px; color: rgba(255,255,255,0.2); margin: 0;
}

/* Painel direito */
.login-right {
  background: #f8f7f4;
  display: flex; align-items: center; justify-content: center;
  padding: 48px 32px;
}
</style>