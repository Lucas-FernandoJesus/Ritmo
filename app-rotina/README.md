# Ritmo

PWA local-first para acompanhar uma rotina pessoal no celular. Funciona sem conta ou servidor, grava em IndexedDB e pode ser usada offline depois da primeira visita.

[Visão geral do repositório](../README.md).

## Organização do código

`src/features/` agrupa Financeiro, Dashboard, rotina e treinos com seus testes. `src/core/` contém modelos e regras compartilhadas; `src/infrastructure/` concentra persistência e serviço offline; `src/components/` mantém componentes reutilizáveis. Consulte o [mapa completo de pastas](../docs/estrutura.md) e o [sistema visual](../docs/design-system/ritmo/MASTER.md).

## Executar

```bash
npm ci
npm run dev
```

Para validar e gerar a versão de produção:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run preview -- --host
```

Abra o endereço exibido pelo Vite. Em `localhost`, a instalação pode ser testada no próprio computador pelo menu **Instalar app** do navegador.

## Publicar no GitHub Pages e instalar no celular

O projeto inclui um fluxo em `.github/workflows/pages.yml` que valida, compila e publica `dist` ao receber alterações na branch `main`. Depois de enviar este código para um repositório GitHub, abra **Settings → Pages → Build and deployment → Source** e escolha **GitHub Actions**. O endereço será `https://USUARIO.github.io/REPOSITORIO/` para um repositório comum, ou `https://USUARIO.github.io/` para um repositório com esse nome. O build detecta automaticamente esses dois formatos. Se usar domínio próprio na raiz, defina a variável de repositório `RITMO_BASE_PATH` como `/` em **Settings → Secrets and variables → Actions → Variables**.

Abra o endereço publicado no navegador do celular **com internet uma vez** e aguarde o carregamento. No Android, use o menu do Chrome → **Instalar app**. No iPhone, use o Safari → **Compartilhar** → **Adicionar à Tela de Início**. Antes de depender do modo offline, abra o ícone instalado uma vez e teste com o modo avião ativado. Depois da instalação e do cache inicial, as telas e os registros locais funcionam sem rede. Atualizações do aplicativo exigem uma nova conexão. A primeira instalação exige HTTPS; um endereço HTTP da rede local não oferece a mesma instalação offline.

Os dados ficam no IndexedDB do navegador de cada aparelho: não são enviados ao GitHub e não sincronizam automaticamente. Apagar os dados do navegador pode removê-los. Faça backups JSON regularmente. O site e os arquivos publicados pelo GitHub Pages são públicos; não inclua backups ou informações pessoais no repositório.

## Navegação

O rodapé mantém somente **Menu**. Ao abrir, a lista vertical ocupa toda a tela e apresenta Hoje, Semana, Treinos, Nutrição, Registros, Financeiro, Progresso e Ajustes. Escolher uma opção navega sem recarregar; o X ou Esc fecha mantendo a tela atual. O diálogo controla foco, bloqueia o fundo e funciona offline nos dois temas.

## Backup

Em **Ajustes**, selecione **Exportar backup JSON**. Guarde o arquivo fora do aparelho. Para restaurar, use **Importar backup JSON**; o formato e a versão são validados antes da confirmação. Backups novos incluem os snapshots diários usados no progresso semanal, enquanto backups antigos sem esse campo continuam aceitos.

## Nutrição

A tela apresenta o objetivo escolhido de déficit de 20% como **meta em calibração**: ingestão de referência igual a 0,8 vezes o gasto de manutenção, ainda não medido. Mostra refeições práticas ligadas a força e Muay Thai, registros de peso e cintura e um diário qualitativo de quatro refeições. O resumo semanal compara os últimos sete dias completos aos sete anteriores usando somente medidas, refeições, treinos e gastos alimentares registrados. Ausência de histórico aparece como **Sem dados**; a comparação não atribui causa às mudanças. O diário não calcula calorias e nenhuma meta calórica, porção ou peso-alvo é fixada a partir de dados insuficientes. Os registros são locais, funcionam offline e entram no backup. O método de calibração e as refeições por dia estão em [alimentação e marmitas](../docs/rotina/07_alimentacao_e_marmitas.txt).

## Financeiro

**Visão geral** reúne o resumo do período, alertas e histórico unificado. **Registrar** abre quatro intenções: Entrada, Saída, A receber e A pagar. Novas saídas manuais são despesas; entradas e valores em aberto usam registros financeiros. Receber ou pagar atualiza o mesmo registro, sem criar cópia. Turnos continuam sendo cadastrados em **Registros > Delivery**; o atalho **Registros > Despesas** abre o mesmo cadastro de Saída do Financeiro.

As áreas internas separam **Planejamento** (metas, orçamentos, recorrências e parcelas), **Patrimônio** (contas e transferências), **Análises** (comparações, projeção e detalhes do delivery) e **Ferramentas** (fechamento mensal, simulador e exportações CSV, Excel e PDF). Ocorrências planejadas só viram lançamentos quando confirmadas e não se duplicam nas projeções. O IndexedDB atual está na versão 7, preserva dados antigos e inclui as estruturas novas no backup; não há backend ou sincronização externa.

O Financeiro consolida automaticamente receitas e custos dos turnos, despesas e movimentações avulsas. O histórico oferece filtros por período, tipo, categoria, origem e status, além de busca por descrição. Hoje, semana civil, mês civil, ano civil e período personalizado atualizam o resumo e as análises. **Progresso** mostra um resumo financeiro correspondente ao mês ou ano selecionado na Dashboard.

Metas têm progresso automático; orçamentos mensais acompanham o consumo por categoria ou custo específico do delivery. Comparações e tendências distinguem histórico ausente de zero. O fluxo dos próximos 7, 15 e 30 dias separa saldo realizado e projeção, incluindo alertas de vencimento e risco de saldo negativo. Delivery mostra bruto, despesas pagas, líquido operacional e resultado após reserva, além de taxas por hora, médias, custos e comparações de turnos. Metas e orçamentos são planejamento, nunca movimentações. A Dashboard destaca uma meta e os alertas prioritários. Tudo permanece offline, com backup compatível com versões anteriores.

O saldo é entradas recebidas menos saídas pagas no período; não inclui saldo inicial de conta, créditos, pendências nem datas futuras. Sem registros realizados, aparece **Sem dados**. A reserva de manutenção do delivery permanece uma previsão: reduz a renda líquida estimada e aparece como valor reservado, sem simular um pagamento. Despesas adicionais entram no resultado do delivery quando vinculadas explicitamente a um turno; não registre novamente um gasto já informado nele.

O turno calcula as horas automaticamente pelo início e fim, inclusive após a meia-noite. Todos os campos monetários usam máscara brasileira durante a digitação: `123456` vira `R$ 1.234,56`, persistido como número `1234.56`. Os backups incluem os novos lançamentos, e a atualização do IndexedDB preserva as coleções anteriores. Consulte [a arquitetura e as regras financeiras](../docs/financeiro.md).

Para executar os testes no Edge instalado, sem baixar o Chromium do Playwright:

```bash
npm run test:e2e -- --config=playwright.edge.config.ts --workers=2
```

`node scripts/visual-review.mjs` executa essa mesma suíte e gera as capturas em `test-results/`, sem exigir um navegador aberto manualmente.

## Progresso automático

Ao abrir a aplicação, o Ritmo salva no IndexedDB um snapshot das atividades previstas de segunda a domingo e do modo aplicável. Mudanças de modo atualizam somente o dia atual e os dias seguintes; dias anteriores permanecem associados ao planejamento que estava registrado.

Atividades fixas e flexíveis contam como obrigatórias. Um dia é concluído quando todas elas estão marcadas como concluídas; atividades opcionais não bloqueiam e atividades puladas não contam. O indicador semanal soma os dias e as atividades obrigatórias de segunda-feira até hoje, sem antecipar os dias futuros, e compara o mesmo trecho da semana anterior quando há histórico. O plano inicial de 30 dias e a semana do treino continuam manuais.

Registros de estudo, delivery e despesa podem oferecer a conclusão da atividade correspondente quando há um único vínculo aplicável. A confirmação é sempre explícita e uma atividade já concluída não é oferecida novamente.

## Consultar o treino do dia

Em **Hoje** ou **Semana**, a atividade de segunda/quarta abre o Muay Thai técnico, terça abre o fortalecimento A, quinta abre o fortalecimento B e sexta abre o Muay Thai leve opcional. A aba **Treinos** reúne esses quatro acessos e a escolha manual da semana do plano; **Progresso** mostra o andamento semanal e o checklist de 30 dias. O botão de retorno e o Voltar do navegador devolvem à tela anterior. Os endereços `?treino=A`, `?treino=B`, `?treino=muay-mon` e `?treino=muay-fri` também abrem as sessões diretamente.

O condicionamento mais intenso usa os rounds já previstos de Muay Thai: adaptação técnica nas semanas 1–4, no máximo uma manhã condicional nas semanas 5–7 e até duas nas semanas seguintes quando a recuperação e a técnica permitirem. As semanas de consolidação e a sexta opcional continuam leves. Os treinos A e B não são substituídos pelo cardio.

A tela segue a semana e o modo Normal, Reduzido ou Mínimo salvos no aparelho. Cada movimento de fortalecimento mostra a prescrição do plano, um exemplo prático em português e um link individual que abre o YouTube em outra aba. As práticas de Muay Thai são opções dentro dos rounds existentes, com instruções adaptadas e trechos das aulas pesquisadas. As fontes de Muay tiveram conteúdo verbal verificado; detalhes visuais dos trechos ainda devem ser conferidos no vídeo antes de copiar a técnica. As instruções continuam disponíveis offline; os vídeos exigem conexão. Os catálogos ficam em `src/features/training/exercise-demos.ts` e `src/features/training/muay-exercises.ts`, com pesquisa e limitações documentadas em `docs/muay-thai/`.

## Fontes e destinos

| Fonte | Dados e telas |
|---|---|
| `docs/rotina/00_LEIA_PRIMEIRO.txt` | prioridades, modos reduzido/mínimo e linguagem geral |
| `docs/rotina/01_perfil_e_objetivos.txt` | contexto, trabalho, objetivos e segurança |
| `docs/rotina/02_rotina_segunda_a_sexta.txt` | Hoje e Semana nos dias úteis |
| `docs/rotina/03_treino_muay_thai_matinal.txt` | treino técnico, condições e alertas |
| `docs/rotina/04_fortalecimento_e_cuidados_com_braco.txt` | treino leve, checagem e segurança |
| `docs/rotina/05_escala_delivery_escolhida.txt` | turnos opcionais e alertas de pilotagem |
| `docs/rotina/06_rotina_sabado_e_domingo.txt` | agenda do fim de semana |
| `docs/rotina/07_alimentacao_e_marmitas.txt` | refeições e checklist de marmitas |
| `docs/rotina/08_estudos_e_leitura.txt` | agenda e registros de estudo |
| `docs/rotina/09_financas_e_controle_delivery.txt` | despesas, turnos e cálculos estimados |
| `docs/rotina/10_limpeza_e_organizacao_da_casa.txt` | manutenção diária e checklist doméstico |
| `docs/rotina/11_sono_jogos_e_celular.txt` | sono, lazer e preparação noturna |
| `docs/rotina/12_plano_30_dias_e_checklist.txt` | Progresso e modos da rotina |
| `docs/muay-thai/` | Inventário das quatro playlists, fichas das aulas verificadas e proposta pedagógica usada na tela de Muay Thai; parte do plano editorial permanece para revisão visual |

Cada atividade padrão conserva `sourceFile` como caminho relativo à raiz do repositório em `docs/rotina/`. Backups antigos podem conservar apenas o nome do arquivo; os IDs das atividades permanecem iguais. A camada `repository.ts` concentra o acesso local para permitir uma implementação futura de sincronização sem reescrever as telas.

As instruções gerais exibidas ao tocar nas outras atividades ficam em `src/features/routine/activity-guides.ts`, incorporadas ao aplicativo para funcionar offline. A evolução dos exercícios durante 24 semanas fica estruturada em `src/features/training/training-plan.ts`; a semana atual é uma preferência local incluída no backup, sem substituir o checklist inicial de 30 dias. As descrições gerais dos movimentos do fortalecimento foram conferidas com orientações de [exercícios de força do NHS](https://www.nhs.uk/live-well/exercise/strength-exercises/), [exercícios em pé do University Hospitals Sussex NHS Foundation Trust](https://www.uhsussex.nhs.uk/resources/standing-exercises-2/), [fortalecimento do quadril do Cambridge University Hospitals NHS Foundation Trust](https://www.cuh.nhs.uk/patient-information/hip-strengthening-exercises/), [atividade física para adultos do CDC](https://www.cdc.gov/physical-activity-basics/guidelines/adults.html) e [recuperação de fraturas do antebraço da AAOS](https://orthoinfo.aaos.org/en/diseases--conditions/adult-forearm-fractures/); séries, progressões e critérios de segurança continuam alinhados ao arquivo `04_fortalecimento_e_cuidados_com_braco.txt`.

A pesquisa de Muay Thai está em [docs/muay-thai/pesquisa-e-plano.md](../docs/muay-thai/pesquisa-e-plano.md). O [inventário](../docs/muay-thai/inventario.md) registra todas as posições e limitações de acesso, e as [fichas](../docs/muay-thai/fichas.md) preservam as observações por vídeo verificado. A tela de Muay usa práticas selecionadas dessa pesquisa; rounds, duração e limites continuam definidos pelo plano de 24 semanas.
