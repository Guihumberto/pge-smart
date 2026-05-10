# Testes manuais — Aba Análise

Roteiro pré-deploy do sub-projeto 2 (entregue em 2026-05-07). Spec: [docs/superpowers/specs/2026-05-07-analise-recorrencia-design.md](../docs/superpowers/specs/2026-05-07-analise-recorrencia-design.md).

## Pré-requisitos

- `npm run dev` rodando localmente
- Estatísticas reais importadas (Cebraspe/Procuradoria + FGV/OAB pelo menos)

## Cenário 1 — Cebraspe/Procuradoria com Moderado

Banca robusta, dataset denso. Esperado: tabela popula bem.

1. Acessar `/estatisticas` → aba "Análise"
2. Toolbar: Banca = Cebraspe, Área = Procuradoria, Granularidade = Assunto, Filtro = Moderado, Cross-banca = off
3. **Esperado**:
   - Tabela mostra ~20-50 assuntos com Recorrência > 30%, Volume total > 3
   - Coluna Tendência mostra setas + slope com R² razoável (>0.4) pra parte dos assuntos
   - Itens com R² baixo mostram traço `—` na coluna Tendência
4. Ordenar por Recorrência desc → CTN/Princípios/Atos Adm devem dominar
5. Clicar no header "Vol total" → re-ordena por volume
6. Clicar no header "Tendência" → ordena por slope (nulls vão pro fim)

## Cenário 2 — FGV/OAB com Permissivo + cross-banca

Caso falho original da Tendências (236 candidatos, zero passados). Esperado: tabela popula com Permissivo, cross-banca traz dados de outras bancas similares.

1. Banca = FGV, Área = OAB, Filtro = Permissivo
2. **Esperado**: tabela com itens de baixa recorrência mas presentes
3. Ativar toggle "Incluir bancas similares"
4. Verificar que badge `+N bancas` aparece nas linhas relevantes; tooltip lista as bancas
5. Comparar visualmente com aba Tendências mesma banca/área — Tendências mostrará bem menos itens

## Cenário 3 — Drill-down progressivo

1. Granularidade = Disciplina
2. Clicar na linha de "Direito Tributário" → granularidade vira Assunto + breadcrumb mostra `Análise / Direito Tributário (Assuntos)`
3. Clicar em "CTN" → granularidade vira Sub-assunto + breadcrumb `Análise / Direito Tributário / CTN`
4. Clicar em "CTN" no breadcrumb → volta um nível: Sub-assuntos da disciplina (sem filtro de assunto)
5. Clicar em "Análise" no breadcrumb → volta ao topo: limpa todos os filtros, **mantém** granularidade (continua em Sub-assunto se você estava lá)
6. Selecionar 3 itens → contador "3 selecionados" aparece + botão Copiar habilita
7. Mudar banca → seleções resetam (esperado)

## Cenário 4 — Copiar selecionados

1. Selecionar ~3 itens
2. Clicar em "Copiar selecionados"
3. Toast "3 itens copiado(s)"
4. Colar num editor de texto → uma linha por item, formato `Disc → Ass` (sem header)

## Cenário 5 — Exportar CSV

1. Clicar em "Exportar CSV"
2. Arquivo baixado com nome `analise-{banca}-{area}-{YYYYMMDD}.csv`
3. Abrir no LibreOffice/Excel
4. **Verificar**:
   - Acentos preservados (`Tributário` correto, sem `?` ou caracteres estranhos)
   - Colunas: `Nome, Recorrencia, VolumeMedio, VolumeTotal, PctMedio, Slope, R2, N, Boosted`
   - Itens com slope=null têm campo Slope/R² vazio
   - Items com cross-banca têm Boosted preenchido (`"Cespe, FGV"`)

## Cenário 6 — Querystring + share-link

1. Configurar Análise com banca + área + filtro + drill-down
2. Copiar URL do navegador
3. Refresh — estado deve restaurar idêntico
4. Abrir URL em outra aba — mesmo estado
5. Browser Back/Forward — estado acompanha URL
6. Limpar drill-down → URL limpa (só `?tab=analise&banca=...&area=...`)
7. Mudar banca — entry no history (Back volta pra banca anterior)

## Cenário 7 — Empty states

| Trigger | Esperado |
|---|---|
| Sem banca selecionada | Mensagem "Selecione uma banca para começar" |
| Banca + área sem estatísticas | "Nenhuma estatística importada para X/Y. Importe na aba Importações." |
| Dataset com 1 ano só | Banner amarelo "Apenas 1 ano de dados — recorrência tem pouco significado..." + tabela aparece com recorrência=100% |
| Preset filtrou tudo | "Nenhum item passou no filtro {preset}" + botão "Mudar para Permissivo" |
| Cross-banca on, sem outras bancas na área | Toast "Nenhuma banca similar tem dados nessa área. Cross-banca desativado." + toggle volta pra off |

## Cenário 8 — Performance check

1. Dataset grande (~50 estatísticas × várias disciplinas)
2. Abrir DevTools → Console
3. Cole no console: `console.time('test'); /* trocar banca */ console.timeEnd('test')`
4. **Meta**: < 200ms para datasets de até 50 estatísticas × 200 disciplinas
5. Se falhar, considerar memoização de `computeMetrics` ou `applyPreset`

## Cenário 9 — Mudança de granularidade zera seleções

Cobre fix da regra-de-vida (rodada 1, achado #2): seleções por `caminhoCompleto` ficam órfãs ao mudar gran.

1. Granularidade = Assunto. Marcar 3 checkboxes
2. Verificar contador "3 selecionados"
3. Mudar Granularidade pra Disciplina
4. **Esperado**: contador zera. Botão Copiar volta pra disabled
5. Mesmo teste via breadcrumb: drill em Disc → Ass, selecionar 2 sub-assuntos, clicar breadcrumb "Trib" → contador zera
6. Justificativa: keys de sub_assunto não fazem sentido em assunto/disciplina

## Cenário 10 — CSV injection

Cobre fix da regra-de-vida (rodada 2, achado #12): nomes começando com `=`, `+`, `-`, `@` poderiam executar fórmulas em Excel/LibreOffice.

1. Importar uma estatística com nome de assunto malicioso (manualmente, pra teste): ex `=SUM(A1:A10)`
2. Filtrar pra ela aparecer na tabela
3. Selecionar + Copiar → colar em A1 do Excel: célula deve mostrar `'=SUM(A1:A10)` (texto, sem executar fórmula)
4. Exportar CSV → abrir em Excel: mesmo comportamento (cell exibe texto literal)

## Cenário 11 — Acessibilidade (screen reader)

Cobre fixes da regra-de-vida (rodada 2, achados #13/#14/#15).

1. Com VoiceOver/NVDA ativo, navegar até a aba Análise
2. **Esperado**:
   - Header de coluna "Recorrência (descending)" anunciado quando ordenado desc
   - Mudar pra coluna "Volume total" → anuncia "ascending" ou "descending"
   - Breadcrumb: último crumb anunciado como "current page"
   - Banner "Apenas 1 ano de dados" anunciado automaticamente ao popular (aria-live="polite")

---

# 🆕 Incremento 2026-05-07 — Filtro de disciplina + Recência + modo expandível

## Cenário 12 — Filtro de disciplina via select (incremento 2026-05-07)

1. Selecionar Banca + Área no toolbar
2. Verificar que select "Disciplina" populou com disciplinas do dataset
3. Selecionar uma disciplina (ex: Direito Tributário)
4. **Esperado**:
   - Tabela mostra só assuntos dessa disciplina
   - Granularidade auto-mudou pra "Assunto" se estava em "Disciplina"
   - Modo expandível ativa (chevrons aparecem)
   - Selecionar "Todas as disciplinas" volta pro universo completo
5. Drill-down via clique de linha de disciplina deve sincronizar com o select (select reflete a disc clicada)

## Cenário 13 — Recência identifica "sumindo" / "subindo"

1. Importar dataset com 5+ anos de uma banca
2. **Esperado**: coluna "Recência" entre "Recorrência" e "Vol/ano"
3. Procurar assunto com:
   - Recorrência alta (>50%) MAS Recência baixa (0-33%) → "sumindo" (cobrado historicamente, não recentemente)
   - Recorrência baixa (<40%) MAS Recência alta (67-100%) → "subindo" (novo, presente nos últimos)
4. Tooltip da célula Recência: hover deve mostrar "N/3 anos cobertos: 2024, 2025"
5. Clicar header "Recência" ordena pela coluna

## Cenário 14 — Coluna Recência oculta com <3 anos

1. Importar só 2 anos de uma banca (ou filtrar dataset reduzido)
2. **Esperado**: coluna Recência some sem mensagem (degrada graciosamente)
3. Header e células ajustam-se (sem espaço vazio)

## Cenário 15 — Modo expandível com destaque por preset

1. Selecionar Banca + Área + Disciplina (ex: Trib)
2. Granularidade = Assunto (auto)
3. **Esperado**: cada linha de assunto tem chevron `▸`
4. Clicar chevron → linhas dos sub-assuntos aparecem indented abaixo
5. Subs que passam no preset (ex: Moderado: recorrência ≥30%, vol ≥3) têm fundo `#EEF2FF` levemente roxo
6. Subs que não passam aparecem com texto cinza (sem fundo)
7. Trocar preset pra Conservador → menos subs ficam destacados (thresholds maiores)
8. Trocar preset pra Permissivo → mais subs ficam destacados
9. Trocar disciplina → expansões anteriores zeram

---

# 🛠️ Débitos técnicos quitados (pós-validação 2026-05-07)

## Cenário 16 — perPage persiste em URL (débito técnico)

1. Análise com banca/área setados, dataset com >50 itens
2. Pagination: trocar "Por página" pra 100 (ou 200)
3. URL ganha `&perPage=100`
4. Refresh → continua em 100/página
5. Voltar pra 50 → URL omite `perPage=` (default omitido)
6. **Esperado**: 3 opções no select (50, 100, 200), bate com `PER_PAGE_OPTIONS`

## Cenário 17 — Disciplina inválida em URL (débito técnico)

1. Acessar URL `/estatisticas?tab=analise&banca=FCC&area=Fiscal&disc=Inexistente`
2. Aguardar fetch do store (~200ms)
3. **Esperado**:
   - Toast info: `Disciplina "Inexistente" não encontrada na banca/área atual. Filtro removido.`
   - URL atualiza removendo `&disc=Inexistente`
   - Tabela mostra todos os assuntos (não vazio)
4. Edge case: refresh durante fetch inicial NÃO deve disparar reset prematuro (guard `count === 0` na view)

## Cenário 18 — Trocar preset preserva expansões (débito técnico — memoização)

1. Análise com disciplina selecionada + modo expandível ativo
2. Expandir 2-3 assuntos
3. Trocar preset (ex: Moderado → Conservador)
4. **Esperado**: expansões PERMANECEM (não colapsam), apenas o destaque muda. Subs antes destacados podem ficar muted (preset mais rígido)
5. Trocar disciplina → expansões colapsam (reset esperado)
6. Performance: trocar preset é instantâneo (memoização separa pipeline pesado de passesPreset leve)

## Cenário 19 — Disciplina sem sub-assuntos cadastrados (débito técnico — empty state)

1. Selecionar disciplina cujo dataset NÃO tem detalhamento de sub-assuntos (ex: imports antigos parados em profundidade 2)
2. **Esperado**:
   - Banner azul claro `Esta disciplina não tem sub-assuntos detalhados...`
   - Tabela mostra os assuntos sem chevron (modo expandível desativa)
   - Sem confusão pro mentor

## Cenário 20 — Contraste subs muted (débito técnico)

1. Modo expandível ativo, expandir um assunto que tenha mix de subs (uns passam, outros não)
2. **Esperado**:
   - Subs destacados: `#EEF2FF` fundo + texto escuro `#1a1a2e` (alto contraste)
   - Subs muted: fundo cinza claro + texto `#555` (não `#888`, evita illegibility)
3. Verificar com [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) se for paranoico — espera-se ratio ≥4.5:1 pro texto muted contra `#fafaf7`

## Cenário 21 — Calibração

Após validar cenários 1-2, decidir se os defaults dos presets precisam ajuste:

- Se `moderado` está **rígido demais** com Cebraspe (poucos itens passam) → reduzir `recorrenciaMin` de 30 pra 25
- Se `permissivo` está **denso demais** com FGV/OAB (lista enorme) → subir `volumeTotalMin` pra 2

Edits em [src/utils/recurrenceAnalysis.js](../src/utils/recurrenceAnalysis.js) (`DEFAULT_PRESETS`). Re-validar com mesmo dataset depois.

**Outras constantes calibráveis:**
- `RECENT_WINDOW` em [src/utils/recurrenceAnalysis.js](../src/utils/recurrenceAnalysis.js) — janela da Recência (default 3 anos)
- `PER_PAGE_OPTIONS` e `DEFAULT_PER_PAGE` em [src/components/analise/constants.js](../src/components/analise/constants.js) — opções de paginação. Sincroniza automaticamente com `VALID_PER_PAGE` no parser de querystring (single source of truth)

## Sign-off checklist

- [ ] Cenários 1-8 passam visualmente
- [ ] Cenário 9 (gran zera seleções) confirmado
- [ ] Cenário 10 (CSV injection) confirmado se houver dataset adversarial
- [ ] Cenário 11 (a11y) confirmado com screen reader
- [ ] Cenário 12 (filtro disciplina select) confirmado
- [ ] Cenário 13 (recência sumindo/subindo) confirmado em dataset real
- [ ] Cenário 14 (coluna oculta <3 anos) confirmado
- [ ] Cenário 15 (modo expandível + destaque preset) confirmado
- [ ] Cenário 16 (perPage persiste URL) confirmado
- [ ] Cenário 17 (disc inválida em URL) confirmado
- [ ] Cenário 18 (preset preserva expansões) confirmado
- [ ] Cenário 19 (empty state disc sem subs) confirmado
- [ ] Cenário 20 (contraste subs muted) confirmado visualmente
- [ ] CSV abre limpo no Excel (sem corrupção de acento)
- [ ] URL compartilhada reproduz estado em outro browser
- [ ] Performance OK em dataset real
- [ ] Calibração aplicada se necessário
