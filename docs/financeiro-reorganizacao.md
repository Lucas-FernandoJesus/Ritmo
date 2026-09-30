# Reorganização do Financeiro

## Estado do trabalho

- **Etapa atual:** tarefa 8 concluída — reorganização implementada e integração final verificada.
- **Base analisada:** commit `c08872e`, que concluiu o mapeamento do estado existente.
- **Decisão aprovada:** Financeiro será o caminho canônico para cadastrar e consultar informações financeiras; Delivery permanece em Registros.
- **Implementação:** Visão geral, áreas secundárias, quatro intenções de cadastro, redirecionamento de Despesas, orientação de primeiro uso, prioridade móvel do resumo e posição do X do menu foram concluídos sem alterar schema, migrações ou contratos de backup.
- **Próxima ação:** revisar o diff e criar o commit quando desejado.

## Resultado da integração

- `npm run lint`: aprovado sem avisos.
- `npm run typecheck`: aprovado para aplicação e E2E.
- `npm test`: 11 arquivos e 193 testes aprovados.
- E2E completo no Edge: 62 testes aprovados com um worker, incluindo temas, responsividade, offline, migrações e backup.
- `npm run build`: aprovado; permanece apenas o aviso conhecido do Vite sobre chunk principal acima de 500 kB.
- Revisão visual: Visão geral e menu conferidos em mobile, desktop, Claro, Escuro, orientação horizontal e movimento reduzido.

## Direção de produto já definida

- **Financeiro** deve ser o ponto central de consulta das informações financeiras já cadastradas.
- Os cadastros financeiros devem ser acessados por um submenu com intenções claras, como Entrada, Saída e Pendência.
- Dados do delivery continuam sendo registrados em **Registros > Delivery**, mas seus resultados financeiros aparecem centralizados no Financeiro.
- A reorganização deve orientar onde cada informação é registrada e impedir lançamentos duplicados.
- Transferências entre contas próprias movimentam patrimônio, mas não constituem entrada nem saída financeira.

## Fontes atuais de informação

| Fonte | Local de cadastro atual | Uso no Financeiro | Ponto de atenção |
| --- | --- | --- | --- |
| Turnos de delivery | Registros > Delivery | Receita bruta, combustível, outros custos, reserva de manutenção, resultado e análises operacionais | Custos também podem ser informados em lançamentos vinculados ao turno |
| Despesas | Registros > Despesas | Movimentações de saída, histórico, resumos e análises | Sobrepõe-se ao cadastro de movimentação do tipo Saída |
| Registros financeiros | Formulário “Nova movimentação” no Financeiro | Entrada, Saída, Crédito e Pendência | Quatro intenções distintas estão reunidas em um formulário sempre visível |
| Recorrências e parcelas | Planejamento financeiro | Ocorrências planejadas e registros confirmados | A mesma recorrência aparece na visão anual e na lista do período |
| Metas e orçamentos | Financeiro > Metas e orçamento | Planejamento, progresso e alertas | Compete visualmente com a consulta principal |
| Contas, ativos e transferências | Financeiro > Patrimônio | Saldos patrimoniais e movimentações entre contas | Transferência interna deve permanecer neutra no fluxo de receitas e despesas |

Os movimentos derivados de delivery são montados para consulta e não são copiados para `financialRecords`. A confirmação de recorrências e parcelas usa `planningRef` para reconciliar plano e realizado sem criar registros repetidos. Essas regras devem ser preservadas.

## Composição atual da tela Financeiro

Na ordem visual aproximada, a tela apresenta:

1. título e seletor de período;
2. cartões de Entradas, Saídas, Créditos, Pendências e Saldo;
3. previsão de valores futuros;
4. alertas financeiros;
5. Metas e orçamento;
6. “Planejar próximos passos”, com Recorrências e parcelas, Patrimônio, Fechamento mensal, Simulador e Exportações;
7. comparação com período anterior;
8. projeção de fluxo futuro;
9. resumo e análises detalhadas do delivery;
10. formulário “Nova movimentação” ou edição de despesa;
11. histórico filtrável de movimentações;
12. análises e distribuições do período.

O volume de blocos mistura consulta, cadastro, planejamento, patrimônio, ferramentas e análise operacional numa única hierarquia. Mesmo os blocos recolhidos aumentam a quantidade de conceitos apresentados na tela principal.

## Sobreposições e riscos identificados

| Prioridade | Situação atual | Risco para o usuário |
| --- | --- | --- |
| Alta | Uma saída pode ser cadastrada em Registros > Despesas ou em Nova movimentação > Saída | Dúvida sobre o caminho correto e possibilidade de duplicação manual |
| Alta | Custos extras do delivery podem estar no turno, numa despesa vinculada ou numa movimentação vinculada | O mesmo custo pode ser informado mais de uma vez |
| Alta | Entrada, Saída, Crédito e Pendência compartilham o mesmo formulário geral | A intenção do cadastro e o efeito de cada tipo ficam pouco claros |
| Média | As categorias de despesa também são oferecidas a entradas e créditos | Origens como salário e serviço recebido não estão representadas semanticamente |
| Média | Delivery entra nos totais e no histórico, mas também ocupa uma seção analítica extensa | A centralização existe nos dados, porém a repetição visual compete com o resumo financeiro |
| Média | Recorrências possuem visão anual e lista de ocorrências do período | Duas apresentações próximas do mesmo compromisso podem parecer cadastros diferentes |
| Média | Período principal, ano das recorrências, mês do fechamento e horizonte da projeção são controles independentes | O usuário pode interpretar totais de períodos diferentes como diretamente comparáveis |
| Média | “Planejar próximos passos” reúne planejamento, patrimônio, fechamento, simulador e exportação | O título não descreve adequadamente todas as ferramentas agrupadas |
| Baixa | O botão X do menu vem depois das opções na ordem do documento, mas é posicionado no topo pela apresentação visual | Não atende à posição visual desejada abaixo das opções |

## Redundância visual que não representa duplicação persistida

- Receita e custos do delivery aparecem em resumos, histórico e análises, mas derivam dos mesmos turnos.
- Uma ocorrência recorrente pode aparecer nas visões mensal e anual, mas a confirmação é reconciliada pelo mesmo `planningRef`.
- Transferências entre contas alteram o patrimônio sem criar receita ou despesa.
- Cartões de resumo, alertas e gráficos podem reapresentar o mesmo fato para finalidades diferentes; a reorganização deve definir hierarquia, não criar novas entidades.

## Arquitetura da informação aprovada

### Princípio de navegação

**Financeiro** é a central de consulta e cadastro de dinheiro. O menu principal continua apresentando um único destino Financeiro, sem expor cada ferramenta financeira como opção global. Dentro dele, a ação primária **Registrar** abre o submenu com quatro intenções em linguagem de usuário:

1. Entrada;
2. Saída;
3. A receber;
4. A pagar.

**Registros** permanece como a área de fatos operacionais e pessoais. Delivery continua em `Registros > Delivery`; estudos e checklists não mudam. `Registros > Despesas` deixa de oferecer um cadastro independente: enquanto esse acesso existir, deve levar ao mesmo fluxo canônico de **Financeiro > Registrar > Saída**.

### Caminhos canônicos e fontes

| Intenção | Caminho canônico | Fonte persistida | Regra |
| --- | --- | --- | --- |
| Registrar dinheiro recebido | Financeiro > Registrar > Entrada | `FinancialRecord` do tipo `entrada` | Cadastro manual de recebimento realizado ou futuro conforme a data |
| Registrar uma compra ou pagamento | Financeiro > Registrar > Saída | `Expense` | Único cadastro manual novo de saída; reutiliza o formulário de despesa existente |
| Registrar valor a receber | Financeiro > Registrar > A receber | `FinancialRecord` do tipo `credito` | Ao receber, o mesmo registro passa a entrada; não cria cópia |
| Registrar conta a pagar | Financeiro > Registrar > A pagar | `FinancialRecord` do tipo `pendencia` | Ao pagar, o mesmo registro passa a saída; não cria cópia |
| Registrar turno e valores próprios do trabalho | Registros > Delivery | `DeliveryShift` | Receita, combustível, outros custos do turno e reserva continuam no formulário operacional |
| Registrar gasto adicional do delivery | Financeiro > Registrar > Saída | `Expense` vinculado ao turno | Usar somente para gasto que ainda não esteja nos campos do turno |
| Confirmar recorrência ou parcela | Planejamento > Recorrências e parcelas | `FinancialRecord` com `planningRef` | A ocorrência planejada de saída compõe A pagar até a confirmação; ao pagar, passa a Saída realizada, reconcilia pelo mesmo identificador e permanece idempotente |
| Transferir entre contas próprias | Patrimônio > Transferir | `AccountTransfer` | Movimenta patrimônio sem compor entrada, saída ou saldo do período |

`Expense` é, portanto, a origem canônica de **novas saídas manuais**. `FinancialRecord` continua sendo a origem de entradas, valores a receber, valores a pagar e confirmações do planejamento. Essa divisão reaproveita as entidades atuais e não exige schema, migração ou conversão de dados.

### Hierarquia do Financeiro

O primeiro nível deve responder rapidamente “como está o período?” e conter somente:

1. título, seleção do período e ação **Registrar**;
2. resumo de Entradas, Saídas, A receber, A pagar e Saldo;
3. alertas essenciais do período;
4. histórico unificado, com filtros e ações de edição ou baixa.

Os demais conteúdos ficam em destinos secundários do próprio Financeiro:

| Área | Conteúdo |
| --- | --- |
| Planejamento | Metas, orçamentos, recorrências, parcelas e a visão anual das mesmas recorrências |
| Patrimônio | Contas, saldos patrimoniais e transferências próprias |
| Análises | Comparação entre períodos, projeção de fluxo, distribuições e detalhes de desempenho do delivery |
| Ferramentas | Fechamento mensal, simulador e exportações |

Resultados financeiros do delivery permanecem no resumo e no histórico central. O detalhamento operacional não compete com a visão principal e fica em Análises; o cadastro do turno continua em Registros. A visão anual e a lista por período de recorrências pertencem ao mesmo destino Planejamento, com controles de período claramente identificados, e não são apresentadas como mecanismos distintos.

### Nomenclatura de interface

| Termo técnico ou atual | Nome de interface aprovado |
| --- | --- |
| `entrada` | Entrada |
| `saida` | Saída |
| `credito` / Crédito | A receber |
| `pendencia` / Pendência | A pagar |
| Nova movimentação | Registrar |
| Planejar próximos passos | Planejamento, Patrimônio, Análises ou Ferramentas, conforme o conteúdo |

Não serão criados nesta etapa atalhos persistidos para salário, serviço recebido ou transferência recebida. As categorias existentes continuam compatíveis; a próxima especificação deve prever como o formulário comunica a origem sem inventar uma nova classificação. Transferência entre contas próprias nunca usa Entrada ou Saída.

### Compatibilidade e edição

- Saídas antigas armazenadas em `FinancialRecord` permanecem visíveis e editáveis pela sua origem; não serão migradas nem duplicadas em `Expense`.
- O histórico unificado deve abrir o editor correspondente à fonte real do item: turno, despesa, registro financeiro ou ocorrência planejada.
- A ação canônica limita **novos cadastros manuais**; ela não reclassifica silenciosamente dados existentes.
- Receber um crédito e pagar uma pendência continuam alterando o registro de mesmo ID.
- Confirmações de recorrências e parcelas continuam reconciliadas por `planningRef`, mesmo quando o tipo confirmado é saída.
- A navegação reorganizada não autoriza mudanças no IndexedDB, backup, restauração ou contratos persistidos.

### Prevenção de duplicidade

- Um gasto informado em Combustível ou Outras despesas do turno não deve ser cadastrado novamente como Saída.
- Um gasto adicional do delivery deve ser uma Saída vinculada ao turno, com orientação explícita no formulário e no fluxo de edição.
- O atalho legado `Registros > Despesas` e o submenu Financeiro devem abrir a mesma intenção e a mesma fonte, nunca formulários concorrentes.
- Uma ocorrência planejada confirmada não deve oferecer um segundo cadastro manual como etapa do mesmo fluxo.
- Resumo, histórico, gráficos e análises são diferentes leituras das mesmas fontes e não criam registros.

Nenhuma dessas decisões depende apenas de troca de textos: os contratos da tarefa seguinte devem demonstrar os destinos, a preservação da fonte e a ausência de cópias antes da implementação visual.

## Contratos da reorganização

### C1 — Entrada no Financeiro e hierarquia

- Abrir Financeiro sempre leva à Visão geral, preservando o período selecionado.
- A Visão geral contém seleção de período, ação **Registrar**, resumo, alertas essenciais e histórico.
- Planejamento, Patrimônio, Análises e Ferramentas são destinos secundários identificáveis e não despejam seus formulários e detalhes na Visão geral.
- Voltar de uma área secundária retorna à Visão geral sem recarregar a aplicação nem alterar dados.
- O histórico e o resumo continuam reunindo as fontes existentes; reorganizar a tela não altera cálculos.

### C2 — Submenu Registrar

- **Registrar** expõe exatamente Entrada, Saída, A receber e A pagar nessa ordem.
- Cada escolha abre um formulário com intenção fixa. O usuário não troca o tipo por um seletor genérico dentro do formulário.
- Cancelar ou concluir devolve à Visão geral e restaura o foco em um destino previsível.
- O fluxo funciona por toque e teclado, tem nomes acessíveis, foco visível e alvos de interação de no mínimo 44 × 44 px.
- O significado de cada opção é textual e não depende somente de cor ou ícone.

### C3 — Origem persistida de novos cadastros

- Entrada cria somente um `FinancialRecord` do tipo `entrada`.
- Saída manual cria somente um `Expense`; não cria `FinancialRecord` paralelo.
- A receber cria somente um `FinancialRecord` do tipo `credito`.
- A pagar cria somente um `FinancialRecord` do tipo `pendencia`.
- O acesso legado `Registros > Despesas`, enquanto existir, entra no mesmo fluxo de Saída e produz a mesma fonte `Expense`.
- Confirmar recorrência ou parcela pode criar `FinancialRecord` do tipo correspondente com `planningRef`; isso não é um segundo cadastro manual.

### C4 — Baixa e edição preservam identidade

- Receber transforma o mesmo crédito em entrada, preservando ID e quantidade total de registros.
- Pagar transforma a mesma pendência em saída, preservando ID e quantidade total de registros.
- Cada ocorrência não confirmada de uma recorrência do tipo Saída ou de um parcelamento compõe A pagar no respectivo período, junto das contas individuais; ela não compõe Saídas nem Saldo antes do pagamento.
- Confirmar o pagamento remove a ocorrência virtual de A pagar e cria uma única Saída realizada com o mesmo identificador de ocorrência e `planningRef`.
- Editar um `Expense` atualiza `expenses`; editar um `FinancialRecord` atualiza `financialRecords`; editar um turno abre Registros > Delivery.
- Uma saída antiga armazenada em `FinancialRecord` continua editável nessa mesma coleção e nunca é convertida automaticamente em `Expense`.
- Um registro com `planningRef` mantém a referência durante confirmação, baixa e edição permitida.

### C5 — Delivery e duplicidade

- Salvar um turno não cria `Expense` nem `FinancialRecord`; resumo e histórico derivam o movimento do `DeliveryShift`.
- Combustível e outras despesas informados no turno aparecem uma única vez nos cálculos.
- Uma Saída adicional vinculada ao turno entra uma única vez como `Expense` e deve orientar que o valor não seja repetido nos campos do turno.
- Editar um movimento derivado do turno abre o turno de origem, inclusive quando ele está fora da lista inicial de recentes.
- Resumo, histórico, análises e exportações leem as mesmas fontes sem persistir cópias.

### C6 — Compatibilidade e limites

- A versão do IndexedDB, as coleções, o schema de backup e os validadores não mudam nesta reorganização.
- Bancos e backups existentes com `Expense`, `FinancialRecord` de qualquer tipo e `planningRef` continuam aceitos.
- Transferências próprias permanecem fora de entradas, saídas e saldo do período.
- O app continua funcional offline e nos temas Claro e Escuro.
- Os termos técnicos `credito` e `pendencia` permanecem no domínio persistido; somente a interface apresenta A receber e A pagar.

## Matriz de testes antes da implementação

Os testes de comportamento devem ser escritos e executados em ciclo vermelho–verde–refatoração. Cada teste novo precisa falhar pela ausência do comportamento esperado antes de qualquer código de produção correspondente.

| ID | Cenário observável | Evidência esperada | Nível / destino |
| --- | --- | --- | --- |
| T1 | Visão geral reduzida | Resumo, alertas e histórico visíveis; áreas secundárias fora do primeiro nível | E2E em `e2e/finance-reorganization.e2e.ts` |
| T2 | Submenu Registrar acessível | Quatro opções, ordem aprovada, teclado, foco e retorno após cancelar | E2E no mesmo arquivo |
| T3 | Origem dos quatro cadastros | Backup ou IndexedDB contém 1 entrada, 1 despesa, 1 crédito e 1 pendência nas coleções corretas, sem saída manual duplicada | E2E no mesmo arquivo |
| T4 | Atalho legado de Despesas | Acesso por Registros abre a mesma intenção Saída e persiste somente `Expense` | E2E no mesmo arquivo |
| T5 | Baixas sem cópia | Receber e Pagar preservam IDs e a quantidade de `financialRecords` | Adaptar `e2e/finance.e2e.ts` |
| T6 | Edição pela fonte | Turno, `Expense`, `FinancialRecord` atual e saída legada abrem e salvam no editor correto | E2E no arquivo novo e em `e2e/finance.e2e.ts` |
| T7 | Delivery sem duplicidade | Turno mais gasto adicional vinculado mantém totais atuais e uma única despesa adicional | Adaptar `e2e/finance.e2e.ts` e `e2e/finance-intelligence.e2e.ts` |
| T8 | Planejamento idempotente | Confirmação dupla, baixa e pausa conservam um registro e `planningRef` | Preservar `finance-plans.test.ts` e `e2e/finance-operations.e2e.ts` |
| T9 | Compatibilidade persistida | Migrações 3/4 → 5 e backups antigos/atuais continuam aprovados sem nova versão | Preservar `repository-guards.test.ts`, `offline.e2e.ts` e suítes financeiras |
| T10 | Áreas secundárias | Cada destino contém somente seu grupo aprovado e volta à Visão geral sem reload | E2E no arquivo novo |
| T11 | Responsividade e temas | Sem rolagem horizontal em 320, 390, 768 e 1440 px; contraste e nomes acessíveis preservados | Adaptar revisão visual financeira existente |
| T12 | Menu global | Financeiro continua sendo um único destino; o X fica visualmente abaixo das opções com foco, Esc e retorno preservados | Adaptar `e2e/menu.e2e.ts` na tarefa 7 |

### Ordem TDD por tarefa

1. **Tarefa 4:** escrever T1, T2 e T10; observar falha por causa da hierarquia e do submenu ainda ausentes; implementar somente a visão principal e a navegação interna necessárias para deixá-los verdes.
2. **Tarefa 5:** escrever T3, T4 e a parte nova de T6; observar a saída ainda usando o formulário geral ou o caminho antigo; implementar a separação das quatro intenções e a preservação da fonte.
3. **Tarefa 6:** completar T7, T10 e T11; mover ferramentas e detalhes do delivery sem alterar cálculos, planejamento ou persistência.
4. **Tarefa 7:** escrever a nova asserção visual e de ordem de T12; ajustar apenas a posição do X.
5. **Tarefa 8:** executar lint, typecheck, suíte unitária, suíte E2E completa no Edge, build e revisão visual final.

Testes existentes podem ser atualizados quando seus seletores representam deliberadamente a interface antiga, mas suas asserções de cálculo, persistência, idempotência, backup, migração e offline não podem ser enfraquecidas ou removidas.

## Backlog ordenado

1. **Concluída — mapear o estado atual.** Identificar fontes, caminhos de cadastro, sobreposições e invariantes.
2. **Concluída — definir a arquitetura da informação desejada.** Caminhos canônicos, primeiro nível, áreas secundárias, nomenclatura e regras de compatibilidade aprovados, sem implementar código.
3. **Concluída — especificar contratos e testes.** Contratos C1–C6, matriz T1–T12 e ordem TDD definidos para navegação, origem, edição, duplicidade e compatibilidade.
4. **Concluída — reorganizar a visão principal e o submenu de cadastro.** Hierarquia aprovada aplicada com os modelos existentes.
5. **Concluída — clarificar os formulários financeiros.** Intenções separadas e fonte canônica preservada sem mecanismos paralelos.
6. **Concluída — reposicionar ferramentas e detalhes do delivery.** Resultados permanecem centralizados com menor carga visual.
7. **Concluída — reposicionar o X do menu.** Controle abaixo das opções, com foco, Escape e alvos acessíveis preservados.
8. **Concluída — integrar e verificar.** Suítes, build e revisão visual aprovados nos tamanhos e temas previstos.

Cada item deve ser executado como uma tarefa independente e verificável, sem antecipar alterações das etapas seguintes.

## Invariantes para as próximas tarefas

- Preservar IndexedDB, funcionamento offline, dados legados e registros já confirmados.
- Não criar um segundo mecanismo de recorrência nem duplicar dados do delivery.
- Não alterar cálculos ou classificações do Dashboard.
- Não tratar resultado estimado do delivery como lucro líquido.
- Não contar transferência entre contas próprias como entrada ou saída.
- Não alterar schema, migrações, dependências, backup ou restauração sem autorização.

## Arquivos consultados

- `AGENTS.md`
- `docs/estrutura.md`
- `docs/financeiro.md`
- `app-rotina/src/features/finance/components/FinanceView.tsx`
- `app-rotina/src/features/finance/components/FinanceSummary.tsx`
- `app-rotina/src/features/finance/components/FinanceForms.tsx`
- `app-rotina/src/features/finance/components/FinancePlanning.tsx`
- `app-rotina/src/features/finance/components/FinanceAdvanced.tsx`
- `app-rotina/src/features/finance/components/FinanceInsights.tsx`
- `app-rotina/src/features/finance/components/RecurringAnnualView.tsx`
- `app-rotina/src/features/finance/finance.ts`
- `app-rotina/src/components/MainMenu.tsx`
