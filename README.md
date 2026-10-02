# Ritmo

O Ritmo reúne uma aplicação de rotina pessoal e os documentos que fundamentam seus horários, treinos e prioridades.

## Estrutura

| Pasta | Conteúdo |
|---|---|
| [`app-rotina/`](app-rotina/) | PWA, dependências, código-fonte, testes e instruções de execução/publicação |
| [`docs/estrutura.md`](docs/estrutura.md) | Mapa dos arquivos, responsabilidades e critérios de organização |
| [`docs/telas-e-funcionalidades.md`](docs/telas-e-funcionalidades.md) | Destino de cada ação e leitura nas oito telas |
| [`docs/nutricao/`](docs/nutricao/) | Plano alimentar inicial, registros e critérios do resumo semanal de Nutrição |
| [`GLOSSARY.md`](GLOSSARY.md) | Termos da rotina, registros e Financeiro |
| [`docs/financeiro.md`](docs/financeiro.md) | Arquitetura, persistência e regras do Financeiro |
| [`docs/design-system/ritmo/`](docs/design-system/ritmo/) | Identidade visual atual e arquivos históricos de referência |
| [`docs/rotina/`](docs/rotina/) | Treze documentos numerados da rotina; comece por [`00_LEIA_PRIMEIRO.txt`](docs/rotina/00_LEIA_PRIMEIRO.txt) |
| [`docs/muay-thai/`](docs/muay-thai/) | [Pesquisa e plano](docs/muay-thai/pesquisa-e-plano.md), [inventário dos vídeos](docs/muay-thai/inventario.md) e [fichas das aulas](docs/muay-thai/fichas.md) |
| [`.agents/skills/README.md`](.agents/skills/README.md) | Índice único das 12 skills usadas ou consultadas; instruções, recursos, licenças e manifesto de integridade na mesma pasta |
| `.github/workflows/` | Validação e publicação da aplicação no GitHub Pages |

## Executar a aplicação

```bash
cd app-rotina
npm ci
npm run dev
```

Para testes, build, backup e publicação, consulte o [README da aplicação](app-rotina/README.md). A pasta `app-rotina/` continua sendo a unidade de build do GitHub Pages.

Os valores `sourceFile` das atividades apontam para caminhos relativos à raiz do repositório em `docs/rotina/`. Os IDs das atividades não foram alterados; backups e registros antigos podem conservar somente o nome do arquivo de origem.
