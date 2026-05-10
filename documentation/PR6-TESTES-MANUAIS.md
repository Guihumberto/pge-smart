# PR6 — Roteiro de Testes Manuais (Fase 3)

> Cobertura end-to-end da feature de **priorização determinística**. Use após backend (Fase 1) e frontend (Fase 2) implementados, antes do canary/deploy.

**Spec de referência:** [docs/superpowers/specs/2026-05-06-priorizacao-deterministica-design.md](../docs/superpowers/specs/2026-05-06-priorizacao-deterministica-design.md) — §7 (testes T1-T27) é a fonte canônica; este doc traduz pra passo-a-passo prático.

**Decisões testadas:** D1-D20 (especialmente D7 gap-skip, D11 sub-assuntos, D13 mean, D14 cascata por disciplina, D16 lookup restritivo, D17 prompt em blocos, D18 max-pesos por nível, D19 sem_match flag, D20 prio-meta obrigatório).

---

## Pré-requisitos

```bash
# Backend (terminal 1)
cd ~/development/backend-express && npm run dev   # localhost:3333

# Frontend (terminal 2) — Vite 7 quer Node 20+
cd ~/development/boilerplate-vue && npm run dev   # localhost:3000
```

**Login** OAuth em `auth.studialex.com.br`.

**Cargos necessários:**
- Pelo menos 1 cargo **legado pré-PR6** (analisado antes do deploy) — se não tiver, pula bloco B.
- Vários cargos **novos prontos pra analisar** com banca/área que tenham importações em `/estatisticas`.

**Importações em `/estatisticas`:**
- 1 banca/área com **3+ anos consecutivos** (ex: FCC fiscal 2023, 2024, 2025) — pra cargo "ideal"
- 1 banca/área com **gaps** (ex: 2020, 2023, 2024, 2025 — sem 2021/2022) — pra testar D7 gap-skip
- 1 banca com **mais de 5 anos** importados — pra testar cap (D3)

---

## Como reportar uma falha

Pra cada cenário que falhar:

1. **Cenário (T#)** — qual da lista
2. **Setup real** — banca/área usadas, quantos anos de histórico
3. **Passos exatos** — o que clicou
4. **O que viu vs esperado** — texto literal + screenshot
5. **Network tab** — payload + response do `analisarConteudo`/`reorganizar` (se relevante)
6. **Console** — erros JS (vermelhos)
7. **Backend logs** — qualquer warn/error em `cargo.service.js` ou `priorizacao.helpers.js`

**Prioridade:**
- 🔴 **P0/P1** — crash, dados perdidos, score errado, banner não aparece quando deveria
- 🟡 **P2** — texto/badge errado, UX confuso, fluxo trava em estado intermediário
- ⚪ **P3** — cosmético, alinhamento, copy

---

## Bloco A — Caminho feliz (testar primeiro)

### T1. Caso ideal — banca alvo + área alvo com histórico

**Setup:** Cargo cuja banca/área tem 3+ anos importados em `/estatisticas`.

**Passos:**
1. Navegue para `/editais/:id/cargos/:cargoId`
2. Se cargo novo: cole conteúdo bruto → "Processar Regex" → "Enviar para IA" → seleciona disciplinas → "Analisar"
3. Aguarda análise (5-10min — timeout é 10min)

**Esperado:**
- Header `prio-meta` mostra: `Banca alvo: FCC · 4 provas importadas` (D9 — vocabulário "provas importadas", não "anos")
- **NÃO aparece** banner amarelo "Recalcular tudo"
- **NÃO aparece** aviso de fonte cascata (caso ideal — todas em nível 1)
- Cada disciplina tem badge de score numérico
- Expandindo um assunto: badge **"P:N/M"** verde (presença), tooltip do score mostra `Presença X% × Peso Y.Y% × Tendência Z`
- Abre `<details>` "Métricas detalhadas" → 4-5 linhas (presença, peso médio, tendência com pp/ano, consistência)

**Reportar se:**
- Tooltip mostra `1800%` em peso (bug D10 — multiplicação errada)
- Badge presença ausente onde deveria estar
- `<details>` aparece vazio ou crasha
- Console errors em vermelho

---

### T2. Tooltip e formato `peso_medio` (D10)

**Passos:** Hover sobre o badge do score em qualquer assunto/disciplina/sub-assunto do cargo do T1.

**Esperado:** `Score: 65 — Presença 80% × Peso 12.3% × Tendência crescente`. Peso com 1 casa decimal, sem `× 100` errado.

**Reportar se:** peso aparece como `1230.0%` ou `0.12%` (erro de unidade).

---

### T3. Sub-assunto com métrica própria (D11)

**Passos:** Em assunto que tem sub-assuntos no edital, clicar para expandir o assunto. Examinar os sub-assuntos.

**Esperado:**
- Cada sub tem score próprio (não herdado do pai — pode ser bem diferente)
- Badges no sub: score, presença `P:N/M`, e (se aplicável) "Amostra pequena"/"Nunca cobrado"
- `<details>` "Métricas detalhadas" também disponível no sub-assunto, abrindo independentemente

**Reportar se:**
- Sub-assuntos sem badges PR6 (regressão)
- Sub-assuntos com mesmas métricas exatas do pai (sinal de herança incorreta — D11 violado)

---

### T4. Cargo com gaps temporais (D7 gap-skip)

**Setup:** Cargo cuja banca alvo tem importações com gaps (ex: 2020, 2023, 2024, 2025 — sem 2021/2022).

**Esperado:**
- `prio-meta` mostra `4 provas importadas` (não 6)
- Tooltip de presença: "Presente em N de **4** provas importadas" (não 6)
- No `<details>`, "Tendência: ...(slope pp/ano)" — slope mais conservador devido aos gaps

**Reportar se:** mostra "6 provas importadas" (gap-skip não aplicado — D7 violado).

---

### T5. Cap de 5 anos mais recentes (D3)

**Setup:** Cargo cuja banca alvo tem 6+ anos importados (ex: 2010, 2015, 2018, 2020, 2024, 2025).

**Esperado:**
- `prio-meta` mostra `5 provas importadas` (não 6)
- 2010 fica fora (mais antigo descartado pelo cap)

**Reportar se:** mostra mais de 5 anos.

---

## Bloco B — Cargo legado e migração

> **Pula este bloco se não tiver cargo legado pré-PR6.**

### T6. Cargo legado (PR4/PR5) — banner aparece

**Setup:** Um cargo analisado antes do deploy do PR6 (sem `disc.metricas`).

**Passos:**
1. Abre o cargo na priorização (estado `priorizacao`)

**Esperado:**
- **Banner amarelo "Esta priorização tem disciplinas analisadas com a versão antiga. [Recalcular tudo]"** visível no topo
- Disciplinas exibem score legado da IA, **sem** badges novos (Presença, qualidade, details)
- `prio-meta` mostra dados legados (`(N anos)` se _meta tinha esse campo)

**Reportar se:**
- Banner não aparece
- Badges PR6 aparecem em cargo legado (regressão)

---

### T7. Recalcular tudo

**Pré-requisito:** T6 ativo (cargo legado aberto).

**Passos:** Clicar "Recalcular tudo" no banner.

**Esperado:**
- Botão vira "Recalculando..." e desabilita
- Após sucesso (5-10min): toast verde, banner some, badges PR6 aparecem em todas as disciplinas
- `_meta.schema_priorizacao = 'deterministic_v1'` no doc (verificável via Network tab → response)

**Reportar se:**
- Trava em "Recalculando" (sem timeout no front)
- Banner continua após sucesso
- Disciplinas perdem dados após recalcular
- Toast vermelho com erro do backend

---

### T8. Re-análise parcial (cargo misto)

**Pré-requisito:** Um cargo PR6 já analisado.

**Passos:**
1. Clicar "Reanalisar" (rodapé) → volta para `estado: 'resultado'`
2. Marcar apenas 1-2 disciplinas via checkbox
3. Clicar "Analisar (N)"

**Esperado:**
- Após análise: cargo permanece em `priorizacao`
- As 2 selecionadas têm `metricas` novas (badges PR6)
- As outras mantêm `metricas` antigas (NÃO viraram legado)
- **Banner amarelo NÃO aparece** (porque todas as disciplinas têm `metricas`)

**Reportar se:**
- Banner aparece após re-análise parcial (quando todas tinham `metricas`)
- Disciplinas não-selecionadas perderam dados ou mudaram score sem terem sido analisadas

---

## Bloco C — Cascata e fontes alternativas

### T9. Cascata nível 2 (banca alvo, outra área)

**Setup:** Cargo cuja **área** alvo NÃO tem dados, mas a **banca** alvo tem dados em outra área.
Exemplo: banca FCC, área "fiscal", mas só tem importações de FCC "judicial".

**Passos:** Analisa o cargo.

**Esperado:**
- Header tem **banner azul/laranja** com texto: *"Histórico desta área é esparso para a banca; maioria usa dados de outras áreas da mesma banca"*
- Disciplinas têm scores válidos (não null)
- `_meta.fonte_cascata_majoritaria = 'banca_alvo_qualquer_area'` no doc (Network tab)

**Reportar se:**
- Banner não aparece
- Texto errado (deve corresponder à fonte majoritária)
- Score null em todas as disciplinas (falha de fallback)

---

### T10. Cascata nível 3-4 (degradação maior)

**Setup:**
- **Nível 3:** banca alvo SEM dados em nenhuma área, mas há dados de outras bancas na área alvo
- **Nível 4:** quase nada bate (último recurso)

**Esperado:**
- Banner laranja/forte com texto correspondente:
  - Nível 3: *"Histórico desta banca é esparso; maioria das disciplinas usa dados de outras bancas na mesma área"*
  - Nível 4: *"Histórico muito esparso — interpretar com cautela. Maioria das disciplinas usa média geral de bancas/áreas heterogêneas"*

**Reportar se:** severidade errada (banner cinza/azul quando deveria ser laranja).

---

### T11. Disciplina sem match (D16)

**Setup:** Edital com alguma disciplina que não tem equivalente no histórico.
Exemplo: "Inglês Técnico" num cargo de fiscal cuja banca alvo só tem assuntos jurídicos.

**Esperado:**
- Header da disciplina tem badge **"Disc. sem match"** (cinza), com tooltip explicativo
- Score da disciplina mostra `—`
- Assuntos: score `—` também, mas **NÃO** mostram badge "Sem match" individual (P3-1 — evita poluição visual)
- Banner amarelo NÃO aparece (`disc.metricas` existe com `sem_match: true`, não é cargo legado)

**Reportar se:**
- Assuntos individuais mostram "Sem match" duplicando a info da disciplina
- Banner amarelo aparece em cargo PR6 sem match (confusão com legado)

---

### T12. Cobertura individual no expand (§6.5)

**Setup:** Cargo onde alguma disciplina tem cobertura < 100% (alguns assuntos com match, outros sem).

**Passos:** Expandir essa disciplina (chevron).

**Esperado:** Linha **"X% dos assuntos com match histórico"** abaixo do header da disciplina, com ícone Info pequeno.

**Reportar se:**
- Linha não aparece em disciplina com cobertura parcial
- Linha aparece em disciplina com 100% (deveria ficar oculta — economiza espaço)

---

## Bloco D — Reorganização (acoplada ao score determinístico)

### T13. Cortar conteúdo em cargo PR6 puro (T13/T14 da spec)

**Setup:** Cargo PR6 com déficit de tempo (totalSemanas > semanasDisponiveis).

**Passos:**
1. Clica "Reorganizar"
2. Configura horas/dias (defaults OK)
3. Clica "Calcular opções"
4. Seleciona "Cortar conteúdo"

**Esperado:**
- Descrição: *"Cortar N assuntos com score abaixo de X%"*
- Lista de cortados ordenada do menor score pro maior
- Ao "Aplicar reorganização": carga total redistribui, mensagem "ok"

**Reportar se:**
- Descrição mostra `score abaixo de 0%` em cargo PR6 puro (regressão do P1-3)

---

### T14. Cortar conteúdo em cargo MISTO (P1-3 + P2-4 fixes)

**Setup:** Cargo onde algumas disciplinas têm `sem_match: true` misturadas com disciplinas com match real.

**Esperado:**
- Descrição usa formato: **"Cortar X sem match histórico + Y assuntos com score abaixo de Z%"**
- Lista de cortados mostra **"sem match"** (não "score 0") nos itens com `score === null`
- Ordem: itens sem match primeiro, depois ordem ascendente de score

**Reportar se:**
- Descrição volta a "score abaixo de 0%" (P1-3 não corrigido)
- Lista mostra "score 0" pra itens sem match (P2-4 não corrigido)

---

### T15. Aplicar reorganização (persiste corretamente)

**Passos:** Após T13/T14, clicar "Aplicar reorganização".

**Esperado:**
- Toast verde "Reorganização aplicada"
- Card "Carga total estimada" recalcula
- Banner verde "Plano cabe no tempo disponível"
- Reload da página: estado persistido (cortes mantidos no doc)

**Reportar se:** após reload, cortes voltam.

---

### T16. Carga total com classificação parcial (P1-2 fix)

**Setup:** Difícil reproduzir manualmente — exige a Fase 1 IA falhar e o backend gravar `disc.carga_estimada_horas` undefined. Pode pular.

**Alternativa de validação:** Network tab em qualquer análise do PR6 → response `priorizacao.disciplinas[].carga_estimada_horas` deve **sempre** ter um número (nunca undefined/null).

**Esperado:** Card "Carga total estimada" mostra valor > 0 sempre que houver assuntos.

**Reportar se:** card mostra `0h` mesmo com assuntos preenchidos.

---

## Bloco E — Edge cases UI

### T17. Toggle "ordenar por relevância"

**Cenário a — cargo PR6 normal:**
- Toggle disponível, marcado/desmarcado
- ON: ordena disciplinas por score desc (alta → baixa)
- OFF: ordem do edital

**Cenário b — todos scores idênticos (raro):**
- Setup: cargo onde TODAS as disciplinas estão `sem_match: true` ou todas em "Mapeado/nunca cobrado" (score 0.10 idêntico)
- Toggle ON → tooltip mostra **"Todas as disciplinas têm o mesmo score — ordem alfabética preservada"** (P2-3 fix)

**Reportar se:**
- Toggle desabilita quando deveria estar habilitado (cenário a)
- Tooltip "scores idênticos" não aparece (cenário b)

---

### T18. Cargo com 1 ano único de histórico (D12)

**Setup:** Banca alvo com só 1 ano importado em `/estatisticas`.

**Esperado:**
- Score válido (não null)
- Tendência: **"estável"** (D12 — `|anos|<2` força estável)
- Slope: 0
- Tooltip: `... × Tendência estável`

**Reportar se:**
- Score vira null (regressão D12)
- Tooltip mostra `NaN pp/ano`

---

### T19. Ano corrente parcial (D7 + Q1)

**Setup:** Cargo cuja banca alvo tem importação do ano corrente (parcial — provas que ocorreram este ano mas o ano não acabou).

**Esperado:**
- Ano corrente **NÃO conta** no universo (`anos_com_prova` exclui)
- Tooltip do score: presença/peso/tendência calculadas só sobre anos completos
- `<details>` Métricas detalhadas tem linha *"Ano corrente excluído (parcial: N questões)"*

**Reportar se:** ano corrente entra no cálculo (regressão).

---

## Checklist final

Antes de declarar PR6 pronto pra prod:

- [ ] T1, T2, T3 (caminho feliz + sub-assuntos)
- [ ] T4, T5 (gap-skip + cap)
- [ ] T6, T7, T8 (legado + recalcular + parcial) — pula T6/T7 se não tiver legado
- [ ] T9, T10, T11, T12 (cascata + sem match + cobertura)
- [ ] T13, T14, T15 (reorganização normal + misto + persistir)
- [ ] T17, T18, T19 (toggle + 1 ano + ano corrente)
- [ ] Console sem erros em vermelho
- [ ] Network tab: payloads coerentes com a spec (campos `metricas`, `fonte_cascata`, `_meta.schema_priorizacao`)
- [ ] Toggle de cargo PR6 puro mostra ordenação que faz sentido
- [ ] Banners não empilham mal quando vários ativos (legado + cascata simultâneos)

**Follow-ups conhecidos** (não bloqueiam canary, ver §9 da spec):
- P3-3 a P3-7 (cobertura média esconde dispersão, recalcularTudo com órfãs, escala mista, prioState não preserva, score 0 vs "—")
- P2-2 (recálculo parcial silencioso quando IA trunca JSON) — observar no canary

---

## Próximos passos pós-aprovação

1. Commit back + front separados, mensagens referenciando PR6 e os números das passagens da spec (1-6)
2. Merge na main
3. Deploy:
   - Backend Express via GitHub Actions (auto-deploy em push)
   - Frontend Vue: build + deploy padrão
4. Canary: usar a feature em 5-10 cargos reais e coletar feedback
5. §10.3 da spec — calibração dos pesos 45/35/20 com base no feedback
