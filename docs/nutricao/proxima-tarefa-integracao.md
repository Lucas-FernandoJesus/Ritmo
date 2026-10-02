# Integração semanal de nutrição, treino e orçamento

Estado: implementação concluída em 01/10/2026.

## Estado atual

A área **Nutrição** já possui:

- plano alimentar inicial somente para consulta;
- registro persistente de peso e cintura;
- média móvel de peso dos últimos 7 dias comparada aos 7 anteriores;
- diário persistente de quatro refeições por dia;
- resultados de refeição `com proteína`, `sem proteína` e `não comi`;
- histórico recente, funcionamento offline e inclusão em backup/restauração.

O IndexedDB está na versão **7**, com as stores `bodyMeasurements` e
`mealLogs`. Backups anteriores continuam válidos porque as duas coleções
são opcionais durante a importação.

## Tarefa executada

### Objetivo

Criar, dentro da área Nutrição, uma visão semanal que reúna as tendências
de medidas, refeições, treinos e gastos alimentares já registrados. A visão
deve ajudar a decidir se o plano precisa ser mantido ou revisto, sem afirmar
causalidade e sem transformar ausência de histórico em zero.

### Escopo permitido

1. Comparar os últimos 7 dias completos com os 7 dias anteriores.
2. Exibir tendência de peso somente quando ambos os períodos possuírem dados.
3. Resumir refeições registradas, refeições com proteína e refeições não
   realizadas, deixando explícita a cobertura do diário.
4. Resumir treinos planejados e concluídos a partir de snapshots e conclusões
   existentes; não criar um segundo registro de treino.
5. Mostrar gastos observados na categoria `Alimentação` usando a fonte
   financeira canônica já existente.
6. Apresentar sinais descritivos, como “dados ainda insuficientes”, “tendência
   estável” ou “vale revisar a rotina”, sem diagnóstico ou prescrição.
7. Manter funcionamento offline, temas claro/escuro, acessibilidade e largura
   mínima de 320 px.

### Fora de escopo

- estimar calorias ou nutrientes a partir do texto das observações;
- definir peso-alvo ou estabelecer meta calórica automática;
- concluir que uma refeição ou treino causou mudança de peso;
- criar gastos alimentares novos ou duplicar registros do Financeiro;
- alterar o planejamento de treinos;
- adicionar suplementos, dietas terapêuticas ou aconselhamento clínico;
- criar uma nova store no IndexedDB, salvo necessidade demonstrada e nova
  autorização.

## Fontes de dados

| Informação | Fonte existente | Regra |
| --- | --- | --- |
| Peso e cintura | `bodyMeasurements` | Comparar períodos equivalentes; um registro por data. |
| Refeições | `mealLogs` | Ausência é “não registrado”, nunca “não comi”. |
| Treinos | `dailySnapshots` + `completions` | Usar somente atividades classificadas como treino. |
| Gastos alimentares | domínio financeiro | Usar registros canônicos da categoria `Alimentação`; evitar dupla contagem com despesas legadas. |

Antes de implementar o item financeiro, identificar no domínio atual qual
coleção já é tratada como fonte canônica pela tela Financeiro. Não somar
`expenses` e `financialRecords` sem essa verificação.

## Regras de apresentação

- Abrir com uma frase de situação semanal, não com uma pontuação de saúde.
- Informar cobertura: quantos dias possuem peso, refeições e treino registrados.
- Mostrar “sem dados suficientes” quando um período não permitir comparação.
- Distinguir dado observado, meta planejada e interpretação.
- Usar linguagem neutra, sem “dia bom”, “dia ruim”, culpa ou compensação.
- Recomendar manter o plano quando a tendência estiver dentro do esperado;
  qualquer mudança deve continuar pequena e depender de pelo menos duas
  semanas comparáveis.

## Critérios de conclusão

1. A visão semanal abre dentro de Nutrição sem nova navegação principal.
2. Períodos e médias possuem testes unitários com valores calculados à mão.
3. Histórico ausente aparece como “sem dados”, não zero.
4. Treinos futuros ficam fora do realizado.
5. Gastos não são duplicados entre fontes financeiras.
6. A tela funciona após recarregar e em modo offline.
7. Testes relacionados, suíte unitária, lint, typecheck, build e revisão visual
   em claro/escuro e 320 px passam antes do handoff.

## Sequência sugerida

1. Escrever testes para agregação semanal e cobertura dos dados.
2. Implementar seletores puros que recebam as coleções existentes.
3. Integrar os dados à `NutritionView` sem nova persistência.
4. Criar o resumo visual e os estados insuficientes.
5. Validar ausência de dupla contagem financeira.
6. Executar verificação completa e atualizar este documento se decisões
   arquiteturais mudarem.

## Implementação

- `src/features/nutrition/weekly-summary.ts` calcula dois períodos completos
  de sete dias sem incluir hoje; `weekly-summary.test.ts` confere limites,
  médias, cobertura, conclusões de treino e ausência de dados.
- `NutritionView` mostra o resumo no início da área Nutrição, com valores
  observados e cobertura explícita. Não atribui causa às mudanças.
- O teste de navegador cobre duas semanas preenchidas, gastos das duas fontes
  financeiras canônicas e recarga offline, além dos estados vazios.
- Os gastos são filtrados dos movimentos canônicos do Financeiro, incluindo
  despesas legadas e registros financeiros realizados, sem somar diretamente
  as duas coleções outra vez. Ausência de lançamento aparece como sem dados.
- A implementação utiliza apenas as coleções já existentes, sem alterar
  IndexedDB, migrações ou backup.

## Verificação

- Lint e typecheck aprovados.
- Suíte unitária: 213 testes aprovados.
- Build e suíte E2E no Edge: 81 testes aprovados.
- Capturas da tela Nutrição revisadas em claro e escuro, incluindo 320 px;
  sem rolagem horizontal nessa largura.
