# Ritmo — sistema de interface

## Direção

O modo Claro adota a opção **Azul claro** escolhida pelo usuário: fundo plano azul muito suave, superfícies brancas, texto azul-escuro e azul forte reservado às ações e indicadores. Cabeçalhos baixos, listas com divisórias leves e um único painel de foco com filete azul deixam a rotina fácil de percorrer. Sem gradientes, imagens de fundo ou fontes externas no modo Claro. O modo Escuro permanece disponível com sua paleta anterior. A aplicação continua local e inteiramente em português brasileiro.

## Tokens

| Papel | Escuro | Claro |
| --- | --- | --- |
| Fundo | `#0F172A` | `#F4F8FF` |
| Cards | `#192134` | `#FFFFFF` |
| Texto | `#F8FAFC` | `#172554` |
| Ação primária | `#14B8A6` | `#1D4ED8` |
| Destaque secundário | `#22C55E` | `#315D85` |

Existem somente os modos Claro e Escuro. Instalações novas começam no Claro; uma preferência já salva continua valendo. Ao carregar um valor antigo `system`, o aplicativo usa a preferência atual do dispositivo e salva o modo explícito correspondente. Tokens complementares devem manter contraste mínimo de 4.5:1 para texto normal.

- Corpo, títulos e marca: `Segoe UI Variable`, `Segoe UI`, sistema, sem serifa. Sem fontes externas nem dependência de rede.
- Escala tipográfica: 13, 14, 16, 18, 24 e 32 px. Corpo 16 px, entrelinha 1,5. Valores e horários usam algarismos tabulares.
- Espaçamento: base de 4 px; passos principais 8, 12, 16, 24, 32 e 40 px.
- Raios: 8 px em campos, 12 px em botões, 18 px em painéis. Pílulas apenas em estados e filtros.
- Superfícies: no Claro, fundo plano `#F4F8FF`, cards brancos e bordas azul-acinzentadas discretas; o painel de foco tem filete azul. Sem fotografia. Sombra somente na navegação fixa e em avisos. O Escuro conserva seus gradientes estáticos.
- Ícones: SVG linear de 24 px com traço de 1,8 px; rótulos sempre visíveis na navegação.
- Botões: primário preenchido, secundário contornado, textual e perigoso separado. Alvos de no mínimo 44 px.
- Campos: rótulo persistente, controle mínimo de 48 px, erro contextual e foco visível.
- Estados: texto e forma para concluído, em aberto e impedido; nenhuma cor classifica Normal, Reduzido e Mínimo como mérito.
- Movimento: feedback de 160–220 ms para ação do usuário; respeitar `prefers-reduced-motion`.
- Navegação: o botão Menu fica no cabeçalho no celular e flutua no desktop. Ele abre um diálogo modal de tela inteira com três grupos de destinos — Rotina, Saúde e Trabalho e dinheiro —, Ajustes global e ações rápidas para Entrada e Saída. Cada área tem navegação local com seus destinos. Fechar por X ou Esc preserva a tela e retorna o foco; escolher uma opção fecha e direciona o foco ao conteúdo. Safe areas, rolagem local e bloqueio do fundo valem do mobile ao desktop. Largura de leitura limitada em telas maiores.
- Orientações da rotina: a área de título e horário abre um diálogo nativo em formato de folha inferior para atividades gerais; concluir e pular permanecem botões independentes. O diálogo traz instruções em sequência, cuidados e fechamento visível, com foco contido e tecla Escape. Fortalecimento e Muay Thai abrem telas próprias da semana atual, com retorno previsível, instruções offline e links externos por movimento.

## Composição

```text
topo branco no Claro — marca / estado local
cabeçalho branco e baixo no Claro — data / título
seletor de ritmo — três opções equivalentes
painel de foco — próxima ação e horário
linha do tempo — três próximos itens; expansão explícita para o dia inteiro
navegação — botão Menu; três áreas no diálogo e destinos locais na tela
```

As demais telas repetem o cabeçalho sem ampliar a altura. Semana favorece orientação, oferece busca textual por título ou categoria e reúne os checklists de preparo do fim de semana. Treinos reúne as sessões e a semana do plano. Estudos e Delivery têm entradas diretas em áreas diferentes; Delivery encaminha despesas ao Financeiro. Progresso usa marcos neutros e mantém o plano inicial de 30 dias separado do Dashboard. Ajustes agrupa controles e um lembrete local com limitação operacional explícita. Nos modos Claro e Escuro, cards e cabeçalhos preservam contraste mínimo de 4.5:1 para texto normal.

Financeiro reutiliza as superfícies, campos e indicadores de Registros e Progresso. Na Visão geral móvel, período, orientação inicial e resumo precedem a navegação das áreas secundárias; assim, os números prioritários permanecem na primeira tela. Delivery tem uma faixa própria de estimativas. Cadastro e histórico ficam em duas colunas no desktop e em sequência no celular. Análises ficam recolhidas inicialmente. Tipos usam texto e bordas distintas além de cor; filtros, valores e listas permanecem legíveis desde 320 px. Os campos monetários compartilham a mesma máscara brasileira, e os rótulos têm nomes acessíveis separados dos textos de ajuda.

Planejamento financeiro usa listas de metas e orçamentos em duas colunas, empilhadas no mobile, com progresso numérico e estados escritos além de cor. Formulários aparecem por ação explícita. Comparação, projeção e métricas detalhadas ficam em disclosures, mantendo cinco cards principais. Alertas são agrupados e exibem até três itens inicialmente; a Dashboard usa até dois. Tabelas financeiras têm rolagem local, foco de teclado e captions. Gráficos SVG reutilizam os tokens e oferecem tabelas de dados; o fluxo diferencia barras cheias e contornadas. Projeções são identificadas como estimativas dos compromissos cadastrados e não compartilham o card de saldo realizado.

## Revisão da direção

A pesquisa da UI/UX Pro Max orienta os critérios de contraste, alvos de toque, foco, responsividade e redução de movimento. A prévia [Azul claro](./previa-paletas-2.png) orienta a proporção de cor do modo Claro: muita área clara, texto escuro e poucos pontos de azul forte. A miniatura ilustra a linguagem visual, não o conteúdo literal da tela Hoje.

Planejar próximos passos reúne recorrências/parcelas, patrimônio, fechamento, simulação e exportações em seções selecionáveis. Planejamento não confirmado permanece explicitamente separado de valores realizados. Todos os inputs monetários usam MoneyInput. Transferências e saldos iniciais não usam cores ou rótulos de receita/despesa.
