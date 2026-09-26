---
name: youtube-research
description: Pesquisar vídeos e playlists de Muay Thai para o Ritmo, com inventário, análise do conteúdo acessível e referências.
---

# Pesquisa de vídeos para o Ritmo

Use esta skill quando a tarefa for pesquisar, revisar ou ampliar fontes de vídeo para o plano de exercícios do Ritmo. Comece por [`docs/muay-thai/pesquisa-e-plano.md`](../../../docs/muay-thai/pesquisa-e-plano.md), [`inventario.md`](../../../docs/muay-thai/inventario.md) e [`fichas.md`](../../../docs/muay-thai/fichas.md). Leia também [`docs/rotina/03_treino_muay_thai_matinal.txt`](../../../docs/rotina/03_treino_muay_thai_matinal.txt) antes de propor exercícios.

## Evidência e cobertura

1. Para cada playlist solicitada, registre canal, nome, ordem, URL, título, duração e todas as posições acessíveis, inclusive duplicatas. Continue a paginação ou carregamento até a contagem fechar. Não amplie para outras playlists sem pedido.
2. Deduplicate por ID do vídeo para análise, preservando todas as posições no inventário.
3. Separe três estados: conteúdo verbal ou audiovisual verificado; página reproduzível sem conteúdo obtido; reprodução indisponível. Título, descrição ou resumo de terceiro não comprovam o conteúdo da aula.
4. Prefira transcrição/legendas obtidas do próprio vídeo, por interface ou automação de navegador. Confira o vídeo visualmente quando a técnica depender de detalhe que o texto não esclarece. Registre a limitação quando isso não for possível.
5. Anote conteúdo, objetivo, pré-requisitos, método, execução que as fontes realmente sustentam, dificuldades e tempo aproximado. Diferencie demonstração do instrutor de adaptação proposta para o Ritmo. Preserve o link individual nas recomendações.
6. Compare canais e sequências antes de alterar o plano. Não replique aulas inteiras apenas pelo rótulo “iniciante”; respeite as sessões e critérios já existentes no projeto.

## Transcrição e relatório

- A skill global `youtube-report`, quando instalada, **formata texto de transcrição já disponível**. Ela não extrai legendas nem transcreve áudio. Seu formato por vídeo pode apoiar fichas individuais, mas a síntese integrada continua necessária.
- A skill global `youtube-transcribe`, quando instalada, usa download de áudio e ASR; requer `yt-dlp`, `ffmpeg` e `ASR_API_KEY`. Verifique os requisitos no ambiente atual antes de usá-la. Não instale ferramentas ou use credenciais sem necessidade e autorização.
- Esta skill local é um **fluxo de pesquisa**, não um transcritor autônomo. Use as ferramentas de navegador disponíveis na máquina. Nunca diga que assistiu integralmente a um vídeo quando apenas leu legendas.

## Atualização do projeto

Atualize os três documentos em `docs/muay-thai/` de forma consistente: cobertura no inventário, observação por vídeo nas fichas e implicações pedagógicas no plano. Mantenha os casos inacessíveis explícitos. Os documentos numerados de `docs/rotina/` definem o contexto atual do usuário; a alta geral para exercícios em fevereiro de 2026 já está registrada. O escopo específico para impacto no saco continua como informação a esclarecer, sem confundi-lo com ausência de alta.
