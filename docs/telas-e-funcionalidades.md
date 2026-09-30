# Telas e funcionalidades do Ritmo

Este mapa define onde cada ação começa e onde seu resultado é consultado. A navegação principal conserva os sete destinos atuais. Uma tela pode mostrar dados de outra funcionalidade, mas o cadastro continua no destino indicado abaixo.

| Destino | Ações próprias | Leitura principal | Fonte persistida |
| --- | --- | --- | --- |
| Hoje | Escolher ritmo, salvar checagem, concluir ou pular uma atividade, expandir o dia e abrir orientações | Próxima atividade, três próximos itens e progresso semanal comparado à semana anterior | `settings`, `checkIns`, `dailySnapshots`, `completions` |
| Semana | Buscar por título ou categoria, escolher um dia e abrir a atividade prevista; preparar marmitas e cuidar da casa nos checklists de sábado e domingo | Agenda semanal filtrável | `settings`, `completions` |
| Treinos | Abrir sessão A, B ou Muay Thai; avançar, repetir ou voltar uma semana do plano | Semana e sessões do treino | `settings` |
| Registros | Registrar ou editar turno de delivery; registrar estudo | Turnos e estudos recentes | `deliveryShifts`, `studyLogs` |
| Financeiro | Registrar entrada, saída, valor a receber ou a pagar; administrar metas, orçamento, recorrências, contas e transferências | Resumo, histórico, planejamento, patrimônio e análises | `expenses`, `financialRecords`, `financialGoals`, `categoryBudgets` e dados de planejamento |
| Progresso | Marcar etapas do plano inicial de 30 dias | Dashboard mensal/anual, progresso semanal e plano de 30 dias em seções separadas | Leitura das fontes existentes; `progress` apenas para o plano de 30 dias |
| Ajustes | Alterar aparência, atividades e horários; configurar e testar lembrete diário; exportar ou importar backup; apagar dados mediante confirmação | Preferências e armazenamento local | `settings`, repositório de backup e `localStorage` somente para o lembrete |

## Caminhos entre funcionalidades

- Uma atividade de treino em Hoje ou Semana abre a sessão correspondente em Treinos. A navegação de volta deve retornar de forma previsível.
- Um estudo ou turno registrado pode oferecer a conclusão da atividade planejada relacionada, sem concluir automaticamente outra atividade.
- Turnos são cadastrados em Registros > Delivery. Sua receita e seus custos alimentam a consulta no Financeiro; o histórico financeiro leva à edição do turno de origem.
- Novas saídas manuais são cadastradas pelo Financeiro. O atalho legado Registros > Despesas deve abrir a mesma ação, sem oferecer outro formulário.
- Checklists de preparo de marmitas e casa pertencem à Semana e aparecem ao selecionar domingo e sábado, respectivamente. Seus IDs e estados de conclusão existentes devem ser preservados ao mudar de lugar.
- O plano inicial de 30 dias pertence ao Progresso, mas permanece separado do percentual principal e dos períodos civis do Dashboard.
- Dados financeiros planejados não contam como realizados antes da confirmação. Transferência entre contas próprias não é entrada nem saída.
- As ações rápidas do menu abrem diretamente Turno, Estudo, Entrada ou Saída, mas não criam novos destinos globais.
- O lembrete diário pede permissão somente após ação explícita, fica neste dispositivo e funciona enquanto o Ritmo estiver aberto. Ele não altera o IndexedDB nem o backup.

## Critérios para mudanças nas telas

1. Cada ação de cadastro tem um destino principal e grava na fonte já existente. Outras telas podem oferecer atalhos para ela.
2. O repositório continua sendo o único acesso ao IndexedDB. A reorganização não altera schema, migrações, formatos de backup, IDs existentes ou cálculos de domínio.
3. O menu conserva o botão no rodapé e seus sete destinos; as quatro ações rápidas ficam em um grupo separado e controles internos de cada tela mostram somente tarefas daquela área.
4. A navegação por teclado, o retorno, a leitura offline, os temas Claro/Escuro e os estados vazios devem funcionar em 320 px e em telas maiores.
5. Cada extração de tela deve preservar comportamento observado em testes antes de alterar sua apresentação.

As decisões financeiras detalhadas continuam em [Reorganização do Financeiro](financeiro-reorganizacao.md). A estrutura de código está em [Estrutura do Ritmo](estrutura.md), e os tokens visuais em [Sistema de interface](design-system/ritmo/MASTER.md).
