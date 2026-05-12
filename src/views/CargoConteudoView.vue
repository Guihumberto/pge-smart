<template>
  <div class="conteudo-view" style="font-family: 'DM Sans', sans-serif;">

    <!-- Header -->
    <div class="conteudo-view__header">
      <button class="btn-ghost" @click="router.push(`/editais/${editalId}/cargos`)">
        <ChevronLeft :size="16" /> Voltar
      </button>
      <div class="breadcrumb">
        <span class="breadcrumb__item" @click="router.push('/editais')">Editais</span>
        <ChevronRight :size="12" class="breadcrumb__sep" />
        <span class="breadcrumb__item" @click="router.push(`/editais/${editalId}/cargos`)">
          {{ edital?.nome || 'Edital' }}
        </span>
        <ChevronRight :size="12" class="breadcrumb__sep" />
        <span class="breadcrumb__current">{{ cargo?.nome || 'Cargo' }}</span>
      </div>
      <button
        v-if="!mounting && cargo"
        class="btn-imprimir"
        @click="router.push(`/editais/${editalId}/cargos/${cargoId}/imprimir`)"
        title="Visualizar e imprimir o edital verticalizado"
      >
        <Printer :size="14" />
        <span>Imprimir edital</span>
      </button>
    </div>

    <!-- Loading inicial — só esconde os estados, header continua acessível -->
    <div v-if="mounting" class="estado-loading">
      <div class="loading-card">
        <div class="loading-spinner-wrapper">
          <Loader2 :size="28" class="spin" />
        </div>
        <p class="loading-card__text">Carregando cargo...</p>
        <div class="loading-skeleton">
          <div class="skeleton-line skeleton-line--header" />
          <div class="skeleton-line skeleton-line--block" />
          <div class="skeleton-line skeleton-line--block" />
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- Estado 1 — Entrada do conteúdo bruto                     -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <div v-else-if="estado === 'entrada'" class="estado-entrada">
      <div class="section-header">
        <h2 class="section-title">Conteúdo Programático</h2>
        <p class="section-desc">Cole abaixo o conteúdo completo das disciplinas deste cargo conforme o edital.</p>
      </div>
      <textarea
        v-model="textoBruto"
        class="textarea-bruto"
        placeholder="Cole aqui o conteúdo programático do edital para este cargo..."
        rows="16"
        @input="onTextoBrutoChange"
      />
      <div class="action-bar">
        <button v-if="textoBruto.trim()" class="btn-ghost btn-ghost--danger" :disabled="processandoRegex" @click="limparConteudo">
          <Trash2 :size="14" /> Limpar
        </button>
        <button class="btn-primary" :disabled="!textoBruto.trim() || processandoRegex" @click="processarRegex">
          <Zap :size="14" /> {{ processandoRegex ? 'Processando...' : 'Processar Regex' }}
        </button>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- Estado 2 — Preview do regex                              -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <div v-else-if="estado === 'preview'" class="estado-preview">
      <div class="section-header">
        <h2 class="section-title">Preview da Segmentação</h2>
        <p class="section-desc">
          Revise as disciplinas detectadas. Itens marcados em
          <span class="highlight-demo">laranja</span> podem conter erros.
        </p>
      </div>

      <div class="preview-layout">
        <!-- Coluna esquerda: texto original com highlights -->
        <div class="preview-col preview-col--left">
          <h3 class="col-title">Texto Original</h3>
          <div class="texto-highlighted" v-html="textoHighlighted" />
        </div>

        <!-- Coluna direita: disciplinas segmentadas -->
        <div class="preview-col preview-col--right">
          <h3 class="col-title">
            Disciplinas Detectadas ({{ segmentacao.disciplinas.length }})
          </h3>

          <div
            v-for="(disc, idx) in segmentacao.disciplinas"
            :key="idx"
            class="disc-card"
            :class="{ 'disc-card--nao-identificado': disc.nome === '_NAO_IDENTIFICADO' }"
          >
            <div class="disc-card__header" @click="disc._aberto = !disc._aberto">
              <div class="disc-card__toggle">
                <ChevronDown :size="14" :class="{ 'rotated': !disc._aberto }" />
              </div>
              <input
                v-model="disc.nome"
                class="disc-card__name-input"
                @click.stop
                placeholder="Nome da disciplina"
              />
              <span v-if="disc._parseStatus === 'processando'" class="parse-status parse-status--processando">
                <Loader2 :size="12" class="spin" /> Processando...
              </span>
              <span v-else-if="disc._parseStatus === 'concluido'" class="parse-status parse-status--concluido">
                Concluído
              </span>
              <span v-else-if="disc._parseStatus === 'erro'" class="parse-status parse-status--erro" :title="disc._parseErro">
                Erro — {{ disc._parseErro || 'ver console' }}
              </span>
              <span class="char-count" :class="{ 'char-count--warn': disc.texto.length > 18000, 'char-count--over': disc.texto.length > 20000 }">
                {{ (disc.texto.length / 1000).toFixed(1) }}k / 20k
              </span>
              <span v-if="disc.anomalias.length" class="anomaly-count">
                {{ disc.anomalias.length }} alerta(s)
              </span>
              <button class="icon-btn icon-btn--sm" title="Remover disciplina" @click.stop="removeDisciplina(idx)">
                <Trash2 :size="12" />
              </button>
            </div>

            <div v-if="disc._aberto" class="disc-card__body">
              <div v-if="disc.anomalias.length" class="anomalias-list">
                <div v-for="(a, ai) in disc.anomalias" :key="ai" class="anomalia-item">
                  <AlertTriangle :size="12" />
                  <span>{{ a.mensagem }}</span>
                </div>
              </div>
              <textarea
                v-model="disc.texto"
                class="disc-card__textarea"
                rows="6"
              />
            </div>
          </div>

          <button class="btn-outline btn-outline--full" @click="adicionarDisciplina">
            <Plus :size="14" /> Adicionar disciplina manualmente
          </button>
        </div>
      </div>

      <!-- Barra de ações -->
      <div class="action-bar">
        <button class="btn-ghost" :disabled="parseLoading" @click="estado = 'entrada'">
          <ChevronLeft :size="14" /> Voltar ao texto
        </button>
        <div class="action-bar__right">
          <!-- Seleção -->
          <div class="disc-select">
            <button class="disc-select__toggle" :disabled="parseLoading" @click="toggleTodasDisciplinas">
              {{ todasSelecionadas ? 'Desmarcar todas' : 'Marcar todas' }}
            </button>
            <label
              v-for="(disc, idx) in segmentacao.disciplinas.filter(d => d.nome !== '_NAO_IDENTIFICADO')"
              :key="idx"
              class="disc-select__item"
            >
              <input type="checkbox" v-model="disc._selecionado" :disabled="parseLoading" />
              <span>{{ disc.nome }}</span>
            </label>
          </div>

          <!-- Progresso da fila -->
          <div v-if="parseLoading" class="fila-progresso">
            <div class="fila-progresso__bar">
              <div class="fila-progresso__fill" :style="{ width: parseProgressoPct + '%' }" />
            </div>
            <span class="fila-progresso__text">
              {{ parseProcessadas }}/{{ parseTotal }} — {{ parseAtualNome || '...' }}
            </span>
          </div>

          <button v-if="!parseLoading" class="btn-primary" :disabled="!algumaSelecionadaPreview" @click="enviarParaIA">
            <Zap :size="14" /> Enviar para IA ({{ qtdSelecionadasPreview }})
          </button>
          <button v-else class="btn-outline btn-outline--danger" @click="cancelarFilaParse">
            <X :size="14" /> Cancelar fila
          </button>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- Estado 3 — Resultado (árvore editável)                   -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <div v-else-if="estado === 'resultado'" class="estado-resultado">
      <div class="section-header">
        <h2 class="section-title">Conteúdo Estruturado</h2>
        <p class="section-desc">Revise e edite a estrutura antes de salvar.</p>
      </div>

      <!-- Painel de validação de completude -->
      <div class="validacao-panel" :class="`validacao-panel--${validacao.estado}`">
        <div class="validacao-header" @click="showValidacao = !showValidacao">
          <div class="validacao-resumo">
            <CheckCircle v-if="validacao.estado === 'ok'" :size="16" class="validacao-icon--ok" />
            <AlertTriangle v-else-if="validacao.estado === 'warn'" :size="16" class="validacao-icon--warn" />
            <Info v-else :size="16" class="validacao-icon--info" />
            <span class="validacao-titulo">
              {{ validacao.titulo }}
            </span>
            <span v-if="validacao.estado === 'warn'" class="validacao-badge">
              {{ validacao.faltando.length }} a verificar
            </span>
            <span v-else-if="validacao.estado === 'ok'" class="validacao-badge validacao-badge--ok">
              Tudo contemplado
            </span>
            <span v-else class="validacao-badge validacao-badge--info">
              Indeterminado
            </span>
          </div>
          <ChevronDown :size="14" :class="{ 'rotated': !showValidacao }" />
        </div>
        <div v-if="showValidacao" class="validacao-body">
          <p class="validacao-label">{{ validacao.descricao }}</p>
          <div v-if="validacao.faltando.length" class="validacao-faltando">
            <div v-for="(item, i) in validacao.faltando" :key="i" class="validacao-item validacao-item--missing">
              {{ item }}
            </div>
          </div>
        </div>
      </div>

      <!-- Botão expandir/recolher tudo -->
      <div class="tree-controls">
        <button class="btn-ghost" @click="toggleTreeAll(true)">
          <ChevronsDownUp :size="14" /> Expandir tudo
        </button>
        <button class="btn-ghost" @click="toggleTreeAll(false)">
          <ChevronsUpDown :size="14" /> Recolher tudo
        </button>
      </div>

      <div class="tree">
        <div v-for="(disc, di) in conteudoParseado.disciplinas" :key="di" class="tree__disc">
          <!-- Disciplina (clicável para expandir/recolher) -->
          <div class="tree__node tree__node--disc" @click="toggleDisc(di)">
            <ChevronDown :size="13" class="tree__toggle" :class="{ 'rotated': !treeState.discs[di] }" />
            <BookOpen :size="14" class="tree__icon tree__icon--disc" />
            <input v-model="disc.nome" class="tree__input tree__input--disc" @click.stop />
            <span class="tree__count">{{ disc.assuntos?.length || 0 }} assuntos</span>
            <button class="icon-btn icon-btn--sm" @click.stop="removeDisciplinaTree(di)">
              <Trash2 :size="11" />
            </button>
          </div>

          <!-- Assuntos (visível se disciplina aberta) -->
          <template v-if="treeState.discs[di]">
            <div v-for="(assunto, ai) in disc.assuntos" :key="ai" class="tree__assunto">
              <div class="tree__node tree__node--assunto" @click="toggleAssunto(di, ai)">
                <ChevronDown
                  v-if="assunto.sub_assuntos?.length"
                  :size="12"
                  class="tree__toggle"
                  :class="{ 'rotated': !treeState.assuntos[`${di}-${ai}`] }"
                />
                <span v-else class="tree__toggle-spacer" />
                <List :size="13" class="tree__icon tree__icon--assunto" />
                <input v-model="assunto.nome" class="tree__input" @click.stop />
                <button
                  class="icon-btn icon-btn--sm icon-btn--accent"
                  title="Transformar em disciplina"
                  @click.stop="promoverAssuntoADisciplina(di, ai)"
                >
                  <ArrowUpFromLine :size="11" />
                </button>
                <button class="icon-btn icon-btn--sm" @click.stop="removeAssuntoTree(di, ai)">
                  <Trash2 :size="11" />
                </button>
              </div>

              <!-- Fontes explícitas -->
              <div v-if="treeState.assuntos[`${di}-${ai}`] && assunto.fontes_explicitas?.length" class="tree__fontes">
                <span v-for="(f, fi) in assunto.fontes_explicitas" :key="fi" class="fonte-tag">
                  {{ f }}
                  <button class="fonte-tag__remove" @click="assunto.fontes_explicitas.splice(fi, 1)">×</button>
                </span>
              </div>

              <!-- Sub-assuntos (visível se assunto aberto) -->
              <template v-if="treeState.assuntos[`${di}-${ai}`]">
                <div v-for="(sub, si) in assunto.sub_assuntos" :key="si" class="tree__sub">
                  <div class="tree__node tree__node--sub">
                    <ListTree :size="12" class="tree__icon tree__icon--sub" />
                    <input v-model="sub.nome" class="tree__input tree__input--sm" @click.stop />
                    <button class="icon-btn icon-btn--sm" @click.stop="removeTreeNode(assunto.sub_assuntos, si)">
                      <Trash2 :size="11" />
                    </button>
                  </div>

                  <!-- Sub-sub-assuntos -->
                  <div v-if="sub.sub_sub_assuntos?.length" class="tree__subsub-list">
                    <div v-for="(ssub, ssi) in sub.sub_sub_assuntos" :key="ssi" class="tree__node tree__node--subsub">
                      <Circle :size="6" class="tree__icon tree__icon--subsub" />
                      <input v-model="sub.sub_sub_assuntos[ssi]" class="tree__input tree__input--xs" @click.stop />
                      <button class="icon-btn icon-btn--sm" @click.stop="sub.sub_sub_assuntos.splice(ssi, 1)">
                        <Trash2 :size="10" />
                      </button>
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </template>
        </div>
      </div>

      <!-- Seleção de disciplinas + Analisar -->
      <div class="action-section">
        <div class="action-section__header">
          <h3 class="action-section__title">Analisar Conteúdo</h3>
          <button class="disc-select__toggle" @click="toggleSelecaoResultado">
            {{ todasSelecionadasResultado ? 'Desmarcar todas' : 'Marcar todas' }}
          </button>
        </div>
        <p class="action-section__desc">
          Selecione disciplinas para classificar fontes e priorizar com base nas estatísticas históricas.
        </p>
        <div class="disc-select">
          <label
            v-for="(disc, idx) in conteudoParseado.disciplinas"
            :key="idx"
            class="disc-select__item"
            :class="{ 'disc-select__item--done': disc._analiseStatus === 'concluido', 'disc-select__item--erro': disc._analiseStatus === 'erro' }"
          >
            <input type="checkbox" v-model="disc._selecionado" :disabled="analisando" />
            <span>{{ disc.nome }}</span>
            <Loader2 v-if="disc._analiseStatus === 'processando'" :size="12" class="spin" />
            <CheckCircle v-else-if="disc._analiseStatus === 'concluido'" :size="12" class="analise-ok" />
            <AlertTriangle v-else-if="disc._analiseStatus === 'erro'" :size="12" class="analise-err" />
            <span v-if="disc._analiseStatus === 'processando'" class="disc-select__fase">
              {{ disc._analiseFase || '' }}
            </span>
          </label>
        </div>
        <!-- Progresso da fila -->
        <div v-if="analisando" class="fila-progresso">
          <div class="fila-progresso__bar">
            <div class="fila-progresso__fill" :style="{ width: filaProgressoPct + '%' }" />
          </div>
          <span class="fila-progresso__text">{{ filaProcessadas }}/{{ filaTotalSelecionadas }} disciplinas</span>
        </div>
        <div class="action-buttons">
          <button class="btn-primary btn-primary--accent" :disabled="analisando || !algumaSelecionadaResultado" @click="iniciarAnalise">
            <Zap :size="14" />
            <template v-if="!analisando">Analisar ({{ discsSelecionadas().length }})</template>
            <template v-else>
              <Loader2 :size="14" class="spin" /> Processando fila...
            </template>
          </button>
        </div>
      </div>

      <!-- Ações -->
      <div class="action-bar">
        <button class="btn-ghost" @click="estado = 'preview'">
          <ChevronLeft :size="14" /> Voltar ao preview
        </button>
        <div class="action-bar__right">
          <button class="btn-primary" :disabled="salvando" @click="salvarConteudo">
            <Save :size="14" /> {{ salvando ? 'Salvando...' : 'Salvar conteúdo' }}
          </button>
          <button v-if="cargo?.priorizacao?.disciplinas?.length" class="btn-outline" @click="estado = 'priorizacao'; initPrioState()">
            Ver priorização
          </button>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- Estado 4 — Priorização                                   -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <div v-else-if="estado === 'priorizacao'" class="estado-priorizacao">
      <!-- Banner A: recálculo em andamento -->
      <div v-if="modoAnalise === 'tudo'" class="prio-banner-legacy">
        <AlertTriangle :size="16" />
        <div class="prio-banner-legacy__body">
          <strong>Recalculando priorização disciplina por disciplina...</strong>
          <div v-if="filaTotalSelecionadas" class="fila-progresso">
            <div class="fila-progresso__bar">
              <div class="fila-progresso__fill" :style="{ width: filaProgressoPct + '%' }" />
            </div>
            <span class="fila-progresso__text">{{ filaProcessadas }}/{{ filaTotalSelecionadas }} disciplinas</span>
          </div>
          <ul class="recalc-fases">
            <li
              v-for="d in disciplinasLegadas"
              :key="d.nome"
              :class="`recalc-fases__item recalc-fases__item--${d._analiseStatus || 'aguardando'}`"
            >
              <span class="recalc-fases__icon">
                <span v-if="!d._analiseStatus || d._analiseStatus === 'aguardando'">○</span>
                <span v-else-if="d._analiseStatus === 'processando'" class="recalc-fases__spin">◐</span>
                <span v-else-if="d._analiseStatus === 'concluido'">✓</span>
                <span v-else-if="d._analiseStatus === 'erro'">✗</span>
              </span>
              <span class="recalc-fases__nome">{{ d.nome }}</span>
              <span v-if="d._analiseFase" class="recalc-fases__detalhe">— {{ d._analiseFase }}</span>
            </li>
          </ul>
        </div>
        <button class="btn-outline btn-outline--sm" disabled>Recalculando...</button>
      </div>

      <!-- Banner B: legadas ainda não recalculadas (primeira vez) -->
      <div v-else-if="temDisciplinaLegada && !recalculoJaRealizado" class="prio-banner-legacy">
        <AlertTriangle :size="16" />
        <div class="prio-banner-legacy__body">
          <strong>{{ disciplinasLegadas.length }} {{ disciplinasLegadas.length === 1 ? 'disciplina analisada' : 'disciplinas analisadas' }} com versão anterior.</strong>
          <p>Recalcule para usar métricas determinísticas (presença, peso médio, tendência sobre o histórico importado).</p>
          <div class="recalc-legadas-list">
            <span v-for="d in disciplinasLegadas" :key="d.nome" class="recalc-legada-tag">{{ d.nome }}</span>
          </div>
        </div>
        <button class="btn-outline btn-outline--sm" @click="recalcularTudoPR6">
          Recalcular ({{ disciplinasLegadas.length }})
        </button>
      </div>

      <!-- Banner C: recálculo já tentado mas disciplinas ainda sem histórico -->
      <div v-else-if="temDisciplinaLegada && recalculoJaRealizado && !bannerSemMatchOculto" class="prio-banner-legacy prio-banner-legacy--info">
        <Info :size="16" />
        <div class="prio-banner-legacy__body">
          <strong>{{ disciplinasLegadas.length }} {{ disciplinasLegadas.length === 1 ? 'disciplina sem' : 'disciplinas sem' }} correspondência no histórico.</strong>
          <p>Não foram encontrados dados estatísticos importados para {{ disciplinasLegadas.length === 1 ? 'esta disciplina' : 'estas disciplinas' }}. Importe mais estatísticas na tela de Estatísticas e use "Reanalisar".</p>
          <div class="recalc-legadas-list">
            <span v-for="d in disciplinasLegadas" :key="d.nome" class="recalc-legada-tag recalc-legada-tag--sem-match">{{ d.nome }}</span>
          </div>
        </div>
        <div class="prio-banner-legacy__actions">
          <button class="btn-ghost btn-ghost--sm" @click="ocultarBannerSemMatch">Entendi, ocultar</button>
          <button class="btn-ghost btn-ghost--sm" style="opacity:0.6; font-size:11px;" @click="resetarFlagRecalculo">Tentar novamente</button>
        </div>
      </div>

      <!-- Aviso de fonte da cascata — §6.5 (D14): quando majoritária ≠ nível 1 ou há mistura -->
      <div v-if="avisoFonteCascata" class="prio-banner-fonte" :class="`prio-banner-fonte--${avisoFonteCascata.severidade}`">
        <Info :size="14" />
        <div class="prio-banner-fonte__body">
          <strong>{{ avisoFonteCascata.titulo }}</strong>
          <p>{{ avisoFonteCascata.detalhe }}</p>
        </div>
      </div>

      <div class="section-header section-header--row">
        <div>
          <h2 class="section-title">Priorização do Conteúdo</h2>
          <p class="section-desc">Scores baseados no histórico de questões importado.</p>

          <!-- Contexto da análise: banca + área usadas pelo backend -->
          <div class="prio-contexto">
            <span class="prio-contexto__item">
              <span class="prio-contexto__label">Banca:</span>
              <strong>{{ priorizacaoMeta?.bancaAlvo || edital?.banca || '—' }}</strong>
              <span v-if="!priorizacaoMeta && edital?.banca" class="prio-contexto__hint">(do edital)</span>
            </span>
            <span class="prio-contexto__sep">·</span>
            <span class="prio-contexto__item">
              <span class="prio-contexto__label">Área:</span>
              <strong>{{ priorizacaoMeta?.areaAlvo || cargo?.area || '—' }}</strong>
              <span v-if="!priorizacaoMeta && cargo?.area" class="prio-contexto__hint">(do cargo)</span>
            </span>
            <template v-if="priorizacaoMeta">
              <span class="prio-contexto__sep">·</span>
              <span class="prio-contexto__item" :class="{ 'prio-contexto__item--warn': priorizacaoMeta.qtdAnosBancaAlvo === 0 }">
                <template v-if="priorizacaoMeta.qtdAnosBancaAlvo > 0">
                  <strong>{{ priorizacaoMeta.qtdAnosBancaAlvo }}</strong>
                  {{ priorizacaoMeta.qtdAnosBancaAlvo === 1 ? 'ano com dados' : 'anos com dados' }}
                </template>
                <template v-else>
                  <AlertTriangle :size="12" /> nenhum dado importado para esta banca/área
                </template>
              </span>
              <template v-if="coberturaMatchMedia != null && coberturaMatchMedia < 1">
                <span class="prio-contexto__sep">·</span>
                <span class="prio-contexto__item">cobertura {{ (coberturaMatchMedia * 100).toFixed(0) }}%</span>
              </template>
            </template>
            <template v-else>
              <span class="prio-contexto__sep">·</span>
              <span class="prio-contexto__item prio-contexto__item--muted">análise ainda não executada</span>
            </template>
          </div>

          <!-- Alerta: banca/área configurada mas zero provas encontradas -->
          <div
            v-if="priorizacaoMeta && priorizacaoMeta.qtdAnosBancaAlvo === 0 && (edital?.banca || cargo?.area)"
            class="prio-contexto-alerta"
          >
            <AlertTriangle :size="13" />
            O backend não encontrou estatísticas para <strong>{{ priorizacaoMeta.bancaAlvo || edital?.banca }}</strong> / <strong>{{ priorizacaoMeta.areaAlvo || cargo?.area }}</strong>.
            Verifique se banca e área das <router-link to="/estatisticas" class="prio-link">estatísticas importadas</router-link> correspondem exatamente às do edital/cargo.
          </div>
        </div>
        <div
          class="toggle-relevancia"
          :class="{ 'toggle-relevancia--disabled': todosScoresNull }"
          :title="tooltipToggleOrdenacao"
        >
          <input
            id="toggle-relevancia"
            type="checkbox"
            v-model="ordenarPorRelevancia"
            :disabled="todosScoresNull"
          />
          <label for="toggle-relevancia">
            Ordenar por relevância
            <span v-if="todosScoresNull" class="toggle-relevancia__hint">(sem dados históricos)</span>
          </label>
        </div>
      </div>

      <!-- Resumo geral -->
      <div class="prio-resumo-grid">
        <div class="prio-resumo-card">
          <span class="prio-resumo-val">{{ totalHoras }}h</span>
          <span class="prio-resumo-label">Carga total estimada</span>
        </div>
        <div class="prio-resumo-card">
          <span class="prio-resumo-val">{{ totalSemanas }}sem</span>
          <span class="prio-resumo-label">Semanas sugeridas</span>
        </div>
        <div class="prio-resumo-card">
          <span class="prio-resumo-val">{{ semanasDisponiveisCalc || '—' }}sem</span>
          <span class="prio-resumo-label">Semanas disponíveis</span>
        </div>
        <div class="prio-resumo-card">
          <span class="prio-resumo-val">{{ priorizacaoData.disciplinas?.length || 0 }}</span>
          <span class="prio-resumo-label">Disciplinas</span>
        </div>
      </div>

      <!-- Prova já realizada — plano serve como guia/histórico -->
      <div v-if="provaPassada && !reorganizacaoHabilitada" class="reorg-alerta reorg-alerta--passed">
        <Clock :size="16" />
        <div class="reorg-alerta__body">
          <strong>Prova já realizada.</strong>
          <p>Informe uma data base para continuar reorganizando o plano.</p>
        </div>
        <div class="reorg-field reorg-field--inline">
          <label>Data base</label>
          <input v-model="reorgConfig.dataBase" type="date" :min="hoje" />
        </div>
      </div>
      <!-- Banner de alerta quando semanas excedem -->
      <div v-else-if="temAlertaSemanas" class="reorg-alerta reorg-alerta--danger">
        <AlertTriangle :size="16" />
        <div>
          <strong>O plano precisa de {{ totalSemanas }} semanas, mas há apenas {{ semanasDisponiveisCalc }} disponíveis.</strong>
          <p>Ajuste as horas de estudo, corte assuntos de baixa prioridade ou reduza semanas de revisão.</p>
        </div>
        <button class="btn-outline btn-outline--sm" @click="showReorganizar = !showReorganizar">
          {{ showReorganizar ? 'Fechar' : 'Reorganizar' }}
        </button>
      </div>
      <div v-else-if="semanasDisponiveisCalc" class="reorg-alerta reorg-alerta--ok">
        <CheckCircle :size="16" />
        <span>Plano cabe no tempo disponível ({{ totalSemanas }}/{{ semanasDisponiveisCalc }} semanas).</span>
        <button class="btn-ghost btn-ghost--sm" @click="showReorganizar = !showReorganizar">Ajustar</button>
      </div>

      <!-- Painel de reorganização -->
      <div v-if="showReorganizar && reorganizacaoHabilitada" class="reorg-panel">
        <div v-if="provaPassada && reorganizacaoHabilitada" class="reorg-info-aviso">
          <Info :size="14" />
          <span>Prova já realizada — usando data base alternativa como referência.</span>
        </div>
        <h3 class="reorg-panel__title">Configuração</h3>
        <div class="reorg-config">
          <div class="reorg-field">
            <label>Horas/dia</label>
            <input v-model.number="reorgConfig.horasPorDia" type="number" min="1" max="10" step="0.5" />
          </div>
          <div class="reorg-field">
            <label>Dias/semana</label>
            <input v-model.number="reorgConfig.diasPorSemana" type="number" min="1" max="7" />
          </div>
          <div class="reorg-field">
            <label>Sem. revisão</label>
            <input v-model.number="reorgConfig.semanasRevisao" type="number" min="0" max="6" />
          </div>
          <div class="reorg-field">
            <label>Data base</label>
            <input v-model="reorgConfig.dataBase" type="date" :min="hoje" />
          </div>
          <button class="btn-primary" :disabled="reorganizando" @click="calcularOpcoes">
            {{ reorganizando ? 'Calculando...' : 'Calcular opções' }}
          </button>
        </div>

        <!-- Diagnóstico -->
        <div v-if="reorgResult?.diagnostico" class="reorg-diag">
          <span>Total: <strong>{{ reorgResult.diagnostico.totalHoras.toFixed(0) }}h</strong></span>
          <span>Disponível: <strong>{{ reorgResult.diagnostico.horasDisponiveis }}h</strong></span>
          <span v-if="reorgResult.diagnostico.temDeficit" class="reorg-diag--deficit">
            Déficit: <strong>{{ reorgResult.diagnostico.deficit.toFixed(0) }}h</strong>
          </span>
          <span v-if="reorgResult.diagnostico.assuntosCobertos" class="reorg-diag--cobertos">
            {{ reorgResult.diagnostico.assuntosCobertos }} já concluídos excluídos
          </span>
          <span v-if="labelIntensidade" :class="['reorg-label-intensidade', labelIntensidade.classe]">
            {{ labelIntensidade.texto }}
          </span>
        </div>

        <!-- Opções -->
        <div v-if="reorgResult?.opcoes?.length" class="reorg-opcoes">
          <div
            v-for="(opcao, i) in reorgResult.opcoes"
            :key="i"
            class="reorg-opcao"
            :class="{
              'reorg-opcao--selected': reorgOpcaoSelecionada === opcao.tipo,
              'reorg-opcao--ok': opcao.tipo === 'ok',
              'reorg-opcao--a': opcao.tipo === 'aumentar_horas',
              'reorg-opcao--b': opcao.tipo === 'cortar_conteudo',
              'reorg-opcao--c': opcao.tipo === 'reduzir_revisao',
            }"
            @click="reorgOpcaoSelecionada = opcao.tipo"
          >
            <div class="reorg-opcao__header">
              <input type="radio" :checked="reorgOpcaoSelecionada === opcao.tipo" />
              <span class="reorg-opcao__titulo">{{ opcao.descricao }}</span>
            </div>
            <div class="reorg-opcao__body">
              <span>{{ opcao.assuntosMantidos }} assuntos · {{ opcao.totalSemanas }} semanas</span>
              <div v-if="opcao.assuntosCortados?.length" class="reorg-cortados">
                <p class="reorg-cortados__label">Assuntos cortados:</p>
                <div v-for="(c, ci) in opcao.assuntosCortados" :key="ci" class="reorg-cortado-item">
                  <span class="reorg-cortado-nome">
                    {{ c.disciplina }} → {{ c.assunto }}
                    <span
                      v-if="c.temNorma"
                      class="reorg-cortado-badge"
                      aria-label="Tem legislação vinculada pelo mentor"
                      title="Tem legislação vinculada pelo mentor"
                    >
                      <Link2 :size="10" aria-hidden="true" /> norma vinculada
                    </span>
                  </span>
                  <span class="reorg-cortado-score">
                    {{ c.score == null ? 'sem match' : `score ${(c.score * 100).toFixed(0)}` }} ·
                    <span v-if="c.peso && c.peso !== 1">
                      {{ c.cargaBase }}h × {{ c.peso }} = {{ c.carga }}h
                    </span>
                    <span v-else>{{ c.carga }}h</span>
                  </span>
                </div>
              </div>
              <div v-if="opcao.cortadosComNorma > 0" class="reorg-aviso reorg-aviso--norma">
                <AlertTriangle :size="12" aria-hidden="true" />
                {{ opcao.cortadosComNorma === 1
                  ? '1 assunto acima tem legislação vinculada pelo mentor'
                  : `${opcao.cortadosComNorma} assuntos acima têm legislação vinculada pelo mentor` }}
                — revise antes de aplicar.
              </div>
              <div v-if="opcao.aviso" class="reorg-aviso">
                <AlertTriangle :size="12" aria-hidden="true" />
                {{ opcao.aviso }}
              </div>
            </div>
          </div>
        </div>

        <!-- Aplicar -->
        <div v-if="reorgResult?.diagnostico" class="reorg-actions">
          <button class="btn-ghost" @click="showReorganizar = false; reorgResult = null">Cancelar</button>
          <button
            class="btn-primary btn-primary--accent"
            :disabled="!reorgOpcaoSelecionada || aplicandoReorg"
            @click="aplicarReorganizacao"
          >
            {{ aplicandoReorg ? 'Aplicando...' : 'Aplicar reorganização' }}
          </button>
        </div>
      </div>

      <!-- Disciplinas com scores -->
      <div class="prio-list">
        <div v-for="disc in disciplinasOrdenadas" :key="disc.nome" class="prio-disc">
          <div class="prio-disc__header" @click="prioState.discs[disc.nome] = !prioState.discs[disc.nome]">
            <ChevronDown :size="13" class="tree__toggle" :class="{ 'rotated': !prioState.discs[disc.nome] }" />
            <span class="prio-disc__nome">{{ disc.nome }}</span>
            <!-- Badges informativos: @click.stop impede que o click neles abra/feche o dropdown -->
            <div class="prio-disc__badges" @click.stop>
              <span class="prio-score" :class="scoreClass(disc.score)" :title="tooltipScore(disc)">
                {{ disc.score != null ? (disc.score * 100).toFixed(0) : '—' }}
              </span>
              <!-- Badge "Disciplina sem match" (D16): aparece quando IA não achou equivalente -->
              <span
                v-if="disc.metricas?.sem_match"
                class="prio-badge-quality prio-badge-quality--no-match"
                title="Disciplina não tem equivalente no histórico desta cascata. Todos os assuntos sem score."
              >Disc. sem match</span>
              <span
                v-if="disc.tendencia"
                class="prio-trend"
                :class="trendClass(disc.tendencia)"
                :title="`Tendência: ${disc.tendencia}`"
              >
                <TrendingUp v-if="disc.tendencia === 'crescente'" :size="12" />
                <Minus v-else-if="disc.tendencia === 'estavel'" :size="12" />
                <TrendingDown v-else :size="12" />
              </span>
              <!-- PR7: Recência da disciplina (D27a/D28). Oculta em cargos legados (sem o campo) e em universo degenerado (total=0) -->
              <span
                v-if="disc.metricas?.recencia_anos_total"
                class="prio-recencia"
                :class="recenciaClass(disc.metricas.recencia)"
                :title="tooltipRecencia(disc.metricas)"
              >R:{{ formatRecencia(disc.metricas) }}</span>
              <span v-for="t in disc.tipo_fonte || []" :key="t" class="prio-tipo" :class="`tipo--${t}`">{{ tipoLabel(t) }}</span>
              <select
                v-model.number="disc._peso"
                class="peso-select"
                @click.stop
                @change="onPesoChange"
                title="Multiplicador de carga"
              >
                <option :value="0.5">0.5x</option>
                <option :value="0.8">0.8x</option>
                <option :value="1">1x</option>
                <option :value="1.2">1.2x</option>
                <option :value="1.5">1.5x</option>
                <option :value="2">2x</option>
                <option :value="2.5">2.5x</option>
              </select>
              <span v-if="disc.carga_estimada_horas" class="prio-carga">
                {{ cargaComPeso(disc) }}h
              </span>
              <span v-if="disc.sugestao_semana" class="prio-semana">Sem {{ disc.sugestao_semana }}</span>
              <button
                v-if="disc.assuntos?.some(a => !a.cortado)"
                class="prio-disc__btn-gerar"
                title="Criar tarefas a partir desta priorização"
                @click.stop="abrirGeradorTasks(disc)"
              >
                <ListPlus :size="11" /> Criar tarefas
              </button>
            </div>
          </div>

          <template v-if="prioState.discs[disc.nome]">
            <!-- P3-2: cobertura individual da disciplina (§6.5) — só quando faz sentido (PR6 com cobertura < 100%) -->
            <div
              v-if="disc.metricas?.cobertura_match != null && disc.metricas.cobertura_match < 1"
              class="prio-disc__cobertura"
              :title="`${disc.assuntos?.filter(a => a.metricas).length || 0} de ${disc.assuntos?.length || 0} assuntos com match histórico`"
            >
              <Info :size="11" />
              {{ (disc.metricas.cobertura_match * 100).toFixed(0) }}% dos assuntos com match histórico
            </div>
            <!-- Tabs: Assuntos | Legislação | Leis (únicas) + botão reanalisar -->
            <div class="prio-tabs">
              <button
                class="prio-tab"
                :class="{ 'prio-tab--active': (prioState.tabs[disc.nome] || 'assuntos') === 'assuntos' }"
                @click.stop="prioState.tabs[disc.nome] = 'assuntos'"
              >
                <List :size="12" /> Assuntos ({{ disc.assuntos?.length || 0 }})
              </button>
              <button
                class="prio-tab"
                :class="{ 'prio-tab--active': prioState.tabs[disc.nome] === 'legislacao' }"
                @click.stop="prioState.tabs[disc.nome] = 'legislacao'"
              >
                <BookOpen :size="12" /> Legislação ({{ legislacaoPorDisciplina(disc).length }})
              </button>
              <button
                class="prio-tab"
                :class="{ 'prio-tab--active': prioState.tabs[disc.nome] === 'leis' }"
                @click.stop="prioState.tabs[disc.nome] = 'leis'"
                :title="`${leisUnicasPorDisciplinaCached(disc).length} leis únicas (consolidação de ${legislacaoPorDisciplina(disc).length} ocorrências em assuntos)`"
              >
                <BookOpen :size="12" /> Leis ({{ leisUnicasPorDisciplinaCached(disc).length }})
              </button>
              <span class="prio-tabs__spacer" />
              <button
                class="prio-tab prio-tab--action"
                :disabled="modoAnalise === 'tudo' || disc._analiseStatus === 'processando'"
                @click.stop="reanalisarDisciplina(disc.nome)"
                :title="`Reanalisar (Fase 1 + Fase 2) apenas '${disc.nome}'`"
              >
                <span v-if="disc._analiseStatus === 'processando'" class="recalc-fases__spin">◐</span>
                <RefreshCw v-else :size="11" />
                {{ disc._analiseStatus === 'processando' ? 'Reanalisando...' : 'Reanalisar' }}
              </button>
            </div>

            <!-- Aba Assuntos -->
            <template v-if="(prioState.tabs[disc.nome] || 'assuntos') === 'assuntos'">
              <div v-for="ass in assuntosOrdenados(disc)" :key="ass.nome" class="prio-assunto">
                <div class="prio-assunto__row" @click="prioState.assuntos[assuntoKey(disc, ass)] = !prioState.assuntos[assuntoKey(disc, ass)]">
                  <ChevronDown
                    v-if="ass.sub_assuntos?.length"
                    :size="11" class="tree__toggle"
                    :class="{ 'rotated': !prioState.assuntos[assuntoKey(disc, ass)] }"
                  />
                  <span v-else class="tree__toggle-spacer" />
                  <span class="prio-assunto__nome">{{ ass.nome }}</span>
                  <div class="prio-assunto__badges" @click.stop>
                    <span class="prio-score prio-score--sm" :class="scoreClass(ass.score)" :title="tooltipScore(ass)">
                      {{ ass.score != null ? (ass.score * 100).toFixed(0) : '—' }}
                    </span>
                    <!-- Badge Presença (§6.1) — só com métricas PR6 -->
                    <span
                      v-if="ass.metricas && !ass.metricas.sem_match"
                      class="prio-presenca"
                      :title="tooltipPresenca(ass)"
                    >P:{{ ass.metricas.anos_que_cobraram }}/{{ ass.metricas.anos_com_prova }}</span>
                    <!-- PR7: Badge Recência. Null-guard: oculta em cargos pré-PR7 e em universo degenerado (total=0) -->
                    <span
                      v-if="ass.metricas?.recencia_anos_total"
                      class="prio-recencia"
                      :class="recenciaClass(ass.metricas.recencia)"
                      :title="tooltipRecencia(ass.metricas)"
                    >R:{{ formatRecencia(ass.metricas) }}</span>
                    <!-- Badges de qualidade (§6.4) — P3-1: oculta "Sem match" individual quando disc inteira sem_match (já há badge no header da disc) -->
                    <span
                      v-if="qualityBadge(ass) === 'no-match' && !disc.metricas?.sem_match"
                      class="prio-badge-quality prio-badge-quality--no-match"
                      title="IA não achou equivalente no histórico. Mentor pode revisar o mapeamento manualmente."
                    >Sem match</span>
                    <span
                      v-else-if="qualityBadge(ass) === 'never-covered'"
                      class="prio-badge-quality prio-badge-quality--rare"
                      title="Tema existe no histórico mas não aparece nos dados importados para esta banca/área. Score baixo até primeira ocorrência."
                    >Mapeado · nunca cobrado</span>
                    <span
                      v-else-if="qualityBadge(ass) === 'small-sample'"
                      class="prio-badge-quality prio-badge-quality--small"
                      title="Apenas 1 prova no universo cobrou este tema. Score volátil até consolidar mais histórico."
                    >Amostra pequena</span>
                    <span v-if="ass.tendencia" class="prio-trend prio-trend--sm" :class="trendClass(ass.tendencia)" :title="`Tendência: ${ass.tendencia}`">
                      {{ ass.tendencia }}
                    </span>
                    <span v-for="t in ass.tipo_fonte || []" :key="t" class="prio-tipo prio-tipo--sm" :class="`tipo--${t}`">{{ tipoLabel(t) }}</span>
                    <span v-if="ass.fonte" class="prio-fonte">{{ fonteLabel(ass.fonte) }}</span>
                    <span v-if="ass.carga_estimada_horas" class="prio-carga prio-carga--sm">{{ ass.carga_estimada_horas }}h</span>
                    <span v-if="ass.sugestao_semana" class="prio-semana prio-semana--sm">S{{ ass.sugestao_semana }}</span>
                  </div>
                </div>
                <!-- Detalhes do assunto -->
                <div class="prio-assunto__details">
                  <p v-if="ass.justificativa" class="prio-justificativa">{{ ass.justificativa }}</p>
                  <p v-if="ass.equivalente_historico && ass.equivalente_historico !== ass.nome" class="prio-equiv">
                    Equivalente: "{{ ass.equivalente_historico }}"
                  </p>
                  <div v-if="ass.leis_referencia?.length" class="prio-leis">
                    <span v-for="(lei, li) in ass.leis_referencia" :key="li" class="prio-lei-tag">{{ lei }}</span>
                  </div>
                  <!-- Métricas detalhadas (§6.3) — só PR6 com match -->
                  <details v-if="ass.metricas && !ass.metricas.sem_match" class="prio-metricas-detalhes">
                    <summary>Métricas detalhadas</summary>
                    <div class="prio-metricas-detalhes__grid">
                      <span>Presente em {{ ass.metricas.anos_que_cobraram }} de {{ ass.metricas.anos_com_prova }} anos importados</span>
                      <!-- PR7: Recência (cobertura nos últimos 3 do universo) — oculta em legados / universo degenerado -->
                      <span v-if="ass.metricas.recencia_anos_total">
                        Recência: cobriu {{ ass.metricas.recencia_anos_cobertos }} dos {{ ass.metricas.recencia_anos_total }} anos mais recentes ({{ (ass.metricas.recencia * 100).toFixed(0) }}%)
                      </span>
                      <span>Peso médio: {{ ass.metricas.peso_medio.toFixed(1) }}% das questões por prova</span>
                      <span v-if="ass.metricas.tendencia">
                        Tendência: {{ tendenciaLabel(ass.metricas.tendencia) }}
                        <template v-if="ass.metricas.tendencia_slope != null">
                          ({{ ass.metricas.tendencia_slope.toFixed(2) }} pp/ano)
                        </template>
                      </span>
                      <span v-else class="prio-metricas-detalhes__hint">Tendência: — (sem sinal histórico)</span>
                      <span v-if="ass.metricas.consistencia != null">
                        Consistência: {{ (ass.metricas.consistencia * 100).toFixed(0) }}%
                      </span>
                      <span v-if="ass.metricas.anos_corrente_qtd_parcial">
                        Ano corrente excluído (parcial: {{ ass.metricas.anos_corrente_qtd_parcial }} questões)
                      </span>
                      <!-- PR7 D24: Comparação score_v1 → score (oculta em cargos legados ou |Δ|<0.5pp) -->
                      <span
                        v-if="scoreDelta(ass) != null && Math.abs(scoreDelta(ass)) >= 0.005"
                        class="prio-score-delta"
                        :class="deltaSignClass(scoreDelta(ass))"
                        title="v1 = fórmula PR6 (sem recência); v2 = fórmula atual (com recência)"
                      >
                        v1: {{ (ass.score_v1 * 100).toFixed(0) }} → v2: {{ (ass.score * 100).toFixed(0) }} ({{ formatDelta(scoreDelta(ass)) }})
                      </span>
                    </div>
                  </details>
                </div>

                <!-- Sub-assuntos -->
                <template v-if="prioState.assuntos[assuntoKey(disc, ass)]">
                  <div v-for="(sub, si) in ass.sub_assuntos" :key="si" class="prio-sub">
                    <div class="prio-sub__row">
                      <span class="prio-sub__nome">{{ sub.nome }}</span>
                      <span class="prio-score prio-score--xs" :class="scoreClass(sub.score)" :title="tooltipScore(sub)">
                        {{ sub.score != null ? (sub.score * 100).toFixed(0) : '—' }}
                      </span>
                      <span
                        v-if="sub.metricas && !sub.metricas.sem_match"
                        class="prio-presenca prio-presenca--xs"
                        :title="tooltipPresenca(sub)"
                      >P:{{ sub.metricas.anos_que_cobraram }}/{{ sub.metricas.anos_com_prova }}</span>
                      <!-- PR7: Recência sub-assunto. Null-guard pra cargos pré-PR7 / universo degenerado -->
                      <span
                        v-if="sub.metricas?.recencia_anos_total"
                        class="prio-recencia prio-recencia--xs"
                        :class="recenciaClass(sub.metricas.recencia)"
                        :title="tooltipRecencia(sub.metricas)"
                      >R:{{ formatRecencia(sub.metricas) }}</span>
                      <!-- P2-1: badges qualidade no sub-assunto (D11 — sub tem métrica própria). P3-1: oculta "Sem match" individual quando disc inteira está sem_match -->
                      <span
                        v-if="qualityBadge(sub) === 'no-match' && !disc.metricas?.sem_match"
                        class="prio-badge-quality prio-badge-quality--no-match"
                        title="IA não achou equivalente no histórico"
                      >Sem match</span>
                      <span
                        v-else-if="qualityBadge(sub) === 'never-covered'"
                        class="prio-badge-quality prio-badge-quality--rare"
                        title="Tema existe no histórico mas não aparece nos dados importados para esta banca/área"
                      >Nunca cobrado</span>
                      <span
                        v-else-if="qualityBadge(sub) === 'small-sample'"
                        class="prio-badge-quality prio-badge-quality--small"
                        title="Apenas 1 prova no universo cobrou este tema"
                      >Amostra pequena</span>
                      <span v-if="sub.tendencia" class="prio-trend prio-trend--sm" :class="trendClass(sub.tendencia)">
                        {{ sub.tendencia }}
                      </span>
                      <span v-for="t in sub.tipo_fonte || []" :key="t" class="prio-tipo prio-tipo--xs" :class="`tipo--${t}`">{{ tipoLabel(t) }}</span>
                      <span v-if="sub.fonte" class="prio-fonte">{{ fonteLabel(sub.fonte) }}</span>
                    </div>
                    <div v-if="sub.leis_referencia?.length || sub.justificativa || (sub.metricas && !sub.metricas.sem_match)" class="prio-sub__details">
                      <p v-if="sub.justificativa" class="prio-justificativa">{{ sub.justificativa }}</p>
                      <div v-if="sub.leis_referencia?.length" class="prio-leis">
                        <span v-for="(lei, li) in sub.leis_referencia" :key="li" class="prio-lei-tag">{{ lei }}</span>
                      </div>
                      <!-- P2-2: Métricas detalhadas no sub-assunto (D11 + §6.3) -->
                      <details v-if="sub.metricas && !sub.metricas.sem_match" class="prio-metricas-detalhes">
                        <summary>Métricas detalhadas</summary>
                        <div class="prio-metricas-detalhes__grid">
                          <span>Presente em {{ sub.metricas.anos_que_cobraram }} de {{ sub.metricas.anos_com_prova }} anos importados</span>
                          <!-- PR7: Recência (oculta em legados / universo degenerado) -->
                          <span v-if="sub.metricas.recencia_anos_total">
                            Recência: cobriu {{ sub.metricas.recencia_anos_cobertos }} dos {{ sub.metricas.recencia_anos_total }} anos mais recentes ({{ (sub.metricas.recencia * 100).toFixed(0) }}%)
                          </span>
                          <span>Peso médio: {{ sub.metricas.peso_medio.toFixed(1) }}% das questões por prova</span>
                          <span v-if="sub.metricas.tendencia">
                            Tendência: {{ tendenciaLabel(sub.metricas.tendencia) }}
                            <template v-if="sub.metricas.tendencia_slope != null">
                              ({{ sub.metricas.tendencia_slope.toFixed(2) }} pp/ano)
                            </template>
                          </span>
                          <span v-else class="prio-metricas-detalhes__hint">Tendência: — (sem sinal histórico)</span>
                          <span v-if="sub.metricas.consistencia != null">
                            Consistência: {{ (sub.metricas.consistencia * 100).toFixed(0) }}%
                          </span>
                          <!-- PR7 D24: Comparação score_v1 → score sub-assunto -->
                          <span
                            v-if="scoreDelta(sub) != null && Math.abs(scoreDelta(sub)) >= 0.005"
                            class="prio-score-delta"
                            :class="deltaSignClass(scoreDelta(sub))"
                            title="v1 = fórmula PR6 (sem recência); v2 = fórmula atual (com recência)"
                          >
                            v1: {{ (sub.score_v1 * 100).toFixed(0) }} → v2: {{ (sub.score * 100).toFixed(0) }} ({{ formatDelta(scoreDelta(sub)) }})
                          </span>
                        </div>
                      </details>
                    </div>
                  </div>
                </template>
              </div>
            </template>

            <!-- Aba Legislação -->
            <template v-else-if="prioState.tabs[disc.nome] === 'legislacao'">
              <div v-if="legislacaoPorDisciplina(disc).length" class="prio-legislacao">
                <div
                  v-for="(lei, li) in legislacaoPorDisciplina(disc)"
                  :key="li"
                  class="prio-lei-card"
                >
                  <div class="prio-lei-card__titulo">
                    <BookOpen :size="13" />
                    <strong>{{ lei.nomeOriginal }}</strong>
                  </div>
                  <div v-if="lei.assuntos?.length" class="prio-lei-card__linha">
                    <span class="prio-lei-card__label">Em assuntos:</span>
                    <span v-for="a in lei.assuntos" :key="a" class="prio-lei-card__tag">{{ a }}</span>
                  </div>
                  <div v-if="lei.sub_assuntos?.length" class="prio-lei-card__linha">
                    <span class="prio-lei-card__label">Sub-assuntos:</span>
                    <span v-for="s in lei.sub_assuntos" :key="s" class="prio-lei-card__tag prio-lei-card__tag--sub">{{ s }}</span>
                  </div>
                  <div v-if="lei.dispositivos?.length" class="prio-lei-card__linha">
                    <span class="prio-lei-card__label">Artigos:</span>
                    <span v-for="d in lei.dispositivos" :key="d" class="prio-lei-card__tag prio-lei-card__tag--disp">{{ d }}</span>
                  </div>
                </div>
              </div>
              <div v-else class="prio-legislacao__empty">
                Nenhuma norma identificada para esta disciplina.
              </div>
            </template>

            <!-- Aba Leis (únicas) — dedupe por nome da lei -->
            <template v-else-if="prioState.tabs[disc.nome] === 'leis'">
              <div v-if="leisUnicasPorDisciplinaCached(disc).length" class="prio-legislacao">
                <div
                  v-for="(lei, li) in leisUnicasPorDisciplinaCached(disc)"
                  :key="li"
                  class="prio-lei-card"
                >
                  <div class="prio-lei-card__titulo">
                    <BookOpen :size="13" />
                    <strong>{{ lei.nomeLei }}</strong>
                  </div>
                  <div v-if="lei.dispositivos?.length" class="prio-lei-card__linha">
                    <span class="prio-lei-card__label">Artigos cobrados:</span>
                    <span v-for="d in lei.dispositivos" :key="d" class="prio-lei-card__tag prio-lei-card__tag--disp">{{ d }}</span>
                  </div>
                  <div v-if="lei.assuntos?.length" class="prio-lei-card__linha">
                    <span class="prio-lei-card__label">Aplica em {{ lei.assuntos.length }} assunto{{ lei.assuntos.length > 1 ? 's' : '' }}:</span>
                    <template v-if="lei.assuntos.length <= 5">
                      <span v-for="a in lei.assuntos" :key="a" class="prio-lei-card__tag">{{ a }}</span>
                    </template>
                    <details v-else class="prio-lei-card__details">
                      <summary>Ver os {{ lei.assuntos.length }} nomes</summary>
                      <span v-for="a in lei.assuntos" :key="a" class="prio-lei-card__tag">{{ a }}</span>
                    </details>
                  </div>
                </div>
              </div>
              <div v-else-if="!leisUnicasPorDisciplinaCached(disc).length" class="prio-legislacao__empty">
                <p>Esta disciplina não tem fontes legislativas mapeadas.</p>
                <p class="prio-legislacao__empty-hint">Veja a aba "Assuntos" pra conteúdo doutrinário/jurisprudencial — não é falha de análise.</p>
              </div>
            </template>
          </template>
        </div>
      </div>

      <!-- Legenda -->
      <div class="prio-legenda">
        <span class="prio-legenda__item"><span class="prio-score prio-score--xs score--high">80+</span> Alta</span>
        <span class="prio-legenda__item"><span class="prio-score prio-score--xs score--medium">40-79</span> Média</span>
        <span class="prio-legenda__item"><span class="prio-score prio-score--xs score--low">1-39</span> Baixa</span>
        <span class="prio-legenda__item"><span class="prio-score prio-score--xs score--null">—</span> S/dados</span>
        <span class="prio-legenda__sep">|</span>
        <span class="prio-legenda__item"><span class="prio-tipo prio-tipo--xs tipo--legislacao">Lei</span> Legislação</span>
        <span class="prio-legenda__item"><span class="prio-tipo prio-tipo--xs tipo--jurisprudencia">Jur</span> Jurisprudência</span>
        <span class="prio-legenda__item"><span class="prio-tipo prio-tipo--xs tipo--doutrina">Dou</span> Doutrina</span>
        <span class="prio-legenda__item"><span class="prio-tipo prio-tipo--xs tipo--teoria">Teo</span> Teoria</span>
      </div>

      <!-- Ações -->
      <div class="action-bar">
        <button class="btn-ghost" @click="estado = 'resultado'">
          <ChevronLeft :size="14" /> Voltar ao conteúdo
        </button>
        <div class="action-bar__right">
          <button class="btn-outline" :disabled="analisando" @click="estado = 'resultado'">
            <RefreshCw :size="14" /> Reanalisar
          </button>
          <button class="btn-primary" @click="salvarEVoltar">
            <Save :size="14" /> Salvar e voltar
          </button>
          <button class="btn-outline" :disabled="analisando" @click="abrirVinculacao">
            <Link2 :size="14" /> Vincular normas
          </button>
          <div class="action-bar__menu-wrap" @click.stop @keydown.esc="menuCriarTasksAberto = false">
            <button
              class="btn-primary"
              :disabled="!disciplinasComCandidates.length"
              :title="disciplinasComCandidates.length ? 'Criar tarefas a partir da priorização' : 'Sem disciplinas disponíveis'"
              aria-haspopup="menu"
              :aria-expanded="menuCriarTasksAberto"
              aria-controls="criar-tarefas-menu"
              @click="menuCriarTasksAberto = !menuCriarTasksAberto"
            >
              <ListPlus :size="14" /> Criar tarefas
              <ChevronDown :size="12" />
            </button>
            <div
              v-if="menuCriarTasksAberto"
              id="criar-tarefas-menu"
              class="action-bar__menu"
              role="menu"
              aria-label="Escolha a disciplina para criar tarefas"
            >
              <p class="action-bar__menu-hint">Escolha a disciplina:</p>
              <button
                v-for="disc in disciplinasComCandidates"
                :key="disc.nome"
                class="action-bar__menu-item"
                role="menuitem"
                @click="menuCriarTasksAberto = false; abrirGeradorTasks(disc)"
              >
                <span class="action-bar__menu-item-nome">{{ disc.nome }}</span>
                <span class="action-bar__menu-item-count">{{ disc.assuntos.filter(a => !a.cortado).length }}</span>
              </button>
            </div>
          </div>
          <button class="btn-primary btn-primary--accent" @click="router.push(`/editais/${editalId}/cargos/${cargoId}/plano`)">
            <CalendarDays :size="14" /> Plano de Estudo
          </button>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════ -->
    <!-- Estado 5 — Vinculação de Normas                          -->
    <!-- ══════════════════════════════════════════════════════════ -->
    <div v-else-if="estado === 'vinculacao'" class="estado-vinculacao">
      <LeisVinculacaoPanel
        :leis-vinculadas="leisVinculadas"
        :regenerando="regenerandoLeis"
        @voltar="estado = 'priorizacao'"
        @regerar="regerarLeis"
        @vincular="vincularLei"
        @desvincular="desvincularLei"
        @mudar-status="mudarStatusLei"
      />
    </div>

    <!-- Gerador de tarefas (a partir da priorização do cargo) -->
    <TaskGeneratorModal
      v-if="taskGenerator.aberto"
      :candidates="taskGenerator.candidates"
      :discipline-name="taskGenerator.disciplineName"
      :contexto-plano="taskGenerator.contextoPlano"
      origem="cargo"
      :origem-dados="taskGenerator.origemDados"
      :title="`Criar tarefas — ${taskGenerator.disciplineName}`"
      :subtitle="`Baseado na priorização do cargo`"
      @close="taskGenerator.aberto = false"
      @created="onTasksCriadas"
    />

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  ChevronLeft, ChevronRight, ChevronDown, Zap, Plus, Trash2,
  AlertTriangle, BookOpen, List, ListTree, Circle, Save, X, Loader2, CheckCircle,
  ChevronsDownUp, ChevronsUpDown, TrendingUp, TrendingDown, Minus, RefreshCw,
  CalendarDays, Clock, Info, Link2, Sparkles, ListPlus, ArrowUpFromLine, Printer,
} from 'lucide-vue-next'
import LeisVinculacaoPanel from '@/components/workspace/LeisVinculacaoPanel.vue'
import TaskGeneratorModal from '@/components/task-generator/TaskGeneratorModal.vue'
import { cargoToCandidates } from '@/utils/taskCandidateAdapters'
import { useEditalStore } from '@/stores/useEditalStore'
import { useCargoStore } from '@/stores/useCargoStore'
import { useDictsStore } from '@/stores/useDictsStore'
import { usePlanStore } from '@/stores/usePlanStore'
import { cargoService } from '@/services/cargo.service'
import { limpar, segmentar } from '@/utils/editalParser'
import { toast } from 'vue-sonner'

const router = useRouter()
const route = useRoute()
const editalStore = useEditalStore()
const cargoStore = useCargoStore()
const dictsStore = useDictsStore()
const planStore = usePlanStore()

const editalId = computed(() => route.params.id)
const cargoId = computed(() => route.params.cargoId)
const edital = computed(() => editalStore.editalAtual)
const cargo = computed(() => cargoStore.cargoAtual)

// Estados da view
const mounting = ref(true) // true durante onMounted — esconde UI até saber qual estado mostrar
const estado = ref('entrada') // 'entrada' | 'preview' | 'resultado' | 'priorizacao' | 'vinculacao'
const storageKey = computed(() => `edital_conteudo_${editalId.value}_${cargoId.value}`)
const textoBruto = ref('')
const segmentacao = ref({ disciplinas: [], padrao: {} })
const conteudoParseado = ref({ disciplinas: [] })
const parseLoading = ref(false)
const parseTotal = ref(0)
const parseProcessadas = ref(0)
const parseAtualNome = ref('')
const cancelarParse = ref(false)
const salvando = ref(false)
const showValidacao = ref(false)

// ── Validação de completude ──────────────────────────────────
//
// Algoritmo:
// 1. Extrai itens numerados do texto bruto (ignora referências a leis/artigos/súmulas)
// 2. Normaliza acentos + case nos dois lados
// 3. Faz matching por interseção significativa de tokens (≥60% das palavras-chave)
// 4. Retorna 3 estados: ok | warn | info (indeterminado)

const STOPWORDS = new Set([
  'a','o','as','os','de','da','do','das','dos','e','em','na','no','nas','nos',
  'um','uma','uns','umas','para','por','com','como','sobre','sob','entre','até',
  'ou','que','se','ao','aos','sua','seu','suas','seus',
])

function stripAccents(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function tokens(text) {
  return stripAccents(String(text || ''))
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOPWORDS.has(w))
}

function similar(itemTokens, nomeTokens) {
  if (!itemTokens.length || !nomeTokens.length) return false
  const setNome = new Set(nomeTokens)
  let inter = 0
  for (const t of itemTokens) if (setNome.has(t)) inter++
  // ≥60% das palavras-chave do item aparecem no nome
  const ratio = inter / itemTokens.length
  return ratio >= 0.6
}

const validacao = computed(() => {
  const textoOriginal = segmentacao.value.disciplinas
    .filter(d => d.nome !== '_NAO_IDENTIFICADO')
    .map(d => d.texto)
    .join('\n')

  // Captura itens numerados, ignorando referências a leis/artigos
  const itensOriginais = []
  const regex = /(\d{1,2}(?:\.\d{1,2}){0,2})\s+([^.;:\d][^.;:]*)/g
  let match
  while ((match = regex.exec(textoOriginal)) !== null) {
    const numeracao = match[1]
    const item = match[2].trim()
    const pos = match.index

    // Filtra referências a leis: "Lei nº 9.605", "art. 5", "Súmula 473", etc
    const antes = textoOriginal.slice(Math.max(0, pos - 30), pos).toLowerCase()
    if (/(?:n[º°o]?\.?|lei|decreto|portaria|resolu[cç][aã]o|complementar|s[uú]mula|art\.?|inciso|al[ií]nea|par[aá]grafo|§|cf|cf\/?88|cpc|cpp|ctn|clt)\s*$/i.test(antes)) {
      continue
    }

    // Filtra itens curtos demais ou que são pura numeração/pontuação
    const itemTokens = tokens(item)
    if (item.length < 5 || itemTokens.length === 0) continue

    itensOriginais.push({ numeracao, item, tokens: itemTokens })
  }

  // Coleta todos os nomes da árvore parseada (defensivo: ssub pode vir como objeto)
  const nomesParseados = []
  for (const disc of conteudoParseado.value.disciplinas || []) {
    if (disc.nome) nomesParseados.push(disc.nome)
    for (const assunto of disc.assuntos || []) {
      if (assunto?.nome) nomesParseados.push(assunto.nome)
      for (const sub of assunto.sub_assuntos || []) {
        if (sub?.nome) nomesParseados.push(sub.nome)
        for (const ssub of sub.sub_sub_assuntos || []) {
          // Defesa: pode vir como string OU objeto
          const nome = typeof ssub === 'string' ? ssub : (ssub?.nome || '')
          if (nome) nomesParseados.push(nome)
        }
      }
    }
  }
  const tokensParseados = nomesParseados.map(tokens)

  // Para cada item, verifica se há nome parseado com interseção ≥ 60%
  const faltando = []
  for (const orig of itensOriginais) {
    const achou = tokensParseados.some(nt => similar(orig.tokens, nt))
    if (!achou) faltando.push(`${orig.numeracao} ${orig.item}`)
  }

  // 3 estados:
  // - 'info' (cinza): poucos itens detectados → não dá pra validar
  // - 'ok' (verde): cobertura ≥ 90% e ao menos 5 itens
  // - 'warn' (amarelo): há candidatos não-correspondentes
  let estado, titulo, descricao
  const total = itensOriginais.length
  const cobertura = total ? (total - faltando.length) / total : 0

  if (total < 5) {
    estado = 'info'
    titulo = `Validação: poucos itens numerados detectados (${total}) — não foi possível validar automaticamente`
    descricao = 'O texto original não tem numeração suficiente para a validação automática. Revise a estrutura manualmente.'
  } else if (faltando.length === 0 || cobertura >= 0.9) {
    estado = 'ok'
    titulo = `Validação: ${total - faltando.length}/${total} itens encontrados na estrutura`
    descricao = 'A estrutura cobre os itens numerados do texto original.'
  } else {
    estado = 'warn'
    titulo = `Validação: ${total - faltando.length}/${total} itens encontrados — ${faltando.length} a verificar`
    descricao = 'Os itens abaixo foram detectados no texto original mas não tiveram correspondência clara na estrutura. A IA pode tê-los unido a outro assunto, reformulado o nome, ou omitido. Verifique manualmente.'
  }

  return { estado, titulo, descricao, faltando, total, encontrados: total - faltando.length }
})

// Persiste texto bruto no localStorage ao digitar/colar
function onTextoBrutoChange() {
  // Mantém localStorage como cache de digitação (sobrevive a reload da aba)
  // O envio para o backend acontece em processarRegex().
  if (textoBruto.value.trim()) {
    localStorage.setItem(storageKey.value, textoBruto.value)
  } else {
    localStorage.removeItem(storageKey.value)
  }
}

async function limparConteudo() {
  textoBruto.value = ''
  segmentacao.value = { disciplinas: [], padrao: {} }
  localStorage.removeItem(storageKey.value)
  estado.value = 'entrada'
  // Apaga no backend silenciosamente (sem toast — usa service direto, não a store)
  try {
    await cargoService.update(editalId.value, cargoId.value, { conteudo_bruto: '' })
  } catch (err) {
    console.warn('Falha ao limpar conteudo_bruto no backend:', err.message)
  }
}

// ── Fase 1+2: Processar regex ────────────────────────────────

const processandoRegex = ref(false)

async function processarRegex() {
  if (processandoRegex.value) return // evita duplo-clique
  processandoRegex.value = true

  try {
    const textoLimpo = limpar(textoBruto.value)
    const disciplinasConhecidas = dictsStore.disciplinas.map(d => d.nome)
    const result = segmentar(textoLimpo, disciplinasConhecidas)

    // Adiciona flags de UI
    result.disciplinas = result.disciplinas.map(d => ({
      ...d,
      _aberto: true,
      _selecionado: true,
      _parseStatus: 'pendente', // 'pendente' | 'processando' | 'concluido' | 'erro'
    }))

    // Persiste o texto bruto original no backend ANTES de avançar — assim a validação
    // posterior tem a fonte de verdade. Sem toast — usa service direto.
    try {
      await cargoService.update(editalId.value, cargoId.value, { conteudo_bruto: textoBruto.value })
    } catch (err) {
      console.warn('Falha ao persistir conteudo_bruto:', err.message)
    }

    segmentacao.value = result
    estado.value = 'preview'
  } finally {
    processandoRegex.value = false
  }
}

// ── Texto com highlights ─────────────────────────────────────

const textoHighlighted = computed(() => {
  const textoLimpo = limpar(textoBruto.value)
  const linhas = textoLimpo.split('\n')
  const padrao = segmentacao.value.padrao

  // Coleta todas as anomalias com suas linhas
  const anomaliasPorLinha = {}
  for (const disc of segmentacao.value.disciplinas) {
    for (const a of disc.anomalias) {
      for (let l = a.inicio; l <= a.fim; l++) {
        if (!anomaliasPorLinha[l]) anomaliasPorLinha[l] = []
        anomaliasPorLinha[l].push(a)
      }
    }
  }

  // Linhas que são nomes de disciplina
  const linhasDisciplina = new Set()
  for (const disc of segmentacao.value.disciplinas) {
    if (disc.linhaInicio !== undefined) linhasDisciplina.add(disc.linhaInicio)
  }

  return linhas.map((linha, i) => {
    const escaped = linha.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    if (linhasDisciplina.has(i)) {
      return `<div class="hl-disciplina">${escaped}</div>`
    }

    if (anomaliasPorLinha[i]) {
      const tooltips = anomaliasPorLinha[i].map(a => a.mensagem).join(' | ')
      return `<div class="hl-anomalia" title="${tooltips}">${escaped}</div>`
    }

    return `<div>${escaped}</div>`
  }).join('')
})

// ── Manipulação de disciplinas ───────────────────────────────

function removeDisciplina(idx) {
  segmentacao.value.disciplinas.splice(idx, 1)
}

function adicionarDisciplina() {
  segmentacao.value.disciplinas.push({
    nome: '',
    texto: '',
    linhaInicio: -1,
    anomalias: [],
    _aberto: true,
    _selecionado: true,
    _parseStatus: 'pendente',
  })
}

// ── Seleção de disciplinas ────────────────────────────────────

const discsVisiveis = computed(() =>
  segmentacao.value.disciplinas.filter(d => d.nome !== '_NAO_IDENTIFICADO')
)
const todasSelecionadas = computed(() =>
  discsVisiveis.value.length > 0 && discsVisiveis.value.every(d => d._selecionado)
)
const algumaSelecionadaPreview = computed(() =>
  discsVisiveis.value.some(d => d._selecionado)
)
const qtdSelecionadasPreview = computed(() =>
  discsVisiveis.value.filter(d => d._selecionado).length
)
const parseProgressoPct = computed(() =>
  parseTotal.value ? Math.round(parseProcessadas.value / parseTotal.value * 100) : 0
)

function toggleTodasDisciplinas() {
  const novoValor = !todasSelecionadas.value
  for (const d of discsVisiveis.value) {
    d._selecionado = novoValor
  }
}

function cancelarFilaParse() {
  cancelarParse.value = true
  toast('Cancelando após a disciplina atual...')
}

// ── Enviar para IA — sempre sequencial, 1 disciplina por chamada ──

async function enviarParaIA() {
  const blocos = discsVisiveis.value.filter(d => d._selecionado)

  if (!blocos.length) {
    toast.error('Selecione ao menos uma disciplina.')
    return
  }

  parseLoading.value = true
  cancelarParse.value = false
  parseTotal.value = blocos.length
  parseProcessadas.value = 0
  parseAtualNome.value = ''

  // Reset status visuais
  for (const disc of blocos) {
    disc._parseStatus = 'aguardando'
    disc._parseErro = null
  }

  let sucessos = 0
  let falhas = 0

  for (const disc of blocos) {
    if (cancelarParse.value) break

    disc._parseStatus = 'processando'
    parseAtualNome.value = disc.nome

    try {
      await cargoStore.enviarParse(editalId.value, cargoId.value, {
        disciplina: disc.nome,
        texto: disc.texto,
      })
      disc._parseStatus = 'concluido'
      sucessos++
    } catch (err) {
      disc._parseStatus = 'erro'
      disc._parseErro = err.message || 'Erro desconhecido'
      falhas++
      toast.error(`Erro em "${disc.nome}": ${disc._parseErro}`)
      // continua a fila — próxima disciplina
    }

    parseProcessadas.value++
  }

  parseLoading.value = false
  parseAtualNome.value = ''

  if (sucessos) {
    const updated = await cargoStore.fetchCargo(editalId.value, cargoId.value)
    if (updated?.conteudo_parseado?.disciplinas?.length) {
      conteudoParseado.value = JSON.parse(JSON.stringify(updated.conteudo_parseado))

      if (cancelarParse.value) {
        toast(`Fila cancelada — ${sucessos} processada(s), ${falhas} com erro.`)
      } else if (falhas) {
        toast(`Concluído com ${sucessos} sucesso(s) e ${falhas} erro(s).`)
      } else {
        toast.success(`${sucessos} disciplina(s) processada(s)!`)
      }

      estado.value = 'resultado'
    } else {
      toast.error('Parse retornou vazio — verifique o console do backend.')
    }
  } else if (falhas) {
    toast.error(`Nenhuma disciplina processada — ${falhas} erro(s).`)
  }

  cancelarParse.value = false
}

// ── Árvore editável — estado de expand/collapse ──────────────

const treeState = ref({ discs: {}, assuntos: {} })

// Inicializa ao entrar no estado resultado
function initTreeState() {
  // Garante flags de UI em cada disciplina
  for (const d of conteudoParseado.value.disciplinas || []) {
    if (d._selecionado === undefined) d._selecionado = false
    if (d._analiseStatus === undefined) d._analiseStatus = null
    if (d._analiseFase === undefined) d._analiseFase = ''
  }
  const discs = {}
  const assuntos = {}
  for (let di = 0; di < (conteudoParseado.value.disciplinas?.length || 0); di++) {
    discs[di] = false // disciplinas recolhidas por padrão
    const disc = conteudoParseado.value.disciplinas[di]
    for (let ai = 0; ai < (disc.assuntos?.length || 0); ai++) {
      assuntos[`${di}-${ai}`] = false
    }
  }
  treeState.value = { discs, assuntos }
}

function toggleDisc(di) {
  treeState.value.discs[di] = !treeState.value.discs[di]
}

function toggleAssunto(di, ai) {
  const key = `${di}-${ai}`
  treeState.value.assuntos[key] = !treeState.value.assuntos[key]
}

function toggleTreeAll(expand) {
  const discs = {}
  const assuntos = {}
  for (let di = 0; di < (conteudoParseado.value.disciplinas?.length || 0); di++) {
    discs[di] = expand
    const disc = conteudoParseado.value.disciplinas[di]
    for (let ai = 0; ai < (disc.assuntos?.length || 0); ai++) {
      assuntos[`${di}-${ai}`] = expand
    }
  }
  treeState.value = { discs, assuntos }
}

function removeTreeNode(arr, idx) {
  arr.splice(idx, 1)
}

// Bloqueia mutação na árvore quando a disciplina está sendo analisada
// (a fila de análise itera o array e mexer no meio bagunça os índices)
function bloqueadoSeAnalisando(di) {
  if (conteudoParseado.value.disciplinas[di]?._analiseStatus === 'processando') {
    toast.error('Aguarde a análise dessa disciplina terminar.')
    return true
  }
  return false
}

// Remove disciplina + ajusta as chaves do treeState para refletir o shift de índices
function removeDisciplinaTree(di) {
  if (bloqueadoSeAnalisando(di)) return
  conteudoParseado.value.disciplinas.splice(di, 1)
  const newDiscs = {}
  for (const [key, val] of Object.entries(treeState.value.discs)) {
    const k = Number(key)
    if (k < di) newDiscs[k] = val
    else if (k > di) newDiscs[k - 1] = val
  }
  const newAssuntos = {}
  for (const [key, val] of Object.entries(treeState.value.assuntos)) {
    const [kDi, kAi] = key.split('-').map(Number)
    if (kDi < di) newAssuntos[key] = val
    else if (kDi > di) newAssuntos[`${kDi - 1}-${kAi}`] = val
  }
  treeState.value.discs = newDiscs
  treeState.value.assuntos = newAssuntos
}

// Remove assunto + ajusta chaves `${di}-${ai+k}` -> `${di}-${ai+k-1}`
// Invalida a análise da disciplina origem (estrutura mudou)
function removeAssuntoTree(di, ai) {
  if (bloqueadoSeAnalisando(di)) return
  const disc = conteudoParseado.value.disciplinas[di]
  disc.assuntos.splice(ai, 1)
  disc._analiseStatus = null
  disc._analiseFase = ''
  const newAssuntos = {}
  for (const [key, val] of Object.entries(treeState.value.assuntos)) {
    const [kDi, kAi] = key.split('-').map(Number)
    if (kDi !== di || kAi < ai) newAssuntos[key] = val
    else if (kAi > ai) newAssuntos[`${di}-${kAi - 1}`] = val
  }
  treeState.value.assuntos = newAssuntos
}

// Insere disciplina em insertAt + shift up das chaves para X >= insertAt
function inserirDisciplinaTree(disciplina, insertAt) {
  const newDiscs = {}
  for (const [key, val] of Object.entries(treeState.value.discs)) {
    const k = Number(key)
    newDiscs[k < insertAt ? k : k + 1] = val
  }
  const newAssuntos = {}
  for (const [key, val] of Object.entries(treeState.value.assuntos)) {
    const [kDi, kAi] = key.split('-').map(Number)
    newAssuntos[`${kDi < insertAt ? kDi : kDi + 1}-${kAi}`] = val
  }
  treeState.value.discs = newDiscs
  treeState.value.assuntos = newAssuntos
  conteudoParseado.value.disciplinas.splice(insertAt, 0, disciplina)
}

function promoverAssuntoADisciplina(di, ai) {
  if (bloqueadoSeAnalisando(di)) return
  const disc = conteudoParseado.value.disciplinas[di]
  const assunto = disc?.assuntos?.[ai]
  if (!assunto) return

  const nome = (assunto.nome || '').trim()
  if (!nome) {
    toast.error('Preencha o nome do assunto antes de promover.')
    return
  }

  const subAssuntos = assunto.sub_assuntos || []
  const fontes = assunto.fontes_explicitas || []

  const novosAssuntos = subAssuntos.map(sub => ({
    nome: sub.nome || '',
    fontes_explicitas: [],
    sub_assuntos: (sub.sub_sub_assuntos || []).map(ss => ({
      nome: typeof ss === 'string' ? ss : (ss?.nome || ''),
      sub_sub_assuntos: [],
    })),
  }))

  // Já existe disciplina com este nome? Oferece mesclar
  const existingIdx = conteudoParseado.value.disciplinas.findIndex(
    (d, idx) => idx !== di && (d.nome || '').trim().toLowerCase() === nome.toLowerCase()
  )

  if (existingIdx !== -1) {
    const destNome = conteudoParseado.value.disciplinas[existingIdx].nome
    const partes = [`Já existe uma disciplina "${destNome}".`]
    partes.push(
      subAssuntos.length
        ? `Mesclar os ${subAssuntos.length} sub-assunto(s) nela?`
        : 'O assunto não tem sub-assuntos — nada será mesclado, apenas o assunto será removido.'
    )
    if (fontes.length) {
      partes.push(`Atenção: as fontes explícitas (${fontes.join(', ')}) serão descartadas.`)
    }
    if (!confirm(partes.join('\n\n'))) return
    if (bloqueadoSeAnalisando(existingIdx)) return

    const dest = conteudoParseado.value.disciplinas[existingIdx]
    if (novosAssuntos.length) {
      dest.assuntos = (dest.assuntos || []).concat(novosAssuntos)
      dest._analiseStatus = null
      dest._analiseFase = ''
    }
    treeState.value.discs[existingIdx] = true
    removeAssuntoTree(di, ai)
    toast.success(
      novosAssuntos.length
        ? `Mesclado em "${destNome}"`
        : `Assunto removido — nada a mesclar em "${destNome}"`
    )
    return
  }

  const partes = [`Transformar "${nome}" em disciplina?`]
  partes.push(
    subAssuntos.length
      ? `Os ${subAssuntos.length} sub-assunto(s) viram assuntos da nova disciplina.`
      : 'A nova disciplina será criada vazia (este assunto não tem sub-assuntos).'
  )
  if (fontes.length) {
    partes.push(`Atenção: as fontes explícitas (${fontes.join(', ')}) serão descartadas.`)
  }
  if (!confirm(partes.join('\n\n'))) return

  const novaDisciplina = {
    nome,
    assuntos: novosAssuntos,
    _selecionado: false,
    _analiseStatus: null,
    _analiseFase: '',
  }

  inserirDisciplinaTree(novaDisciplina, di + 1)
  treeState.value.discs[di + 1] = true
  removeAssuntoTree(di, ai)

  toast.success(`"${nome}" promovida a disciplina`)
}

// ── Salvar ───────────────────────────────────────────────────

async function salvarConteudo() {
  salvando.value = true
  try {
    await cargoStore.salvarConteudo(editalId.value, cargoId.value, conteudoParseado.value)
    // Limpa localStorage pois o conteúdo já foi salvo no backend
    localStorage.removeItem(storageKey.value)
    toast.success('Conteúdo salvo com sucesso!')
    router.push(`/editais/${editalId.value}/cargos`)
  } catch (err) {
    toast.error(err.message)
  } finally {
    salvando.value = false
  }
}

// ── Priorização ──────────────────────────────────────────────

const analisando = ref(false)
const filaProcessadas = ref(0)
const filaTotalSelecionadas = ref(0)
// PR8: distingue contexto da análise em curso pra UI mostrar mensagem certa.
// 'tudo' = recalcularTudoPR6 (todas as disc). 'individual' = reanalisarDisciplina (1 disc).
// 'inicial' = iniciarAnalise da view 'resultado'. null = ocioso.
const modoAnalise = ref(null)
// Status por disciplina é armazenado em `disc._analiseStatus` / `disc._analiseFase`
// (igual ao iniciarAnalise — fonte única de verdade). Renderizado só quando `analisando=true`.
const priorizacaoData = ref({ disciplinas: [] })
const ordenarPorRelevancia = ref(false) // toggle no header — default OFF (mantém ordem do edital)
const priorizacaoMeta = ref(null)
const prioState = ref({ discs: {}, assuntos: {}, tabs: {} })

const filaProgressoPct = computed(() =>
  filaTotalSelecionadas.value ? Math.round(filaProcessadas.value / filaTotalSelecionadas.value * 100) : 0
)

// Seleção de disciplinas no Estado 3
const todasSelecionadasResultado = computed(() =>
  conteudoParseado.value.disciplinas?.length > 0 &&
  conteudoParseado.value.disciplinas.every(d => d._selecionado)
)
const algumaSelecionadaResultado = computed(() =>
  conteudoParseado.value.disciplinas?.some(d => d._selecionado)
)

function toggleSelecaoResultado() {
  const novo = !todasSelecionadasResultado.value
  for (const d of conteudoParseado.value.disciplinas || []) d._selecionado = novo
}

function discsSelecionadas() {
  return (conteudoParseado.value.disciplinas || [])
    .filter(d => d._selecionado)
    .map(d => d.nome)
}

function getDiscObj(nome) {
  return conteudoParseado.value.disciplinas.find(d => d.nome === nome)
}

async function iniciarAnalise() {
  const nomes = discsSelecionadas()
  if (!nomes.length) { toast.error('Selecione ao menos uma disciplina.'); return }

  analisando.value = true
  filaProcessadas.value = 0
  filaTotalSelecionadas.value = nomes.length

  // Reset status de todas
  for (const nome of nomes) {
    const d = getDiscObj(nome)
    if (d) { d._analiseStatus = 'aguardando'; d._analiseFase = '' }
  }

  // Salva conteúdo ANTES da análise — se falhar, aborta e avisa
  try {
    await cargoStore.salvarConteudo(editalId.value, cargoId.value, conteudoParseado.value)
    localStorage.removeItem(storageKey.value)
  } catch (err) {
    toast.error(`Não foi possível salvar o conteúdo antes de analisar: ${err.message}`)
    analisando.value = false
    return
  }

  try {
    // Processa uma por uma em fila
    let algumSucesso = false

    for (const nome of nomes) {
      const disc = getDiscObj(nome)
      if (disc) {
        disc._analiseStatus = 'processando'
        disc._analiseFase = 'classificando...'
      }

      try {
        const result = await cargoStore.analisarConteudo(editalId.value, cargoId.value, {
          area: cargo.value?.area || '',
          disciplinas: [nome],
        })

        if (disc) {
          disc._analiseStatus = 'concluido'
          disc._analiseFase = ''
        }
        algumSucesso = true
        toast.success(`"${nome}" analisada!`)
      } catch (err) {
        if (disc) {
          disc._analiseStatus = 'erro'
          disc._analiseFase = err.message || 'Erro'
        }
        toast.error(`Erro em "${nome}": ${err.message || 'desconhecido'}`)
      }

      filaProcessadas.value++
    }

    // Busca o cargo final com toda a priorização acumulada
    if (algumSucesso) {
      const updated = await cargoStore.fetchCargo(editalId.value, cargoId.value)
      if (updated?.priorizacao?.disciplinas?.length) {
        priorizacaoData.value = updated.priorizacao
        priorizacaoMeta.value = updated.priorizacao._meta || null
        initPrioState()
        estado.value = 'priorizacao'
      }
    }
  } catch (err) {
    toast.error(`Erro durante a análise: ${err.message || 'desconhecido'}`)
  } finally {
    analisando.value = false
  }
}

function initPrioState() {
  // Estados indexados por NOME (estável a reordenação) em vez de índice
  const discs = {}
  const assuntos = {}
  const tabs = {}
  for (const disc of priorizacaoData.value.disciplinas || []) {
    discs[disc.nome] = false
    tabs[disc.nome] = 'assuntos' // aba default
    if (disc._peso === undefined) disc._peso = disc.peso || 1
    for (const ass of disc.assuntos || []) {
      assuntos[assuntoKey(disc, ass)] = false
    }
  }
  prioState.value = { discs, assuntos, tabs }
}

function assuntoKey(disc, ass) {
  return `${disc.nome}::${ass.nome}`
}

// Detecta o caso em que TODAS as disciplinas têm score null (IA não achou histórico).
// Nesse caso, o toggle é inútil — desempate alfabético resulta em ordem aparentemente
// igual à do edital (que já é alfabético no input). Desabilitamos com mensagem clara.
// Também desabilita se array vazio (estado intermediário de análise) — toggle inútil também.
const todosScoresNull = computed(() => {
  const arr = priorizacaoData.value.disciplinas || []
  if (!arr.length) return true // vazio = nada a ordenar
  return arr.every(d => d.score == null)
})

// P2-3: detecta caso "todos scores idênticos" (ex: PR6 com todas disc "raro" = 0.10)
// — toggle funciona mas resultado é igual ao input alfabético
const todosScoresIguais = computed(() => {
  const arr = priorizacaoData.value.disciplinas || []
  if (arr.length < 2) return false
  const primeiro = arr[0].score
  if (primeiro == null) return false
  return arr.every(d => d.score === primeiro)
})

const tooltipToggleOrdenacao = computed(() => {
  if (todosScoresNull.value) {
    return 'Sem scores no histórico — ordenação por relevância não disponível para este cargo'
  }
  if (todosScoresIguais.value && ordenarPorRelevancia.value) {
    return 'Todas as disciplinas têm o mesmo score — ordem alfabética preservada'
  }
  return ordenarPorRelevancia.value ? 'Ordenado por score (alta → baixa)' : 'Ordem do edital'
})

// Ordenação opcional — controlada pelo toggle "Ordenar por relevância"
function compararPorRelevancia(a, b) {
  // Score null vai pro fim (-1 < qualquer score real entre 0..1)
  const sA = a.score ?? -1
  const sB = b.score ?? -1
  if (sA !== sB) return sB - sA
  // Empate em score: ordena por nome alfabético (estável)
  return (a.nome || '').localeCompare(b.nome || '', 'pt-BR')
}

const disciplinasOrdenadas = computed(() => {
  const arr = priorizacaoData.value.disciplinas || []
  if (!ordenarPorRelevancia.value) return arr
  return [...arr].sort(compararPorRelevancia)
})

function assuntosOrdenados(disc) {
  const arr = disc?.assuntos || []
  if (!ordenarPorRelevancia.value) return arr
  return [...arr].sort(compararPorRelevancia)
}

// Regex local pra extrair dispositivos (espelha o do back, mas roda no client)
const REGEX_DISPOSITIVO = /art\.?\s*\d+[º°o]?(?:[,\s]+(?:inc(?:iso)?|al(?:[ií])nea|§|par(?:[áa])grafo)\.?\s*[\w]+)*/gi

function chaveLei(textoBruto) {
  return String(textoBruto || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim()
}

function extrairDispositivosLocal(textoBruto) {
  const m = String(textoBruto || '').match(REGEX_DISPOSITIVO)
  if (!m) return []
  return Array.from(new Set(m.map(s => s.trim().toLowerCase())))
}

/**
 * Extrai o "nome da lei" de um textoBruto, removendo a porção de artigos.
 * Ex: "Arts. 1º a 21, CC/2002" → "CC/2002"
 *     "Arts. 104 a 232, CC/2002" → "CC/2002"
 *     "Lei nº 10.406/2002 (Código Civil)" → "Lei nº 10.406/2002 (Código Civil)"
 *     "Lei 8.112/1990 art 5" → "Lei 8.112/1990"
 *
 * Heurística: divide por vírgula. Pega a parte que contém marcador de lei/código/CF/etc.
 * Se nada bater, devolve último fragmento (último é tipicamente a lei).
 */
function extrairNomeLei(textoBruto) {
  const limpo = String(textoBruto || '').trim()
  if (!limpo) return ''
  const partes = limpo.split(',').map(p => p.trim()).filter(Boolean)
  if (partes.length === 1) return partes[0]
  // Marcadores expandidos: LC (Lei Complementar), EC (Emenda Constitucional),
  // Decreto-Lei, Súmula (Vinculante / STJ / TST). Captura amplo conjunto de fontes.
  const reLei = /\b(lei(?:\s+(?:complementar|org[aâ]nica|delegada))?|lc|ec|emenda|cf(?:\/|\b)|cc(?:\/|\b)|cpc|cp|ctn|clt|c[oó]digo|decreto(?:[\s-]lei)?|estatuto|portaria|resolu[cç][aã]o|s[uú]mula(?:s)?(?:\s+(?:vinculante|stf|stj|tst))?)\b/i
  for (const p of partes) {
    if (reLei.test(p)) return p
  }
  return partes[partes.length - 1] || limpo
}

// Cache memoizado por identidade do objeto disc (invalida quando priorizacaoData
// recebe novo .disciplinas após reanálise). Evita 3 recomputações por render.
const _leisUnicasCache = new WeakMap()
function leisUnicasPorDisciplinaCached(disc) {
  if (!disc) return []
  if (_leisUnicasCache.has(disc)) return _leisUnicasCache.get(disc)
  const r = leisUnicasPorDisciplina(disc)
  _leisUnicasCache.set(disc, r)
  return r
}

/**
 * 3ª aba — leis ÚNICAS da disciplina (sem repetição por assunto/sub-assunto).
 * Agrupa por chaveLei(extrairNomeLei(textoBruto)). Dispositivos e referências
 * cruzadas (assuntos/sub-assuntos que mencionam) são acumulados pra cada lei única.
 */
function leisUnicasPorDisciplina(disc) {
  if (!disc) return []
  const map = new Map()

  function addLei(textoBruto, ctx) {
    if (!textoBruto || typeof textoBruto !== 'string') return
    const nomeLei = extrairNomeLei(textoBruto)
    const chave = chaveLei(nomeLei)
    if (!chave) return
    if (!map.has(chave)) {
      map.set(chave, {
        nomeLei,
        dispositivos: new Set(),
        assuntos: new Set(),
        sub_assuntos: new Set(),
      })
    }
    const e = map.get(chave)
    for (const d of extrairDispositivosLocal(textoBruto)) e.dispositivos.add(d)
    if (ctx.assunto) e.assuntos.add(ctx.assunto)
    if (ctx.sub_assunto) e.sub_assuntos.add(ctx.sub_assunto)
  }

  for (const lei of disc.leis_referencia || []) addLei(lei, {})
  for (const ass of disc.assuntos || []) {
    for (const lei of ass.leis_referencia || []) addLei(lei, { assunto: ass.nome })
    for (const sub of ass.sub_assuntos || []) {
      for (const lei of sub.leis_referencia || []) addLei(lei, { assunto: ass.nome, sub_assunto: sub.nome })
    }
  }

  // Sort numérico (não alfabético) — "1, 2, 10, 20, 100" em vez de "1, 10, 100, 2, 20".
  // Extrai 1º número de cada string ("Arts. 5º" → 5; "art. 142, §1" → 142). Fallback alfabético.
  const sortDispositivos = (a, b) => {
    const numA = parseInt(String(a).match(/\d+/)?.[0] ?? '0')
    const numB = parseInt(String(b).match(/\d+/)?.[0] ?? '0')
    return numA - numB || String(a).localeCompare(String(b))
  }

  return Array.from(map.values()).map(e => ({
    nomeLei: e.nomeLei,
    dispositivos: [...e.dispositivos].sort(sortDispositivos),
    assuntos: [...e.assuntos],
    sub_assuntos: [...e.sub_assuntos],
  }))
}

/**
 * Agrega leis_referencia da disciplina + assuntos + sub_assuntos em normas únicas.
 * Cada norma traz: nomeOriginal, assuntos[], sub_assuntos[], dispositivos[].
 */
function legislacaoPorDisciplina(disc) {
  if (!disc) return []
  const map = new Map() // chave normalizada → entry

  function add(textoBruto, ctx) {
    if (!textoBruto || typeof textoBruto !== 'string') return
    const chave = chaveLei(textoBruto)
    if (!chave) return
    if (!map.has(chave)) {
      map.set(chave, {
        nomeOriginal: textoBruto.trim(),
        assuntos: [],
        sub_assuntos: [],
        dispositivos: extrairDispositivosLocal(textoBruto),
      })
    }
    const e = map.get(chave)
    if (ctx.assunto && !e.assuntos.includes(ctx.assunto)) e.assuntos.push(ctx.assunto)
    if (ctx.sub_assunto && !e.sub_assuntos.includes(ctx.sub_assunto)) e.sub_assuntos.push(ctx.sub_assunto)
    // Acumula dispositivos de outras ocorrências
    for (const d of extrairDispositivosLocal(textoBruto)) {
      if (!e.dispositivos.includes(d)) e.dispositivos.push(d)
    }
  }

  // Nível disciplina
  for (const lei of disc.leis_referencia || []) add(lei, {})
  // Nível assunto
  for (const ass of disc.assuntos || []) {
    for (const lei of ass.leis_referencia || []) {
      add(lei, { assunto: ass.nome })
    }
    // Nível sub-assunto
    for (const sub of ass.sub_assuntos || []) {
      for (const lei of sub.leis_referencia || []) {
        add(lei, { assunto: ass.nome, sub_assunto: sub.nome })
      }
    }
  }

  return Array.from(map.values())
}

function cargaComPeso(disc) {
  const base = disc.carga_estimada_horas || 0
  const peso = disc._peso || 1
  return Math.round(base * peso * 10) / 10
}

function onPesoChange() {
  // Recalcula totalHoras com pesos
  // Os pesos são salvos quando o usuário reorganiza ou salva
}

function scoreClass(score) {
  if (score == null) return 'score--null'
  const v = score * 100
  if (v >= 80) return 'score--high'
  if (v >= 40) return 'score--medium'
  return 'score--low'
}

function trendClass(tendencia) {
  if (tendencia === 'crescente') return 'trend--up'
  if (tendencia === 'decrescente') return 'trend--down'
  return 'trend--stable'
}

function fonteLabel(fonte) {
  const labels = { banca_alvo: 'banca alvo', banca_similar: 'similar', ambas: 'ambas' }
  return labels[fonte] || fonte
}

function tipoLabel(tipo) {
  const labels = { legislacao: 'Lei', jurisprudencia: 'Jur', doutrina: 'Dou', teoria: 'Teo' }
  return labels[tipo] || tipo
}

function tendenciaLabel(t) {
  const labels = { crescente: 'crescente', estavel: 'estável', decrescente: 'decrescente' }
  return labels[t] || t
}

// ── PR6 helpers (Fase 2 frontend) ────────────────────────────

/**
 * Identifica o badge de qualidade do assunto/sub-assunto.
 * Returns: 'no-match' | 'never-covered' | 'small-sample' | null
 */
function qualityBadge(item) {
  if (!item) return null
  // Sem metricas (cargo legado) — sem badge novo
  if (!item.metricas) {
    return item.score == null ? 'no-match' : null
  }
  // Sem match no assunto (mas disc tem match)
  if (item.score == null || item.metricas.sem_match) return 'no-match'
  const cob = item.metricas.anos_que_cobraram ?? 0
  if (cob === 0) return 'never-covered'
  if (cob === 1) return 'small-sample'
  return null
}

function tooltipScore(item) {
  if (!item) return 'Score: —'
  const m = item.metricas
  if (!m || m.sem_match) {
    return `Score: ${item.score != null ? (item.score * 100).toFixed(0) : '—'}`
  }
  const tend = m.tendencia ? tendenciaLabel(m.tendencia) : '—'
  return `Score: ${item.score != null ? (item.score * 100).toFixed(0) : '—'} — Presença ${(m.presenca * 100).toFixed(0)}% × Peso ${m.peso_medio.toFixed(1)}% × Tendência ${tend}`
}

function tooltipPresenca(item) {
  const m = item?.metricas
  if (!m) return ''
  return `Presente em ${m.anos_que_cobraram} de ${m.anos_com_prova} anos importados. Peso médio ${m.peso_medio.toFixed(1)}%`
}

// ── PR7 helpers (recência + score_v1 — Fase 3 frontend) ──────

function recenciaClass(recencia) {
  if (recencia == null) return 'recencia--null'
  if (recencia >= 0.67) return 'recencia--high'
  if (recencia >= 0.34) return 'recencia--medium'
  return 'recencia--low'
}

function formatRecencia(metricas) {
  if (!metricas || metricas.recencia == null) return null
  const cobertos = metricas.recencia_anos_cobertos ?? 0
  const total = metricas.recencia_anos_total ?? 0
  if (total === 0) return null
  return `${cobertos}/${total}`
}

function tooltipRecencia(metricas) {
  if (!metricas || metricas.recencia == null) return ''
  const cobertos = metricas.recencia_anos_cobertos ?? 0
  const total = metricas.recencia_anos_total ?? 0
  if (total === 0) return 'Recência: universo sem anos de prova (caso degenerado)'
  return `Recência: cobriu ${cobertos} dos ${total} anos mais recentes do universo (${(metricas.recencia * 100).toFixed(0)}%)`
}

// Diferença score_v1 → score (PR7 D24) — null em cargos legados (pré-PR7)
function scoreDelta(item) {
  if (!item || item.score == null || item.score_v1 == null) return null
  return item.score - item.score_v1
}

function deltaSignClass(delta) {
  if (delta == null || Math.abs(delta) < 0.005) return 'delta--zero'
  return delta > 0 ? 'delta--up' : 'delta--down'
}

function formatDelta(delta) {
  if (delta == null) return ''
  if (Math.abs(delta) < 0.005) return 'Δ ≈ 0'
  const sign = delta > 0 ? '+' : ''
  return `Δ ${sign}${(delta * 100).toFixed(0)}`
}

// Banner Recalcular (§6.6 / D19): detecta cargos com mistura PR6 + legado.
// Disciplina PR6 sem match TEM `metricas` (com `sem_match: true`) — não conta como legada.
const disciplinasLegadas = computed(() =>
  (priorizacaoData.value.disciplinas || []).filter(d => !d.metricas)
)
const temDisciplinaLegada = computed(() => disciplinasLegadas.value.length > 0)
// Flag: recálculo já foi tentado nesta sessão (ou numa sessão anterior persistida).
// Evita que o banner de "versão antiga" reapareça quando o backend não tem histórico
// suficiente para preencher `metricas` em todas as disciplinas.
const recalculoJaRealizado = ref(false)
const bannerSemMatchOculto = ref(false)

// Cobertura média (§6.5 / D19) — só sobre disciplinas com metricas
const coberturaMatchMedia = computed(() => {
  const arr = (priorizacaoData.value.disciplinas || [])
    .map(d => d.metricas?.cobertura_match)
    .filter(c => c != null)
  if (!arr.length) return null
  return arr.reduce((a, b) => a + b, 0) / arr.length
})

// Aviso de fonte da cascata (§6.5 / D14)
const avisoFonteCascata = computed(() => {
  const meta = priorizacaoMeta.value
  if (!meta) return null
  const maj = meta.fonte_cascata_majoritaria
  if (!maj) return null

  const fontes = (priorizacaoData.value.disciplinas || [])
    .map(d => d.fonte_cascata)
    .filter(Boolean)
  const ideais = fontes.filter(f => f === 'banca_alvo_area_alvo').length

  if (maj === 'banca_alvo_area_alvo' && ideais === fontes.length) return null

  if (maj === 'banca_alvo_area_alvo' && ideais < fontes.length) {
    return {
      severidade: 'soft',
      titulo: `${fontes.length - ideais} de ${fontes.length} disciplinas usaram fontes alternativas`,
      detalhe: 'Maioria está com a banca/área alvo, mas algumas disciplinas caíram em níveis de fallback.',
    }
  }

  const labels = {
    banca_alvo_qualquer_area: {
      titulo: 'Histórico desta área é esparso para a banca',
      detalhe: 'Maioria das disciplinas usa dados de outras áreas da mesma banca como referência.',
    },
    outras_bancas_area_alvo: {
      titulo: 'Histórico desta banca é esparso',
      detalhe: 'Maioria das disciplinas usa dados de outras bancas na mesma área.',
    },
    qualquer: {
      titulo: 'Histórico muito esparso — interpretar com cautela',
      detalhe: 'Maioria das disciplinas usa média geral de bancas/áreas heterogêneas. Métricas podem não refletir o estilo da banca.',
    },
  }
  return { severidade: 'strong', ...(labels[maj] || { titulo: 'Fonte alternativa em uso', detalhe: '' }) }
})

/**
 * Recalcula priorização de TODAS as disciplinas do cargo, em fila sequencial.
 *
 * Trade-off de design (decisão consciente — Opção A da revisão UX 2026-05-08):
 * - **8× mais chamadas IA** que a versão antiga (1 disc = 1 chamada vs 1 chamada total).
 *   Pra cargo com 8 disciplinas: 8 chamadas Fase 1 + 8 chamadas Fase 2 = 16 IA calls.
 * - Ganho: feedback visual disc por disc + falha grácil (1 disc falha não derruba o resto).
 * - F2: criar endpoint backend que processa N disciplinas com SSE/progress callback (1 IA call total + feedback granular).
 */
/**
 * Reanaliza UMA disciplina específica (Fase 1 + Fase 2). Útil quando uma disc específica
 * caiu em fallback (sem score) ou o mentor quer atualizar só ela após mudança no edital.
 */
async function reanalisarDisciplina(nomeDisc) {
  if (!nomeDisc) return
  if (modoAnalise.value === 'tudo') return                  // recalc-tudo bloqueia tudo
  const disc = priorizacaoData.value.disciplinas?.find(d => d.nome === nomeDisc)
  if (!disc) return
  if (disc._analiseStatus === 'processando') return         // guard per-disc anti-double-click

  // PR8: reanálise individual NÃO bloqueia outras disc. Mentor pode rodar 3 em paralelo.
  // Risco: race no backend (cada chamada lê cargo → modifica → grava). Last-write-wins.
  // Em prática, raro porque mentor não clica 3 simultâneo; aceito como trade-off MVP.
  disc._analiseStatus = 'processando'
  disc._analiseFase = 'classificando + priorizando...'

  try {
    await cargoStore.analisarConteudo(editalId.value, cargoId.value, {
      area: cargo.value?.area || '',
      disciplinas: [nomeDisc],
    })
    disc._analiseStatus = 'concluido'
    disc._analiseFase = ''

    // Refetch cargo pra refletir mudança. NÃO reseta prioState — preserva expansão das outras disc.
    const updated = await cargoStore.fetchCargo(editalId.value, cargoId.value)
    if (updated?.priorizacao?.disciplinas?.length) {
      priorizacaoData.value = updated.priorizacao
      priorizacaoMeta.value = updated.priorizacao._meta || null
      // initPrioState() NÃO chamado: chaves do prioState são `disc.nome::ass.nome`,
      // que continuam válidas após reanálise (mesmo se objeto disc é novo).
      toast.success(`"${nomeDisc}" reanalisada com sucesso.`)
    }
  } catch (err) {
    disc._analiseStatus = 'erro'
    disc._analiseFase = err.message || 'Erro'
    toast.error(`Erro ao reanalisar "${nomeDisc}": ${err.message || 'desconhecido'}`)
  }
}

function resetarFlagRecalculo() {
  recalculoJaRealizado.value = false
  bannerSemMatchOculto.value = false
  localStorage.removeItem(`recalc_done_${cargoId.value}`)
  localStorage.removeItem(`recalc_hide_${cargoId.value}`)
}

function ocultarBannerSemMatch() {
  bannerSemMatchOculto.value = true
  localStorage.setItem(`recalc_hide_${cargoId.value}`, '1')
}

async function recalcularTudoPR6() {
  if (analisando.value) return                           // guard clause anti-double-click
  if (!disciplinasLegadas.value.length) return
  const nomes = disciplinasLegadas.value.map(d => d.nome)

  analisando.value = true
  modoAnalise.value = 'tudo'
  filaProcessadas.value = 0
  filaTotalSelecionadas.value = nomes.length

  // Reset status de todas (mesmo padrão de iniciarAnalise — usa disc._analiseStatus em vez de state separado)
  for (const d of priorizacaoData.value.disciplinas) {
    d._analiseStatus = 'aguardando'
    d._analiseFase = ''
  }

  let algumSucesso = false
  let qtdSucesso = 0
  let qtdErro = 0
  const errosResumo = []

  try {
    for (const nome of nomes) {
      const disc = priorizacaoData.value.disciplinas.find(d => d.nome === nome)
      if (disc) {
        disc._analiseStatus = 'processando'
        disc._analiseFase = 'classificando + priorizando...'
      }

      try {
        await cargoStore.analisarConteudo(editalId.value, cargoId.value, {
          area: cargo.value?.area || '',
          disciplinas: [nome],
        })
        if (disc) { disc._analiseStatus = 'concluido'; disc._analiseFase = '' }
        algumSucesso = true
        qtdSucesso++
      } catch (err) {
        if (disc) { disc._analiseStatus = 'erro'; disc._analiseFase = err.message || 'Erro' }
        qtdErro++
        errosResumo.push(`"${nome}": ${err.message || 'desconhecido'}`)
      }
      filaProcessadas.value++
    }

    // Busca o cargo final com toda a priorização acumulada
    if (algumSucesso) {
      const updated = await cargoStore.fetchCargo(editalId.value, cargoId.value)
      if (updated?.priorizacao?.disciplinas?.length) {
        priorizacaoData.value = updated.priorizacao
        priorizacaoMeta.value = updated.priorizacao._meta || null
        initPrioState()
      }
    }

    // Toast consolidado (1 só, em vez de N — evita spam em cargos grandes)
    if (qtdErro === 0) {
      toast.success(`${qtdSucesso} disciplina${qtdSucesso > 1 ? 's' : ''} recalculada${qtdSucesso > 1 ? 's' : ''} com sucesso.`)
    } else if (qtdSucesso === 0) {
      toast.error(`Falha em todas as ${qtdErro} disciplinas. Veja detalhes na lista acima.`)
    } else {
      toast.warn?.(`${qtdSucesso} OK + ${qtdErro} com erro. Detalhes na lista.`) ||
        toast.success(`${qtdSucesso} OK + ${qtdErro} com erro. Detalhes na lista acima.`)
    }
    if (errosResumo.length) console.warn('[recalcularTudoPR6] erros:', errosResumo)
  } catch (err) {
    toast.error(`Erro inesperado durante recálculo: ${err.message || 'desconhecido'}`)
  } finally {
    analisando.value = false
    modoAnalise.value = null
    recalculoJaRealizado.value = true
    localStorage.setItem(`recalc_done_${cargoId.value}`, '1')
  }
}

const totalHoras = computed(() => {
  let h = 0
  for (const d of priorizacaoData.value.disciplinas || []) {
    const peso = d._peso || 1
    h += (d.carga_estimada_horas || 0) * peso
  }
  return Math.round(h)
})

const totalSemanas = computed(() => {
  let max = 0
  for (const d of priorizacaoData.value.disciplinas || []) {
    if (d.sugestao_semana > max) max = d.sugestao_semana
    for (const a of d.assuntos || []) {
      if (a.sugestao_semana > max) max = a.sugestao_semana
    }
  }
  return max
})

async function salvarEVoltar() {
  router.push(`/editais/${editalId.value}/cargos`)
}

// ── Reorganização ────────────────────────────────────────────

const showReorganizar = ref(false)
const reorganizando = ref(false)
const aplicandoReorg = ref(false)
const reorgConfig = ref({ horasPorDia: 4, diasPorSemana: 6, semanasRevisao: 2, dataBase: null })
const reorgResult = ref(null)
const reorgOpcaoSelecionada = ref(null)

const hoje = new Date().toISOString().split('T')[0]

const planIdParaCargo = computed(() =>
  planStore.plans.find(p => p.cargoId === cargoId.value)?.id ?? null
)

const provaPassada = computed(() => {
  if (!edital.value?.data_prova) return false
  return editalStore.countdown(edital.value.data_prova)?.passado === true
})

const reorganizacaoHabilitada = computed(() => !provaPassada.value || !!reorgConfig.value.dataBase)

const semanasDisponiveisCalc = computed(() => {
  const dataRef = reorgConfig.value.dataBase || edital.value?.data_prova
  if (!dataRef) return null
  const countdown = editalStore.countdown(dataRef)
  if (!countdown || countdown.passado) return null
  const dias = countdown.total || 0
  return Math.max(1, Math.floor(dias / 7) - reorgConfig.value.semanasRevisao)
})

const temAlertaSemanas = computed(() => {
  if (!semanasDisponiveisCalc.value) return false
  return totalSemanas.value > semanasDisponiveisCalc.value
})

const labelIntensidade = computed(() => {
  if (!semanasDisponiveisCalc.value || !totalSemanas.value) return null
  const ratio = semanasDisponiveisCalc.value / totalSemanas.value
  if (ratio < 0.3) return { texto: 'Plano de alto risco', classe: 'intens--risco' }
  if (ratio < 0.5) return { texto: 'Muito apertado', classe: 'intens--apertado' }
  if (ratio < 0.7) return { texto: 'Tempo arrojado', classe: 'intens--arrojado' }
  return null
})

async function calcularOpcoes() {
  reorganizando.value = true
  reorgResult.value = null
  reorgOpcaoSelecionada.value = null
  try {
    // Inclui pesos das disciplinas na config
    const pesos = {}
    for (const d of priorizacaoData.value.disciplinas || []) {
      if (d._peso && d._peso !== 1) pesos[d.nome] = d._peso
    }
    reorgResult.value = await cargoService.reorganizar(editalId.value, cargoId.value, { ...reorgConfig.value, pesos, planId: planIdParaCargo.value })
    // Auto-seleciona opção B se tem déficit (é a mais equilibrada)
    if (reorgResult.value.diagnostico?.temDeficit) {
      const opcaoB = reorgResult.value.opcoes.find(o => o.tipo === 'cortar_conteudo')
      if (opcaoB) reorgOpcaoSelecionada.value = 'cortar_conteudo'
    } else {
      reorgOpcaoSelecionada.value = 'ok'
    }
  } catch (err) {
    toast.error(err.message)
  } finally {
    reorganizando.value = false
  }
}

async function aplicarReorganizacao() {
  if (!reorgOpcaoSelecionada.value) return
  aplicandoReorg.value = true
  try {
    const pesos = {}
    for (const d of priorizacaoData.value.disciplinas || []) {
      if (d._peso && d._peso !== 1) pesos[d.nome] = d._peso
    }
    const result = await cargoService.aplicarReorganizacao(editalId.value, cargoId.value, {
      opcao: reorgOpcaoSelecionada.value,
      config: { ...reorgConfig.value, pesos },
      planId: planIdParaCargo.value,
    })
    // Atualiza dados locais
    if (result?.priorizacao?.disciplinas?.length) {
      priorizacaoData.value = result.priorizacao
      priorizacaoMeta.value = result.priorizacao._meta || null
      initPrioState()
    }
    showReorganizar.value = false
    reorgResult.value = null
    toast.success('Reorganização aplicada!')
  } catch (err) {
    toast.error(err.message)
  } finally {
    aplicandoReorg.value = false
  }
}

// Gerar Plano: agora usa view dedicada /plano

// Inicializa tree state quando entra no resultado
watch(estado, (val) => {
  if (val === 'resultado') initTreeState()
})

// ── Vinculação de Normas (Estado 5 — modelo norma-centric, PR5) ──

const leisVinculadas = ref({ _meta: {}, normas: [] })
const regenerandoLeis = ref(false)

async function abrirVinculacao() {
  const cargoIdInicial = cargoId.value
  try {
    estado.value = 'vinculacao'
    regenerandoLeis.value = true
    const result = await cargoStore.getLeisSugestoes(editalId.value, cargoIdInicial)
    if (cargoIdInicial !== cargoId.value) return // navegou pra outro cargo, ignora
    leisVinculadas.value = result || { _meta: {}, normas: [] }
  } catch (err) {
    if (cargoIdInicial === cargoId.value) {
      // toast já é mostrado pelo store; voltar à priorização
      estado.value = 'priorizacao'
    }
  } finally {
    if (cargoIdInicial === cargoId.value) regenerandoLeis.value = false
  }
}

async function regerarLeis() {
  // Captura o cargoId no início pra detectar se o usuário navegou pra outro cargo
  // antes da Promise resolver (race condition em SPA navigation rápida).
  const cargoIdInicial = cargoId.value
  regenerandoLeis.value = true
  try {
    const result = await cargoStore.regerarLeisSugestoes(editalId.value, cargoIdInicial)
    if (cargoIdInicial !== cargoId.value) return // navegou pra outro cargo, ignora
    leisVinculadas.value = result || { _meta: {}, normas: [] }
  } finally {
    if (cargoIdInicial === cargoId.value) regenerandoLeis.value = false
  }
}

async function vincularLei({ normaId, lawId }, done) {
  try {
    const normaAtualizada = await cargoStore.vincularLei(editalId.value, cargoId.value, { normaId, lawId })
    atualizarNormaLocal(normaAtualizada)
  } finally {
    done?.()
  }
}

async function desvincularLei(normaId, done) {
  try {
    const normaAtualizada = await cargoStore.desvincularLei(editalId.value, cargoId.value, normaId)
    atualizarNormaLocal(normaAtualizada)
  } finally {
    done?.()
  }
}

async function mudarStatusLei({ normaId, status }, done) {
  try {
    const normaAtualizada = await cargoStore.mudarStatusLei(editalId.value, cargoId.value, normaId, status)
    atualizarNormaLocal(normaAtualizada)
  } finally {
    done?.()
  }
}

function atualizarNormaLocal(normaAtualizada) {
  if (!normaAtualizada || !leisVinculadas.value?.normas) return
  const idx = leisVinculadas.value.normas.findIndex(n => n.id === normaAtualizada.id)
  if (idx !== -1) {
    leisVinculadas.value.normas[idx] = normaAtualizada
    leisVinculadas.value._meta = { ...leisVinculadas.value._meta, ...recontar(leisVinculadas.value.normas) }
  }
}

/**
 * Recalcula apenas as contagens. NÃO inclui timestamps — o backend é fonte
 * de verdade para `ultimaAtualizacaoEm`/`geradoEm`. Se incluíssemos aqui,
 * o front divergiria do back em ~300ms.
 */
function recontar(normas) {
  const arr = normas || []
  return {
    totalNormas: arr.length,
    confirmadas: arr.filter(n => n.status === 'confirmada').length,
    confirmadas_obsoletas: arr.filter(n => n.status === 'confirmada_obsoleta').length,
    sugeridas: arr.filter(n => n.status === 'sugerida').length,
    ambiguas: arr.filter(n => n.status === 'ambigua').length,
    pendentes: arr.filter(n => n.status === 'pendente').length,
    nao_encontradas: arr.filter(n => n.status === 'nao_encontrada').length,
  }
}

// ── Mount ────────────────────────────────────────────────────

onMounted(async () => {
  // Reset state local para não vazar dados de cargo anterior na navegação SPA
  leisVinculadas.value = { _meta: {}, normas: [] }
  conteudoParseado.value = { disciplinas: [] }
  segmentacao.value = { disciplinas: [], padrao: {} }
  textoBruto.value = ''
  priorizacaoData.value = { disciplinas: [] }
  priorizacaoMeta.value = null
  recalculoJaRealizado.value = !!localStorage.getItem(`recalc_done_${cargoId.value}`)
  bannerSemMatchOculto.value = !!localStorage.getItem(`recalc_hide_${cargoId.value}`)

  try {
    await Promise.all([
      editalStore.fetchEdital(editalId.value),
      cargoStore.fetchCargo(editalId.value, cargoId.value),
      dictsStore.fetchByTipo('disciplina'),
    ])

    // Se o cargo já tem leis_vinculadas no doc, hidrata pra UI ter dado quando entrar
    if (cargo.value?.leis_vinculadas) {
      leisVinculadas.value = JSON.parse(JSON.stringify(cargo.value.leis_vinculadas))
    }

    // Decide o estado de entrada baseado no que o cargo já tem (prioridade descendente)
    if (cargo.value?.priorizacao?.disciplinas?.length) {
      conteudoParseado.value = JSON.parse(JSON.stringify(cargo.value.conteudo_parseado))
      priorizacaoData.value = cargo.value.priorizacao
      priorizacaoMeta.value = cargo.value.priorizacao._meta || null
      initPrioState()
      estado.value = 'priorizacao'
    } else if (cargo.value?.conteudo_parseado?.disciplinas?.length) {
      conteudoParseado.value = JSON.parse(JSON.stringify(cargo.value.conteudo_parseado))
      estado.value = 'resultado'
    } else {
      estado.value = 'entrada'
    }

    // Restaura texto bruto: backend tem prioridade (fonte de verdade entre dispositivos).
    // localStorage só vale como fallback se o backend não tem nada (ex: usuário digitou
    // mas ainda não clicou "Processar Regex" — texto persiste local até o próximo PATCH).
    if (cargo.value?.conteudo_bruto) {
      textoBruto.value = cargo.value.conteudo_bruto
      // Se o local diverge do backend, prioriza backend e atualiza o cache local
      localStorage.setItem(storageKey.value, cargo.value.conteudo_bruto)
    } else {
      const saved = localStorage.getItem(storageKey.value)
      if (saved) textoBruto.value = saved
    }
  } catch (err) {
    console.error('[CargoConteudoView.onMounted]', err)
    toast.error(`Não foi possível carregar o cargo: ${err.message || 'erro de rede'}`)
  } finally {
    mounting.value = false
  }
})

// ── Gerador de tarefas a partir da priorização do cargo ───────────────
const taskGenerator = ref({
  aberto: false,
  candidates: [],
  disciplineName: '',
  contextoPlano: {},
  origemDados: {},
})

// Dropdown da action-bar "Criar tarefas" — lista disciplinas com candidates
const menuCriarTasksAberto = ref(false)
const disciplinasComCandidates = computed(() =>
  (priorizacaoData.value.disciplinas || [])
    .filter(d => (d.assuntos || []).some(a => !a.cortado))
)

// Fecha o menu ao clicar fora
function fecharMenuCriarTasks() { menuCriarTasksAberto.value = false }
onMounted(() => window.addEventListener('click', fecharMenuCriarTasks))
onBeforeUnmount(() => window.removeEventListener('click', fecharMenuCriarTasks))

function abrirGeradorTasks(disc) {
  // `edital` é computed (editalStore.editalAtual) já no escopo
  const ed = edital.value || {}
  const contexto = {
    editalId: editalId.value,
    cargoId: cargoId.value,
    bancaEdital: ed.banca || null,
    areaEdital: ed.area || null,
  }
  const { candidates } = cargoToCandidates(cargo.value, disc.nome, contexto)
  if (!candidates.length) {
    toast.error('Nenhum assunto disponível nessa disciplina.')
    return
  }
  taskGenerator.value = {
    aberto: true,
    candidates,
    disciplineName: disc.nome,
    contextoPlano: {
      cargoId: cargoId.value,
      editalId: editalId.value,
      banca: ed.banca || null,
      area: ed.area || null,
    },
    origemDados: {
      cargoOrigem: cargoId.value,
      editalOrigem: editalId.value,
      bancaOrigem: ed.banca || null,
      areaOrigem: ed.area || null,
      disciplinaOrigem: disc.nome,
    },
  }
}

function onTasksCriadas({ planId, tasks, partial }) {
  taskGenerator.value.aberto = false
  if (partial) {
    // Plano criado mas bulk falhou — toast com ação (não redireciona automático
    // pra não arrancar mentor da view de priorização que ele estava).
    toast.warning('Plano criado mas algumas tarefas falharam.', {
      action: {
        label: 'Abrir workspace',
        onClick: () => router.push(`/workspace?plan=${planId}`),
      },
    })
    return
  }
  // Mentor pode estar gerando tasks de várias disciplinas em sequência.
  toast.success(`${tasks.length} tarefa(s) criada(s) no plano.`, {
    action: {
      label: 'Abrir workspace',
      onClick: () => router.push(`/workspace?plan=${planId}`),
    },
  })
}

</script>

<style scoped>
.conteudo-view { max-width: 1200px; display: flex; flex-direction: column; gap: 20px; }

/* Header */
.conteudo-view__header { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 13px; }
.btn-imprimir {
  margin-left: auto;
  display: inline-flex; align-items: center; gap: 6px;
  font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 600;
  color: #7C2D2A; background: transparent;
  border: 1px solid #7C2D2A; border-radius: 8px;
  padding: 6px 12px; cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.btn-imprimir:hover { background: #7C2D2A; color: #fff; }
/* Mobile: no wrap do header, mantém botão visível mas compacto.
   Padding 8/12 garante click area ~40×32px (próximo do mínimo iOS 44px). */
@media (max-width: 640px) {
  .btn-imprimir { margin-left: 0; padding: 8px 12px; font-size: 11px; }
  .btn-imprimir span { display: none; }
}
.breadcrumb__item { color: #534AB7; cursor: pointer; font-weight: 500; }
.breadcrumb__item:hover { text-decoration: underline; }
.breadcrumb__sep { color: #ccc; }
.breadcrumb__current { color: #1a1a2e; font-weight: 600; }

.section-header { margin-bottom: 8px; }
.section-header--row {
  display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap;
}
.toggle-relevancia {
  display: flex; align-items: center; gap: 8px;
  background: #fafaf8; border: 1px solid #ebe9e4; border-radius: 8px;
  padding: 6px 12px; user-select: none;
  transition: background 0.15s, border-color 0.15s;
}
.toggle-relevancia:hover { background: #f5f4f0; border-color: #d4d3ce; }
.toggle-relevancia input[type="checkbox"] {
  accent-color: #534AB7; cursor: pointer; margin: 0;
}
.toggle-relevancia label {
  font-size: 12px; color: #475569; font-weight: 500;
  cursor: pointer; user-select: none;
  display: flex; align-items: center; gap: 6px;
}
.toggle-relevancia__hint {
  font-size: 10px; color: #94A3B8; font-weight: 400; font-style: italic;
}
.toggle-relevancia--disabled {
  opacity: 0.55; cursor: not-allowed;
}
.toggle-relevancia--disabled label,
.toggle-relevancia--disabled input { cursor: not-allowed; }
.toggle-relevancia--disabled:hover {
  background: #fafaf8; border-color: #ebe9e4;
}
.section-title { font-size: 1.1rem; font-weight: 700; color: #1a1a2e; margin: 0 0 4px; }
.section-desc { font-size: 12px; color: #aaa; margin: 0; }
.highlight-demo {
  background: #FFF3E0; color: #E65100; padding: 1px 6px; border-radius: 3px;
  font-weight: 600; font-size: 11px;
}

/* ── Estado 1: Entrada ──────────────────────────────────── */
.estado-entrada { display: flex; flex-direction: column; gap: 16px; }
.textarea-bruto {
  width: 100%; padding: 16px; border: 1px solid #ddd; border-radius: 12px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 12px;
  line-height: 1.6; color: #1a1a2e; resize: vertical; min-height: 300px;
  transition: border-color 0.15s;
}
.textarea-bruto:focus { outline: none; border-color: #534AB7; }

/* ── Estado 2: Preview ──────────────────────────────────── */
.estado-preview { display: flex; flex-direction: column; gap: 16px; }

.preview-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; min-height: 400px; }
@media (max-width: 900px) { .preview-layout { grid-template-columns: 1fr; } }

.preview-col {
  background: #fff; border: 1px solid #ebe9e4; border-radius: 12px;
  padding: 16px; overflow-y: auto; max-height: 600px;
}
.col-title { font-size: 13px; font-weight: 700; color: #1a1a2e; margin: 0 0 12px; }

/* Texto highlighted */
.texto-highlighted {
  font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 11px;
  line-height: 1.7; color: #444;
}
.texto-highlighted :deep(.hl-disciplina) {
  font-weight: 700; color: #1e40af; background: #EFF6FF;
  padding: 2px 6px; border-radius: 3px; margin: 4px 0;
}
.texto-highlighted :deep(.hl-anomalia) {
  background: #FFF3E0; border-left: 3px solid #F57C00;
  padding: 2px 6px; border-radius: 0 3px 3px 0; margin: 2px 0;
  cursor: help;
}

/* Disciplina cards */
.disc-card {
  border: 1px solid #ebe9e4; border-radius: 10px; margin-bottom: 8px; overflow: hidden;
}
.disc-card--nao-identificado { border-color: #FED7AA; background: #FFFBF5; }

.disc-card__header {
  display: flex; align-items: center; gap: 8px; padding: 10px 12px;
  background: #fafaf8; cursor: pointer;
}
.disc-card__toggle { transition: transform 0.2s; }
.disc-card__toggle .rotated { transform: rotate(-90deg); }
.disc-card__name-input {
  flex: 1; border: none; background: transparent;
  font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; color: #1a1a2e;
}
.disc-card__name-input:focus { outline: none; background: #fff; border-radius: 4px; padding: 2px 6px; }

.anomaly-count {
  font-size: 10px; font-weight: 700; background: #FFF3E0; color: #E65100;
  padding: 2px 8px; border-radius: 10px;
}

/* Parse status badges */
.parse-status {
  font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 10px;
  display: flex; align-items: center; gap: 4px; white-space: nowrap;
}
.char-count {
  font-size: 10px; font-weight: 600; color: #9CA3AF; white-space: nowrap;
}
.char-count--warn { color: #D97706; }
.char-count--over { color: #DC2626; font-weight: 700; }

.parse-status--processando { background: #EFF6FF; color: #2563EB; }
.parse-status--concluido { background: #F0FDF4; color: #16A34A; }
.parse-status--erro { background: #FEF2F2; color: #DC2626; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.disc-card__body { padding: 12px; }
.disc-card__textarea {
  width: 100%; border: 1px solid #eee; border-radius: 8px; padding: 10px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 11px;
  line-height: 1.6; color: #444; resize: vertical;
}
.disc-card__textarea:focus { outline: none; border-color: #534AB7; }

.anomalias-list {
  display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px;
}
.anomalia-item {
  display: flex; align-items: flex-start; gap: 6px; font-size: 11px;
  color: #E65100; background: #FFF8E1; padding: 4px 8px; border-radius: 4px;
}

/* Parse mode */
.parse-mode { display: flex; gap: 12px; }
.parse-mode__label {
  display: flex; align-items: center; gap: 4px; font-size: 12px; color: #666; cursor: pointer;
}

.disc-select {
  display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 0; align-items: center;
}
.disc-select__toggle {
  font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 600;
  color: #534AB7; background: none; border: 1px solid #534AB7;
  border-radius: 6px; padding: 3px 10px; cursor: pointer;
  transition: background 0.15s;
}
.disc-select__toggle:hover { background: #EEF2FF; }
.disc-select__item {
  display: flex; align-items: center; gap: 4px; font-size: 12px; color: #444;
  background: #f5f4f0; padding: 4px 10px; border-radius: 6px; cursor: pointer;
}

/* ── Estado 3: Resultado (árvore) ───────────────────────── */
.estado-resultado { display: flex; flex-direction: column; gap: 16px; }

.tree {
  background: #fff; border: 1px solid #ebe9e4; border-radius: 12px;
  padding: 20px; display: flex; flex-direction: column; gap: 16px;
}

.tree__disc { margin-bottom: 12px; }
.tree__assunto { padding-left: 24px; }
.tree__sub { padding-left: 24px; }
.tree__subsub-list { padding-left: 24px; }

.tree__node {
  display: flex; align-items: center; gap: 8px; padding: 4px 0;
}
.tree__icon { flex-shrink: 0; }
.tree__icon--disc { color: #534AB7; }
.tree__icon--assunto { color: #2563EB; }
.tree__icon--sub { color: #7C3AED; }
.tree__icon--subsub { color: #9CA3AF; }

.tree__input {
  flex: 1; border: none; border-bottom: 1px solid transparent;
  font-family: 'DM Sans', sans-serif; font-size: 13px; color: #1a1a2e;
  padding: 2px 4px; transition: border-color 0.15s;
}
.tree__input:hover { border-bottom-color: #ddd; }
.tree__input:focus { outline: none; border-bottom-color: #534AB7; }
.tree__input--disc { font-weight: 700; font-size: 14px; }
.tree__input--sm { font-size: 12px; }
.tree__input--xs { font-size: 11px; color: #666; }

.tree__fontes {
  display: flex; flex-wrap: wrap; gap: 4px; padding: 2px 0 4px 22px;
}
.fonte-tag {
  display: flex; align-items: center; gap: 3px;
  font-size: 10px; font-weight: 600; background: #F0F9FF; color: #0369A1;
  padding: 2px 8px; border-radius: 4px;
}
.fonte-tag__remove {
  background: none; border: none; color: #0369A1; cursor: pointer;
  font-size: 12px; padding: 0; line-height: 1;
}
.fonte-tag__remove:hover { color: #DC2626; }

/* ── Shared ─────────────────────────────────────────────── */
.action-bar {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; flex-wrap: wrap; padding-top: 8px;
  border-top: 1px solid #ebe9e4;
}
.action-bar__right { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }

/* Dropdown "Criar tarefas" — disciplina picker */
.action-bar__menu-wrap { position: relative; }
.action-bar__menu {
  position: absolute; right: 0; top: calc(100% + 6px);
  min-width: 240px; max-height: 320px; overflow-y: auto;
  background: #fff; border: 1px solid #ebe9e4; border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  padding: 6px; z-index: 50;
}
.action-bar__menu-hint {
  font-size: 11px; font-weight: 600; color: #888;
  text-transform: uppercase; letter-spacing: 0.05em;
  padding: 6px 10px 4px; margin: 0;
}
.action-bar__menu-item {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  width: 100%; padding: 7px 10px;
  background: transparent; border: none; border-radius: 6px;
  font-family: 'DM Sans', sans-serif; font-size: 13px; color: #1a1a2e;
  cursor: pointer; text-align: left;
}
.action-bar__menu-item:hover { background: #EEEDFE; color: #534AB7; }
.action-bar__menu-item-nome { flex: 1; }
.action-bar__menu-item-count {
  font-size: 11px; color: #888; font-weight: 600;
  background: #f5f4f0; border-radius: 999px; padding: 1px 8px;
}
.action-bar__menu-item:hover .action-bar__menu-item-count {
  background: #fff; color: #534AB7;
}

.btn-primary {
  display: flex; align-items: center; gap: 6px;
  font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600;
  background: #534AB7; color: #fff; border: none; border-radius: 8px; padding: 8px 16px;
  cursor: pointer; transition: background 0.15s;
}
.btn-primary:hover { background: #3C3489; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-ghost {
  display: flex; align-items: center; gap: 4px;
  font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500;
  background: transparent; border: none; color: #666; cursor: pointer;
  padding: 6px 10px; border-radius: 6px; transition: background 0.15s;
}
.btn-ghost:hover { background: #f5f4f0; }
.btn-ghost--danger { color: #DC2626; }
.btn-ghost--danger:hover { background: #FEF2F2; }

.btn-outline {
  display: flex; align-items: center; gap: 6px;
  font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500;
  background: #fff; color: #444; border: 1px solid #ddd; border-radius: 8px; padding: 7px 14px;
  cursor: pointer; transition: background 0.15s;
}
.btn-outline:hover { background: #f5f4f0; }
.btn-outline--full { width: 100%; justify-content: center; }

.icon-btn {
  width: 28px; height: 28px; border-radius: 7px; border: none; background: transparent;
  padding: 0; display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #aaa; transition: background 0.15s, color 0.15s;
}
.icon-btn:hover { background: #f0efea; color: #444; }
.icon-btn--sm { width: 22px; height: 22px; }
.icon-btn--accent { color: #2563EB; }
.icon-btn--accent:hover { background: #EFF6FF; color: #1D4ED8; }

/* Action section */
.action-section {
  background: #fff; border: 1px solid #ebe9e4; border-radius: 12px; padding: 16px;
}
.action-section__header {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;
}
.action-section__title { font-size: 13px; font-weight: 700; color: #1a1a2e; margin: 0; }
.action-section__desc { font-size: 12px; color: #aaa; margin: 0; }

/* Fila de análise */
.disc-select__item--done { background: #F0FDF4; }
.disc-select__item--erro { background: #FEF2F2; }
.disc-select__fase { font-size: 9px; color: #888; font-style: italic; }
.analise-ok { color: #16A34A; }
.analise-err { color: #DC2626; }

.fila-progresso { display: flex; align-items: center; gap: 8px; }
.fila-progresso__bar {
  flex: 1; height: 6px; background: #ebe9e4; border-radius: 3px; overflow: hidden;
}
.fila-progresso__fill {
  height: 100%; background: #16A34A; border-radius: 3px; transition: width 0.4s ease;
}
.fila-progresso__text { font-size: 11px; color: #888; font-weight: 600; white-space: nowrap; }
.action-buttons { display: flex; gap: 8px; margin-top: 10px; }

/* Button variants */
.btn-primary--accent { background: #16A34A; }
.btn-primary--accent:hover { background: #15803D; }

/* ── Priorização ────────────────────────────────────────── */
.estado-priorizacao { display: flex; flex-direction: column; gap: 16px; }
.estado-vinculacao { display: flex; flex-direction: column; gap: 16px; }

/* Loading inicial — esconde toda a UI até o onMounted terminar */
.estado-loading {
  display: flex; align-items: center; justify-content: center;
  min-height: 60vh;
}
.loading-card {
  display: flex; flex-direction: column; align-items: center; gap: 24px;
  background: #fff; border: 1px solid #ebe9e4; border-radius: 14px;
  padding: 48px 56px; max-width: 420px; width: 100%;
}
.loading-spinner-wrapper { color: #534AB7; }
.loading-card__text {
  font-size: 13px; color: #888; margin: 0;
}
.loading-skeleton {
  display: flex; flex-direction: column; gap: 10px; width: 100%;
}
.loading-skeleton .skeleton-line {
  background: linear-gradient(90deg, #f0efea 0%, #fafaf8 50%, #f0efea 100%);
  background-size: 200% 100%;
  animation: cargoConteudoSkeletonShine 1.4s ease-in-out infinite;
  border-radius: 6px;
}
.skeleton-line--header { width: 80%; height: 12px; }
.skeleton-line--block  { width: 100%; height: 32px; border-radius: 8px; }
@keyframes cargoConteudoSkeletonShine {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.prio-meta { font-size: 11px; color: #888; display: block; margin-top: 4px; }

/* Contexto da análise (banca/área/provas) */
.prio-contexto {
  display: flex; flex-wrap: wrap; align-items: center; gap: 4px 6px;
  margin-top: 8px; font-size: 12px; color: #64748B;
}
.prio-contexto__label { color: #94A3B8; }
.prio-contexto__sep { color: #CBD5E1; }
.prio-contexto__hint { font-size: 10px; color: #94A3B8; font-style: italic; margin-left: 2px; }
.prio-contexto__item { display: inline-flex; align-items: center; gap: 3px; }
.prio-contexto__item--warn { color: #B45309; font-weight: 500; }
.prio-contexto__item--warn svg { flex-shrink: 0; }
.prio-contexto__item--muted { color: #94A3B8; font-style: italic; }
.prio-contexto-alerta {
  display: flex; align-items: flex-start; gap: 6px;
  margin-top: 8px; padding: 8px 10px;
  background: #FFFBEB; border: 1px solid #FCD34D; border-radius: 6px;
  font-size: 12px; color: #92400E; line-height: 1.5;
}
.prio-contexto-alerta svg { flex-shrink: 0; margin-top: 1px; color: #B45309; }
.prio-link { color: #534AB7; text-decoration: underline; }

.prio-list {
  background: #fff; border: 1px solid #ebe9e4; border-radius: 12px;
  padding: 16px; display: flex; flex-direction: column; gap: 4px;
}

.prio-disc { border-bottom: 1px solid #f5f4f0; padding-bottom: 4px; }
.prio-disc:last-child { border-bottom: none; }

/* Tabs Assuntos | Legislação */
.prio-tabs {
  display: flex; gap: 4px; padding: 8px 0 4px 24px;
  border-bottom: 1px solid #f5f4f0;
  margin-bottom: 8px;
}
.prio-tab {
  display: flex; align-items: center; gap: 6px;
  font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 600;
  color: #94A3B8; background: transparent; border: none;
  padding: 6px 12px; cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: color 0.15s, border-color 0.15s;
}
.prio-tab:hover { color: #475569; }
.prio-tab--active {
  color: #534AB7;
  border-bottom-color: #534AB7;
}
.prio-tabs__spacer { flex: 1; }
.prio-tab--action {
  /* Verde "ação rotineira de refresh" — não confundir com banner amarelo (alerta real) */
  color: #047857; border: 1px solid #86EFAC; background: #F0FDF4;
  border-radius: 6px; padding: 4px 10px; align-self: center; margin-right: 8px;
  border-bottom-color: #86EFAC !important;
}
.prio-tab--action:hover:not(:disabled) {
  color: #065F46; background: #DCFCE7; border-color: #047857;
}
.prio-tab--action:disabled { opacity: 0.5; cursor: not-allowed; }
/* Detalhe colapsado em "leis aplicadas a N assuntos" (N > 5) */
.prio-lei-card__details {
  margin-top: 4px;
  font-size: 11px;
}
.prio-lei-card__details > summary {
  color: #475569; cursor: pointer; font-style: italic;
  padding: 2px 0; user-select: none;
}
.prio-lei-card__details[open] > summary { color: #1E293B; }
.prio-lei-card__details > .prio-lei-card__tag { margin-top: 4px; }

/* Aba Legislação — cards de norma agregada */
.prio-legislacao {
  display: flex; flex-direction: column; gap: 8px;
  padding: 4px 24px 12px;
}
.prio-legislacao__empty p { margin: 0 0 4px; }
.prio-legislacao__empty-hint { font-size: 11px; color: #B7791F; font-style: italic; }
.prio-legislacao__empty {
  font-size: 12px; color: #94A3B8;
  padding: 16px 24px; text-align: center;
  background: #fafaf8; border-radius: 8px;
}
.prio-lei-card {
  background: #fafaf8; border: 1px solid #ebe9e4;
  border-left: 3px solid #C7D2FE;
  border-radius: 8px;
  padding: 10px 12px;
  display: flex; flex-direction: column; gap: 6px;
}
.prio-lei-card__titulo {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; color: #1a1a2e;
}
.prio-lei-card__titulo svg { color: #6366F1; flex-shrink: 0; }
.prio-lei-card__linha {
  display: flex; flex-wrap: wrap; gap: 4px; align-items: center;
  font-size: 11px;
}
.prio-lei-card__label {
  color: #94A3B8; min-width: 92px;
  font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600;
}
.prio-lei-card__tag {
  background: #F1F5F9; color: #475569;
  padding: 1px 8px; border-radius: 4px; font-size: 10px;
}
.prio-lei-card__tag--sub { background: #FAF5FF; color: #6B21A8; }
.prio-lei-card__tag--disp { background: #DBEAFE; color: #1E40AF; font-weight: 600; }

/* Peso select */
.peso-select {
  width: 52px; padding: 1px 2px; border: 1px solid #ddd; border-radius: 4px;
  font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 700;
  color: #534AB7; background: #FAFAFE; cursor: pointer;
  appearance: auto;
}
.peso-select:focus { outline: none; border-color: #534AB7; }

.prio-disc__header {
  display: flex; align-items: center; gap: 8px; padding: 8px 4px;
  cursor: pointer; border-radius: 6px;
}
.prio-disc__header:hover { background: #F8F7F4; }
.prio-disc__nome { flex: 1; font-size: 14px; font-weight: 700; color: #1a1a2e; }

.prio-assunto { padding-left: 28px; }
.prio-assunto__row {
  display: flex; align-items: center; gap: 6px; padding: 4px;
  cursor: pointer; border-radius: 4px;
}
.prio-assunto__row:hover { background: #F8F7F4; }
.prio-assunto__nome { flex: 1; font-size: 12px; color: #444; }

.prio-sub {
  display: flex; flex-wrap: wrap; align-items: center; gap: 6px;
  padding: 3px 4px 3px 52px; font-size: 11px; color: #666;
}
.prio-sub__nome { flex: 1; min-width: 0; }

/* Score badges */
.prio-score {
  font-size: 12px; font-weight: 800; padding: 2px 8px; border-radius: 6px;
  min-width: 36px; text-align: center; white-space: nowrap;
}
.prio-score--sm { font-size: 11px; padding: 1px 6px; min-width: 30px; }
.prio-score--xs { font-size: 10px; padding: 1px 5px; min-width: 24px; }
.score--high { background: #F0FDF4; color: #16A34A; }
.score--medium { background: #FFFBEB; color: #D97706; }
.score--low { background: #FEF2F2; color: #DC2626; }
.score--null { background: #F3F4F6; color: #9CA3AF; }

/* Trend badges */
.prio-trend {
  font-size: 10px; font-weight: 600; display: flex; align-items: center; gap: 2px;
  padding: 1px 6px; border-radius: 4px; white-space: nowrap;
}
.prio-trend--sm { font-size: 9px; }
.trend--up { color: #16A34A; background: #F0FDF4; }
.trend--down { color: #DC2626; background: #FEF2F2; }
.trend--stable { color: #6B7280; background: #F3F4F6; }

/* Fonte */
.prio-fonte {
  font-size: 9px; font-weight: 600; color: #9CA3AF; background: #F9FAFB;
  padding: 1px 5px; border-radius: 3px; white-space: nowrap;
}

/* Badges row */
.prio-disc__badges, .prio-assunto__badges {
  display: flex; align-items: center; gap: 4px; flex-shrink: 0;
}

/* Tipo de fonte badges */
.prio-tipo {
  font-size: 9px; font-weight: 700; padding: 1px 5px; border-radius: 3px;
  text-transform: uppercase; letter-spacing: 0.03em;
}
.prio-tipo--sm { font-size: 8px; }
.prio-tipo--xs { font-size: 7px; padding: 1px 4px; }
.tipo--legislacao { background: #DBEAFE; color: #1E40AF; }
.tipo--jurisprudencia { background: #FEE2E2; color: #991B1B; }
.tipo--doutrina { background: #F3E8FF; color: #6B21A8; }
.tipo--teoria { background: #FEF3C7; color: #92400E; }

/* Carga e semana */
.prio-carga {
  font-size: 10px; font-weight: 700; color: #0369A1; background: #F0F9FF;
  padding: 1px 5px; border-radius: 3px;
}
.prio-carga--sm { font-size: 9px; }
.prio-semana {
  font-size: 10px; font-weight: 600; color: #166534; background: #F0FDF4;
  padding: 1px 5px; border-radius: 3px;
}
.prio-semana--sm { font-size: 9px; }

.prio-disc__btn-gerar {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 700;
  color: #fff; background: #534AB7;
  border: 1px solid #534AB7; border-radius: 999px;
  padding: 4px 10px; cursor: pointer;
  transition: background 0.12s, transform 0.12s;
  flex-shrink: 0;
}
.prio-disc__btn-gerar:hover { background: #3C3489; transform: translateY(-1px); }

/* Leis referência */
.prio-leis { display: flex; flex-wrap: wrap; gap: 3px; padding: 2px 0 0 52px; }
.prio-lei-tag {
  font-size: 9px; font-weight: 600; background: #F0F9FF; color: #0369A1;
  padding: 1px 6px; border-radius: 3px;
}

/* Assunto details */
.prio-assunto__details { padding-left: 28px; }
.prio-sub__row {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
}
.prio-sub__details { padding-left: 52px; }

/* Justificativa / equivalente */
.prio-justificativa {
  font-size: 10px; color: #9CA3AF; margin: 2px 0; font-style: italic;
}
.prio-equiv {
  font-size: 10px; color: #7C3AED; margin: 0 0 2px;
}

/* Resumo grid */
.prio-resumo-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;
}
.prio-resumo-card {
  background: #fff; border: 1px solid #ebe9e4; border-radius: 10px;
  padding: 14px; display: flex; flex-direction: column; gap: 2px; text-align: center;
}
.prio-resumo-val { font-size: 1.4rem; font-weight: 800; color: #1a1a2e; }
.prio-resumo-label { font-size: 10px; font-weight: 600; color: #aaa; text-transform: uppercase; letter-spacing: 0.06em; }

/* Legenda */
/* ── PR6 (Fase 2): banners + badges + métricas detalhadas ── */

/* Banner Recalcular (§6.6) */
.prio-banner-legacy {
  display: flex; align-items: flex-start; gap: 10px;
  background: #FEF9E7; border: 1px solid #F4C842; border-radius: 8px;
  padding: 12px 14px;
}
.prio-banner-legacy svg { color: #B45309; flex-shrink: 0; margin-top: 2px; }
.prio-banner-legacy__body { flex: 1; }
.prio-banner-legacy__body strong { color: #78350F; font-size: 13px; }
.prio-banner-legacy__body p { margin: 4px 0 0; font-size: 12px; color: #92400E; }

/* Banner variante --info (pós-recálculo sem match histórico) */
.prio-banner-legacy--info {
  background: #F0F9FF; border-color: #BAE6FD;
}
.prio-banner-legacy--info svg { color: #0369A1; }
.prio-banner-legacy--info .prio-banner-legacy__body strong { color: #0C4A6E; }
.prio-banner-legacy--info .prio-banner-legacy__body p { color: #075985; }

/* Tags de disciplinas legadas no banner */
.recalc-legadas-list { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
.recalc-legada-tag {
  font-size: 11px; padding: 2px 8px; border-radius: 20px;
  background: #FEF3C7; color: #92400E; border: 1px solid #FCD34D;
}
.recalc-legada-tag--sem-match {
  background: #E0F2FE; color: #0369A1; border-color: #7DD3FC;
}
.prio-banner-legacy__actions {
  display: flex; flex-direction: column; gap: 4px; flex-shrink: 0; align-items: flex-end;
}

/* PR8: feedback visual do recalcularTudoPR6 — lista de status por disciplina */
.recalc-fases {
  list-style: none; padding: 8px 0 0; margin: 8px 0 0;
  max-height: 240px; overflow-y: auto;
  border-top: 1px dashed #B45309;
}
.recalc-fases__item {
  display: flex; align-items: center; gap: 8px;
  font-size: 12px; padding: 3px 0; line-height: 1.3;
}
.recalc-fases__icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 16px; flex-shrink: 0; font-weight: 700;
}
.recalc-fases__nome { color: #78350F; }
.recalc-fases__detalhe { color: #92400E; font-style: italic; font-size: 11px; }
.recalc-fases__item--aguardando { color: #B7791F; opacity: 0.6; }
.recalc-fases__item--aguardando .recalc-fases__icon { color: #B7791F; }
.recalc-fases__item--processando { color: #1E3A8A; }
.recalc-fases__item--processando .recalc-fases__icon { color: #2563EB; }
.recalc-fases__item--concluido .recalc-fases__icon { color: #047857; }
.recalc-fases__item--erro { color: #991B1B; }
.recalc-fases__item--erro .recalc-fases__icon { color: #DC2626; }
.recalc-fases__spin {
  display: inline-block;
  animation: recalc-spin 1.2s linear infinite;
}
@keyframes recalc-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

/* Aviso de fonte da cascata (§6.5) */
.prio-banner-fonte {
  display: flex; align-items: flex-start; gap: 8px;
  border-radius: 8px; padding: 10px 12px;
}
.prio-banner-fonte--soft { background: #F0F9FF; border: 1px solid #BAE6FD; }
.prio-banner-fonte--soft svg { color: #0369A1; flex-shrink: 0; margin-top: 2px; }
.prio-banner-fonte--strong { background: #FFF7ED; border: 1px solid #FDBA74; }
.prio-banner-fonte--strong svg { color: #C2410C; flex-shrink: 0; margin-top: 2px; }
.prio-banner-fonte__body { flex: 1; }
.prio-banner-fonte__body strong { font-size: 12px; }
.prio-banner-fonte--soft .prio-banner-fonte__body strong { color: #075985; }
.prio-banner-fonte--strong .prio-banner-fonte__body strong { color: #9A3412; }
.prio-banner-fonte__body p { margin: 2px 0 0; font-size: 11px; color: #555; }

/* Badge Presença (§6.1) */
.prio-presenca {
  display: inline-flex; align-items: center;
  font-size: 10px; font-weight: 600; color: #065F46;
  background: #D1FAE5; padding: 1px 6px; border-radius: 4px;
  letter-spacing: 0.02em;
}
.prio-presenca--xs { font-size: 9px; padding: 1px 5px; }

/* PR7: Badge Recência — paleta ciano pra distinguir da Presença (verde) */
.prio-recencia {
  display: inline-flex; align-items: center;
  font-size: 10px; font-weight: 600;
  padding: 1px 6px; border-radius: 4px;
  letter-spacing: 0.02em;
}
.prio-recencia--xs { font-size: 9px; padding: 1px 5px; }
.prio-recencia.recencia--high   { color: #155E75; background: #CFFAFE; }  /* ciano forte */
.prio-recencia.recencia--medium { color: #854D0E; background: #FEF3C7; }  /* âmbar */
.prio-recencia.recencia--low    { color: #991B1B; background: #FEE2E2; }  /* vermelho */
.prio-recencia.recencia--null   { color: #6B7280; background: #F3F4F6; }  /* cinza */

/* PR7 D24: Comparação score_v1 → score (linha discreta no expand) */
.prio-score-delta {
  font-size: 10px; font-style: italic; color: #4B5563;
  font-family: ui-monospace, monospace;
}
.prio-score-delta.delta--up   { color: #047857; }
.prio-score-delta.delta--down { color: #B91C1C; }
.prio-score-delta.delta--zero { color: #6B7280; }

/* Badges de qualidade (§6.4) */
.prio-badge-quality {
  display: inline-flex; align-items: center;
  font-size: 9px; font-weight: 600; padding: 2px 6px; border-radius: 4px;
  text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap;
}
.prio-badge-quality--no-match {
  background: #F3F4F6; color: #6B7280; border: 1px solid #E5E7EB;
}
.prio-badge-quality--rare {
  background: #EFF6FF; color: #1E40AF; border: 1px solid #BFDBFE;
}
.prio-badge-quality--small {
  background: #FFFBEB; color: #B45309; border: 1px solid #FCD34D;
}

/* Métricas detalhadas (§6.3) */
.prio-metricas-detalhes {
  margin-top: 6px; font-size: 11px;
}
.prio-metricas-detalhes summary {
  cursor: pointer; color: #6B7280; font-weight: 500;
  padding: 2px 0; user-select: none;
}
.prio-metricas-detalhes summary:hover { color: #374151; }
.prio-metricas-detalhes__grid {
  display: flex; flex-direction: column; gap: 2px;
  padding: 6px 0 4px 12px; color: #555;
}
.prio-metricas-detalhes__hint { color: #9CA3AF; font-style: italic; }

/* Cobertura individual no expand da disciplina (§6.5) */
.prio-disc__cobertura {
  display: flex; align-items: center; gap: 4px;
  font-size: 11px; color: #6B7280;
  padding: 4px 14px 0 38px;
}
.prio-disc__cobertura svg { color: #9CA3AF; }

.prio-legenda {
  display: flex; gap: 12px; flex-wrap: wrap; font-size: 11px; color: #888; align-items: center;
}
.prio-legenda__item { display: flex; align-items: center; gap: 4px; }
.prio-legenda__sep { color: #ddd; }

/* ── Reorganização ──────────────────────────────────────── */
.reorg-alerta {
  display: flex; align-items: flex-start; gap: 10px; padding: 12px 16px;
  border-radius: 10px; font-size: 12px;
}
.reorg-alerta p { margin: 4px 0 0; font-weight: 400; }
.reorg-alerta__body { flex: 1; }
.reorg-alerta--danger { background: #FEF2F2; color: #991B1B; border: 1px solid #FECACA; }
.reorg-alerta--ok { background: #F0FDF4; color: #166534; border: 1px solid #BBF7D0; }
.reorg-alerta--passed { background: #F8FAFC; color: #475569; border: 1px solid #E2E8F0; }
.reorg-field--inline { margin-top: 2px; }
.reorg-field--inline input { width: 130px; }
.btn-outline--sm { font-size: 11px; padding: 4px 10px; white-space: nowrap; }
.btn-outline--danger { color: #c0392b; border-color: #f1c0bb; }
.btn-outline--danger:hover { background: #fdf0ef; border-color: #e8a39a; }
.btn-ghost--sm { font-size: 11px; padding: 2px 8px; }

.reorg-panel {
  background: #fff; border: 1px solid #ebe9e4; border-radius: 12px; padding: 20px;
  display: flex; flex-direction: column; gap: 14px;
}
.reorg-panel__title { font-size: 14px; font-weight: 700; color: #1a1a2e; margin: 0; }
.reorg-config {
  display: flex; gap: 10px; align-items: flex-end; flex-wrap: wrap;
}
.reorg-field { display: flex; flex-direction: column; gap: 3px; }
.reorg-field label { font-size: 10px; font-weight: 600; color: #888; }
.reorg-field input {
  width: 80px; padding: 6px 8px; border: 1px solid #ddd; border-radius: 6px;
  font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 700; color: #1a1a2e;
}
.reorg-field input:focus { outline: none; border-color: #534AB7; }

.reorg-diag {
  display: flex; gap: 16px; font-size: 12px; color: #666;
  background: #F8FAFC; padding: 8px 12px; border-radius: 6px; flex-wrap: wrap; align-items: center;
}
.reorg-diag--deficit { color: #DC2626; font-weight: 700; }
.reorg-diag--cobertos { color: #16A34A; font-size: 11px; }
.reorg-label-intensidade {
  font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 20px; margin-left: auto;
}
.intens--arrojado { background: #FEF9C3; color: #854D0E; }
.intens--apertado { background: #FFEDD5; color: #9A3412; }
.intens--risco    { background: #FEE2E2; color: #7F1D1D; }
.reorg-info-aviso {
  display: flex; align-items: center; gap: 6px; font-size: 11px; color: #6366F1;
  background: #EEF2FF; border: 1px solid #C7D2FE; border-radius: 6px; padding: 7px 10px;
}
.reorg-field input[type="date"] { width: 130px; font-size: 12px; font-weight: 400; }

.reorg-opcoes { display: flex; flex-direction: column; gap: 8px; }
.reorg-opcao {
  border: 2px solid #ebe9e4; border-radius: 10px; padding: 14px; cursor: pointer;
  transition: border-color 0.15s;
}
.reorg-opcao:hover { border-color: #AFA9EC; }
.reorg-opcao--selected { border-color: #534AB7; background: #FAFAFE; }
.reorg-opcao--ok { border-left: 4px solid #16A34A; }
.reorg-opcao--a { border-left: 4px solid #2563EB; }
.reorg-opcao--b { border-left: 4px solid #D97706; }
.reorg-opcao--c { border-left: 4px solid #DC2626; }

.reorg-opcao__header { display: flex; align-items: center; gap: 8px; }
.reorg-opcao__titulo { font-size: 13px; font-weight: 700; color: #1a1a2e; }
.reorg-opcao__body { margin-top: 6px; font-size: 11px; color: #666; }

.reorg-cortados { margin-top: 8px; }
.reorg-cortados__label { font-size: 10px; font-weight: 600; color: #888; margin: 0 0 4px; }
.reorg-cortado-item {
  display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;
  padding: 3px 8px;
  background: #FFF7ED; border-radius: 4px; margin-bottom: 2px; font-size: 11px;
}
.reorg-cortado-nome { display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap; flex: 1 1 auto; min-width: 0; }
.reorg-cortado-score { color: #9CA3AF; white-space: nowrap; flex-shrink: 0; text-align: right; }
.reorg-cortado-badge {
  display: inline-flex; align-items: center; gap: 3px;
  background: #EEF2FF; color: #4338CA; border: 1px solid #C7D2FE;
  padding: 1px 6px; border-radius: 10px; font-size: 10px; font-weight: 600;
  white-space: nowrap;
}

.reorg-aviso {
  display: flex; align-items: flex-start; gap: 6px; margin-top: 8px;
  background: #FEF2F2; padding: 8px 10px; border-radius: 6px;
  font-size: 11px; color: #991B1B; font-weight: 500;
}
.reorg-aviso--norma {
  background: #EEF2FF; color: #3730A3;
}

.reorg-actions {
  display: flex; justify-content: flex-end; gap: 8px; padding-top: 8px; border-top: 1px solid #f0efea;
}

/* ── Modal Plano ────────────────────────────────────────── */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 100;
  display: flex; align-items: center; justify-content: center; padding: 20px;
}
.modal {
  background: #fff; border-radius: 16px; width: 100%; max-width: 520px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15); overflow: hidden;
}
.modal__header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px; border-bottom: 1px solid #ebe9e4;
}
.modal__title { font-size: 16px; font-weight: 700; color: #1a1a2e; margin: 0; }
.modal__body { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.modal__footer {
  display: flex; justify-content: flex-end; gap: 8px;
  padding: 16px 24px; border-top: 1px solid #ebe9e4;
}

.field-row--2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.field__input::-webkit-inner-spin-button { opacity: 1; }

.plano-info {
  display: flex; flex-direction: column; gap: 4px;
  font-size: 13px; color: #444;
}
.plano-info p { margin: 0; display: flex; align-items: center; gap: 6px; }

.plano-alerta {
  display: flex; align-items: flex-start; gap: 8px; padding: 10px 12px;
  border-radius: 8px; font-size: 12px;
}
.plano-alerta--danger { background: #FEF2F2; color: #991B1B; }
.plano-alerta--warn { background: #FFFBEB; color: #92400E; }

/* ── Validação ──────────────────────────────────────────── */
.validacao-panel {
  border: 1px solid #ebe9e4; border-radius: 12px; overflow: hidden;
  background: #fff;
}
.validacao-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; cursor: pointer; gap: 12px;
}
.validacao-header:hover { background: #fafaf8; }
.validacao-resumo { display: flex; align-items: center; gap: 8px; flex: 1; }
.validacao-titulo { font-size: 13px; font-weight: 600; color: #1a1a2e; }
.validacao-panel--ok { border-color: #BBF7D0; background: #F0FDF4; }
.validacao-panel--warn { border-color: #FED7AA; background: #FFFBEB; }
.validacao-panel--info { border-color: #E5E7EB; background: #F9FAFB; }
.validacao-icon--ok { color: #16A34A; }
.validacao-icon--warn { color: #D97706; }
.validacao-icon--info { color: #6B7280; }
.validacao-badge {
  font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 10px;
  background: #FFF7ED; color: #9A3412;
}
.validacao-badge--ok { background: #F0FDF4; color: #16A34A; }
.validacao-badge--info { background: #F3F4F6; color: #6B7280; }

.validacao-body { padding: 0 16px 16px; }
.validacao-label { font-size: 12px; font-weight: 600; color: #666; margin: 0 0 8px; }
.validacao-item {
  font-size: 12px; padding: 4px 10px; border-radius: 6px; margin-bottom: 4px;
}
.validacao-item--missing {
  background: #FFF7ED; color: #9A3412; border-left: 3px solid #F59E0B;
}
.validacao-ok {
  font-size: 12px; color: #16A34A; font-weight: 500;
  padding: 8px 12px; background: #F0FDF4; border-radius: 8px;
}

/* Tree controls */
.tree-controls { display: flex; gap: 8px; }
.tree__toggle {
  flex-shrink: 0; cursor: pointer; color: #9CA3AF;
  transition: transform 0.2s;
}
.tree__toggle.rotated { transform: rotate(-90deg); }
.tree__toggle-spacer { width: 12px; flex-shrink: 0; }
.tree__count {
  font-size: 10px; color: #9CA3AF; font-weight: 600; white-space: nowrap;
}
.tree__node--disc { cursor: pointer; border-radius: 6px; padding: 6px 4px; }
.tree__node--disc:hover { background: #F8F7F4; }
.tree__node--assunto { cursor: pointer; border-radius: 4px; padding: 3px 4px; }
.tree__node--assunto:hover { background: #F8F7F4; }
</style>
