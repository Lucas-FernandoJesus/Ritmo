# Skills do Ritmo

Todas as skills usadas ou consultadas no projeto estão reunidas nesta pasta. Cada uma preserva seu próprio `SKILL.md`, recursos, scripts e licenças disponíveis. O índice é único; instruções distintas continuam separadas para manter a descoberta e carregar somente a skill relevante.

| Skill | Participação | Uso registrado |
| --- | --- | --- |
| [prompt-master](prompt-master/SKILL.md) | Aplicada | Prompts de criação das skills de Muay Thai e nutrição, preservados em `docs/` |
| [frontend-design](frontend-design/SKILL.md) | Aplicada | Identidade visual e componentes |
| [ui-ux-pro-max](ui-ux-pro-max/SKILL.md) | Aplicada | UI/UX, React, acessibilidade, temas, gráficos e formulários |
| [playwright-cli](playwright-cli/SKILL.md) | Aplicada como orientação | Validação com a suíte Playwright/Edge existente |
| [find-skills](find-skills/SKILL.md) | Aplicada | Avaliação das skills instaladas e necessidade de capacidades adicionais |
| [muay-thai-professor](muay-thai-professor/SKILL.md) | Criada e instalada globalmente | Professor de Muay Thai para aulas, progressão e avaliação técnica |
| [nutricionista-ritmo](nutricionista-ritmo/SKILL.md) | Criada localmente | Educação alimentar e planejamento integrado a rotina, treino e orçamento |
| [youtube-research](youtube-research/SKILL.md) | Aplicada | Pesquisa local dos vídeos de Muay Thai |
| [pdf](pdf/SKILL.md) | Consultada | Formatos e revisão das exportações; não substituiu o gerador offline do app |
| [spreadsheets](spreadsheets/SKILL.md) | Consultada | Formatos de planilha; não substituiu o gerador offline do app |
| [youtube-report](youtube-report/SKILL.md) | Avaliada | Formatação de transcrições já obtidas; não foi usada como transcritor |
| [youtube-transcribe](youtube-transcribe/SKILL.md) | Avaliada | Fluxo por API sem chave; legendas coletadas e ASR local testado como alternativa |
| [skill-creator](skill-creator/SKILL.md) | Aplicada nesta etapa | Formato e organização desta coleção |
| [skill-installer](skill-installer/SKILL.md) | Consultada nesta etapa | Conferência de critérios; nenhuma instalação remota ou global |

A participação anterior está documentada em [Financeiro](../../docs/financeiro.md) e [pesquisa de Muay Thai](../../docs/muay-thai/pesquisa-e-plano.md). Esta coleção não afirma que workflows apenas avaliados foram executados.

## Usar e manter

- A partir da raiz, leia `.agents/skills/<nome>/SKILL.md` quando a tarefa corresponder à descrição. Prefira estas cópias locais para o trabalho no Ritmo.
- Não carregue todas as skills de uma vez. Preserve referências e recursos ao mover ou atualizar uma skill.
- [manifest.json](manifest.json) registra origem, participação e SHA-256 de cada arquivo. É o inventário desta coleção. O `skills-lock.json` na raiz conserva o registro anterior da ferramenta de instalação; ele não substitui o manifesto de cópias manuais.
- As cópias globais, de sistema e de plugins existentes permanecem nos locais originais. A nova `muay-thai-professor` foi instalada também no diretório global de skills do Codex; ferramentas de transcrição foram instaladas apenas em pastas temporárias, sem credenciais adicionadas.
- Cópias de skills não instalam suas ferramentas: `playwright-cli`, Poppler, bibliotecas PDF, `@oai/artifact-tool`, `yt-dlp`, `ffmpeg` e ambientes de plugins continuam sujeitos à disponibilidade e autorização na máquina.
- Metadados originais, inclusive campos específicos de outros agentes e o nome `Spreadsheets`, foram preservados. Essa preservação não garante que ferramentas exclusivas de um plugin estejam disponíveis fora dele.
- Atualize uma skill de forma explícita, conferindo a origem e a licença; depois regenere seus hashes no manifesto. A coleção não se atualiza automaticamente.

## Verificar a coleção

Execute na raiz do repositório:

```bash
python -B .agents/skills/verify_collection.py
python -B .agents/skills/ui-ux-pro-max/scripts/search.py "keyboard focus" --domain ux
```

O verificador usa apenas a biblioteca padrão do Python: confere campos essenciais, nomes, arquivos, hashes, caminhos e links do índice. Não instala PyYAML nem executa scripts de transcrição ou autoria de artefatos. A validação de integridade é independente de ferramentas de PDF, planilhas ou serviços externos.
