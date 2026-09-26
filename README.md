# Ritmo

O Ritmo reúne uma aplicação de rotina pessoal e os documentos que fundamentam seus horários, treinos e prioridades.

## Estrutura

| Pasta | Conteúdo |
|---|---|
| [`app-rotina/`](app-rotina/) | PWA, dependências, código-fonte, testes e instruções de execução/publicação |
| [`docs/rotina/`](docs/rotina/) | Treze documentos numerados da rotina; comece por [`00_LEIA_PRIMEIRO.txt`](docs/rotina/00_LEIA_PRIMEIRO.txt) |
| [`docs/muay-thai/`](docs/muay-thai/) | [Pesquisa e plano](docs/muay-thai/pesquisa-e-plano.md), [inventário dos vídeos](docs/muay-thai/inventario.md) e [fichas das aulas](docs/muay-thai/fichas.md) |
| `.github/workflows/` | Validação e publicação da aplicação no GitHub Pages |

## Executar a aplicação

```bash
cd app-rotina
npm ci
npm run dev
```

Para testes, build, backup e publicação, consulte o [README da aplicação](app-rotina/README.md). A pasta `app-rotina/` continua sendo a unidade de build do GitHub Pages.

Os valores `sourceFile` das atividades apontam para caminhos relativos à raiz do repositório em `docs/rotina/`. Os IDs das atividades não foram alterados; backups e registros antigos podem conservar somente o nome do arquivo de origem.
