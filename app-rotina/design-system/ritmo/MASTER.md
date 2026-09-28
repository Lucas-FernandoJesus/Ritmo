# Ritmo — sistema de interface

## Direção

Uma agenda pessoal de caráter editorial, com fundo abstrato estático feito em CSS e gradientes discretos em teal e azul. Cards sólidos e legíveis protegem o conteúdo; o foco do dia é o elemento principal. A aplicação permanece local, acessível e inteiramente em português brasileiro.

## Tokens

| Papel | Escuro | Claro |
| --- | --- | --- |
| Fundo | `#0F172A` | `#F0F7F6` |
| Cards | `#192134` | `#FFFFFF` |
| Texto | `#F8FAFC` | `#134E4A` |
| Ação primária | `#14B8A6` | `#0D9488` |
| Destaque | `#22C55E` | `#EA580C` |

Existem somente os modos Claro e Escuro. Valores antigos persistidos como `system` devem ser normalizados futuramente para o modo correspondente à preferência atual do dispositivo. Tokens complementares devem manter contraste mínimo de 4.5:1 para texto normal.

- Corpo: `Segoe UI Variable`, `Segoe UI`, sistema. Títulos e marca: `Georgia`, `Cambria`, serif. Sem fontes externas nem dependência de rede.
- Escala tipográfica: 13, 14, 16, 18, 24 e 32 px. Corpo 16 px, entrelinha 1,5. Valores e horários usam algarismos tabulares.
- Espaçamento: base de 4 px; passos principais 8, 12, 16, 24, 32 e 40 px.
- Raios: 8 px em campos, 12 px em botões, 18 px em painéis. Pílulas apenas em estados e filtros.
- Superfícies: cards sólidos e legíveis sobre fundo abstrato estático em CSS, com gradientes discretos em teal e azul. Não usar fotografia. Sombra somente na navegação fixa e em avisos.
- Ícones: SVG linear de 24 px com traço de 1,8 px; rótulos sempre visíveis na navegação.
- Botões: primário preenchido, secundário contornado, textual e perigoso separado. Alvos de no mínimo 44 px.
- Campos: rótulo persistente, controle mínimo de 48 px, erro contextual e foco visível.
- Estados: texto e forma para concluído, em aberto e impedido; nenhuma cor classifica Normal, Reduzido e Mínimo como mérito.
- Movimento: feedback de 160–220 ms para ação do usuário; respeitar `prefers-reduced-motion`.
- Navegação: seis destinos fixos no rodapé em celular, incluindo Treinos; largura de leitura limitada em telas maiores.
- Orientações da rotina: a área de título e horário abre um diálogo nativo em formato de folha inferior para atividades gerais; concluir e pular permanecem botões independentes. O diálogo traz instruções em sequência, cuidados e fechamento visível, com foco contido e tecla Escape. Fortalecimento e Muay Thai abrem telas próprias da semana atual, com retorno previsível, instruções offline e links externos por movimento.

## Composição

```text
topo sólido escuro — marca / estado local
cabeçalho baixo com fundo abstrato — data / título
seletor de ritmo — três opções equivalentes
painel de foco — próxima ação e horário
linha do tempo — rotina restante
navegação fixa escura — seis destinos
```

As demais telas repetem o cabeçalho abstrato sem ampliar a altura. Semana favorece orientação, Treinos reúne as sessões e a semana do plano, Registros mantém formulários e valores em superfícies opacas, Progresso usa marcos neutros e Ajustes agrupa controles. Nos modos Claro e Escuro, cards e cabeçalhos preservam contraste mínimo de 4.5:1 para texto normal.

## Revisão da direção

A pesquisa da UI/UX Pro Max orienta os critérios de contraste, alvos de toque, foco, responsividade e redução de movimento. A direção usa acentos frios discretos, gradientes estáticos e ergonomia contemporânea, sem espalhar efeitos que prejudiquem a leitura.
