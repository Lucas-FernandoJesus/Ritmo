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

`estimatedResult`, `resultPerHour`, `resultPerKilometer` e `hours` persistidos nos turnos são campos legados. Permanecem compatíveis com validação e backups; a análise recalcula valores pelas fontes e pelos horários. Antes desta etapa, não havia outras entidades monetárias nem saldos iniciais. O patrimônio agora usa contas explicitamente cadastradas e vínculos opcionais, sem inferir saldos antigos.

## Arquitetura

Os arquivos financeiros estão agrupados em `app-rotina/src/features/finance/`, com componentes em `components/` e testes unitários próximos dos módulos. Modelos, validação, máscara monetária e calendário compartilhados ficam em `src/core/`; o repositório fica em `src/infrastructure/`. Veja o [mapa de organização](estrutura.md). Essa realocação preserva o IndexedDB 5, migrations, backup e regras de cálculo.

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

IndexedDB `rotina-local`, versão **5**. A migração 3 → 4 criou `financialGoals` e `categoryBudgets`; a migração 4 → 5 cria `recurringPlans`, `installmentPlans`, `assetAccounts` e `accountTransfers` quando ausentes. As coleções anteriores são preservadas. A migração 2 → 3 já criava `financialRecords`; o mesmo laço mantém compatibilidade com bancos 1 a 4 sem apagar ou inventar registros. Outras abas abertas recebem `versionchange`; uma atualização bloqueada orienta fechar as abas, sem alterar os dados.

Metas usam ID estável na edição. Orçamentos têm ID determinístico por mês e categoria ou custo específico. Salvar novamente o mesmo escopo/mês atualiza o limite, evitando duplicação. Alterar a identidade de um orçamento exige criar outro planejamento; edição modifica o limite. Exclusão de planejamento não apaga movimentações.

O backup mantém `schemaVersion: 1`, seguindo o padrão de extensões opcionais já usado por `dailySnapshots` e `financialRecords`. `financialGoals`, `categoryBudgets`, `recurringPlans`, `installmentPlans`, `assetAccounts` e `accountTransfers` são opcionais na importação e incluídos na exportação atual. A exportação lê todas as coleções em uma transação readonly consistente. Backups antigos são aceitos e restauram as novas coleções vazias. A restauração substitui os dados de todas as coleções na mesma transação, após validação completa. IDs duplicados, alvos/limites inválidos, datas invertidas e vínculos órfãos são rejeitados antes de alterar dados.

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

A sequência por data calcula o saldo após compromissos de cada dia e identifica risco intermediário, mesmo quando o saldo final volta a ficar positivo. Valores do mesmo dia são compensados sem inventar horários de recebimento/pagamento. Não há extrapolação de receitas ou gastos ausentes, recorrência presumida nem saldo inicial inventado. Recorrências e parcelas explicitamente cadastradas e ainda não confirmadas entram na projeção pelos seus vencimentos, incluindo atrasadas; uma ocorrência confirmada deixa de ser projetada pelo planejamento e passa a usar somente seu lançamento existente. Os saldos iniciais de contas permanecem na visão Patrimônio, separados desta projeção dos registros.

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

A identidade existente é preservada: tokens, superfícies, tipografia, claro/escuro e campos. O rodapé agora mantém somente Menu, que abre a lista central dos sete destinos em tela cheia. Cinco cards principais; planejamento em listas; comparações, projeção e análises detalhadas em seções recolhidas. Formulários de metas/orçamento são abertos por ação explícita. Cadastro/histórico continuam disponíveis.

Gráficos SVG reutilizam `ProgressChart` e suas convenções, sem biblioteca nova: fluxo de entradas/saídas, saldo acumulado, distribuição por categoria/origem e evolução de indicadores do delivery. Fluxo diferencia barras cheias/contornadas e explica os valores em texto; gráficos possuem tabela alternativa. Séries longas são mensais, com limite de 1.200 buckets; totais/histórico permanecem completos. Saldo acumulado do gráfico começa em zero dentro do período e não presume saldo de conta.

A Dashboard mantém os indicadores originais e o resumo financeiro do mês/ano escolhido. Acrescenta comparação do saldo, uma meta ativa/atingida em destaque (prazo mais próximo, desempate pela criação), pendências próximas e alertas prioritários, além de líquido operacional do delivery. Checklist de 30 dias e progresso semanal permanecem separados. Alertas atuais são identificados como relativos a hoje.

Responsividade verificada em 320, 390, 768 e 1440px no Financeiro; larguras existentes da Dashboard também são cobertas. Valores podem quebrar linha nas listas/cards; tabelas usam rolagem local com foco de teclado e captions. Estados incluem texto, não somente cor. Formulários têm labels, feedback e foco previsível. Contraste normal mínimo 4,5:1 verificado nos novos textos nos dois temas. Capturas foram inspecionadas.

## Máscara monetária

`MoneyInput`, `moneyFromInput` e `moneyInputValue` continuam compartilhados em todos os campos monetários, incluindo alvos e limites novos. `1 → R$ 0,01`, `100 → R$ 1,00`, `123456 → R$ 1.234,56`, persistido como `1234.56`. Limpar, apagar e colar permanecem disponíveis. Não há string monetária formatada no banco.

## Planejamento recorrente

`RecurringPlan` registra nome, tipo (entrada/saída/crédito/pendência), categoria, valor, frequência semanal/mensal/anual, início, fim opcional, ativo/pausado e contas opcionais. Contas fixas usam Saída. O calendário é calculado sem persistir ocorrências:

- Semana: início + múltiplos de sete dias, por datas civis UTC para evitar diferenças de DST.
- Mês: mantém o dia da primeira ocorrência. Dia 31 vira o último dia em fevereiro/meses curtos, retornando a 31 nos demais.
- Ano: mantém mês/dia; 29/02 vira 28/02 em anos comuns e retorna a 29/02 nos bissextos.
- Fim é inclusivo. Pausar retira ocorrências não confirmadas de histórico/projeções/alertas sem excluir lançamentos confirmados. Retomar preserva as mesmas identidades.

`PlanOccurrence` é derivado. `planningRef` guarda origem, plano, chave e vencimento original no lançamento confirmado. ID determinístico: `occurrence:<kind>:<planId>:<chave>`. Confirmação é uma transação readwrite que relê o plano e o lançamento: duas confirmações simultâneas retornam o mesmo registro. Não duplica ao recarregar, restaurar ou confirmar em outra data.

Entrada/saída confirmadas usam a data efetiva informada, até hoje. Crédito/pendência confirmados mantêm o vencimento e ficam em aberto até Receber/Pagar no histórico; baixa conserva o ID e `planningRef`. Valor e vínculo de uma ocorrência confirmada são preservados na edição; descrição, observação e conta podem ser corrigidas. Após confirmar, calendário/frequência/tipo e estrutura de parcelas ficam protegidos. Para outra estrutura, pause e crie um novo plano. Alterar o valor de uma recorrência vale para ocorrências não confirmadas, preservando valores anteriores.

A tela lista os planejamentos e as ocorrências do período compartilhado, com paginação. Status **Planejado · ainda não confirmado** não é realizado. Alertas de vencimento/projeções também consideram os compromissos planejados. Não há geração automática de pagamentos, juros, correção ou cobranças externas.

## Parcelamentos

`InstallmentPlan` guarda somente nome, categoria, total, quantidade (1 a 600), primeiro vencimento mensal, ativo e contas opcionais. Parcelas, próxima não paga, pagas, restantes e saldo restante são derivados dos lançamentos confirmados:

```text
centavos = round(total × 100)
base = floor(centavos ÷ quantidade)
resto = centavos % quantidade
parcela(i) = (base + 1 se i < resto; senão base) ÷ 100
```

Exemplo: R$ 100,00 / 3 → R$ 33,34 + R$ 33,33 + R$ 33,33. Todas as parcelas têm pelo menos um centavo e a soma é exatamente o total. Vencimentos usam a mesma âncora de mês das recorrências. Parcela confirmada em aberto continua não paga; futura continua não paga até a data efetiva. Não existem pagamento parcial, juros ou renegociação nesta estrutura simples. Criar compra parcelada não cria automaticamente despesa realizada nem dívida patrimonial; o usuário pode vinculá-la a um passivo já cadastrado.

## Patrimônio

`AssetAccount` contém nome, tipo (dinheiro, conta, poupança, reserva financeira, investimento ou dívida/passivo), saldo inicial positivo/zero e data. O saldo inicial representa a posição **antes** dos lançamentos daquela data. Para evitar dupla contagem, só vincule registros ainda não incluídos no saldo inicial.

```text
saldo do ativo = saldo inicial + entradas vinculadas − saídas vinculadas
                + transferências recebidas − transferências enviadas
passivo restante = valor inicial devido − pagamentos vinculados ao passivo
patrimônio líquido = soma dos ativos − soma dos passivos
```

Data até o corte e igual/posterior à data inicial. Futuro, créditos e pendências sem baixa ficam fora. Conta com início futuro não entra na posição atual. Sem contas já iniciadas: Sem dados, sem zero inventado. Receitas/custos pagos de um turno podem ser vinculados à mesma conta; reserva de manutenção não entra. Custos adicionais continuam vindo de despesas/lançamentos originais. Registros sem conta permanecem no Financeiro e um aviso informa posição patrimonial incompleta.

Vínculo `accountId` é opcional em `deliveryShifts`, `expenses` e `financialRecords`; `liabilityAccountId` opcional em saídas/pendências reduz uma dívida somente após pagamento. Legados sem vínculo não são migrados ou adivinhados. Corrigir saldo inicial recalcula a posição histórica. Após vínculos, tipo e data inicial ficam protegidos. Investimentos não recebem cotações/rendimentos automáticos; correções de valor são explícitas. A reserva financeira é uma conta com dinheiro e permanece distinta da reserva estimada do delivery.

`AccountTransfer` conecta duas contas de ativos existentes, com valor, data e ID estável. A data deve ser igual/posterior ao início das duas contas. Não cria `financialRecords`, não entra em renda/despesa e conserva patrimônio total. Transferência é imutável; cancelamento marca `voidedAt`, excluindo seu efeito sem perder identidade. Saldo negativo ou pagamento que supere o passivo recebe aviso para conferir vínculos, sem presumir limite bancário.

## Fechamento mensal

Visão viva do mês civil, sem snapshot, bloqueio ou lançamento automático. Mês em andamento é identificado; o corte é o fim do mês ou hoje, o que vier primeiro. Inclui entradas, saídas, saldo, créditos/pendências atuais com data no mês, delivery bruto/custos/líquido operacional, reserva, resultado após reserva, metas, orçamentos, comparação anterior, cinco principais categorias e patrimônio no corte.

Metas e orçamentos preservam seus próprios prazos; realizado termina em hoje. Créditos/pendências refletem o **status atual**, não uma reconstrução imutável do que estava em aberto no último dia histórico. Pagamentos usam sua data efetiva. A seleção mensal desta ferramenta é explícita e necessária para consultar outro mês, enquanto demais análises e simulador reutilizam o filtro principal. Selecionar/exportar o fechamento não altera dados.

## Simulador

Hipóteses locais ao componente, sem persistência: aumento de renda, redução de gastos, nova despesa, compra e alvo. A base pode ser saldo realizado do período ou progresso de uma meta selecionada. Limites de despesas não são metas de faturamento. Valores ausentes, taxa zero/negativa, duração inválida e estouro de centavos seguros deixam resultados indisponíveis.

```text
cenário líquido = base + renda adicional + redução de gastos − despesa nova − compra
redução aplicada = mínimo(redução informada, despesas realizadas na base)
falta = máximo(0, alvo − cenário)
horas estimadas = falta ÷ líquido operacional/hora histórico
bruto necessário = falta ÷ (líquido operacional histórico ÷ bruto histórico)
```

Necessidade de bruto é arredondada para cima em centavos. Para meta bruta, somente renda adicional altera o progresso: falta é o faturamento necessário, e horas usam **bruto/hora**. Economizar não vira receita bruta. Meta líquida de delivery limita redução aos custos do delivery; outras metas líquidas usam despesas gerais do período. Taxas usam os turnos do filtro selecionado, com aviso de amostra pequena e sem promessa de renda futura. Reserva e custos desconhecidos não são adivinhados. As hipóteses não alimentam os indicadores ou alertas reais.

## Exportações por período

`finance-export.ts` é um gerador local sem dependências ou rede. Exporta resumo e todos os lançamentos do período (independente dos filtros específicos do histórico), com status para diferenciar realizado/aberto/previsto/planejado/reserva:

- CSV: UTF-8 com BOM, delimitador `;`, decimal brasileiro, campos entre aspas, escape de aspas/newlines e proteção de texto que possa ser interpretado como fórmula.
- Excel: arquivo `.xlsx` OOXML verdadeiro, pacote ZIP com CRC32, partes/relações válidas, células de texto explícitas e valores numéricos com formato BRL. Uma aba Financeiro com resumo, congelamento de cabeçalho e autofiltro. Não é CSV renomeado e não contém fórmulas executáveis.
- PDF: documento real com páginas A4, streams, objetos, xref, cabeçalhos, rodapés e quebra de linhas/páginas. Texto pesquisável; português e acentos WinAnsi preservados. Caracteres fora dessa cobertura usam representação `[U+XXXX]`, sem desaparecer silenciosamente. PDF não é PDF/UA nem formulário editável.

Os relatórios são fotografias dos valores disponíveis e não substituem o backup completo. Exportação do fechamento usa o mês escolhido. XLSX/CSV preservam texto Unicode. Excel limita a 1.048.576 linhas; arquivos grandes são gerados em memória e podem exigir período menor no aparelho. Tabelas e planejamento completo ficam no backup JSON, não em abas redundantes dos relatórios.

Referências de formato verificadas: [SpreadsheetML, Microsoft](https://learn.microsoft.com/en-us/office/open-xml/spreadsheet/structure-of-a-spreadsheetml-document) e [PDF Reference, Adobe](https://opensource.adobe.com/dc-acrobat-sdk-docs/pdfstandards/pdfreference1.7old.pdf). ZIP/CRC/XML foram lidos por `zipfile`/`ElementTree` do Python; PDF teve offsets/streams validados e foi renderizado/inspecionado no leitor nativo do Edge.

## Backup e preparação para sincronização

As quatro novas coleções estão no JSON schemaVersion 1 como extensões opcionais, no restore atômico e no apagamento global. Validação rejeita duplicidades, calendários/vínculos inválidos, contas órfãs, transferências incoerentes e parcelas com valores adulterados **antes** do restore. Backups antigos deixam as novas coleções vazias; bancos 3 → 5 e 4 → 5 foram testados preservando fontes antigas.

IDs estáveis, `createdAt`/`updatedAt` nas novas entidades e `planningRef` mantido após baixa permitem um futuro adaptador externo. Planos são pausados e transferências canceladas sem perder identidade. `financeSyncSnapshot` oferece um contrato tipado apenas das fontes locais, sem totais derivados. Não existe backend, transporte de rede, serviço escolhido, credencial, fila, reconciliação remota ou sincronização implementada. A futura política de conflitos/identificação de usuário depende de decisão específica.

## Menu principal em tela cheia

`MainMenu` reutiliza `navItems` do App: Hoje, Semana, Treinos, Registros, Financeiro, Progresso e Ajustes. Não inventa destinos Delivery/Planejamento; são funcionalidades dentro de Registros/Financeiro. Rodapé contém um único botão Menu; opções ficam somente no diálogo aberto, verticalmente, sem cards, indicadores ou ícones.

Diálogo nativo `showModal()` ocupa a viewport por `100dvh`, respeita safe areas e possui rolagem vertical própria. Fundo fica inert e com overflow bloqueado. Ao abrir, foco vai à opção atual; o destino atual usa texto, peso e sublinhado discretos, além de cor. Teclado permanece no diálogo. X com `aria-label` e Esc fecham preservando a tela e retornando foco ao botão. Escolher um destino fecha, usa `navigateTab` existente e foca o conteúdo, sem reload. Ícones SVG são usados somente em Menu/X, decorativos para leitores de tela. Abertura usa 180 ms; reduced-motion remove a animação. Mobile/paisagem/tablet/desktop e claro/escuro foram verificados.

## Skills e arquivos desta etapa

As skills utilizadas e consultadas estão reunidas na [coleção local do projeto](../.agents/skills/README.md), com recursos completos, origem e integridade registradas no manifesto. Essa consolidação preserva as instalações globais e os workflows originais; não instala ferramentas de PDF, planilhas ou transcrição.

`prompt-master` foi lida antes das alterações; por seu próprio escopo, esta implementação não foi substituída por um prompt. `ui-ux-pro-max` orientou React, formulários, foco, navegação, acessibilidade e revisão dos tokens. `frontend-design` orientou listas simples e separação de ferramentas, preservando a identidade. `playwright-cli` orientou validação com a suíte Playwright/Edge. `find-skills` orientou avaliar o catálogo: nenhuma capacidade adicional exigiu instalação, nem houve dependência nova. Orientações de PDF/planilhas foram consultadas para formatos e revisão; os workflows de artefatos isolados não substituem o gerador offline do aplicativo.

Criados em `app-rotina`:

- Domínio: `src/core/finance-schedule.ts`, `src/features/finance/finance-plans.ts`, `src/features/finance/finance-closing.ts`, `src/features/finance/finance-export.ts`.
- Interface financeira em `src/features/finance/components/`: `FinanceAdvanced.tsx`, `FinanceSchedules.tsx`, `FinanceWealth.tsx`, `FinanceTools.tsx` e `finance-form-utils.ts`. Menu compartilhado em `src/components/MainMenu.tsx`.
- Testes: `src/features/finance/finance-plans.test.ts`, `src/features/finance/finance-export.test.ts`, `e2e/finance-operations.e2e.ts`, `e2e/menu.e2e.ts`, `e2e/finance-pdf.e2e.ts`.

Alterados: `src/App.tsx`, `src/core/types.ts`, `src/core/domain.ts`, `src/infrastructure/repository.ts`, `src/features/finance/finance.ts`, `src/features/finance/finance-analysis.ts`, `src/features/finance/components/FinanceView.tsx`, `FinanceForms.tsx`, `FinanceInsights.tsx`, `ProgressDashboard.tsx`, `src/index.css`, `src/infrastructure/repository-guards.test.ts`, `e2e/fixtures.ts`, `e2e/offline.e2e.ts`, `e2e/finance-intelligence.e2e.ts`, `README.md`, `docs/design-system/ritmo/MASTER.md` e este documento. MoneyInput/money.ts e dependências foram preservados.

## Validação final

| Verificação | Resultado |
| --- | --- |
| `npm run lint` | Sem erros ou avisos |
| `npm run typecheck` | Aprovado, incluindo E2E |
| `npm test` | **182 testes / 11 arquivos** |
| `npm run test:e2e -- --config=playwright.edge.config.ts --workers=2` | **55 cenários** |
| `npm run build` | Aprovado |
| Console / warnings React | Sem ocorrências nos cenários |
| Temas / responsividade / foco / teclado | Verificados |

Total: **237 testes**, **34 unitários e 7 cenários de navegador novos** sobre a base 196. Nenhum teste anterior removido. Testes existentes foram adaptados à navegação modal e à versão final do IndexedDB. TDD teve falhas observadas antes do domínio, exportações e menu, e em proteções de precisão. A validação usa o Edge instalado, pois o Chromium padrão do Playwright não está instalado. Avisos NO_COLOR/FORCE_COLOR são do runner, não do aplicativo.

Casos cobertos: quatro tipos recorrentes, semana/mês/ano, 31/02 e bissexto, pausa, confirmação simultânea idempotente, pagamento com data distinta, parcelas de centavos e soma exata, limites inválidos, posição patrimonial/transferências/reserva, metas brutas/líquidas no simulador, sem histórico/taxa zero/overflow, fechamento civil/parcial, migração 3/4 → 5, backups antigos/novos e refs adulteradas, restore e offline, CSV escaping/fórmulas, ZIP CRC/XML/números, PDF/paginação/acento/renderização, menu viewport/mobile/paisagem/temas/teclado/retorno de foco.

## Limitações reais

- Não há sincronização externa, conta de usuário, saldo bancário automático, cotações, juros, renegociação ou pagamento parcial. A estrutura está preparada para um adaptador futuro, sem serviço escolhido.
- Patrimônio depende do saldo inicial correto e dos vínculos explícitos; histórico sem vínculo não é inferido. Corrigir inicial recalcula a posição antiga. Projeção dos registros e saldo patrimonial são leituras separadas.
- Fechamento é uma visão recalculada, não um documento imutável ou livro contábil; valores em aberto históricos usam status atual.
- Simulações dependem das hipóteses e do histórico escolhido; médias de delivery não garantem desempenho. Tendências mantêm os requisitos mínimos de dados e lacunas não viram zero.
- Relatórios são resumos/movimentações; estruturas completas de planejamento/patrimônio ficam no JSON. PDF usa cobertura WinAnsi, representação U+ para outros símbolos e não é um PDF marcado para acessibilidade. Exportações grandes usam memória local; escolha períodos menores se necessário.
- Os testes de navegador foram executados no Edge; Safari/Firefox e outros dispositivos físicos não foram executados neste ambiente. Excel foi validado estruturalmente com ZIP/XML, sem abrir uma instalação do Microsoft Excel.
