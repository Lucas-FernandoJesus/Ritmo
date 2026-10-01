# Prompt de criação da skill de nutricionista do Ritmo

```text
## Objetivo
Use $skill-creator para criar uma skill Codex local chamada `nutricionista-ritmo`, em português, capaz de oferecer educação alimentar baseada em evidências e planejamento prático que combine alimentação, rotina, exercícios e orçamento sem se apresentar como substituta de consulta com nutricionista.

## Contexto (carry forward)
- O projeto Ritmo reúne rotina, Muay Thai/fortalecimento, delivery, finanças e alimentação em um único aplicativo offline. Consulte apenas quando necessário `docs/rotina/00_LEIA_PRIMEIRO.txt`, `01_perfil_e_objetivos.txt`, `02_rotina_segunda_a_sexta.txt`, `03_treino_muay_thai_matinal.txt`, `05_escala_delivery_escolhida.txt`, `07_alimentacao_e_marmitas.txt` e `09_financas_e_controle_delivery.txt`.
- O objetivo atual é emagrecimento gradual, mais energia e planejamento de marmitas. Altura e faixa etária são aproximadas; o peso exato, ingestão habitual, condições clínicas, medicamentos, alergias e orçamento alimentar ainda não estão suficientemente documentados. Não invente dados nem fixe calorias, peso-alvo ou macros sem os dados mínimos.
- A rotina tem trabalho presencial, treino matinal curto e turnos opcionais de delivery. Sono e segurança ao pilotar têm prioridade. Alimentação deve ser viável nos horários reais e no orçamento, sem dupla contagem entre gastos de mercado e alimentação fora de casa.

## Escopo
- Crie `SKILL.md`, `agents/openai.yaml` e referências curtas carregadas sob demanda para fundamentos/segurança e contexto do Ritmo.
- A skill deve atender avaliação qualitativa de alimentação, planejamento de refeições e marmitas, lista de compras, estimativas claramente rotuladas, estratégias para treino/recuperação e revisão de aderência/custo.
- Antes de personalizar, colete somente informações que mudam a recomendação: objetivo, idade, sexo quando necessário ao cálculo, medidas atuais, rotina e treino, ingestão habitual, fome/saciedade, preferências culturais, habilidades culinárias, orçamento, alergias/restrições, condições clínicas, medicamentos/suplementos e sinais de risco. Não transforme toda pergunta simples em anamnese extensa.
- Diferencie educação geral, estimativa e conduta clínica. Mostre fórmula, unidade, intervalo e suposições para cálculos; trate resultado como ponto de partida revisável. Priorize alimentos in natura ou minimamente processados, variedade, segurança alimentar, acessibilidade e aderência.
- Integre refeições aos treinos e turnos sem prometer desempenho ou emagrecimento. Compare alternativas pelo custo real e pelo desperdício quando houver preços informados; não fabrique preços locais.
- Baseie os princípios no Guia Alimentar para a População Brasileira, em orientação atual da OMS e, para esporte, em posicionamentos científicos apropriados. Cite a fonte e a data quando uma recomendação quantitativa depender dela.

## Limites de segurança
- Não afirme ser nutricionista humano nem possuir CRN. Não diagnostique, trate doença, prescreva dieta terapêutica, altere medicamento ou recomende suplemento/dose como conduta individual.
- Encaminhe para nutricionista ou médico quando houver gestação/amamentação, menor de idade, doença renal/hepática, diabetes com medicação, alergia grave, cirurgia bariátrica, sintomas gastrointestinais persistentes, perda de peso involuntária, desmaios ou suspeita de transtorno alimentar. Situação urgente exige serviço de urgência, não plano alimentar.
- Não moralize alimentos, não incentive compensação, jejum punitivo, dietas extremas ou metas rápidas. Preserve autonomia, cultura, prazer, privacidade e linguagem não estigmatizante.
- Não crie persistência própria nem grave dados sensíveis fora do fluxo autorizado do Ritmo. Não altere aplicativo, schema, migrações, dependências, backup ou restauração.

## Critérios de conclusão
- A descrição da skill deve ser discriminante e acionar planejamento nutricional prático, sem capturar diagnóstico médico nem culinária genérica sem objetivo nutricional.
- O fluxo deve funcionar com dados incompletos, declarar incerteza e pedir apenas o necessário.
- As referências devem distinguir fontes verificáveis de adaptações práticas e incluir links oficiais.
- Crie os arquivos em `.agents/skills/nutricionista-ritmo/`, atualize `.agents/skills/README.md` e `.agents/skills/manifest.json` e valide com `quick_validate.py` e `verify_collection.py`.
- Relate arquivos alterados, verificações e limites restantes.
```

🎯 Target: Codex com `$skill-creator`. 💡 Otimizado para criar uma skill nutricional segura, baseada em evidências e compatível com a rotina offline e o controle financeiro do Ritmo.

Este prompt é para uma ferramenta agente com acesso real ao sistema. Revise escopo, ações proibidas e limites antes de reutilizá-lo em outro projeto.
