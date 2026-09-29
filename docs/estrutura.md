# Estrutura do Ritmo

A raiz reúne a aplicação, documentação, regras dos agentes e automação do repositório. Comandos npm continuam sendo executados em `app-rotina/`; essa pasta permanece a unidade de build e publicação.

```text
Ritmo/
├── AGENTS.md
├── README.md
├── skills-lock.json
├── .agents/skills/
│   ├── README.md / manifest.json / verify_collection.py
│   └── <nome-da-skill>/SKILL.md + recursos
├── .github/workflows/pages.yml
├── docs/
│   ├── estrutura.md
│   ├── financeiro.md
│   ├── rotina/
│   ├── muay-thai/
│   └── design-system/ritmo/
│       ├── MASTER.md
│       ├── image-prompts.md
│       └── archive/
│           ├── App.css
│           └── assets/
└── app-rotina/
    ├── README.md
    ├── package.json / package-lock.json
    ├── index.html / vite.config.ts / tsconfig*.json
    ├── playwright*.config.ts
    ├── public/
    ├── scripts/
    ├── e2e/
    └── src/
        ├── App.tsx / main.tsx / index.css
        ├── components/
        ├── core/
        ├── infrastructure/
        └── features/
            ├── finance/
            │   └── components/
            ├── dashboard/
            │   └── components/
            ├── routine/
            └── training/
```

## Responsabilidades

| Local | Conteúdo |
| --- | --- |
| `src/App.tsx` | Composição das telas, navegação e estado da aplicação |
| `src/main.tsx` | Inicialização do React e registro do serviço offline |
| `src/index.css` | Estilos e tokens compartilhados dos dois temas |
| `src/components/` | Menu principal, primitivas de formulário, input monetário e gráfico reutilizável |
| `src/core/` | Modelos compartilhados, validação, cálculos gerais, precisão monetária e calendário financeiro |
| `src/infrastructure/` | Repositório IndexedDB, testes de proteção da persistência e do serviço offline |
| `src/features/finance/` | Movimentações, análises, planos, fechamento, exportações, testes e componentes financeiros |
| `src/features/dashboard/` | Agregações, testes e componente da Dashboard |
| `src/features/routine/` | Dados iniciais da rotina, guias gerais e testes de integridade |
| `src/features/training/` | Plano de treinos, catálogos de exercícios e testes |
| `e2e/` | Cenários de navegador, fixtures, servidor de preview e teardown |
| `public/` | Manifesto, serviço offline e recursos estáticos publicados |
| `scripts/` | Utilitários de validação e manutenção dos ícones |
| `docs/` | Regras do produto, pesquisa, arquitetura e sistema visual |
| `.agents/skills/` | Coleção única das 12 skills usadas ou consultadas, com índice, recursos e hashes |

## Critérios de manutenção

- Coloque cada módulo na funcionalidade que o utiliza; mantenha testes unitários próximos do código testado. Componentes usados por mais de uma área ficam em `src/components/`.
- Use imports diretos para módulos existentes. A organização não introduz aliases, barrels ou outra camada de roteamento.
- Regras financeiras continuam no domínio; componentes consomem resultados. O repositório permanece o único ponto de acesso ao IndexedDB.
- `finance-schedule.ts` fica em `core/` porque suas primitivas de calendário também são necessárias à validação compartilhada.
- Documentação visual fica em `docs/design-system/ritmo/`. CSS do template Vite e imagens antigas sem referências no código foram preservados em `archive/`, fora do código ativo.
- Os ícones originais em `public/` permanecem disponíveis ao script de manutenção; os ícones atuais continuam sendo usados pelo manifesto e pelo serviço offline.
- Skills locais ficam somente em `.agents/skills/` na raiz; o lock correspondente também fica na raiz. Não há instalação ou configuração global nesta reorganização.
- Consulte o [índice da coleção](../.agents/skills/README.md) para distinguir aplicação, leitura e avaliação. O manifesto local registra todas as cópias; o lock na raiz conserva os metadados originais da ferramenta de instalação. As fontes globais e de plugins foram preservadas para outros projetos.
- `node_modules/`, `dist/` e `test-results/` são gerados e ignorados pelo Git. Não mova esses resultados para `src/` ou `docs/`.
- Caminhos `sourceFile` da rotina continuam relativos à raiz em `docs/rotina/`. IDs persistidos, banco versão 5, migrations e formatos de backup são preservados.

## Verificação

Execute em `app-rotina/`:

```bash
npm run lint
npm run typecheck
npm test
npm run build
node scripts/visual-review.mjs
```

`visual-review.mjs` executa a suíte existente de navegador com o Edge instalado, incluindo capturas dos dois temas, menu, Financeiro, responsividade, console, backup e offline. Usa as configurações e fixtures de `e2e/`, sem depender de uma sessão CDP aberta manualmente. Capturas e anexos ficam em `test-results/`.

Validação da reorganização: lint e TypeScript aprovados; 182 testes unitários e 55 cenários de navegador aprovados (237 no total); build aprovado. Foram conferidos 47 links locais da documentação e a preservação de 47 arquivos realocados, além da atualização dos dois documentos visuais. Nos módulos, só caminhos de imports e URLs dos arquivos de teste foram ajustados. Migrations, schema, cálculos e dependências não foram alterados.
