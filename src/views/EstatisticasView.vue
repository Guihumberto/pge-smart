<template>
  <div class="stats-view" style="font-family: 'DM Sans', sans-serif;">

    <!-- Header -->
    <div class="stats-view__header">
      <div>
        <h1 class="stats-view__title">Estatísticas de Questões</h1>
        <p class="stats-view__sub">Importe dados e analise tendências por banca e área</p>
      </div>
      <button v-if="activeTab === 'importacoes'" class="btn-primary" @click="openModal">
        <Plus :size="14" /> Nova Importação
      </button>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button class="tab" :class="{ 'tab--active': activeTab === 'importacoes' }" @click="activeTab = 'importacoes'">
        Importações
      </button>
      <button class="tab" :class="{ 'tab--active': activeTab === 'tendencias' }" @click="activeTab = 'tendencias'">
        <TrendingUp :size="14" /> Tendências
      </button>
      <button class="tab" :class="{ 'tab--active': activeTab === 'analise' }" @click="activeTab = 'analise'">
        <BarChart3 :size="14" /> Análise
      </button>
    </div>

    <!-- ═══ Tab: Importações ═══ -->
    <template v-if="activeTab === 'importacoes'">

    <!-- Filtros -->
    <div v-if="store.estatisticas.length" class="filters-row">
      <select v-model="filtro.banca" class="filter-select">
        <option value="">Todas as bancas</option>
        <option v-for="b in bancasUsadas" :key="b">{{ b }}</option>
      </select>
      <select v-model="filtro.area" class="filter-select">
        <option value="">Todas as áreas</option>
        <option v-for="a in areasDisponiveisFiltro" :key="a">{{ a }}</option>
      </select>
      <select v-model="filtro.ano" class="filter-select">
        <option value="">Todos os anos</option>
        <option v-for="a in anosUsados" :key="a">{{ a }}</option>
      </select>
    </div>

    <!-- Lista de importações -->
    <div v-if="estatisticasFiltradas.length" class="stats-grid">
      <div
        v-for="est in estatisticasPagina"
        :key="est.id"
        class="stat-card"
      >
        <div class="stat-card__top">
          <div class="stat-card__icon"><BarChart3 :size="16" /></div>
          <div class="stat-card__meta">
            <div class="stat-card__badges">
              <span class="badge badge--banca">{{ est.banca }}</span>
              <span v-if="est.area" class="badge badge--area">{{ est.area }}</span>
              <span class="badge badge--ano">{{ est.ano }}</span>
            </div>
            <p v-if="est.descricao" class="stat-card__desc">{{ est.descricao }}</p>
          </div>
          <div class="stat-card__menu" @click.stop>
            <button class="icon-btn" @click="toggleMenu(est.id)">
              <MoreVertical :size="14" />
            </button>
            <div v-if="openMenu === est.id" class="dropdown">
              <button class="dropdown__item" @click="verDetalhes(est)">
                <Eye :size="13" /> Ver detalhes
              </button>
              <div class="dropdown__divider" />
              <button class="dropdown__item dropdown__item--danger" @click="confirmDelete(est.id)">
                <Trash2 :size="13" /> Excluir
              </button>
            </div>
          </div>
        </div>

        <!-- Resumo das disciplinas -->
        <div class="stat-card__resumo">
          <span class="stat-card__total">
            {{ totalQuestoes(est) }} questões · {{ est.dados?.disciplinas?.length || 0 }} disciplinas
          </span>
        </div>

        <!-- Top 3 disciplinas -->
        <div class="stat-card__top3">
          <div v-for="(d, idx) in topDisciplinas(est)" :key="idx" class="top-disc">
            <div class="top-disc__bar" :style="{ width: d.pct + '%' }" />
            <span class="top-disc__nome">{{ d.nome }}</span>
            <span class="top-disc__val">{{ d.qtd }} ({{ d.pct }}%)</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Paginação -->
    <Pagination
      v-if="estatisticasFiltradas.length"
      :current-page="page"
      :total-pages="totalPaginas"
      :total="estatisticasFiltradas.length"
      :per-page="perPage"
      @update:current-page="page = $event"
      @update:per-page="perPage = $event"
    />

    <!-- Loading inicial — sem dados persistidos e fetch em curso -->
    <div v-if="store.loading && !store.estatisticas.length" class="empty-state">
      <p class="empty-state__desc">Carregando estatísticas...</p>
    </div>

    <!-- Empty state — sem resultados nos filtros aplicados -->
    <div v-else-if="store.estatisticas.length && !estatisticasFiltradas.length" class="empty-state">
      <div class="empty-state__icon"><BarChart3 :size="40" /></div>
      <h3 class="empty-state__title">Nenhum resultado com esses filtros</h3>
      <p class="empty-state__desc">Ajuste banca, área ou ano para ver mais.</p>
      <button class="btn-outline" @click="resetFiltros">Limpar filtros</button>
    </div>

    <!-- Empty state — nenhum dado importado -->
    <div v-else-if="!store.estatisticas.length && !store.loading" class="empty-state">
      <div class="empty-state__icon"><BarChart3 :size="40" /></div>
      <h3 class="empty-state__title">Nenhuma estatística importada</h3>
      <p class="empty-state__desc">
        Importe dados de questões para analisar tendências por banca e disciplina.
      </p>
      <button class="btn-primary" @click="openModal">
        <Plus :size="14" /> Importar dados
      </button>
    </div>

    </template>

    <!-- ═══ Tab: Tendências ═══ -->
    <template v-if="activeTab === 'tendencias'">
      <div class="tendencias">
        <!-- Filtros de tendência -->
        <div class="filters-row">
          <select v-model="trend.banca" class="filter-select" @change="onTrendFilterChange">
            <option value="">Selecione a banca</option>
            <option v-for="b in bancasUsadas" :key="b">{{ b }}</option>
          </select>
          <select v-model="trend.area" class="filter-select" @change="onTrendFilterChange">
            <option value="">Todas as áreas</option>
            <option v-for="a in areasUsadas" :key="a">{{ a }}</option>
          </select>
          <select v-if="trend.banca && disciplinasDisponiveis.length" v-model="trend.disciplina" class="filter-select" @change="calcularTendencias">
            <option value="">Todas as disciplinas</option>
            <option v-for="d in disciplinasDisponiveis" :key="d">{{ d }}</option>
          </select>
        </div>

        <!-- Empty 1: banca não selecionada -->
        <div v-if="!trend.banca" class="empty-state">
          <TrendingUp :size="40" />
          <h3 class="empty-state__title">Selecione uma banca</h3>
          <p class="empty-state__desc">Escolha uma banca para visualizar as tendências ao longo dos anos.</p>
        </div>

        <!-- Empty 2: banca selecionada mas sem dados importados -->
        <div v-else-if="trendData.anos.length === 0" class="empty-state">
          <BarChart3 :size="40" />
          <h3 class="empty-state__title">Nenhuma estatística importada</h3>
          <p class="empty-state__desc">
            Não há dados importados para {{ trend.banca }}{{ trend.area ? ` / ${trend.area}` : '' }}.
            Importe estatísticas na aba Importações.
          </p>
        </div>

        <!-- Empty 3: dataset com 1-2 anos (insuficiente para regressão linear) -->
        <div v-else-if="trendData.anos.length < 3" class="empty-state">
          <BarChart3 :size="40" />
          <h3 class="empty-state__title">Dados insuficientes</h3>
          <p class="empty-state__desc">
            Importe dados de pelo menos 3 anos para calcular tendências confiáveis.
            Atualmente: {{ trendData.anos.length === 1 ? '1 ano disponível' : `${trendData.anos.length} anos disponíveis` }}.
          </p>
        </div>

        <template v-else>
          <!-- Resumo -->
          <div class="trend-summary">
            <span class="trend-summary__label">
              {{ trend.banca }} {{ trend.area ? '— ' + trend.area : '' }}
              · {{ trendData.anos.length }} ano(s): {{ trendData.anos.join(', ') }}
            </span>
          </div>

          <!-- Empty 4: ≥3 anos mas nenhuma tendência qualificada (todas filtradas) -->
          <div
            v-if="!trendData.subindo.length && !trendData.descendo.length"
            class="trend-no-results"
            role="status"
          >
            <BarChart3 :size="20" />
            <div>
              <h3 class="trend-no-results__title">Nenhuma tendência confiável detectada</h3>
              <p v-if="trendData.descartados.total">
                {{ trendData.descartados.total }} candidato(s) descartado(s) pelos filtros:
              </p>
              <ul v-if="trendData.descartados.total" class="trend-no-results__breakdown">
                <li v-if="trendData.descartados.poucosAnos">
                  {{ trendData.descartados.poucosAnos }} com menos de 3 anos importados
                </li>
                <li v-if="trendData.descartados.qtdBaixa">
                  {{ trendData.descartados.qtdBaixa }} com volume absoluto baixo (max &lt; 5 questões em algum ano)
                </li>
                <li v-if="trendData.descartados.r2Baixo">
                  {{ trendData.descartados.r2Baixo }} com R² baixo (oscilação sem tendência clara)
                </li>
                <li v-if="trendData.descartados.slopeBaixo">
                  {{ trendData.descartados.slopeBaixo }} com variação imperceptível (|slope| &lt; 0.3pp/ano)
                </li>
              </ul>
              <p class="trend-no-results__hint">{{ trendNoResultsHint }}</p>
            </div>
          </div>

          <!-- Gráfico de linha: evolução das top disciplinas -->
          <div class="chart-section">
            <h3 class="chart-title">Evolução por Disciplina (%)</h3>
            <div class="chart-container">
              <Line :data="chartDisciplinas" :options="chartOptions" />
            </div>
          </div>

          <!-- Tendências: subindo / descendo -->
          <div class="trends-grid">
            <div class="trend-col">
              <h3 class="trend-col__title trend-col__title--up">
                <TrendingUp :size="14" /> Em alta
              </h3>
              <div
                v-for="t in trendData.subindo"
                :key="t.nome"
                class="trend-item trend-item--up"
                :title="`R² = ${t.r2.toFixed(2)} · ${t.n} anos`"
              >
                <span class="trend-item__nome">{{ t.nome }}</span>
                <span class="trend-item__delta">{{ slopeFormat(t.slope) }}</span>
                <span class="trend-item__range">{{ t.primeiroPct.toFixed(1) }}% → {{ t.ultimoPct.toFixed(1) }}%</span>
              </div>
              <p v-if="!trendData.subindo.length" class="trend-empty">Nenhuma tendência de alta detectada</p>
            </div>
            <div class="trend-col">
              <h3 class="trend-col__title trend-col__title--down">
                <TrendingDown :size="14" /> Em queda
              </h3>
              <div
                v-for="t in trendData.descendo"
                :key="t.nome"
                class="trend-item trend-item--down"
                :title="`R² = ${t.r2.toFixed(2)} · ${t.n} anos`"
              >
                <span class="trend-item__nome">{{ t.nome }}</span>
                <span class="trend-item__delta">{{ slopeFormat(t.slope) }}</span>
                <span class="trend-item__range">{{ t.primeiroPct.toFixed(1) }}% → {{ t.ultimoPct.toFixed(1) }}%</span>
              </div>
              <p v-if="!trendData.descendo.length" class="trend-empty">Nenhuma tendência de queda detectada</p>
            </div>
          </div>

          <!-- Tabela detalhada: assuntos que mais mudaram -->
          <div class="chart-section">
            <h3 class="chart-title">{{ trend.disciplina ? 'Assuntos' : 'Tópicos' }} com maior variação</h3>
            <div class="chart-container">
              <Bar :data="chartAssuntos" :options="chartAssuntosOptions" />
            </div>
          </div>

          <!-- Detalhamento por disciplina selecionada -->
          <template v-if="trend.disciplina">
            <!-- Gráfico de linha: assuntos da disciplina -->
            <div class="chart-section">
              <h3 class="chart-title">Evolução dos Assuntos de "{{ trend.disciplina }}" (%)</h3>
              <div class="chart-container">
                <Line :data="chartAssuntosDisciplina" :options="chartOptions" />
              </div>
            </div>

            <!-- Sub-assuntos: se algum assunto tiver sub_assuntos -->
            <div v-if="subAssuntosDisponiveis.length" class="chart-section">
              <h3 class="chart-title">Detalhamento por Sub-assunto</h3>
              <div class="filters-row" style="margin-bottom: 12px;">
                <select v-model="trend.assunto" class="filter-select">
                  <option value="">Todos os assuntos</option>
                  <option v-for="a in subAssuntosDisponiveis" :key="a">{{ a }}</option>
                </select>
              </div>
              <div class="chart-container">
                <Bar :data="chartSubAssuntos" :options="chartAssuntosOptions" />
              </div>
            </div>
          </template>
        </template>
      </div>
    </template>

    <!-- ═══ Tab: Análise ═══ -->
    <template v-if="activeTab === 'analise'">
      <div class="analise">
        <AnaliseToolbar
          v-model:banca="analise.banca"
          v-model:area="analise.area"
          v-model:granularidade="analise.gran"
          v-model:preset="analise.preset"
          v-model:cross-banca="analise.cross"
          :disciplina="analise.discFilter"
          :bancas-options="bancasUsadas"
          :areas-options="analiseAreasOptions"
          :disciplinas-options="analiseDisciplinasOptions"
          :other-bancas-in-area="analiseOtherBancasInArea"
          :total-count="analiseRaw.items.length"
          :filtered-count="analiseSorted.length"
          :selected-count="analiseSelectedKeys.length"
          @update:disciplina="onAnaliseDisciplinaChange"
          @copy-selected="onAnaliseCopySelected"
          @export-csv="onAnaliseExportCsv"
        />

        <!-- Loading inicial -->
        <div v-if="store.loading && !store.estatisticas.length" class="empty-state">
          <p class="empty-state__desc">Carregando estatísticas...</p>
        </div>

        <!-- Empty state: sem banca -->
        <div v-else-if="!analise.banca" class="empty-state">
          <BarChart3 :size="40" />
          <h3 class="empty-state__title">Selecione uma banca para começar</h3>
          <p class="empty-state__desc">A análise compara assuntos por recorrência, volume e tendência ao longo dos anos.</p>
        </div>

        <!-- Empty state: banca/área sem estatísticas importadas -->
        <div v-else-if="analiseRaw.anos.length === 0" class="empty-state">
          <BarChart3 :size="40" />
          <h3 class="empty-state__title">Nenhuma estatística importada</h3>
          <p class="empty-state__desc">
            Não há dados para {{ analise.banca }}{{ analise.area ? ` / ${analise.area}` : '' }}.
            Importe na aba Importações.
          </p>
        </div>

        <template v-else>
          <!-- Aviso: dataset pequeno -->
          <div v-if="analiseRaw.anos.length === 1" class="analise-warn" role="status" aria-live="polite">
            Apenas 1 ano de dados — recorrência tem pouco significado. Importe mais anos para análise robusta.
          </div>

          <!-- Aviso: disciplina selecionada mas sem sub-assuntos cadastrados (modo expandível inerte).
               Suprimido quando preset filtrou tudo (analiseSorted=0) — empty-state do preset tem
               precedência ali (ação principal: mudar preset). Cenário onde os 2 coexistiam era
               confuso (#3 da regra-de-vida dos débitos). -->
          <div
            v-if="analise.discFilter && analise.gran === 'assunto' && analiseRaw.items.length > 0 && analiseSorted.length > 0 && analiseSubsByAssunto.size === 0"
            class="analise-info"
            role="status"
            aria-live="polite"
          >
            Esta disciplina não tem sub-assuntos detalhados no dataset importado — modo expandível indisponível.
            A tabela mostra os assuntos sem aninhamento.
          </div>

          <!-- Empty state: preset filtrou tudo -->
          <div v-if="analiseRaw.items.length > 0 && analiseSorted.length === 0" class="empty-state">
            <BarChart3 :size="40" />
            <h3 class="empty-state__title">Nenhum item passou no filtro {{ analise.preset }}</h3>
            <p class="empty-state__desc">
              Tente um filtro mais permissivo, ative bancas similares, ou importe mais dados.
            </p>
            <button class="btn-outline" @click="analise.preset = 'permissivo'">
              Mudar para Permissivo
            </button>
          </div>

          <AnaliseTable
            v-else
            :items="analiseSorted"
            :anos="analiseRaw.anos"
            :granularidade="analise.gran"
            :preset-name="analise.preset"
            :breadcrumb="analiseBreadcrumb"
            :subs-by-assunto="analiseSubsByAssunto"
            :sort="analise.sort"
            :dir="analise.dir"
            :page="analise.page"
            :per-page="analise.perPage"
            :selected-keys="analiseSelectedKeys"
            @update:sort="analise.sort = $event"
            @update:dir="analise.dir = $event"
            @update:page="analise.page = $event"
            @update:per-page="analise.perPage = $event"
            @update:selected-keys="analiseSelectedKeys = $event"
            @drill-down="onAnaliseDrillDown"
            @breadcrumb-go="onAnaliseBreadcrumbGo"
          />
        </template>
      </div>
    </template>

    <!-- Modal de detalhes -->
    <Teleport to="body">
      <div v-if="detalhesItem" class="modal-overlay" @click.self="detalhesItem = null">
        <div class="modal modal--wide">
          <div class="modal__header">
            <h2 class="modal__title">
              {{ detalhesItem.banca }} — {{ detalhesItem.area || 'Geral' }} — {{ detalhesItem.ano }}
            </h2>
            <button class="icon-btn" @click="detalhesItem = null"><X :size="16" /></button>
          </div>
          <div class="modal__body">
            <div class="detalhes-controls">
              <button class="btn-ghost" @click="toggleDetalhesAll(true)">Expandir tudo</button>
              <button class="btn-ghost" @click="toggleDetalhesAll(false)">Recolher tudo</button>
            </div>
            <div class="detalhes-tree">
              <div v-for="(disc, di) in detalhesItem.dados.disciplinas" :key="di" class="det-disc">
                <div class="det-node det-node--disc" @click="detalhesState[di] = !detalhesState[di]">
                  <ChevronDown :size="13" :class="{ 'det-rotated': !detalhesState[di] }" />
                  <span class="det-nome">{{ disc.nome }}</span>
                  <span class="det-val">{{ disc.qtd }} ({{ disc.pct }}%)</span>
                </div>
                <template v-if="detalhesState[di]">
                  <div v-for="(ass, ai) in disc.assuntos" :key="ai" class="det-assunto">
                    <div class="det-node det-node--assunto">
                      <span class="det-nome">{{ ass.nome }}</span>
                      <span class="det-val">{{ ass.qtd }} ({{ ass.pct }}%)</span>
                    </div>
                    <div v-for="(sub, si) in ass.sub_assuntos" :key="si" class="det-sub">
                      <div class="det-node det-node--sub">
                        <span class="det-nome">{{ sub.nome }}</span>
                        <span class="det-val">{{ sub.qtd }} ({{ sub.pct }}%)</span>
                      </div>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Confirmação de exclusão -->
    <ConfirmDialog
      v-model="showDeleteDialog"
      variant="danger"
      title="Excluir estatística"
      message="Esta ação não pode ser desfeita. A estatística será removida permanentemente."
      confirm-label="Excluir"
      @confirm="executeDelete"
      @cancel="deleteId = null"
    />

    <!-- Confirmação de saída com rascunho não-salvo -->
    <ConfirmDialog
      v-model="showExitDialog"
      variant="warning"
      title="Sair sem salvar?"
      message="Há um rascunho não-salvo no textarea. Você pode recuperá-lo na próxima vez que abrir."
      confirm-label="Sair"
      cancel-label="Continuar editando"
      @confirm="closeModal"
    />

    <!-- Confirmação de duplicata -->
    <ConfirmDialog
      v-model="showDuplicateDialog"
      variant="info"
      :title="duplicateMatch ? `Substituir ${duplicateMatch.banca} / ${duplicateMatch.area || 'Geral'} / ${duplicateMatch.ano}?` : 'Substituir?'"
      message="Já existe uma estatística importada com essa combinação de banca, área e ano. Substituir vai atualizar apenas os dados disciplinares — descrição, banca, área e ano permanecem como estão."
      confirm-label="Substituir"
      cancel-label="Cancelar"
      @confirm="onDuplicateConfirm"
      @cancel="onDuplicateCancel"
    />

    <!-- Modal nova importação -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="tryCloseModal">
        <div class="modal modal--wide">
          <div class="modal__header">
            <h2 class="modal__title">Importar Estatísticas</h2>
            <button class="icon-btn" @click="tryCloseModal"><X :size="16" /></button>
          </div>
          <div class="modal__body">
            <!-- Banner de rascunho recuperado -->
            <div v-if="showRestoreBanner && importDraft.draft.value" class="draft-banner">
              <span class="draft-banner__msg">
                Rascunho recuperado de {{ formatDraftTime(importDraft.draft.value.savedAt) }}
              </span>
              <div class="draft-banner__actions">
                <button class="btn-outline" @click="restoreDraft">Restaurar</button>
                <button class="btn-ghost" @click="discardDraft">Descartar</button>
              </div>
            </div>

            <!-- Metadados -->
            <div class="field-row field-row--4">
              <div class="field">
                <label class="field__label">Banca *</label>
                <div class="autocomplete">
                  <input
                    v-model="bancaSearch"
                    class="field__input"
                    placeholder="Buscar banca..."
                    @focus="showBancaList = true"
                    @input="showBancaList = true"
                  />
                  <div v-if="showBancaList && filteredBancas.length" class="autocomplete__list">
                    <button
                      v-for="b in filteredBancas"
                      :key="b.id"
                      class="autocomplete__item"
                      @click="selectBanca(b.nome)"
                    >{{ b.nome }}</button>
                  </div>
                </div>
              </div>
              <div class="field">
                <label class="field__label">Área</label>
                <div class="autocomplete">
                  <input
                    v-model="areaSearch"
                    class="field__input"
                    placeholder="Buscar área..."
                    @focus="showAreaList = true"
                    @input="showAreaList = true"
                  />
                  <div v-if="showAreaList && filteredAreas.length" class="autocomplete__list">
                    <button
                      v-for="a in filteredAreas"
                      :key="a.id"
                      class="autocomplete__item"
                      @click="selectArea(a.nome)"
                    >{{ a.nome }}</button>
                  </div>
                </div>
              </div>
              <div class="field">
                <label class="field__label">Ano *</label>
                <input v-model.number="form.ano" class="field__input" type="number" placeholder="2024" />
                <button
                  v-if="showYearChip"
                  class="year-chip"
                  type="button"
                  @click="applyDetectedYear"
                  :title="`Aplicar o ano detectado no conteúdo colado: ${detectedYear}`"
                  :aria-label="`Aplicar o ano ${detectedYear} detectado no conteúdo colado`"
                >
                  Detectado: {{ detectedYear }} (aplicar)
                </button>
              </div>
              <div class="field">
                <label class="field__label">Descrição</label>
                <input v-model="form.descricao" class="field__input" placeholder="Ex: PGE/AL 2026" />
              </div>
            </div>

            <!-- Textarea -->
            <div class="field">
              <label class="field__label">Dados (cole texto ou HTML do inspect element)</label>
              <textarea
                ref="textareaRef"
                v-model="textoBruto"
                class="field__textarea"
                rows="14"
                placeholder="Cole aqui os dados — aceita texto puro ou HTML copiado do inspect element (Ctrl+Shift+I → copiar elemento)..."
              />
              <span class="field__hint">
                Dica: no site de questões, clique com botão direito → Inspecionar → copie o elemento &lt;li&gt; raiz
              </span>
            </div>

            <!-- Preview -->
            <div v-if="textoBruto.trim()" class="preview-section">
              <button class="btn-outline" @click="processar">
                <Zap :size="14" /> Processar preview
              </button>
            </div>

            <!-- Preview resultado -->
            <div v-if="previewDados.disciplinas?.length" class="preview-resultado">
              <h3 class="preview-titulo">
                Preview: {{ previewDados.disciplinas.length }} disciplinas detectadas ·
                {{ previewTotal }} questões
              </h3>
              <div class="preview-tree">
                <div v-for="(disc, di) in previewDados.disciplinas" :key="di" class="pv-disc">
                  <div class="pv-node pv-node--disc" @click="pvState[di] = !pvState[di]">
                    <ChevronDown :size="12" :class="{ 'det-rotated': !pvState[di] }" />
                    <span>{{ disc.nome }}</span>
                    <span class="pv-val">{{ disc.qtd }} ({{ disc.pct }}%)</span>
                  </div>
                  <template v-if="pvState[di]">
                    <div v-for="(ass, ai) in disc.assuntos" :key="ai" class="pv-assunto">
                      <div class="pv-node pv-node--assunto">
                        <span>{{ ass.nome }}</span>
                        <span class="pv-val">{{ ass.qtd }} ({{ ass.pct }}%)</span>
                      </div>
                      <div v-for="(sub, si) in ass.sub_assuntos" :key="si" class="pv-sub">
                        <div class="pv-node pv-node--sub">
                          <span>{{ sub.nome }}</span>
                          <span class="pv-val">{{ sub.qtd }} ({{ sub.pct }}%)</span>
                        </div>
                      </div>
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </div>
          <div class="modal__footer">
            <button class="btn-outline" @click="tryCloseModal">Cancelar</button>
            <button
              class="btn-outline"
              :disabled="!canSave"
              @click="salvar(true)"
              title="Salva e fecha o modal"
            >
              Salvar e fechar
            </button>
            <button
              class="btn-primary"
              :disabled="!canSave"
              @click="salvar(false)"
              title="Salva e mantém o modal aberto para o próximo ano"
            >
              {{ saving ? 'Salvando...' : 'Salvar' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, reactive, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Plus, BarChart3, MoreVertical, Trash2, X, Eye, Zap, ChevronDown,
  TrendingUp, TrendingDown
} from 'lucide-vue-next'
import { Line, Bar } from 'vue-chartjs'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js'
import { useEstatisticaStore } from '@/stores/useEstatisticaStore'
import { useDictsStore } from '@/stores/useDictsStore'
import { parseEstatisticas, detectYear } from '@/utils/statsParser'
import { buildTrendRanking } from '@/utils/trendAnalysis'
import { computeMetrics, applyPreset, DEFAULT_PRESETS } from '@/utils/recurrenceAnalysis'
import { buildCsv, buildCsvFilename, downloadCsv, sanitizeFormulaPrefix } from '@/utils/csvExport'
import { toast } from 'vue-sonner'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import Pagination from '@/components/common/Pagination.vue'
import AnaliseToolbar from '@/components/analise/AnaliseToolbar.vue'
import AnaliseTable from '@/components/analise/AnaliseTable.vue'
import { PER_PAGE_OPTIONS as ANALISE_PER_PAGE_OPTIONS, DEFAULT_PER_PAGE as ANALISE_DEFAULT_PER_PAGE } from '@/components/analise/constants'
import { useImportDraft } from '@/composables/useImportDraft'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler)

const store = useEstatisticaStore()
const dictsStore = useDictsStore()

const activeTab = ref('importacoes')
const showModal = ref(false)
const openMenu = ref(null)
const saving = ref(false)
const detalhesItem = ref(null)
const detalhesState = reactive({})

const form = ref({ banca: '', area: '', ano: null, descricao: '' })
const textoBruto = ref('')
const previewDados = ref({ disciplinas: [] })
const pvState = reactive({})
const textareaRef = ref(null)

const bancaSearch = ref('')
const showBancaList = ref(false)
const areaSearch = ref('')
const showAreaList = ref(false)

const filtro = ref({ banca: '', area: '', ano: '' })
const page = ref(1)
const perPage = ref(12)

const showDeleteDialog = ref(false)
const deleteId = ref(null)

const importDraft = useImportDraft()
const bannerDismissed = ref(false)
const showExitDialog = ref(false)
const detectedYear = ref(null)
const showDuplicateDialog = ref(false)
const duplicateMatch = ref(null)
const pendingCloseAfter = ref(false)

const filteredBancas = computed(() => {
  if (!bancaSearch.value) return dictsStore.bancas
  const q = bancaSearch.value.toLowerCase()
  return dictsStore.bancas.filter(b => b.nome.toLowerCase().includes(q))
})

const filteredAreas = computed(() => {
  if (!areaSearch.value) return dictsStore.areas
  const q = areaSearch.value.toLowerCase()
  return dictsStore.areas.filter(a => a.nome.toLowerCase().includes(q))
})

const bancasUsadas = computed(() => [...new Set(store.estatisticas.map(e => e.banca))].sort())
const anosUsados = computed(() => [...new Set(store.estatisticas.map(e => e.ano))].sort((a, b) => b - a))

const areasDisponiveisFiltro = computed(() => {
  const base = filtro.value.banca
    ? store.estatisticas.filter(e => e.banca === filtro.value.banca)
    : store.estatisticas
  return [...new Set(base.map(e => e.area).filter(Boolean))].sort()
})

const estatisticasFiltradas = computed(() => {
  return store.estatisticas.filter(e => {
    if (filtro.value.banca && e.banca !== filtro.value.banca) return false
    if (filtro.value.area && (e.area || '') !== filtro.value.area) return false
    if (filtro.value.ano && e.ano !== filtro.value.ano) return false
    return true
  })
})

const totalPaginas = computed(() =>
  Math.max(1, Math.ceil(estatisticasFiltradas.value.length / perPage.value))
)

const estatisticasPagina = computed(() => {
  // Guard: se page ficar maior que totalPaginas (ex: após delete), usa o último válido
  const validPage = Math.min(page.value, totalPaginas.value)
  const start = (validPage - 1) * perPage.value
  return estatisticasFiltradas.value.slice(start, start + perPage.value)
})

// Reset página quando filtro ou per-page muda
watch(
  () => [filtro.value.banca, filtro.value.area, filtro.value.ano, perPage.value],
  () => {
    page.value = 1
  },
)

// Limpa área se a nova banca não tem a área atualmente selecionada
watch(
  () => filtro.value.banca,
  () => {
    if (filtro.value.area && !areasDisponiveisFiltro.value.includes(filtro.value.area)) {
      filtro.value.area = ''
    }
  },
)

function resetFiltros() {
  filtro.value = { banca: '', area: '', ano: '' }
  page.value = 1
}

function selectBanca(nome) { form.value.banca = nome; bancaSearch.value = nome; showBancaList.value = false }
function selectArea(nome) { form.value.area = nome; areaSearch.value = nome; showAreaList.value = false }

function totalQuestoes(est) {
  return est.dados?.disciplinas?.reduce((s, d) => s + d.qtd, 0) || 0
}

function topDisciplinas(est) {
  return (est.dados?.disciplinas || [])
    .slice()
    .sort((a, b) => b.qtd - a.qtd)
    .slice(0, 3)
}

function processar(silent = false) {
  const result = parseEstatisticas(textoBruto.value)
  previewDados.value = result
  // Abre todos no preview
  for (let i = 0; i < result.disciplinas.length; i++) pvState[i] = true
  if (!result.disciplinas.length && !silent) {
    toast.error('Nenhuma disciplina detectada. Verifique o formato.')
  }
}

const previewTotal = computed(() =>
  previewDados.value.disciplinas?.reduce((s, d) => s + d.qtd, 0) || 0
)

// Encapsula todas as condições de habilitação do botão Salvar.
// Ano e banca obrigatórios; preview ≥ 1 disciplina; área é opcional, mas se o usuário
// digitou no autocomplete sem selecionar uma sugestão, bloqueia (§11.5).
// Também bloqueia enquanto algum dialog (saída, duplicata) está aberto — evita re-cliques.
const canSave = computed(() => {
  if (saving.value) return false
  if (showExitDialog.value || showDuplicateDialog.value) return false
  if (!form.value.banca || !form.value.ano) return false
  if (!previewDados.value.disciplinas?.length) return false
  if (areaSearch.value.trim() && !form.value.area) return false
  return true
})

async function salvar(closeAfter = false) {
  // Validação: bancaSearch/areaSearch com texto mas sem seleção do autocomplete
  if (bancaSearch.value.trim() && !form.value.banca) {
    toast.error('Selecione uma banca da lista de sugestões.')
    return
  }
  if (areaSearch.value.trim() && !form.value.area) {
    toast.error('Selecione uma área da lista de sugestões.')
    return
  }
  if (!form.value.banca || !form.value.ano || !previewDados.value.disciplinas?.length) return

  // Detecção de duplicata (§7): match client-side por banca + área + ano.
  // Se existe, abre dialog para o usuário decidir Substituir (PATCH apenas dados) ou Cancelar.
  const dup = findDuplicate()
  if (dup) {
    duplicateMatch.value = dup
    pendingCloseAfter.value = closeAfter
    showDuplicateDialog.value = true
    return
  }

  await runSave({ mode: 'create', closeAfter })
}

function findDuplicate() {
  return store.estatisticas.find(
    (e) =>
      e.banca === form.value.banca &&
      (e.area || '') === (form.value.area || '') &&
      e.ano === form.value.ano,
  )
}

async function runSave({ mode, closeAfter, dupId }) {
  saving.value = true
  const banca = form.value.banca
  const area = form.value.area
  const anoSalvo = form.value.ano

  try {
    if (mode === 'update') {
      // PATCH apenas com `dados` — preserva descricao/banca/area/ano do doc original (§7)
      await store.updateEstatistica(dupId, { dados: previewDados.value }, { silent: true })
      toast.success(`Atualizado: ${banca} / ${area || 'Geral'} / ${anoSalvo}`)
    } else {
      await store.createEstatistica(
        { ...form.value, dados: previewDados.value },
        { silent: true },
      )
      toast.success(`Salvo: ${banca} / ${area || 'Geral'} / ${anoSalvo}`)
    }

    importDraft.clearDraft()

    if (closeAfter) {
      closeModal()
    } else {
      textoBruto.value = ''
      previewDados.value = { disciplinas: [] }
      Object.keys(pvState).forEach((k) => delete pvState[k])
      form.value.ano = anoSalvo - 1
      await nextTick()
      textareaRef.value?.focus()
    }
  } catch (err) {
    toast.error(err.message)
  } finally {
    saving.value = false
  }
}

async function onDuplicateConfirm() {
  const dup = duplicateMatch.value
  const closeAfter = pendingCloseAfter.value
  duplicateMatch.value = null
  pendingCloseAfter.value = false
  if (!dup) return
  await runSave({ mode: 'update', closeAfter, dupId: dup.id })
}

function onDuplicateCancel() {
  duplicateMatch.value = null
  pendingCloseAfter.value = false
}

function openModal() {
  form.value = {
    banca: '',
    area: '',
    ano: new Date().getFullYear(),
    descricao: '',
  }
  textoBruto.value = ''
  previewDados.value = { disciplinas: [] }
  bancaSearch.value = ''
  areaSearch.value = ''
  detectedYear.value = null
  Object.keys(pvState).forEach((k) => delete pvState[k])
  showModal.value = true

  // Re-checa rascunho válido (TTL pode ter expirado entre a montagem e a abertura)
  importDraft.refresh()
  bannerDismissed.value = false
}

// Banner aparece apenas quando: modal aberto + rascunho válido + não foi dispensado pelo usuário.
// "Dispensar" inclui: restaurar, descartar, ou começar a colar conteúdo no textarea.
const showRestoreBanner = computed(
  () => showModal.value && importDraft.hasValidDraft.value && !bannerDismissed.value,
)

// Quando o usuário começa a colar/digitar no textarea, descarta o banner sem apagar o rascunho.
// (Para reaver o banner, basta fechar o modal e abrir de novo.)
watch(textoBruto, (n, o) => {
  if (showModal.value && n && !o) bannerDismissed.value = true
})

async function restoreDraft() {
  const d = importDraft.draft.value
  if (!d) return
  // Atribuir form numa operação síncrona dispara o watcher [banca, area] que reseta ano.
  // Por isso reaplicamos form.ano após nextTick — sobrescreve o reset.
  form.value = {
    banca: d.form?.banca || '',
    area: d.form?.area || '',
    ano: d.form?.ano ?? new Date().getFullYear(),
    descricao: d.form?.descricao || '',
  }
  textoBruto.value = d.textoBruto || ''
  bancaSearch.value = form.value.banca
  areaSearch.value = form.value.area
  bannerDismissed.value = true
  await nextTick()
  if (d.form?.ano) form.value.ano = d.form.ano
}

function discardDraft() {
  importDraft.clearDraft()
  bannerDismissed.value = true
}

// Saída com confirmação se há conteúdo não-salvo no textarea (§3.7 da spec).
function tryCloseModal() {
  // Não fechar/abrir dialog enquanto save está em curso — espera o save terminar
  // (sticky vai limpar textoBruto e o user pode tentar fechar novamente).
  if (saving.value) return
  // Se já há um dialog aberto (saída ou duplicata), delega para ele —
  // evita múltiplos ConfirmDialogs sobrepostos.
  if (showExitDialog.value || showDuplicateDialog.value) return
  if (textoBruto.value.trim()) {
    showExitDialog.value = true
  } else {
    closeModal()
  }
}

// Atalhos (§5):
//   Ctrl/Cmd+Enter no textarea → processa preview (mostra erro se nada detectado)
//   Ctrl/Cmd+S em qualquer lugar do modal → salvar (sticky), preventDefault para não disparar "Salvar página"
//   Esc → fluxo de saída (com confirmação se há rascunho)
function onModalKeyDown(event) {
  if (!showModal.value) return
  // ConfirmDialogs (saída, duplicata) têm seu próprio handler de Esc — delega tudo para eles
  if (showExitDialog.value || showDuplicateDialog.value) return

  const isMod = event.ctrlKey || event.metaKey

  // Conservador: aceita apenas o atalho exato (sem Shift/Alt extras)
  // para não interferir com Shift+Ctrl+S (View Source) ou outros bindings do browser.
  if (event.shiftKey || event.altKey) return

  if (isMod && event.key === 'Enter') {
    if (event.target === textareaRef.value) {
      event.preventDefault()
      processar()
    }
    return
  }

  if (isMod && event.key.toLowerCase() === 's') {
    event.preventDefault()
    if (canSave.value) salvar(false)
    return
  }

  if (event.key === 'Escape') {
    event.preventDefault()
    tryCloseModal()
  }
}

watch(showModal, (open) => {
  if (open) {
    document.addEventListener('keydown', onModalKeyDown)
  } else {
    document.removeEventListener('keydown', onModalKeyDown)
  }
})

function formatDraftTime(iso) {
  try {
    const d = new Date(iso)
    return d.toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
  } catch {
    return ''
  }
}

function closeModal() {
  showModal.value = false
  showExitDialog.value = false
  showDuplicateDialog.value = false
  duplicateMatch.value = null
  pendingCloseAfter.value = false
  form.value = { banca: '', area: '', ano: null, descricao: '' }
  textoBruto.value = ''
  previewDados.value = { disciplinas: [] }
  bancaSearch.value = ''
  areaSearch.value = ''
  detectedYear.value = null
  Object.keys(pvState).forEach((k) => delete pvState[k])
}

// Reset do ano para o ano corrente quando banca ou área mudam
// (evita carregar ano decrementado de outro lote ao trocar combinação banca+area)
watch(
  () => [form.value.banca, form.value.area],
  () => {
    if (showModal.value) {
      form.value.ano = new Date().getFullYear()
    }
  },
)

// Sincroniza autocomplete: se o usuário apaga o input do search, limpa também o valor selecionado.
// Spec §3.6 — "se o usuário limpa a banca/área (volta a vazio), também reseta ano".
// Limpar form.banca/area dispara o watcher acima e reseta o ano.
watch(bancaSearch, (n) => {
  if (showModal.value && !n.trim() && form.value.banca) form.value.banca = ''
})
watch(areaSearch, (n) => {
  if (showModal.value && !n.trim() && form.value.area) form.value.area = ''
})

// Auto-processar + auto-extrair ano ao colar/digitar — debounce 300ms. Silencioso.
// Quando o textarea fica vazio (ex: após sticky save), limpa o preview imediatamente.
let processarTimer = null
watch(textoBruto, () => {
  clearTimeout(processarTimer)
  if (!showModal.value) return
  if (!textoBruto.value.trim()) {
    previewDados.value = { disciplinas: [] }
    Object.keys(pvState).forEach((k) => delete pvState[k])
    detectedYear.value = null
    return
  }
  processarTimer = setTimeout(() => {
    if (!showModal.value || !textoBruto.value.trim()) return
    processar(true)

    // Auto-extrair ano: se o conteúdo tem header com ano, sugere ou aplica.
    const detected = detectYear(textoBruto.value)
    detectedYear.value = detected
    if (detected && (form.value.ano === null || form.value.ano === '')) {
      // form.ano vazio → preenche silenciosamente (caso raro porque openModal
      // sempre seta currentYear, mas user pode ter apagado manualmente)
      form.value.ano = detected
    }
  }, 300)
})

// Chip "Detectado: X (aplicar)" aparece quando há ano detectado diferente do atual no form
const showYearChip = computed(
  () =>
    detectedYear.value !== null &&
    form.value.ano !== null &&
    form.value.ano !== '' &&
    detectedYear.value !== form.value.ano,
)

function applyDetectedYear() {
  if (detectedYear.value) form.value.ano = detectedYear.value
}

// Auto-save de rascunho com debounce de 1s. Salva apenas quando há conteúdo no textarea.
// clearTimeout é chamado SEMPRE no início do callback — evita timer pendente disparar
// e re-criar o draft após clearDraft() (race do salvar com sucesso).
let draftSaveTimer = null
watch([textoBruto, () => form.value.banca, () => form.value.area, () => form.value.ano, () => form.value.descricao],
  () => {
    clearTimeout(draftSaveTimer)
    if (!showModal.value) return
    if (!textoBruto.value.trim()) return
    draftSaveTimer = setTimeout(() => {
      // Validação extra dentro do timer: se modal fechou ou texto sumiu, não salva
      if (!showModal.value || !textoBruto.value.trim()) return
      importDraft.saveDraft({
        form: { ...form.value },
        textoBruto: textoBruto.value,
      })
    }, 1000)
  },
)

onBeforeUnmount(() => {
  clearTimeout(draftSaveTimer)
  clearTimeout(processarTimer)
  document.removeEventListener('keydown', onModalKeyDown)
})

function verDetalhes(est) {
  detalhesItem.value = est
  openMenu.value = null
  for (let i = 0; i < (est.dados?.disciplinas?.length || 0); i++) detalhesState[i] = false
}

function toggleDetalhesAll(expand) {
  for (let i = 0; i < (detalhesItem.value?.dados?.disciplinas?.length || 0); i++) {
    detalhesState[i] = expand
  }
}

function confirmDelete(id) {
  deleteId.value = id
  showDeleteDialog.value = true
  openMenu.value = null
}

async function executeDelete() {
  const id = deleteId.value
  if (!id) return
  try { await store.removeEstatistica(id) } catch (err) { toast.error(err.message) }
  deleteId.value = null
}

function toggleMenu(id) { openMenu.value = openMenu.value === id ? null : id }

// ── Tendências ───────────────────────────────────────────────

const trend = ref({ banca: '', area: '', disciplina: '', assunto: '' })
const trendData = ref({ anos: [], subindo: [], descendo: [], disciplinas: {} })

const areasUsadas = computed(() =>
  [...new Set(store.estatisticas.filter(e => !trend.value.banca || e.banca === trend.value.banca).map(e => e.area).filter(Boolean))].sort()
)

const COLORS = ['#534AB7', '#E65100', '#16A34A', '#2563EB', '#D97706', '#DC2626', '#7C3AED', '#0891B2', '#BE185D', '#4338CA']

// Lista de disciplinas disponíveis nos dados filtrados
const disciplinasDisponiveis = computed(() => {
  if (!trend.value.banca) return []
  const filtradas = store.estatisticas.filter(e => {
    if (e.banca !== trend.value.banca) return false
    if (trend.value.area && e.area !== trend.value.area) return false
    return true
  })
  const nomes = new Set()
  for (const est of filtradas) {
    for (const disc of est.dados?.disciplinas || []) nomes.add(disc.nome)
  }
  return [...nomes].sort()
})

// Lista de assuntos com sub-assuntos na disciplina selecionada
const subAssuntosDisponiveis = computed(() => {
  if (!trend.value.disciplina) return []
  const filtradas = store.estatisticas.filter(e => {
    if (e.banca !== trend.value.banca) return false
    if (trend.value.area && e.area !== trend.value.area) return false
    return true
  })
  const nomes = new Set()
  for (const est of filtradas) {
    const disc = est.dados?.disciplinas?.find(d => d.nome === trend.value.disciplina)
    if (!disc) continue
    for (const ass of disc.assuntos || []) {
      if (ass.sub_assuntos?.length) nomes.add(ass.nome)
    }
  }
  return [...nomes].sort()
})

function onTrendFilterChange() {
  trend.value.disciplina = ''
  trend.value.assunto = ''
  calcularTendencias()
}

function calcularTendencias() {
  if (!trend.value.banca) {
    trendData.value = { anos: [], subindo: [], descendo: [], total: 0, descartados: 0, disciplinas: {}, assuntos: {}, subAssuntos: {} }
    return
  }

  const ranking = buildTrendRanking(store.estatisticas, {
    banca: trend.value.banca,
    area: trend.value.area || undefined,
    disciplina: trend.value.disciplina || undefined,
  })

  // Mapeia nomes da saída de buildTrendRanking para os usados pelos charts atuais
  // (compatibilidade com chartDisciplinas/chartAssuntosDisciplina/chartSubAssuntos).
  trendData.value = {
    anos: ranking.anos,
    subindo: ranking.subindo,
    descendo: ranking.descendo,
    total: ranking.total,
    descartados: ranking.descartados,
    disciplinas: ranking.disciplinasMap,
    assuntos: ranking.assuntosMap,
    subAssuntos: ranking.subAssuntosMap,
  }
}

// Hint dinâmico baseado na categoria que mais filtrou — orienta diagnóstico empírico.
const trendNoResultsHint = computed(() => {
  const d = trendData.value.descartados
  if (!d || !d.total) {
    return 'Importe mais anos ou aguarde provas com perfil mais consistente para detectar tendências.'
  }
  const counts = {
    poucosAnos: d.poucosAnos || 0,
    qtdBaixa: d.qtdBaixa || 0,
    r2Baixo: d.r2Baixo || 0,
    slopeBaixo: d.slopeBaixo || 0,
  }
  const [maiorCat] = Object.entries(counts).sort((a, b) => b[1] - a[1])
  switch (maiorCat[0]) {
    case 'poucosAnos':
      return 'Muitos assuntos só apareceram em 1-2 anos — programa amplo e pulverizado. Pra esse perfil, a aba Análise (em desenvolvimento) com métrica de recorrência será mais útil que tendência.'
    case 'qtdBaixa':
      return 'Muitos assuntos têm volume absoluto baixo (sub-tópicos pulverizados). Considere ajustar a granularidade dos dados importados ou aguardar mais provas.'
    case 'r2Baixo':
      return 'Os dados oscilam muito entre anos sem seguir uma trajetória clara — comum em programas com edições heterogêneas. Não há tendência linear; cada prova cobre coisas diferentes.'
    case 'slopeBaixo':
      return 'Programa estável: pcts variam pouco entre anos, então não há tendência clara de alta ou queda. Use a aba Análise (em desenvolvimento) para ver recorrência absoluta.'
    default:
      return 'Calibração de thresholds pode ajustar isso.'
  }
})

// Formata slope em pp/ano com sinal explícito. Ex: 0.85 → "+0.85pp/ano", -1.23 → "-1.23pp/ano"
function slopeFormat(slope) {
  if (!Number.isFinite(slope)) return '—'
  const sign = slope > 0 ? '+' : ''
  return `${sign}${slope.toFixed(2)}pp/ano`
}

// Re-calcula tendências quando o store muda (ex: usuário importa nova estatística
// enquanto a aba Tendências está aberta). Evita trendData stale.
watch(
  () => store.estatisticas.length,
  () => {
    if (trend.value.banca) calcularTendencias()
  },
)

// Gráfico de linha: top disciplinas ao longo dos anos
const chartDisciplinas = computed(() => {
  const { anos, disciplinas } = trendData.value
  if (!anos.length) return { labels: [], datasets: [] }

  // Top 8 disciplinas por média de percentual
  const discComMedia = Object.entries(disciplinas).map(([nome, porAno]) => {
    const vals = Object.values(porAno)
    return { nome, media: vals.reduce((s, v) => s + v, 0) / vals.length, porAno }
  }).sort((a, b) => b.media - a.media).slice(0, 8)

  return {
    labels: anos.map(String),
    datasets: discComMedia.map((d, i) => ({
      label: d.nome,
      data: anos.map(a => d.porAno[a] ?? null),
      borderColor: COLORS[i % COLORS.length],
      backgroundColor: COLORS[i % COLORS.length] + '20',
      tension: 0.3,
      fill: false,
      spanGaps: true,
      pointRadius: 4,
    })),
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom', labels: { font: { size: 11, family: 'DM Sans' }, boxWidth: 12 } },
    tooltip: { mode: 'index', intersect: false },
  },
  scales: {
    y: { beginAtZero: true, title: { display: true, text: '%', font: { size: 11 } } },
    x: { title: { display: true, text: 'Ano', font: { size: 11 } } },
  },
}

// Gráfico de barras: assuntos com maior variação por ano (slope)
const chartAssuntos = computed(() => {
  const todos = [...trendData.value.subindo.slice(0, 8), ...trendData.value.descendo.slice(0, 8)]
    .sort((a, b) => b.slope - a.slope)

  return {
    labels: todos.map(t => t.nome.length > 40 ? t.nome.slice(0, 37) + '...' : t.nome),
    datasets: [{
      label: 'Variação (pp/ano)',
      data: todos.map(t => t.slope),
      backgroundColor: todos.map(t => t.slope > 0 ? '#16A34A40' : '#DC262640'),
      borderColor: todos.map(t => t.slope > 0 ? '#16A34A' : '#DC2626'),
      borderWidth: 1,
    }],
  }
})

const chartAssuntosOptions = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y',
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => `${ctx.raw > 0 ? '+' : ''}${ctx.raw.toFixed(2)}pp/ano`,
      },
    },
  },
  scales: {
    x: { title: { display: true, text: 'Variação por ano (pp/ano)', font: { size: 11 } } },
  },
}

// Gráfico de linha: assuntos da disciplina selecionada
const chartAssuntosDisciplina = computed(() => {
  const { anos, assuntos } = trendData.value
  if (!anos.length || !trend.value.disciplina) return { labels: [], datasets: [] }

  const discNome = trend.value.disciplina
  const assFiltrados = Object.entries(assuntos)
    .filter(([, v]) => v.disc === discNome)
    .map(([key, porAno]) => {
      const nomeSimples = key.split(' → ').slice(1).join(' → ')
      const vals = anos.map(a => porAno[a] ?? 0).filter(v => v > 0)
      const media = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0
      return { nome: nomeSimples, media, porAno }
    })
    .sort((a, b) => b.media - a.media)
    .slice(0, 10)

  return {
    labels: anos.map(String),
    datasets: assFiltrados.map((d, i) => ({
      label: d.nome,
      data: anos.map(a => d.porAno[a] ?? null),
      borderColor: COLORS[i % COLORS.length],
      backgroundColor: COLORS[i % COLORS.length] + '20',
      tension: 0.3,
      fill: false,
      spanGaps: true,
      pointRadius: 4,
    })),
  }
})

// Gráfico de barras: sub-assuntos (variação ou valores do último ano)
const chartSubAssuntos = computed(() => {
  const { anos, subAssuntos } = trendData.value
  if (!anos.length || !trend.value.disciplina) return { labels: [], datasets: [] }

  const discNome = trend.value.disciplina
  const assuntoFiltro = trend.value.assunto

  const subsFiltrados = Object.entries(subAssuntos)
    .filter(([, v]) => {
      if (v.disc !== discNome) return false
      if (assuntoFiltro && v.assunto !== assuntoFiltro) return false
      return true
    })
    .map(([key, porAno]) => {
      const nomeSimples = key.split(' → ').pop()
      const anosItem = Object.keys(porAno).filter(k => !isNaN(k)).map(Number).sort()
      if (anosItem.length >= 2) {
        const delta = porAno[anosItem[anosItem.length - 1]] - porAno[anosItem[0]]
        return { nome: nomeSimples, valor: delta, tipo: 'delta' }
      }
      // Com 1 ano: mostra valor absoluto
      const ultimoAno = anosItem[anosItem.length - 1]
      return { nome: nomeSimples, valor: porAno[ultimoAno] || 0, tipo: 'absoluto' }
    })
    .filter(s => s.valor !== 0)
    .sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor))
    .slice(0, 15)

  const ehDelta = subsFiltrados.some(s => s.tipo === 'delta')

  return {
    labels: subsFiltrados.map(s => s.nome.length > 45 ? s.nome.slice(0, 42) + '...' : s.nome),
    datasets: [{
      label: ehDelta ? 'Variação (pp)' : '% questões',
      data: subsFiltrados.map(s => s.valor),
      backgroundColor: subsFiltrados.map(s =>
        s.tipo === 'delta' ? (s.valor > 0 ? '#16A34A40' : '#DC262640') : '#534AB740'
      ),
      borderColor: subsFiltrados.map(s =>
        s.tipo === 'delta' ? (s.valor > 0 ? '#16A34A' : '#DC2626') : '#534AB7'
      ),
      borderWidth: 1,
    }],
  }
})

// ═══ Aba Análise ═════════════════════════════════════════════════════════════
// State, computeds e handlers da aba "Análise" (recorrência + volume + tendência).
// Spec: docs/superpowers/specs/2026-05-07-analise-recorrencia-design.md
// Querystring (Fase 4) virá depois — por ora, refs locais com defaults da §15.3.

const analise = reactive({
  banca: '',
  area: '',
  gran: 'assunto',
  discFilter: '',
  assFilter: '',
  preset: 'moderado',
  cross: false,
  sort: 'recorrencia',
  dir: 'desc',
  page: 1,
  perPage: ANALISE_DEFAULT_PER_PAGE,
})
const analiseSelectedKeys = ref([])

// Áreas disponíveis pra banca-alvo escolhida (vai pra Toolbar)
const analiseAreasOptions = computed(() => {
  if (!analise.banca) return []
  const out = new Set()
  for (const e of store.estatisticas) {
    if (e.banca !== analise.banca) continue
    if (e.area) out.add(e.area)
  }
  return [...out].sort()
})

// Disciplinas disponíveis pro select da toolbar (filtradas por banca/área)
const analiseDisciplinasOptions = computed(() => {
  if (!analise.banca) return []
  const out = new Set()
  for (const e of store.estatisticas) {
    if (e.banca !== analise.banca) continue
    if (analise.area && (e.area || '') !== analise.area) continue
    for (const disc of e.dados?.disciplinas || []) {
      if (disc.nome) out.add(disc.nome)
    }
  }
  return [...out].sort()
})

// Outras bancas com mesma área (habilita o toggle cross-banca)
const analiseOtherBancasInArea = computed(() => {
  if (!analise.banca || !analise.area) return []
  const out = new Set()
  for (const e of store.estatisticas) {
    if (e.banca === analise.banca) continue
    if ((e.area || '') !== analise.area) continue
    out.add(e.banca)
  }
  return [...out].sort()
})

// Pipeline da Análise: computeMetrics → applyPreset → sort
const analiseRaw = computed(() =>
  computeMetrics(store.estatisticas, {
    banca: analise.banca,
    area: analise.area || undefined,
    granularidade: analise.gran,
    disciplinaFiltro: analise.discFilter || undefined,
    assuntoFiltro: analise.assFilter || undefined,
    crossBanca: analise.cross,
  }),
)

const analiseFiltered = computed(() => applyPreset(analiseRaw.value.items, analise.preset))

const analiseSorted = computed(() => sortAnaliseItems(analiseFiltered.value, analise.sort, analise.dir))

// Pipeline pesado: chama computeMetrics e organiza subs por assunto pai.
// Depende SÓ de banca/area/disc/cross/gran — NÃO de preset. Cacheado pelo Vue.
// Separado do passesPreset (computed leve abaixo) pra evitar recompute do pipeline
// quando user só troca preset (#ARCH-24 / #VUE-14).
const analiseSubsByAssuntoRaw = computed(() => {
  if (!analise.discFilter || analise.gran !== 'assunto') return new Map()
  const result = computeMetrics(store.estatisticas, {
    banca: analise.banca,
    area: analise.area || undefined,
    granularidade: 'sub_assunto',
    disciplinaFiltro: analise.discFilter,
    crossBanca: analise.cross,
  })
  const map = new Map()
  for (const item of result.items) {
    if (!map.has(item.pai)) map.set(item.pai, [])
    map.get(item.pai).push(item)
  }
  for (const subs of map.values()) {
    subs.sort((a, b) => b.recorrencia - a.recorrencia)
  }
  return map
})

// Computed leve: anota cada sub com `passesPreset` baseado no preset atual.
// Quando user troca preset, SÓ este computed re-roda — pipeline não.
// Recria o Map (referências dos subs novas com flag) pra que o watcher do
// componente filho (#VUE-14) detecte ou ignore conforme estratégia (compara keys).
const analiseSubsByAssunto = computed(() => {
  const raw = analiseSubsByAssuntoRaw.value
  if (raw.size === 0) return new Map()
  const t = DEFAULT_PRESETS[analise.preset] || DEFAULT_PRESETS.moderado
  const out = new Map()
  for (const [pai, subs] of raw) {
    out.set(
      pai,
      subs.map((sub) => ({
        ...sub,
        passesPreset:
          sub.recorrencia >= t.recorrenciaMin && sub.volumeTotal >= t.volumeTotalMin,
      })),
    )
  }
  return out
})

function sortAnaliseItems(items, sortKey, dir) {
  const mult = dir === 'desc' ? -1 : 1
  // Null tratado como -Infinity: vai pro fim em desc, pro topo em asc.
  // Caso defensivo — coluna Recência fica oculta quando anos.length<3, então user
  // raramente vê sort=recencia com items null. Mas querystring `?sort=recencia` num
  // dataset de 2 anos exercita esse path.
  const accessor = sortKey === 'nome'
    ? (i) => (i.nome || '').toLowerCase()
    : (i) => (i[sortKey] == null ? Number.NEGATIVE_INFINITY : i[sortKey])
  return [...items].sort((a, b) => {
    const va = accessor(a)
    const vb = accessor(b)
    if (va < vb) return -1 * mult
    if (va > vb) return 1 * mult
    return 0
  })
}

// Breadcrumb derivado do estado de drill-down + filtros
const analiseBreadcrumb = computed(() => {
  const out = [{ label: 'Análise', level: 0 }]
  if (analise.discFilter) out.push({ label: analise.discFilter, level: 1 })
  if (analise.assFilter && analise.discFilter) out.push({ label: analise.assFilter, level: 2 })
  return out
})

// Watchers — comportamento da §7.1 (mudança de banca/área/granularidade)
watch(
  () => [analise.banca, analise.area],
  () => {
    // Mudança de banca/área reseta drill-down + seleções + paginação; sort/dir são UI preference
    analise.gran = 'assunto'
    analise.discFilter = ''
    analise.assFilter = ''
    analise.page = 1
    analiseSelectedKeys.value = []
  },
)

watch(
  () => analise.gran,
  (newGran, oldGran) => {
    if (newGran === oldGran) return
    if (newGran === 'disciplina') {
      analise.discFilter = ''
      analise.assFilter = ''
    } else if (newGran === 'assunto') {
      analise.assFilter = ''
    }
    analise.page = 1
    // Seleções são por `caminhoCompleto`, que muda com a granularidade — keys da
    // granularidade anterior viram órfãs. Zerar evita selectedCount inflado e
    // copy/CSV incluindo items invisíveis. Cobre tanto mudança via toolbar quanto
    // via breadcrumb-go (que também muda gran).
    analiseSelectedKeys.value = []
  },
)

// Mudança de filtro/cross/preset volta página pra 1 (não mexe em seleção/sort)
watch(
  () => [analise.preset, analise.cross, analise.discFilter, analise.assFilter, analise.perPage],
  () => {
    analise.page = 1
  },
)

// Auto-desliga cross-banca se não há mais bancas similares disponíveis (ex: usuário trocou área)
watch(
  () => analiseOtherBancasInArea.value,
  (others) => {
    if (others.length === 0 && analise.cross) {
      analise.cross = false
      toast.info('Nenhuma banca similar tem dados nessa área. Cross-banca desativado.')
    }
  },
)

// Guard: disciplina inválida na URL (ou disciplina deletada do dataset depois)
// → reseta pra "Todas". Cuidado: só dispara depois de o store ter populado, senão
// reseta a disc legítima durante fetch inicial. Spec §15.2 prevê comportamento
// análogo pra banca/área (carrega + empty state); aqui aplicamos a mesma semântica
// pra disc com aviso explícito quando há divergência.
watch(
  () => [analise.discFilter, analiseDisciplinasOptions.value, store.estatisticas.length],
  ([disc, options, count]) => {
    if (!disc) return
    if (count === 0) return // store ainda fetching — não toca
    if (!options.includes(disc)) {
      const stale = disc
      analise.discFilter = ''
      analise.assFilter = ''
      toast.info(`Disciplina "${stale}" não encontrada na banca/área atual. Filtro removido.`)
    }
  },
)

// Drill-down: clicou na linha de uma disciplina/assunto
function onAnaliseDrillDown(item) {
  if (item.tipo === 'disciplina') {
    analise.gran = 'assunto'
    analise.discFilter = item.nome
  } else if (item.tipo === 'assunto') {
    analise.gran = 'sub_assunto'
    if (!analise.discFilter && item.pai) {
      analise.discFilter = item.pai
    }
    analise.assFilter = item.nome
  }
  analise.page = 1
  analiseSelectedKeys.value = []
}

// Disciplina selecionada via toolbar — sincroniza com discFilter (drill-down via clique
// também atualiza discFilter, então select reflete via :disciplina)
function onAnaliseDisciplinaChange(newDisc) {
  analise.discFilter = newDisc
  if (newDisc && analise.gran === 'disciplina') {
    analise.gran = 'assunto'
  }
  if (!newDisc) {
    analise.assFilter = ''
  }
  // caminhoCompleto da disciplina antiga não bate com itens da nova — zerar evita
  // contador inflado, igual ao watcher de gran (regra-de-vida #VUE-13).
  analiseSelectedKeys.value = []
}

// Breadcrumb: clicou num crumb pra voltar. Spec §7.1: "limpa filtros do nível imediatamente
// abaixo + paginação volta para 1; mantém seleções e ordenação".
//
// Granularidade alinha com o nível do crumb: clicar level 0 (Análise) → gran=disciplina,
// clicar level 1 (Disc) → gran=assunto. Isso resolve o caso típico do drill profundo:
// se usuário fez Disc→Ass (gran=sub_assunto), clicar "Trib" volta pra "assuntos da Trib"
// (não pra "sub-assuntos sem filtro de assunto", que seria confuso).
//
// O último crumb é current (disabled), então level 0 só é clicável quando há drill ativo —
// nesses casos forçar gran de volta faz sentido.
function onAnaliseBreadcrumbGo(level) {
  if (level === 0) {
    analise.discFilter = ''
    analise.assFilter = ''
    analise.gran = 'disciplina'
  } else if (level === 1) {
    analise.assFilter = ''
    analise.gran = 'assunto'
  }
  analise.page = 1
}

// Outputs (Fase 5 vai polir; aqui o copiar simples já funciona)
async function onAnaliseCopySelected() {
  const sel = new Set(analiseSelectedKeys.value)
  const lines = analiseSorted.value
    .filter((i) => sel.has(i.caminhoCompleto))
    // Sanitiza prefixos de fórmula caso usuário cole em Excel/LibreOffice (CSV/formula injection).
    .map((i) => sanitizeFormulaPrefix(i.caminhoCompleto))
  if (!lines.length) return
  try {
    await navigator.clipboard.writeText(lines.join('\n'))
    toast.success(`${lines.length} item(s) copiado(s)`)
  } catch (err) {
    console.error('[analise] Clipboard writeText failed:', err)
    toast.error('Não foi possível copiar (verifique permissões do navegador)')
  }
}

function onAnaliseExportCsv() {
  if (!analiseSorted.value.length) return
  const csv = buildCsv(analiseSorted.value)
  const filename = buildCsvFilename(analise.banca, analise.area)
  downloadCsv(csv, filename)
  toast.success(`CSV gerado: ${filename}`)
}

// ─── Querystring sync (§15) ──────────────────────────────────────────────────
// Estado da Análise é persistido na URL pra refresh, back/forward e share-link.
// Outras abas não persistem nada — só Análise (spec §15.1: tab=analise distingue).

const route = useRoute()
const router = useRouter()

const VALID_GRAN = ['disciplina', 'assunto', 'sub_assunto']
const VALID_PRESET = ['conservador', 'moderado', 'permissivo']
const VALID_SORT = ['nome', 'recorrencia', 'recencia', 'volumeMedio', 'volumeTotal', 'pctMedio', 'slope']
const VALID_DIR = ['asc', 'desc']
const ANALISE_QUERY_KEYS = ['tab', 'banca', 'area', 'gran', 'disc', 'ass', 'preset', 'cross', 'sort', 'dir', 'page', 'perPage']
// Reutiliza opções do componente — single source of truth (#ARCH-24)
const VALID_PER_PAGE = ANALISE_PER_PAGE_OPTIONS

// Lê route.query e devolve o snapshot validado pra aplicar no state.
// Valores inválidos caem pra default (§15.2).
function parseAnaliseQuery() {
  const q = route.query
  const pageNum = Number(q.page)
  const perPageNum = Number(q.perPage)
  const out = {
    banca: typeof q.banca === 'string' ? q.banca : '',
    area: typeof q.area === 'string' ? q.area : '',
    gran: VALID_GRAN.includes(q.gran) ? q.gran : 'assunto',
    discFilter: typeof q.disc === 'string' ? q.disc : '',
    assFilter: typeof q.ass === 'string' ? q.ass : '',
    preset: VALID_PRESET.includes(q.preset) ? q.preset : 'moderado',
    cross: q.cross === '1',
    sort: VALID_SORT.includes(q.sort) ? q.sort : 'recorrencia',
    dir: VALID_DIR.includes(q.dir) ? q.dir : 'desc',
    page: Number.isInteger(pageNum) && pageNum > 0 ? pageNum : 1,
    perPage: VALID_PER_PAGE.includes(perPageNum) ? perPageNum : ANALISE_DEFAULT_PER_PAGE,
  }
  // Validações cruzadas (§15.2):
  // - disc só vale com gran=assunto|sub_assunto
  // - ass só vale com disc presente
  if (out.gran === 'disciplina') {
    out.discFilter = ''
    out.assFilter = ''
  }
  if (!out.discFilter) out.assFilter = ''
  return out
}

// Aplica snapshot da URL ao state. Idempotente (se valor já está, watcher de
// state→URL não re-dispara replace porque buildAnaliseQuery vai gerar a mesma
// string que está em route.query).
function applyAnaliseQueryToState() {
  const next = parseAnaliseQuery()
  Object.assign(analise, next)
}

// Constrói o objeto query a partir do state. Defaults são omitidos pra manter URL limpa.
function buildAnaliseQuery() {
  const q = { tab: 'analise' }
  if (analise.banca) q.banca = analise.banca
  if (analise.area) q.area = analise.area
  if (analise.gran !== 'assunto') q.gran = analise.gran
  if (analise.discFilter) q.disc = analise.discFilter
  if (analise.assFilter && analise.discFilter) q.ass = analise.assFilter
  if (analise.preset !== 'moderado') q.preset = analise.preset
  if (analise.cross) q.cross = '1'
  if (analise.sort !== 'recorrencia') q.sort = analise.sort
  if (analise.dir !== 'desc') q.dir = analise.dir
  if (analise.page !== 1) q.page = String(analise.page)
  if (analise.perPage !== ANALISE_DEFAULT_PER_PAGE) q.perPage = String(analise.perPage)
  return q
}

// Comparação rasa de query objects (todos os values são strings ou undefined).
function queryEqual(a, b) {
  const ak = Object.keys(a).sort()
  const bk = Object.keys(b).sort()
  if (ak.length !== bk.length) return false
  for (let i = 0; i < ak.length; i++) {
    if (ak[i] !== bk[i]) return false
    if (String(a[ak[i]]) !== String(b[bk[i]])) return false
  }
  return true
}

// Watcher state → URL: dispara replace (ou push pra mudanças significativas).
// Significativas (§15.3): banca ou area mudaram → cria entry de history.
watch(
  [() => activeTab.value, analise],
  ([tab]) => {
    // Preserva params não-relacionados à Análise (defensivo; hoje a view não usa outros)
    const preserved = {}
    for (const k of Object.keys(route.query)) {
      if (!ANALISE_QUERY_KEYS.includes(k)) preserved[k] = route.query[k]
    }
    const target = tab === 'analise'
      ? { ...preserved, ...buildAnaliseQuery() }
      : preserved

    if (queryEqual(target, route.query)) return

    const significant =
      tab === 'analise' &&
      (target.banca !== route.query.banca || target.area !== route.query.area)

    const navMethod = significant ? 'push' : 'replace'
    router[navMethod]({ query: target }).catch(() => {
      // NavigationDuplicated é silencioso — Vue Router 4 já trata, mas defensivo
    })
  },
  { deep: true },
)

// Watcher URL → state: cobre back/forward e deeplinks.
watch(
  () => route.query,
  (q) => {
    if (q.tab === 'analise') {
      activeTab.value = 'analise'
      applyAnaliseQueryToState()
    } else if (activeTab.value === 'analise') {
      // Back-nav saiu da aba Análise — volta pra default
      activeTab.value = 'importacoes'
    }
  },
)

function handleGlobalClick() {
  openMenu.value = null
}

onMounted(async () => {
  // Registra listener antes do await para evitar janela onde o menu não fecha com clique fora
  window.addEventListener('click', handleGlobalClick)

  // Estado inicial da Análise via querystring (§15.3)
  if (route.query.tab === 'analise') {
    activeTab.value = 'analise'
    applyAnaliseQueryToState()
  }

  const fetches = [store.fetchEstatisticas()]
  if (!dictsStore.bancas.length) fetches.push(dictsStore.fetchByTipo('banca'))
  if (!dictsStore.areas.length) fetches.push(dictsStore.fetchByTipo('area'))
  await Promise.all(fetches)
})

onBeforeUnmount(() => {
  window.removeEventListener('click', handleGlobalClick)
})
</script>

<style scoped>
.stats-view { max-width: 1100px; display: flex; flex-direction: column; gap: 24px; }

.stats-view__header {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap;
}
.stats-view__title { font-size: 1.25rem; font-weight: 700; color: #1a1a2e; margin: 0; }
.stats-view__sub { font-size: 12px; color: #aaa; margin: 4px 0 0; }

/* Filtros */
.filters-row { display: flex; gap: 8px; }
.filter-select {
  padding: 6px 12px; border: 1px solid #ddd; border-radius: 8px;
  font-family: 'DM Sans', sans-serif; font-size: 12px; color: #444;
  background: #fff; cursor: pointer;
}

/* Grid */
.stats-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 14px;
}

/* Card */
.stat-card {
  background: #fff; border: 1px solid #ebe9e4; border-radius: 14px; padding: 20px;
  display: flex; flex-direction: column; gap: 14px;
  transition: border-color 0.15s, transform 0.15s;
}
.stat-card:hover { border-color: #AFA9EC; transform: translateY(-2px); }

.stat-card__top { display: flex; align-items: flex-start; gap: 12px; }
.stat-card__icon {
  width: 36px; height: 36px; border-radius: 10px; background: #534AB7; color: #fff;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.stat-card__meta { flex: 1; min-width: 0; }
.stat-card__badges { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 4px; }
.stat-card__desc { font-size: 12px; color: #888; margin: 0; }

.badge {
  font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px;
  text-transform: uppercase; letter-spacing: 0.04em;
}
.badge--banca { background: #FFF7ED; color: #9A3412; }
.badge--area { background: #EEF2FF; color: #4338CA; }
.badge--ano { background: #F8FAFC; color: #475569; }

.stat-card__resumo { font-size: 12px; color: #666; }
.stat-card__total { font-weight: 600; }

/* Top 3 disciplinas com barras */
.stat-card__top3 { display: flex; flex-direction: column; gap: 6px; }
.top-disc { position: relative; padding: 6px 10px; border-radius: 6px; overflow: hidden; }
.top-disc__bar {
  position: absolute; left: 0; top: 0; bottom: 0;
  background: #EEF2FF; border-radius: 6px; z-index: 0;
  min-width: 4px; max-width: 100%;
}
.top-disc__nome { position: relative; z-index: 1; font-size: 12px; font-weight: 500; color: #1a1a2e; }
.top-disc__val {
  position: relative; z-index: 1; font-size: 11px; color: #666;
  float: right; font-weight: 600;
}

/* Menu */
.stat-card__menu { position: relative; }
.dropdown {
  position: absolute; top: 30px; right: 0; background: #fff; border: 1px solid #ebe9e4;
  border-radius: 10px; padding: 4px; min-width: 150px; z-index: 50;
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
}
.dropdown__item {
  display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 10px;
  border: none; background: transparent; border-radius: 6px; font-family: 'DM Sans', sans-serif;
  font-size: 13px; color: #444; cursor: pointer; text-align: left; transition: background 0.15s;
}
.dropdown__item:hover { background: #f5f4f0; }
.dropdown__item--danger { color: #c0392b; }
.dropdown__item--danger:hover { background: #fdf0ef; }
.dropdown__divider { height: 1px; background: #f0efea; margin: 4px 0; }

/* Modal */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 100;
  display: flex; align-items: center; justify-content: center; padding: 20px;
}
.modal {
  background: #fff; border-radius: 16px; width: 100%; max-width: 560px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15); overflow: hidden; max-height: 90vh;
  display: flex; flex-direction: column;
}
.modal--wide { max-width: 720px; }
.modal__header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px; border-bottom: 1px solid #ebe9e4;
}
.modal__title { font-size: 16px; font-weight: 700; color: #1a1a2e; margin: 0; }
.modal__body { padding: 24px; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; }
.modal__footer {
  display: flex; justify-content: flex-end; gap: 8px;
  padding: 16px 24px; border-top: 1px solid #ebe9e4;
}

/* Fields */
.field { display: flex; flex-direction: column; gap: 4px; }
.field__label { font-size: 12px; font-weight: 600; color: #666; }
.field__input {
  padding: 8px 12px; border: 1px solid #ddd; border-radius: 8px;
  font-family: 'DM Sans', sans-serif; font-size: 13px; color: #1a1a2e;
}
.field__input:focus { outline: none; border-color: #534AB7; }
.field__textarea {
  padding: 12px; border: 1px solid #ddd; border-radius: 8px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 11px;
  line-height: 1.6; color: #1a1a2e; resize: vertical;
}
.field__textarea:focus { outline: none; border-color: #534AB7; }
.field__hint { font-size: 11px; color: #aaa; }
.field-row { display: grid; gap: 12px; }
.field-row--4 { grid-template-columns: 1fr 1fr 100px 1fr; }
@media (max-width: 600px) { .field-row--4 { grid-template-columns: 1fr 1fr; } }

/* Autocomplete */
.autocomplete { position: relative; }
.autocomplete__list {
  position: absolute; top: 100%; left: 0; right: 0; background: #fff;
  border: 1px solid #ebe9e4; border-radius: 8px; margin-top: 4px;
  max-height: 160px; overflow-y: auto; z-index: 10;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}
.autocomplete__item {
  display: block; width: 100%; padding: 8px 12px;
  border: none; background: transparent; font-family: 'DM Sans', sans-serif;
  font-size: 13px; color: #444; cursor: pointer; text-align: left;
}
.autocomplete__item:hover { background: #f5f4f0; }

/* Chip de ano detectado */
.year-chip {
  margin-top: 4px;
  align-self: flex-start;
  font-family: 'DM Sans', sans-serif;
  font-size: 11px;
  font-weight: 600;
  color: #534AB7;
  background: #EEF2FF;
  border: 1px dashed #534AB7;
  border-radius: 6px;
  padding: 3px 8px;
  cursor: pointer;
  transition: background 0.15s;
}
.year-chip:hover { background: #DDE2FF; }

/* Banner de rascunho recuperado */
.draft-banner {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 10px 14px; background: #FEF7E6; border: 1px solid #F5C97A;
  border-radius: 10px; flex-wrap: wrap;
}
.draft-banner__msg { font-size: 12px; color: #7A4A0F; font-weight: 500; }
.draft-banner__actions { display: flex; gap: 6px; }

/* Preview */
.preview-section { display: flex; gap: 8px; }
.preview-resultado { border: 1px solid #ebe9e4; border-radius: 10px; padding: 12px; }
.preview-titulo { font-size: 13px; font-weight: 700; color: #1a1a2e; margin: 0 0 10px; }
.preview-tree { max-height: 300px; overflow-y: auto; }

.pv-disc { margin-bottom: 4px; }
.pv-node {
  display: flex; align-items: center; gap: 6px; padding: 3px 6px; border-radius: 4px;
  font-size: 12px; cursor: pointer;
}
.pv-node:hover { background: #f8f7f4; }
.pv-node--disc { font-weight: 700; color: #1a1a2e; }
.pv-node--assunto { padding-left: 20px; color: #444; }
.pv-node--sub { padding-left: 40px; color: #888; font-size: 11px; }
.pv-val { margin-left: auto; font-size: 11px; color: #9CA3AF; font-weight: 600; white-space: nowrap; }
.det-rotated { transform: rotate(-90deg); transition: transform 0.2s; }

/* Detalhes modal tree */
.detalhes-controls { display: flex; gap: 8px; margin-bottom: 8px; }
.detalhes-tree { max-height: 500px; overflow-y: auto; }
.det-disc { margin-bottom: 4px; }
.det-node {
  display: flex; align-items: center; gap: 6px; padding: 4px 8px;
  border-radius: 4px; font-size: 13px;
}
.det-node--disc { font-weight: 700; color: #1a1a2e; cursor: pointer; }
.det-node--disc:hover { background: #f8f7f4; }
.det-node--assunto { padding-left: 24px; color: #444; }
.det-node--sub { padding-left: 48px; color: #888; font-size: 12px; }
.det-nome { flex: 1; }
.det-val { font-size: 11px; color: #9CA3AF; font-weight: 600; white-space: nowrap; }

/* Buttons */
.btn-primary {
  display: flex; align-items: center; gap: 6px;
  font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600;
  background: #534AB7; color: #fff; border: none; border-radius: 8px; padding: 8px 16px;
  cursor: pointer; transition: background 0.15s;
}
.btn-primary:hover { background: #3C3489; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-outline {
  display: flex; align-items: center; gap: 6px;
  font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500;
  background: #fff; color: #444; border: 1px solid #ddd; border-radius: 8px; padding: 7px 14px;
  cursor: pointer; transition: background 0.15s;
}
.btn-outline:hover { background: #f5f4f0; }
.btn-ghost {
  display: flex; align-items: center; gap: 4px;
  font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 500;
  background: transparent; border: none; color: #666; cursor: pointer;
  padding: 4px 8px; border-radius: 6px;
}
.btn-ghost:hover { background: #f5f4f0; }
.icon-btn {
  width: 28px; height: 28px; border-radius: 7px; border: none; background: transparent;
  padding: 0; display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #aaa; transition: background 0.15s, color 0.15s;
}
.icon-btn:hover { background: #f0efea; color: #444; }

/* Tabs */
.tabs { display: flex; gap: 2px; border-bottom: 2px solid #ebe9e4; }
.tab {
  display: flex; align-items: center; gap: 6px;
  font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600;
  padding: 10px 18px; border: none; background: transparent; color: #888;
  cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px;
  transition: color 0.15s, border-color 0.15s;
}
.tab:hover { color: #1a1a2e; }
.tab--active { color: #534AB7; border-bottom-color: #534AB7; }

/* Tendências */
.tendencias { display: flex; flex-direction: column; gap: 20px; }
.trend-summary { font-size: 13px; color: #666; }
.trend-summary__label { font-weight: 600; }

.chart-section {
  background: #fff; border: 1px solid #ebe9e4; border-radius: 12px; padding: 20px;
}
.chart-title { font-size: 14px; font-weight: 700; color: #1a1a2e; margin: 0 0 12px; }
.chart-container { height: 350px; position: relative; }

.trends-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 700px) { .trends-grid { grid-template-columns: 1fr; } }

.trend-col {
  background: #fff; border: 1px solid #ebe9e4; border-radius: 12px; padding: 16px;
}
.trend-col__title {
  display: flex; align-items: center; gap: 6px;
  font-size: 13px; font-weight: 700; margin: 0 0 12px;
}
.trend-col__title--up { color: #16A34A; }
.trend-col__title--down { color: #DC2626; }

.trend-item {
  display: flex; align-items: center; gap: 8px; padding: 6px 10px;
  border-radius: 6px; margin-bottom: 4px; font-size: 12px;
}
.trend-item--up { background: #F0FDF4; }
.trend-item--down { background: #FEF2F2; }
.trend-item__nome { flex: 1; color: #1a1a2e; font-weight: 500; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.trend-item__delta { font-weight: 700; white-space: nowrap; }
.trend-item--up .trend-item__delta { color: #16A34A; }
.trend-item--down .trend-item__delta { color: #DC2626; }
.trend-item__range { font-size: 10px; color: #9CA3AF; white-space: nowrap; }
.trend-empty { font-size: 12px; color: #aaa; margin: 8px 0; }

/* Banner discreto quando ≥3 anos mas nenhuma tendência qualificada */
.trend-no-results {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 12px 14px; background: #FEF7E6; border: 1px solid #F5C97A;
  border-radius: 10px; color: #7A4A0F;
}
.trend-no-results__title { font-size: 13px; font-weight: 700; margin: 0 0 4px; color: inherit; }
.trend-no-results p { margin: 0; font-size: 12px; line-height: 1.5; }
.trend-no-results__breakdown {
  margin: 6px 0 6px 18px; padding: 0; font-size: 12px; line-height: 1.6;
}
.trend-no-results__breakdown li { margin: 0; }
.trend-no-results__hint { margin-top: 6px !important; font-size: 11px !important; opacity: 0.85; }

/* Aba Análise */
.analise { display: flex; flex-direction: column; gap: 16px; }
.analise-warn {
  padding: 10px 14px; background: #FEF7E6; border: 1px solid #F5C97A;
  border-radius: 10px; font-size: 12px; color: #7A4A0F;
}
.analise-info {
  padding: 10px 14px; background: #EEF2FF; border: 1px solid #AFA9EC;
  border-radius: 10px; font-size: 12px; color: #4338CA;
}

.empty-state {
  display: flex; flex-direction: column; align-items: center; text-align: center;
  padding: 64px 24px; gap: 12px; color: #ccc;
}
.empty-state__title { font-size: 16px; font-weight: 700; color: #1a1a2e; margin: 0; }
.empty-state__desc { font-size: 13px; color: #aaa; max-width: 360px; margin: 0; line-height: 1.6; }
</style>
