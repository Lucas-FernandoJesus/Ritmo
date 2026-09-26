# Ritmo — sistema de interface

## Direção

Uma agenda pessoal de caráter editorial, sobre preto-carvão e nogueira envernizada. A madeira é ambiente, não suporte direto para dados: aparece no fundo com baixa opacidade e em cabeçalhos compactos protegidos por uma camada escura. O foco do dia é o elemento principal. A aplicação permanece local, acessível e inteiramente em português brasileiro.

## Tokens

| Papel | Escuro (padrão) | Claro (opcional) |
| --- | --- | --- |
| Fundo | `#12100F` | `#EEE7DD` |
| Superfície | `#211C19` | `#F9F5ED` |
| Superfície sutil | `#302822` | `#E9DFD1` |
| Campo | `#181513` | `#FFFCF6` |
| Texto | `#F5EEE5` | `#27211C` |
| Texto secundário | `#C5B9AC` | `#65584D` |
| Ação primária | `#D5B592` | `#68452E` |
| Destaque | `#D6A27D` | `#874F35` |
| Erro | `#EDAAA1` | `#9D443C` |
| Painel de foco | `#3A281F` | `#3A261C` |

- Corpo: `Segoe UI Variable`, `Segoe UI`, sistema. Títulos e marca: `Georgia`, `Cambria`, serif. Sem fontes externas nem dependência de rede.
- Escala tipográfica: 13, 14, 16, 18, 24 e 32 px. Corpo 16 px, entrelinha 1,5. Valores e horários usam algarismos tabulares.
- Espaçamento: base de 4 px; passos principais 8, 12, 16, 24, 32 e 40 px.
- Raios: 8 px em campos, 12 px em botões, 18 px em painéis. Pílulas apenas em estados e filtros.
- Superfícies: base escura; cartões sólidos; painel de foco em marrom profundo. A textura fotográfica fica atrás do conteúdo, não dos campos. Sombra somente na navegação fixa e em avisos.
- Ícones: SVG linear de 24 px com traço de 1,8 px; rótulos sempre visíveis na navegação.
- Botões: primário preenchido, secundário contornado, textual e perigoso separado. Alvos de no mínimo 44 px.
- Campos: rótulo persistente, controle mínimo de 48 px, erro contextual e foco visível.
- Estados: texto e forma para concluído, em aberto e impedido; nenhuma cor classifica Normal, Reduzido e Mínimo como mérito.
- Movimento: feedback de 160–220 ms para ação do usuário; respeitar `prefers-reduced-motion`.
- Navegação: cinco destinos fixos no rodapé em celular, com área segura; largura de leitura limitada em telas maiores.
- Orientações da rotina: a área de título e horário abre um diálogo nativo em formato de folha inferior para atividades gerais; concluir e pular permanecem botões independentes. O diálogo traz instruções em sequência, cuidados e fechamento visível, com foco contido e tecla Escape. O fortalecimento abre uma tela própria para o treino A ou B da semana atual, com retorno previsível, instruções offline e links externos de demonstração por movimento.

## Composição

```text
topo sólido escuro — marca / estado local
cabeçalho baixo com foto de nogueira — data / título
seletor de ritmo — três opções equivalentes
painel de foco — próxima ação e horário
linha do tempo — rotina restante
navegação fixa escura — cinco destinos
```

As demais telas repetem o cabeçalho fotográfico sem ampliar a altura. Semana favorece orientação, Registros mantém formulários e valores em superfícies opacas, Progresso usa marcos neutros e Ajustes agrupa controles. No tema claro, as imagens continuam como detalhe sobre papel quente; cabeçalhos permanecem escuros para garantir contraste.

## Revisão da direção

A pesquisa da UI/UX Pro Max trouxe padrões de landing page, glassmorphism e acentos frios, incompatíveis com um aplicativo diário. Foram aproveitados os critérios de contraste, alvos de toque, foco, responsividade e redução de movimento. A direção própria combina estética vintage discreta com ergonomia contemporânea. O ponto memorável é a nogueira iluminada no cabeçalho, não um efeito espalhado por cada componente.
