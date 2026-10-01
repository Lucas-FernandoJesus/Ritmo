# Prompt de criação da skill de professor de Muay Thai

🎯 Target: Codex com `$skill-creator`. 💡 O pedido delimita ensino de Muay Thai, fontes verificáveis, progressão e instalação global sem misturar diagnóstico clínico com orientação técnica.

```text
## Objetivo
Use $skill-creator para criar e instalar globalmente uma skill Codex chamada `muay-thai-professor`, capaz de atuar como professor de Muay Thai em português, com ensino técnico progressivo, adaptação da sessão, análise de execução e feedback verificável.

## Contexto (carry forward)
- No projeto Ritmo, consulte AGENTS.md, docs/rotina/03_treino_muay_thai_matinal.txt, docs/muay-thai/pesquisa-e-plano.md, inventario.md, fichas.md e docs/muay-thai/transcricoes/README.md. Há 127 legendas originais salvas por ID de vídeo, quatro vídeos públicos sem fala aproveitável e 12 vídeos de membros inacessíveis.
- O Ritmo já tem sessões curtas, rounds e progressão de 24 semanas. O usuário confirmou liberação para todas as modalidades e ausência de restrição específica; impacto e potência do braço esquerdo devem progredir gradualmente, com dor como principal sinal de interrupção. Permanecem dois fios de Kirschner cuja retirada, segundo o usuário, ficou opcional. Não interprete o material nem sugira sua retirada.
- A skill global também deve servir fora do Ritmo. Só leia arquivos do Ritmo quando estiver nesse repositório; não dependa deles para funcionar em outros projetos.

## Escopo
- Crie SKILL.md com gatilho claro para aula, plano, correção de técnica, análise de vídeo e dúvidas de Muay Thai; não ative para coreografia de luta fictícia nem para conselho clínico.
- Inclua referências curtas e carregadas sob demanda para fundamentos, progressões e avaliação técnica. Separe habilidades: base/guarda, deslocamento/distância, socos, teep, chute circular, joelhos, cotovelos, check/defesa e clinch. Distinga sombra, saco, pads, parceiro e sparring; explicite pré-requisitos e erros observáveis.
- Ao ensinar, estabeleça objetivo, nível, ambiente e restrições conhecidas; proponha uma habilidade por vez, demonstração ou fonte, dose compatível, sinais observáveis de qualidade e critério para repetir, progredir ou regredir. Quando faltar contexto, faça no máximo as perguntas indispensáveis ou adote uma opção conservadora claramente declarada.
- Separe técnica demonstrada em fonte, adaptação pedagógica e hipótese. Legenda não prova gesto visual. Cite vídeo individual e tempo quando usar o acervo; use somente as fontes preservadas e não invente credenciais profissionais, laudos ou resultados.
- Trate dor aguda, piora neurológica, tontura ou sintomas inesperados como motivo para interromper a sessão e buscar avaliação apropriada. Não dê diagnóstico nem altere recomendações médicas. Impacto, clinch e sparring exigem contexto e supervisão adequados.

## Restrições
- Não altere o aplicativo, plano de treino persistido, schema, dependências ou outros projetos. Preserve os arquivos-fonte e licenças das skills existentes.
- Mantenha instruções operacionais e concisas; use referências para detalhes. A skill deve funcionar sem rede, com fontes locais quando disponíveis, e não prometer inspeção visual que não ocorreu.
- Crie a fonte da skill em `.agents/skills/muay-thai-professor/`, atualize o índice e manifesto da coleção local e instale uma cópia em `$CODEX_HOME/skills` (ou `~/.codex/skills`).

## Conclusão
- Valide com `quick_validate.py`, verifique a coleção local e teste dois casos de uso: iniciante sem equipamento e revisão de teep com texto sem vídeo. Confirme que a instalação global contém SKILL.md e referências. Relate arquivos alterados, verificações, cobertura das fontes e limitações remanescentes.
```

This prompt is for an agentic tool with real system access. Review the scope locks, forbidden actions, and stop conditions before pasting. Confirm file paths, directories, and permissions match the actual project.
