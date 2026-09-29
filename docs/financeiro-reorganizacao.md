# Reorganização do Financeiro

## Estado do trabalho

- **Etapa atual:** tarefa 1 concluída — mapeamento da arquitetura da informação existente.
- **Base analisada:** commit `871efbb` e alterações locais posteriores preservadas.
- **Alterações nesta etapa:** somente documentação e regra de execução do repositório; nenhum código da aplicação foi modificado.
- **Próxima tarefa:** definir a arquitetura da informação desejada e os caminhos canônicos de cadastro antes de alterar a interface.

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

## Decisões necessárias antes da implementação

1. Definir o caminho canônico para cadastrar saídas: preservar `Expense` como origem principal, usar `FinancialRecord` ou estabelecer uma separação explícita entre eles.
2. Definir os itens exatos do submenu de cadastro e para qual formulário existente cada item direciona.
3. Definir se salário, serviço recebido e transferência recebida serão atalhos de interface mapeados aos campos atuais ou uma nova classificação persistida. Transferência entre contas próprias deve continuar separada.
4. Definir quais informações permanecem no primeiro nível da visão Financeiro e quais ficam em áreas secundárias.
5. Definir se as análises detalhadas do delivery permanecem recolhidas no Financeiro ou ficam apenas na consulta própria do delivery, mantendo seus totais no resumo central.
6. Definir a apresentação conjunta das recorrências por período e por ano para evitar a impressão de mecanismos diferentes.

Essas decisões não devem ser resolvidas apenas por troca de textos: a escolha do cadastro canônico afeta compatibilidade, edição e prevenção de duplicidade. Nenhuma mudança de modelo, schema, migração, backup ou restauração está autorizada por este documento.

## Backlog ordenado

1. **Concluída — mapear o estado atual.** Identificar fontes, caminhos de cadastro, sobreposições e invariantes.
2. **Definir a arquitetura da informação desejada.** Escolher caminhos canônicos de cadastro, primeiro nível da consulta e nomenclatura, sem implementar código.
3. **Especificar contratos e testes.** Cobrir navegação, origem dos registros, prevenção de duplicidade e compatibilidade.
4. **Reorganizar a visão principal e o submenu de cadastro.** Aplicar a hierarquia aprovada reutilizando os modelos atuais.
5. **Clarificar os formulários financeiros.** Separar intenções e orientar entradas, saídas e pendências sem criar mecanismos paralelos.
6. **Reposicionar ferramentas e detalhes do delivery.** Manter centralização dos resultados com menor carga visual.
7. **Reposicionar o X do menu.** Colocá-lo visualmente abaixo das opções, preservando acessibilidade.
8. **Integrar e verificar.** Executar suíte completa, build e revisão visual nos tamanhos e temas previstos.

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
