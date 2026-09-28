# Regras permanentes do repositório

## Estrutura e coordenação

- `app-rotina` contém a aplicação React; `docs` contém regras e documentação do produto.
- Execute comandos npm dentro de `app-rotina`.
- O agente principal é o único editor e integrador. Subagentes, quando usados, limitam-se a inspeção ou revisão com entregas delimitadas.
- Nunca permita edições concorrentes nos mesmos arquivos.

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
