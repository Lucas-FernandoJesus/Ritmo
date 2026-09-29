# Regras permanentes do repositório

## Estrutura e coordenação

- `app-rotina` contém a aplicação React; `docs` contém regras e documentação do produto.
- Em `app-rotina/src`, agrupe módulos e testes por funcionalidade em `features`; use `core` para regras/modelos compartilhados, `infrastructure` para persistência e `components` para UI reutilizável. Consulte `docs/estrutura.md`.
- Mantenha a documentação visual em `docs/design-system`, skills locais em `.agents/skills` na raiz e o respectivo `skills-lock.json` na raiz.
- Para skills do Ritmo, consulte `.agents/skills/README.md` e priorize a cópia local correspondente à tarefa. Preserve recursos/licenças e atualize `.agents/skills/manifest.json` ao alterar uma skill; não carregue a coleção inteira de uma vez.
- Execute comandos npm dentro de `app-rotina`.
- O agente principal é o único editor e integrador. Subagentes, quando usados, limitam-se a inspeção ou revisão com entregas delimitadas.
- Nunca permita edições concorrentes nos mesmos arquivos.

## Execução por tarefas e economia de contexto

- Solicitações com mais de uma funcionalidade, área ou objetivo devem ser divididas antes da implementação em tarefas ordenadas e independentes. Cada tarefa deve declarar, de forma compacta, objetivo, escopo permitido, critério de conclusão, verificação e dependências.
- Execute uma tarefa por vez e não antecipe arquivos, documentação, testes ou decisões de tarefas seguintes. Cada etapa deve terminar funcional e verificável; não separe mudanças fortemente acopladas se isso deixar o projeto quebrado.
- Se uma solicitação ampla não vier dividida, converta-a em um backlog numerado e execute somente a primeira tarefa segura e coerente. Continue sem nova confirmação quando a sequência já estiver autorizada e não houver decisão material.
- Quando o usuário ou o sistema informar orçamento restante de até 20%, ative o modo econômico: priorize correções críticas e de maior valor; carregue apenas o contexto necessário; não use subagentes, pesquisa web, novas skills, dependências ou refatorações paralelas sem necessidade concreta; execute testes relacionados por tarefa e reserve suíte completa, build e revisão visual para a integração final, salvo risco que exija antecipação.
- Ao concluir cada tarefa no modo econômico, entregue um handoff curto com o que foi concluído, arquivos alterados, testes executados e próxima tarefa.
- Pare antes de mudanças de arquitetura, dados, dependências, ações destrutivas ou expansão de escopo. Não invente métricas de tokens; use somente o orçamento informado e referencie contexto já documentado em vez de repeti-lo.
- Economia de contexto nunca autoriza omitir testes essenciais, quebrar compatibilidade ou declarar conclusão sem evidência.

## Instalação e verificação

- `npm ci` está autorizado.
- Não adicione, remova ou atualize dependências sem autorização.
- Não modifique `package.json` ou `package-lock.json` para contornar falhas.
- Use TDD em funcionalidades e correções. Execute os testes relacionados e o build antes de declarar conclusão.

## Arquitetura e dados

- Preserve o funcionamento offline e a compatibilidade com dados existentes no IndexedDB.
- Não altere schema, migrações, backup ou restauração sem autorização.
- Não invente dados históricos ausentes.

## Dashboard

- Mensal e anual são períodos civis; datas futuras ficam fora do realizado.
- Histórico ausente significa “sem dados”, não zero.
- Somente atividades obrigatórias planejadas entram no percentual principal. Opcionais aparecem separadamente e atividades puladas não contam como concluídas.
- O checklist de 30 dias permanece separado.

### Categorias

- **Tarefas:** atividades gerais da rotina, excluindo treino e estudo quando essas classificações estiverem disponíveis.
- **Treinos:** atividades classificadas como treino.
- **Estudos:** dados provenientes dos registros de estudo.
- **Delivery:** métricas operacionais, como turnos, horas, quilômetros, receita/hora e resultado/hora.
- **Renda:** visão financeira baseada no delivery, com receita bruta, custos registrados no turno e resultado estimado.
- Nunca chame o resultado estimado de “lucro líquido”. Nesta versão, não desconte despesas gerais da renda do delivery, evitando dupla contagem.

## Aparência

- Existem somente os modos Claro e Escuro. Valores antigos persistidos como `system` devem ser normalizados futuramente para o modo correspondente à preferência atual do dispositivo.
- Substitua o fundo amadeirado por um fundo abstrato estático feito em CSS, com gradientes discretos em teal e azul, cards legíveis e contraste mínimo de 4.5:1.
- Paleta clara: fundo `#F0F7F6`, cards `#FFFFFF`, texto `#134E4A`, primária `#0D9488`, destaque `#EA580C`.
- Paleta escura: fundo `#0F172A`, cards `#192134`, texto `#F8FAFC`, primária `#14B8A6`, destaque `#22C55E`.
- Não dependa somente de cores para transmitir significado.
