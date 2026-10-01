# Contexto nutricional do Ritmo

Use esta referência somente dentro do repositório Ritmo. Os documentos do projeto são a fonte para horários e decisões já registradas; eles não substituem anamnese ou avaliação clínica.

## Leitura mínima por necessidade

- Visão geral, prioridades e segurança: `docs/rotina/00_LEIA_PRIMEIRO.txt`.
- Perfil e objetivos conhecidos: `docs/rotina/01_perfil_e_objetivos.txt`.
- Horários de trabalho, refeições e sono: `docs/rotina/02_rotina_segunda_a_sexta.txt`.
- Carga do Muay Thai: `docs/rotina/03_treino_muay_thai_matinal.txt`.
- Turnos e pausas do delivery: `docs/rotina/05_escala_delivery_escolhida.txt`.
- Plano atual de marmitas: `docs/rotina/07_alimentacao_e_marmitas.txt`.
- Categorias e controle financeiro: `docs/rotina/09_financas_e_controle_delivery.txt`.

Leia apenas os documentos relevantes ao pedido atual.

## Decisões preservadas

- Não estabelecer calorias ou peso-alvo antes de obter mais dados individuais.
- Emagrecimento deve ser gradual, sem dietas extremas e sem eliminar arroz e feijão por regra.
- A rotina prevê café da manhã após treino matinal, almoço no trabalho e jantar no início da noite; sexta e fim de semana exigem adaptação aos turnos de delivery.
- O preparo principal ocorre no domingo, com reposição curta na quarta. Planejamento deve considerar refrigeração, congelamento, transporte e desperdício.
- Sono e segurança para pilotar têm precedência sobre treino, delivery ou meta alimentar.
- Preços, ingestão, peso e histórico ausentes permanecem “sem dados”. Não invente números.

## Integração futura com o produto

Nutrição poderá dialogar com rotina, treinos e finanças, mas deve continuar um domínio identificável. Ao propor requisitos, diferencie:

- planejamento (refeições, preparo, compras e orçamento);
- registro observado (o que foi consumido e custo informado);
- estimativa (porções, nutrientes ou custo não comprovado);
- resultado acompanhado (tendências, não julgamento de um dia).

Preserve funcionamento offline e compatibilidade com IndexedDB. Não altere schema, migrações, backup/restauração ou persistência sem autorização explícita. Gastos alimentares não devem ser duplicados entre mercado, refeições e outras categorias financeiras.
