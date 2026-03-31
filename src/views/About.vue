<template>
  <div class="about">

    <!-- ── HERO ──────────────────────────────────────────── -->
    <section class="hero">
      <div class="hero__content">
        <span class="hero__badge">⚖ Plataforma Jurídica</span>
        <h1 class="hero__title">
          Domine a legislação<br>
          <span class="hero__title-accent">de forma estratégica</span>
        </h1>
        <p class="hero__tagline">
          O <strong>Metas Leges</strong> transforma a preparação jurídica em um processo estruturado,
          mensurável e eficiente — para quem leva a sério a aprovação.
        </p>
      </div>

      <div class="hero__visual" aria-hidden="true">
        <!-- Decorative legal scales SVG -->
        <svg class="hero__scales" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="100" cy="100" r="96" stroke="rgba(99,102,241,0.15)" stroke-width="1.5"/>
          <circle cx="100" cy="100" r="70" stroke="rgba(99,102,241,0.1)" stroke-width="1"/>
          <!-- Pole -->
          <line x1="100" y1="40" x2="100" y2="155" stroke="#534AB7" stroke-width="2" stroke-linecap="round"/>
          <!-- Beam -->
          <line x1="50" y1="70" x2="150" y2="70" stroke="#534AB7" stroke-width="2" stroke-linecap="round"/>
          <!-- Center circle -->
          <circle cx="100" cy="70" r="5" fill="#534AB7"/>
          <!-- Left pan -->
          <line x1="55" y1="70" x2="62" y2="100" stroke="#a5b4fc" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="62" y1="100" x2="48" y2="100" stroke="#a5b4fc" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M 42 100 Q 55 115 68 100" stroke="#a5b4fc" stroke-width="1.5" fill="none" stroke-linecap="round"/>
          <!-- Right pan -->
          <line x1="145" y1="70" x2="138" y2="100" stroke="#a5b4fc" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="138" y1="100" x2="152" y2="100" stroke="#a5b4fc" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M 132 100 Q 145 115 158 100" stroke="#a5b4fc" stroke-width="1.5" fill="none" stroke-linecap="round"/>
          <!-- Base -->
          <line x1="82" y1="155" x2="118" y2="155" stroke="#534AB7" stroke-width="2" stroke-linecap="round"/>
          <!-- Decorative dots -->
          <circle cx="40" cy="50" r="3" fill="rgba(99,102,241,0.3)"/>
          <circle cx="165" cy="130" r="2" fill="rgba(165,180,252,0.4)"/>
          <circle cx="30" cy="135" r="2" fill="rgba(99,102,241,0.2)"/>
          <circle cx="170" cy="55" r="4" fill="rgba(165,180,252,0.2)"/>
        </svg>

        <!-- Floating stat pills -->
        <div class="hero__pill hero__pill--1">
          <span class="hero__pill-value">6</span>
          <span class="hero__pill-label">módulos</span>
        </div>
        <div class="hero__pill hero__pill--2">
          <span class="hero__pill-value">∞</span>
          <span class="hero__pill-label">metas</span>
        </div>
        <div class="hero__pill hero__pill--3">
          <span class="hero__pill-value">100%</span>
          <span class="hero__pill-label">legislação</span>
        </div>
      </div>
    </section>

    <!-- ── COMO FUNCIONA ──────────────────────────────────── -->
    <section class="section">
      <div class="section__label-row">
        <span class="section__label">Como funciona</span>
      </div>
      <h2 class="section__title">Um ciclo contínuo de evolução</h2>

      <div class="flow">
        <div class="flow__step">
          <div class="flow__icon flow__icon--1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
            </svg>
          </div>
          <div class="flow__num">01</div>
          <h3 class="flow__title">Mentor cria o plano</h3>
          <p class="flow__desc">O mentor define metas personalizadas com tarefas de leitura, revisão, questões e flash drills para cada aluno.</p>
        </div>

        <div class="flow__connector" aria-hidden="true">
          <svg viewBox="0 0 48 12" fill="none">
            <path d="M0 6 H40 M36 2 L42 6 L36 10" stroke="#AFA9EC" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>

        <div class="flow__step">
          <div class="flow__icon flow__icon--2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
          </div>
          <div class="flow__num">02</div>
          <h3 class="flow__title">Aluno estuda com foco</h3>
          <p class="flow__desc">Cada tarefa é clara e direcionada. O aluno sabe exatamente o que estudar, como estudar e quanto já avançou.</p>
        </div>

        <div class="flow__connector" aria-hidden="true">
          <svg viewBox="0 0 48 12" fill="none">
            <path d="M0 6 H40 M36 2 L42 6 L36 10" stroke="#AFA9EC" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>

        <div class="flow__step">
          <div class="flow__icon flow__icon--3">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </div>
          <div class="flow__num">03</div>
          <h3 class="flow__title">Progresso é acompanhado</h3>
          <p class="flow__desc">Mentor e aluno visualizam domínio por artigo, padrões de erro e evolução ao longo do tempo.</p>
        </div>
      </div>
    </section>

    <!-- ── PARA QUEM É ─────────────────────────────────────── -->
    <section class="section section--alt">
      <div class="section__label-row">
        <span class="section__label">Para quem é</span>
      </div>
      <h2 class="section__title">Dois perfis, uma plataforma</h2>

      <div class="audience">
        <div class="audience__card audience__card--mentor">
          <div class="audience__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <h3 class="audience__title">Mentor</h3>
          <p class="audience__desc">Cria planos de estudo personalizados, acompanha o progresso dos alunos e ajusta as metas conforme a evolução de cada um.</p>
          <ul class="audience__list">
            <li>Criação de planos por aluno</li>
            <li>Visibilidade total do progresso</li>
            <li>Ajuste dinâmico de metas</li>
          </ul>
        </div>

        <div class="audience__card audience__card--student">
          <div class="audience__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
            </svg>
          </div>
          <h3 class="audience__title">Aluno</h3>
          <p class="audience__desc">Recebe um plano estruturado, executa tarefas direcionadas e tem clareza visual do que domina e do que precisa reforçar.</p>
          <ul class="audience__list">
            <li>Concurseiros públicos</li>
            <li>Candidatos da OAB</li>
            <li>Residências jurídicas</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- ── FUNCIONALIDADES ────────────────────────────────── -->
    <section class="section">
      <div class="section__label-row">
        <span class="section__label">Funcionalidades</span>
      </div>
      <h2 class="section__title">O que a plataforma oferece</h2>

      <div class="features-grid">
        <div
          v-for="(feature, i) in features"
          :key="feature.title"
          class="feature-card"
        >
          <div class="feature-card__head">
            <span class="feature-card__num">{{ String(i + 1).padStart(2, '0') }}</span>
            <span class="feature-card__icon" v-html="feature.icon" aria-hidden="true"></span>
          </div>
          <h3 class="feature-card__title">{{ feature.title }}</h3>
          <p class="feature-card__desc">{{ feature.description }}</p>
        </div>
      </div>
    </section>

    <!-- ── STATS BAND ─────────────────────────────────────── -->
    <section class="stats-band">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="stats-band__item"
      >
        <span class="stats-band__value">{{ stat.value }}</span>
        <span class="stats-band__label">{{ stat.label }}</span>
      </div>
    </section>

    <!-- ── IMPACTO ─────────────────────────────────────────── -->
    <section class="section">
      <div class="impact">
        <div class="impact__content">
          <div class="section__label-row">
            <span class="section__label">Impacto</span>
          </div>
          <h2 class="section__title">Por que isso faz diferença</h2>
          <p>
            Estudar legislação sem método é como navegar sem bússola — você lê muito,
            mas não sabe o que domina nem o que falta. A desorganização custa aprovações.
          </p>
          <p>
            O <strong>Metas Leges</strong> coloca o aluno no controle: com um plano claro,
            tarefas objetivas e análise de desempenho, o estudo deixa de ser vago e passa
            a ser estratégico.
          </p>
          <div class="impact__quote">
            "Quem sabe o que sabe — e o que não sabe — estuda com muito mais eficiência."
          </div>
        </div>

        <div class="impact__diagram" aria-hidden="true">
          <!-- Progress visualization -->
          <div class="progress-viz">
            <div class="progress-viz__title">Domínio da legislação</div>
            <div v-for="bar in progressBars" :key="bar.label" class="progress-viz__row">
              <span class="progress-viz__label">{{ bar.label }}</span>
              <div class="progress-viz__bar">
                <div
                  class="progress-viz__fill"
                  :style="{ width: bar.pct + '%', background: bar.color }"
                ></div>
              </div>
              <span class="progress-viz__pct">{{ bar.pct }}%</span>
            </div>
          </div>
        </div>
      </div>
    </section>

  </div>
</template>

<script setup>
import { ref } from 'vue'

const features = ref([
  {
    title: 'Biblioteca de Tarefas',
    description: 'Leitura da lei, questões, revisão, flash drills, vídeos e materiais — tarefas reutilizáveis em qualquer plano.',
    icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`
  },
  {
    title: 'Metas Personalizadas',
    description: 'Monte planos flexíveis combinando tarefas conforme o objetivo de cada aluno e o cronograma da preparação.',
    icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="8"/><circle cx="10" cy="10" r="3"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="10" y1="16" x2="10" y2="18"/><line x1="2" y1="10" x2="4" y2="10"/><line x1="16" y1="10" x2="18" y2="10"/></svg>`
  },
  {
    title: 'Planejamento Visual',
    description: 'Organização intuitiva das metas com arrastar e soltar — simples para o mentor, claro para o aluno.',
    icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="3" y="13" width="7" height="7"/><rect x="13" y="3" width="7" height="7"/><rect x="13" y="13" width="7" height="7"/></svg>`
  },
  {
    title: 'Acompanhamento de Progresso',
    description: 'Visualize tarefas concluídas, tempo investido e evolução do aluno de forma clara e em tempo real.',
    icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`
  },
  {
    title: 'Mapa de Domínio',
    description: 'Visualize artigo por artigo quais já foram dominados e quais precisam de reforço — sem achismos.',
    icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>`
  },
  {
    title: 'Análise de Erros',
    description: 'Identifique padrões de erro em questões para orientar revisões direcionadas e eliminar pontos frágeis.',
    icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`
  },
])

const stats = ref([
  { value: '6', label: 'Módulos de estudo' },
  { value: '100%', label: 'Focado em legislação' },
  { value: '∞', label: 'Metas personalizáveis' },
  { value: '1', label: 'Objetivo: aprovação' },
])

const progressBars = ref([
  { label: 'Direito Constitucional', pct: 78, color: '#534AB7' },
  { label: 'Direito Administrativo',  pct: 55, color: '#7C6FD4' },
  { label: 'Direito Penal',           pct: 42, color: '#a5b4fc' },
  { label: 'Legislação Especial',     pct: 30, color: '#c7d2fe' },
])
</script>

<style scoped>
/* ── Base ────────────────────────────────────────────────── */
.about {
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 28px 80px;
  font-family: 'DM Sans', sans-serif;
}

/* ── HERO ────────────────────────────────────────────────── */
.hero {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 32px;
  align-items: center;
  padding: 56px 0 52px;
  border-bottom: 1px solid #ebe9e4;
  margin-bottom: 60px;
}

@media (max-width: 680px) {
  .hero {
    grid-template-columns: 1fr;
  }
  .hero__visual { display: none; }
}

.hero__badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #534AB7;
  background: #EEEDFE;
  padding: 5px 14px;
  border-radius: 20px;
  margin-bottom: 22px;
}

.hero__title {
  font-size: clamp(2rem, 4.5vw, 3rem);
  font-weight: 800;
  color: #1a1a2e;
  letter-spacing: -0.035em;
  line-height: 1.15;
  margin-bottom: 18px;
}

.hero__title-accent {
  color: #534AB7;
}

.hero__tagline {
  font-size: 1rem;
  color: #666;
  line-height: 1.75;
  max-width: 440px;
}

.hero__tagline strong {
  color: #1a1a2e;
  font-weight: 600;
}

/* Hero Visual */
.hero__visual {
  position: relative;
  width: 200px;
  height: 200px;
  flex-shrink: 0;
}

.hero__scales {
  width: 200px;
  height: 200px;
  animation: float 6s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-8px); }
}

.hero__pill {
  position: absolute;
  background: #fff;
  border: 1px solid #ebe9e4;
  border-radius: 24px;
  padding: 4px 10px;
  display: flex;
  align-items: baseline;
  gap: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  animation: float 6s ease-in-out infinite;
}

.hero__pill--1 { top: 10px;  right: -10px; animation-delay: -1s; }
.hero__pill--2 { bottom: 30px; left: -20px; animation-delay: -3s; }
.hero__pill--3 { bottom: 10px; right: -10px; animation-delay: -2s; }

.hero__pill-value {
  font-size: 14px;
  font-weight: 800;
  color: #534AB7;
}

.hero__pill-label {
  font-size: 10px;
  color: #888;
  font-weight: 500;
}

/* ── Sections ────────────────────────────────────────────── */
.section {
  padding: 52px 0;
  border-bottom: 1px solid #ebe9e4;
}

.section--alt {
  background: transparent;
}

.section__label-row {
  margin-bottom: 6px;
}

.section__label {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #999;
}

.section__title {
  font-size: clamp(1.3rem, 2.5vw, 1.65rem);
  font-weight: 700;
  color: #1a1a2e;
  letter-spacing: -0.025em;
  line-height: 1.3;
  margin-bottom: 36px;
}

/* ── FLOW ────────────────────────────────────────────────── */
.flow {
  display: flex;
  align-items: flex-start;
  gap: 0;
}

@media (max-width: 720px) {
  .flow {
    flex-direction: column;
  }
  .flow__connector {
    transform: rotate(90deg);
    margin: 4px auto;
  }
}

.flow__step {
  flex: 1;
  background: #fff;
  border: 1px solid #ebe9e4;
  border-radius: 14px;
  padding: 24px 20px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.flow__step:hover {
  border-color: #AFA9EC;
  box-shadow: 0 4px 20px rgba(83, 74, 183, 0.08);
}

.flow__connector {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  margin-top: 40px;
  flex-shrink: 0;
}

.flow__connector svg {
  width: 48px;
  height: 12px;
}

.flow__icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}

.flow__icon svg {
  width: 20px;
  height: 20px;
}

.flow__icon--1 { background: #EEEDFE; color: #534AB7; }
.flow__icon--2 { background: #EEF2FF; color: #4F46E5; }
.flow__icon--3 { background: #F0FDF4; color: #16A34A; }

.flow__num {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: #c7c2f0;
  margin-bottom: 6px;
}

.flow__title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #1a1a2e;
  margin-bottom: 8px;
  line-height: 1.4;
}

.flow__desc {
  font-size: 0.875rem;
  color: #777;
  line-height: 1.65;
  margin: 0;
}

/* ── AUDIENCE ────────────────────────────────────────────── */
.audience {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.audience__card {
  border-radius: 16px;
  padding: 30px 28px;
  border: 1px solid transparent;
  transition: transform 0.2s;
}

.audience__card:hover {
  transform: translateY(-3px);
}

.audience__card--mentor {
  background: #1a1a2e;
  color: #fff;
  border-color: transparent;
}

.audience__card--student {
  background: #fff;
  border-color: #ebe9e4;
}

.audience__icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.audience__icon svg {
  width: 22px;
  height: 22px;
}

.audience__card--mentor .audience__icon {
  background: rgba(165, 180, 252, 0.15);
  color: #a5b4fc;
}

.audience__card--student .audience__icon {
  background: #EEEDFE;
  color: #534AB7;
}

.audience__title {
  font-size: 1.15rem;
  font-weight: 700;
  margin-bottom: 10px;
  letter-spacing: -0.02em;
}

.audience__card--mentor .audience__title { color: #fff; }
.audience__card--student .audience__title { color: #1a1a2e; }

.audience__desc {
  font-size: 0.9rem;
  line-height: 1.7;
  margin-bottom: 18px;
}

.audience__card--mentor .audience__desc { color: rgba(255,255,255,0.6); }
.audience__card--student .audience__desc { color: #666; }

.audience__list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.audience__list li {
  font-size: 0.85rem;
  font-weight: 500;
  padding-left: 18px;
  position: relative;
}

.audience__list li::before {
  content: '§';
  position: absolute;
  left: 0;
  font-weight: 700;
}

.audience__card--mentor .audience__list li { color: rgba(255,255,255,0.75); }
.audience__card--mentor .audience__list li::before { color: #a5b4fc; }
.audience__card--student .audience__list li { color: #555; }
.audience__card--student .audience__list li::before { color: #534AB7; }

/* ── FEATURES GRID ───────────────────────────────────────── */
.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(270px, 1fr));
  gap: 14px;
}

.feature-card {
  background: #fff;
  border: 1px solid #ebe9e4;
  border-radius: 14px;
  padding: 22px 20px;
  transition: border-color 0.2s, transform 0.2s;
}

.feature-card:hover {
  border-color: #AFA9EC;
  transform: translateY(-2px);
}

.feature-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.feature-card__num {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: #c7c2f0;
}

.feature-card__icon {
  width: 32px;
  height: 32px;
  background: #EEEDFE;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #534AB7;
}

.feature-card__icon :deep(svg) {
  width: 16px;
  height: 16px;
}

.feature-card__title {
  font-size: 0.92rem;
  font-weight: 700;
  color: #1a1a2e;
  margin-bottom: 7px;
  line-height: 1.4;
}

.feature-card__desc {
  font-size: 0.845rem;
  color: #777;
  line-height: 1.65;
  margin: 0;
}

/* ── STATS BAND ──────────────────────────────────────────── */
.stats-band {
  background: #1a1a2e;
  border-radius: 20px;
  margin: 0 0 0 0;
  padding: 36px 40px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 28px;
  position: relative;
  overflow: hidden;
}

.stats-band::before {
  content: '⚖';
  position: absolute;
  right: 32px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 80px;
  opacity: 0.04;
  pointer-events: none;
}

.stats-band__item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.stats-band__value {
  font-size: 2.2rem;
  font-weight: 800;
  color: #a5b4fc;
  letter-spacing: -0.04em;
  line-height: 1;
}

.stats-band__label {
  font-size: 0.75rem;
  color: rgba(255,255,255,0.4);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

/* ── IMPACTO ─────────────────────────────────────────────── */
.impact {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 52px;
  align-items: start;
}

@media (max-width: 720px) {
  .impact { grid-template-columns: 1fr; }
}

.impact__content p {
  font-size: 0.95rem;
  color: #555;
  line-height: 1.8;
  margin-bottom: 14px;
}

.impact__content strong {
  color: #1a1a2e;
  font-weight: 600;
}

.impact__quote {
  margin-top: 24px;
  padding: 16px 20px;
  border-left: 3px solid #534AB7;
  background: #f4f3ff;
  border-radius: 0 10px 10px 0;
  font-size: 0.9rem;
  color: #3C3489;
  line-height: 1.65;
  font-style: italic;
}

/* Progress visualization */
.progress-viz {
  background: #fff;
  border: 1px solid #ebe9e4;
  border-radius: 16px;
  padding: 22px 20px;
}

.progress-viz__title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #999;
  margin-bottom: 16px;
}

.progress-viz__row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 11px;
}

.progress-viz__row:last-child {
  margin-bottom: 0;
}

.progress-viz__label {
  font-size: 11px;
  color: #666;
  width: 130px;
  flex-shrink: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.progress-viz__bar {
  flex: 1;
  height: 6px;
  background: #f0eff8;
  border-radius: 99px;
  overflow: hidden;
}

.progress-viz__fill {
  height: 100%;
  border-radius: 99px;
  transition: width 1s ease;
}

.progress-viz__pct {
  font-size: 11px;
  font-weight: 700;
  color: #534AB7;
  width: 32px;
  text-align: right;
  flex-shrink: 0;
}
</style>
