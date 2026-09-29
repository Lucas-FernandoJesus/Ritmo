# Financeiro do Ritmo

## Auditoria e fontes

Aplicação React 19 + TypeScript + Vite, local e offline, sem servidor ou integração bancária. A auditoria abrangeu `finance.ts`, `money.ts`, `FinanceView`, `FinanceSummary`, `FinanceForms`, `MoneyInput`, `FormPrimitives`, `App`, Dashboard, domínio, modelos, repositório, IndexedDB, temas, gráficos, backup e suítes unitária/browser. A etapa amplia o módulo existente; não o reescreve.

| Fonte | Conteúdo financeiro | Uso |
| --- | --- | --- |
| `deliveryShifts` | Receita bruta, combustível, outras despesas, reserva, horários e distância | Movimentações derivadas e indicadores operacionais |
| `expenses` | Valor, data, categoria e vínculo opcional ao turno | Saídas pagas/previstas |
| `financialRecords` | Valor, tipo, data, categoria e vínculo opcional | Entradas, saídas, créditos e pendências |
| `financialGoals` | Nome, tipo, alvo e datas | Definições de metas |
| `categoryBudgets` | Mês, categoria/escopo e limite | Definições de orçamento |

Categorias gerais continuam strings: Moradia, Alimentação, Transporte, Saúde, Lazer, Desenvolvimento e Outros. Não há tabela nova de categorias nem transformação do histórico. `deliveryCostKind` é um campo opcional em despesas/lançamentos vinculados: combustível, manutenção, alimentação no turno, taxas ou outros. Combustível e outras despesas informados nos campos do turno já são identificáveis. Dados antigos sem classificação mantêm a categoria e aparecem explicitamente como não classificados; descrições não são usadas para adivinhar custos.

`estimatedResult`, `resultPerHour`, `resultPerKilometer` e `hours` persistidos nos turnos são campos legados. Permanecem compatíveis com validação e backups; a análise recalcula valores pelas fontes e pelos horários. Não foram encontradas outras entidades monetárias ou saldos bancários iniciais.

## Arquitetura

```text
Formulários → MoneyInput/números → validação → repository.ts → IndexedDB
                                                    ↓
Fontes existentes → finance.ts → finance-analysis.ts → Financeiro / Dashboard
```

`finance.ts` adapta as fontes em movimentações com IDs compostos, consolida valores e calcula o turno. Nenhuma movimentação de delivery/despesa é copiada para `financialRecords`.

`finance-analysis.ts` centraliza funções puras e tipadas:

- `calculateGoalProgress`: realizado, progresso e estado de metas.
- `calculateBudgetUsage`: consumo, restante e estado do orçamento.
- `calculatePeriodComparison`: valores anteriores, diferença e percentual.
- `calculateExpenseTrend`: evolução diária, semanal e mensal com base mínima.
- `calculateProjectedBalance`: horizontes, sequência por data e risco intermediário.
- `calculateFinancialAlerts`: alertas derivados e agrupados.
- `calculateDeliveryPerformance`: taxas, médias, custos, reserva e grupos de turnos.
- `groupFinancialAmounts` e `financialSeries`: distribuição e séries para gráficos.
- `buildFinanceAnalysis`: agrega o resultado para as duas telas.

Totais, saldos, percentuais, médias, status, tendências e projeções não são persistidos. A agregação da tela é memoizada por fontes e período; digitação nos formulários e filtros do histórico não refazem o motor. Custos vinculados são agrupados por ID de turno antes dos indicadores, evitando procurar todas as despesas para cada turno. Séries usam buckets por data; o histórico mantém paginação de 50 movimentações.

## Persistência, migração e backup

IndexedDB `rotina-local`, versão **4**. A atualização aditiva cria somente `financialGoals` e `categoryBudgets` quando ausentes. As coleções anteriores são preservadas. A migração 2 → 3 já criava `financialRecords`; o mesmo laço mantém compatibilidade com bancos 1, 2 e 3 sem apagar ou inventar registros.

Metas usam ID estável na edição. Orçamentos têm ID determinístico por mês e categoria ou custo específico. Salvar novamente o mesmo escopo/mês atualiza o limite, evitando duplicação. Alterar a identidade de um orçamento exige criar outro planejamento; edição modifica o limite. Exclusão de planejamento não apaga movimentações.

O backup mantém `schemaVersion: 1`, seguindo o padrão de extensões opcionais já usado por `dailySnapshots` e `financialRecords`. `financialGoals` e `categoryBudgets` são opcionais para importação e incluídos na exportação atual. Backups antigos são aceitos e restauram as novas coleções vazias. A restauração substitui os dados de todas as coleções na mesma transação, após validação completa. IDs duplicados, alvos/limites inválidos, datas invertidas e vínculos órfãos são rejeitados antes de alterar dados.

Use o aplicativo atualizado para restaurar backups novos: versões anteriores não conhecem as coleções de planejamento. O funcionamento offline permanece no IndexedDB e no service worker existentes, sem novas dependências.

## Realizado, aberto, previsto e reserva

- Entrada/saída com data até hoje: recebimento/pagamento realizado.
- Entrada/saída posterior a hoje: prevista, fora do realizado.
- Crédito/pendência: aberto até a baixa; a data é o vencimento previsto.
- Receber/pagar altera o mesmo ID para entrada/saída com a data atual. Não cria uma segunda cópia.
- Reserva: estimativa separada do pagamento real, sem vencimento ou alerta de obrigação.
- `saldo realizado = entradas recebidas − saídas pagas`.

Os cinco cards mostram entradas, saídas, créditos, pendências **a pagar** e saldo. A reserva não compõe o card de pendências a pagar; aparece separada no delivery e no histórico como reservada. O campo legado `pending` do resumo continua compatível; a UI usa `payablePending` para obrigações reais.

Histórico ausente aparece como **Sem dados**, nunca como zero presumido. Um zero explicitamente registrado continua zero. Valores incompletos tornam o cálculo indisponível. Somas/subtrações monetárias usam centavos inteiros com proteção de precisão segura; o banco continua armazenando `number`. Taxas mantêm precisão para cálculo e são formatadas com duas casas na interface.

## Metas

Tipos extensíveis: renda recebida, renda líquida pessoal, renda bruta do delivery, renda líquida do delivery, economia e limite desejado de despesas. Cada definição tem nome, tipo, alvo positivo e datas inicial/final, com mês atual como padrão do formulário.

- Renda recebida: soma das entradas realizadas no prazo.
- Renda líquida pessoal/economia: entradas menos saídas no prazo.
- Delivery bruto/líquido: movimentações realizadas explicitamente relacionadas ao delivery, sem descontar reserva do líquido operacional.
- Limite de despesas: soma das saídas pagas; representa consumo do teto, não incentivo a gastar.
- `percentual = realizado ÷ alvo × 100`.

Percentuais acima de 100% são apresentados numericamente, com barra visual limitada a 100%. Há estados para ainda não iniciado, sem registros, em andamento, meta atingida, encerrado, próximo do limite e limite ultrapassado. Nenhum formulário pede realizado manual.

Economia não comprova transferência para uma poupança. Metas líquidas pessoais refletem somente o saldo dos registros disponíveis. O filtro seleciona metas cujo prazo cruza o período; cada progresso considera todo o prazo da própria meta, até hoje.

## Orçamento

Orçamento mensal por categoria geral ou custo específico do delivery. O escopo específico ignora a categoria geral e considera somente valores classificados/identificados naquele tipo de custo.

- `gasto = saídas pagas no mês e escopo`.
- `restante = limite − gasto`.
- `percentual utilizado = gasto ÷ limite × 100`.
- Abaixo de 80%: dentro do orçamento.
- De 80% a menos de 100%: próximo do limite.
- Exatamente 100%: limite atingido.
- Acima de 100%: ultrapassado, com excesso explícito.

Aberto, futuro e reserva ficam fora do gasto realizado. Sem registros naquela categoria, o app informa ausência; não comprova gasto zero. Orçamentos gerais e específicos podem se sobrepor e não são somados como um total. Planejamento nunca cria movimentação. O filtro seleciona os meses envolvidos e o consumo considera o mês civil completo até hoje.

## Períodos, comparações e tendências

Hoje usa data local; semana vai de segunda a domingo; mês e ano são civis. Intervalos personalizados são inclusivos e precisam de fim igual ou posterior ao início. Uma única seleção de período controla resumos, histórico e análises do Financeiro. Filtros por tipo/categoria/origem/status/descrição continuam específicos do histórico.

Comparações: mês anterior, ano anterior ou intervalo imediatamente anterior de igual duração para hoje/semana/customizado. Incluem entradas, saídas/gastos, saldo/renda líquida pessoal, bruto, despesas e líquido operacional do delivery, resultado após reserva, horas e líquido/hora.

`variação = (atual − anterior) ÷ abs(anterior) × 100`. Sem histórico ou anterior zero: **Sem base de comparação**; diferença absoluta continua disponível quando ambos os valores são conhecidos. Período atual incompleto é identificado; a comparação civil é com o anterior completo e não prova tendência definitiva.

Tendência exige seis buckets consecutivos **encerrados**, com registros de gastos em cada um. Compara soma dos três recentes com soma dos três anteriores. Mais de +5% indica aumento nos registros; menos de −5%, diminuição; entre esses valores, estabilidade. Usa escala diária/semanal/mensal escolhida e dados do período selecionado. Lacunas e bucket em andamento não viram zero. Categorias crescentes precisam de base em ambos os blocos. A interface informa o intervalo observado e não faz promessa estatística ou previsão automática.

## Saldo projetado e fluxo futuro

Projeção é sempre relativa a **hoje**, explicitamente independente do filtro histórico. Usa todo o realizado disponível até hoje, sem saldo bancário inicial.

```text
impacto futuro = créditos + entradas previstas − pendências − despesas previstas
saldo projetado = saldo atual dos registros + impacto futuro
```

Horizontes cumulativos de 7, 15 e 30 dias; as linhas não devem ser somadas. Valores em aberto vencidos entram em todos os horizontes porque continuam sem baixa. Reserva não entra. Sem base realizada válida, mostra o impacto e deixa o saldo projetado indisponível.

A sequência por data calcula o saldo após compromissos de cada dia e identifica risco intermediário, mesmo quando o saldo final volta a ficar positivo. Valores do mesmo dia são compensados sem inventar horários de recebimento/pagamento. Não há extrapolação de receitas ou gastos ausentes, recorrência presumida nem saldo inicial inventado.

## Alertas

Alertas internos, derivados e agrupados:

- Pendências vencidas ou vencendo de hoje até os próximos 7 dias.
- Orçamento com pelo menos 80% utilizado, atingido ou ultrapassado.
- Meta em andamento com pelo menos 80% do alvo e limite de despesas ultrapassado.
- Risco de saldo negativo na sequência prevista.
- Queda de entradas de pelo menos 20% ou crescimento de despesas de pelo menos 20%, somente em períodos completos com registros em ao menos três dias de cada período.

Sem base, não há alerta de variação. Não há notificações externas ou afirmação de segurança financeira por ausência de alertas. O Financeiro mostra três alertas inicialmente e agrupa os demais em expansão; a Dashboard mostra dois, com acesso aos detalhes. Vencimentos e projeção usam hoje mesmo ao consultar um período histórico; orçamentos e metas seguem os planejamentos do filtro.

## Delivery e reserva

```text
horas = fim − início; acrescenta 24h quando fim < início
custos operacionais = combustível + outras despesas + custos adicionais vinculados já pagos
líquido operacional = bruto − custos operacionais
resultado após reserva = líquido operacional − reserva

bruto/hora = bruto ÷ horas
 despesas/hora = custos operacionais ÷ horas
 líquido/hora = líquido operacional ÷ horas
 resultado após reserva/hora = (líquido operacional − reserva) ÷ horas
```

Horários iguais significam zero horas, sem assumir 24h. Horário incompleto/inválido, zero horas ou numerador ausente deixam a taxa indisponível. Taxas agregadas são soma dos valores dividida pela soma das horas; não média simples das taxas por turno. Um turno com duração inválida/zero impede usar a taxa agregada como indicador válido.

Despesas gerais não reduzem delivery. Créditos/pendências vinculados só entram quando pagos e custos futuros ficam fora do realizado. Registre cada custo uma vez: se já consta no turno, não repita como despesa vinculada.

Indicadores operacionais agrupam pela data do turno, incluindo seus custos vinculados pagos até hoje, mesmo se pagos em outro período. Resumo financeiro, orçamento e metas seguem a data efetiva dos pagamentos/recebimentos. Essa diferença preserva o comportamento existente e é explicada na comparação.

A tela mostra bruto, despesas pagas, líquido operacional, reserva do período e resultado após reserva. Detalhes incluem quatro taxas, médias de bruto/líquido/despesas/horas por turno, melhor líquido/hora, evolução mensal e comparação por dia da semana, duração e hora de início. Grupos com menos de três turnos têm aviso de amostra pequena; médias são descritivas e não garantem resultado futuro.

Custos mostram total, participação nas despesas, percentual da receita bruta, custo/hora e variação anterior quando há base. Reserva acumulada soma as estimativas registradas nos turnos até hoje; não é saldo de uma conta, depósito, retirada ou pagamento. Ela reduz somente o resultado estimado após reserva. O formato legado de resultado estimado permanece disponível e nunca é chamado de lucro líquido.

## Interface, gráficos, Dashboard e acessibilidade

A identidade existente é preservada: tokens, superfícies, tipografia, claro/escuro, campos e navegação. Cinco cards principais; planejamento em listas; comparações, projeção e análises detalhadas em seções recolhidas. Formulários de metas/orçamento são abertos por ação explícita. Cadastro/histórico continuam disponíveis.

Gráficos SVG reutilizam `ProgressChart` e suas convenções, sem biblioteca nova: fluxo de entradas/saídas, saldo acumulado, distribuição por categoria/origem e evolução de indicadores do delivery. Fluxo diferencia barras cheias/contornadas e explica os valores em texto; gráficos possuem tabela alternativa. Séries longas são mensais, com limite de 1.200 buckets; totais/histórico permanecem completos. Saldo acumulado do gráfico começa em zero dentro do período e não presume saldo de conta.

A Dashboard mantém os indicadores originais e o resumo financeiro do mês/ano escolhido. Acrescenta comparação do saldo, uma meta ativa/atingida em destaque (prazo mais próximo, desempate pela criação), pendências próximas e alertas prioritários, além de líquido operacional do delivery. Checklist de 30 dias e progresso semanal permanecem separados. Alertas atuais são identificados como relativos a hoje.

Responsividade verificada em 320, 390, 768 e 1440px no Financeiro; larguras existentes da Dashboard também são cobertas. Valores podem quebrar linha nas listas/cards; tabelas usam rolagem local com foco de teclado e captions. Estados incluem texto, não somente cor. Formulários têm labels, feedback e foco previsível. Contraste normal mínimo 4,5:1 verificado nos novos textos nos dois temas. Capturas foram inspecionadas.

## Máscara monetária

`MoneyInput`, `moneyFromInput` e `moneyInputValue` continuam compartilhados em todos os campos monetários, incluindo alvos e limites novos. `1 → R$ 0,01`, `100 → R$ 1,00`, `123456 → R$ 1.234,56`, persistido como `1234.56`. Limpar, apagar e colar permanecem disponíveis. Não há string monetária formatada no banco.

## Skills e arquivos desta etapa

- `prompt-master`: lida integralmente antes das alterações. Seu escopo é engenharia de prompts; esta solicitação é implementação, então não foi gerado um prompt substituindo o trabalho.
- `ui-ux-pro-max`: orientação React, gráficos, acessibilidade, contraste, responsividade e revisão do sistema existente.
- `frontend-design`: hierarquia, conteúdo, reaproveitamento da identidade e revisão visual.
- `playwright-cli`: orientação de validação browser; os testes usam a suíte Playwright e o Edge já instalados.
- `find-skills`: avaliação do catálogo disponível e necessidade de novas capacidades. Nenhuma instalação foi necessária; nenhuma dependência ou ferramenta foi adicionada por conveniência.

Criados em `app-rotina`: `src/finance-analysis.ts`, `src/finance-analysis.test.ts`, `src/components/FinancePlanning.tsx`, `src/components/FinanceInsights.tsx`, `e2e/finance-intelligence.e2e.ts`.

Alterados nesta etapa: `src/types.ts`, `src/domain.ts`, `src/repository.ts`, `src/money.ts`, `src/finance.ts`, `src/App.tsx`, `src/components/FinanceForms.tsx`, `src/components/FinanceSummary.tsx`, `src/components/FinanceView.tsx`, `src/components/ProgressDashboard.tsx`, `src/index.css`, `src/repository-guards.test.ts`, `e2e/finance.e2e.ts`, `e2e/fixtures.ts`, `README.md`, `design-system/ritmo/MASTER.md` e este documento. Arquivos da implementação anterior foram preservados.

## Validação final

| Verificação | Resultado |
| --- | --- |
| `npm run lint` | Aprovado, sem erros ou avisos |
| `npm run typecheck` | Aprovado, incluindo E2E |
| `npm test` | **148 testes / 9 arquivos aprovados** |
| `npm run test:e2e -- --config=playwright.edge.config.ts --workers=2` | **48 cenários aprovados** |
| Build de produção, executado pelo comando E2E | Aprovado |
| Console / warnings React | Sem ocorrências nos cenários |
| Temas / responsividade / contraste / teclado | Aprovados nas verificações descritas |

Total: **196 testes**, com **49 unitários e 4 cenários de navegador novos** em relação aos 99/44 anteriores. TDD foi usado para motor e barreiras de persistência, com falha observada antes da implementação. Testes incluem metas 0/parcial/100/acima, limites, comparação sem base/zero, tendências com lacunas, projeção positiva/negativa/intermediária, alertas, taxas protegidas, madrugada, custos classificados, edição sem duplicação, centavos, migração 3→4, backup novo/antigo, restauração, máscara e offline.

O ambiente não possui o Chromium padrão do Playwright; validação usa o Edge instalado com configuração separada. O runner emite aviso de conflito de variáveis `NO_COLOR`/`FORCE_COLOR`, sem relação com o console da aplicação ou falha de build/testes.

## Limitações e interpretação

Não há conta bancária, saldo inicial, sincronização, recorrências automáticas ou previsão de valores não cadastrados. Projeção e alertas dependem de valores e vencimentos informados. Tendências exigem histórico suficiente; ausência não é zero. Classificação fina de custos antigos exige edição explícita, sem inferência automática. Reserva acumulada não controla depósitos/retiradas. Planejamentos são locais ao aparelho e devem ser preservados em backup. Nenhum critério solicitado ficou pendente de implementação.
