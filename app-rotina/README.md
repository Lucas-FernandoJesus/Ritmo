# Ritmo

PWA local-first para acompanhar uma rotina pessoal no celular. Funciona sem conta ou servidor, grava em IndexedDB e pode ser usada offline depois da primeira visita.

## Executar

```bash
npm install
npm run dev
```

Para validar e gerar a versão de produção:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run preview -- --host
```

Abra o endereço exibido pelo Vite. Em `localhost`, a instalação pode ser testada no próprio computador pelo menu **Instalar app** do navegador.

## Publicar no GitHub Pages e instalar no celular

O projeto inclui um fluxo em `.github/workflows/pages.yml` que valida, compila e publica `dist` ao receber alterações na branch `main`. Depois de enviar este código para um repositório GitHub, abra **Settings → Pages → Build and deployment → Source** e escolha **GitHub Actions**. O endereço será `https://USUARIO.github.io/REPOSITORIO/` para um repositório comum, ou `https://USUARIO.github.io/` para um repositório com esse nome. O build detecta automaticamente esses dois formatos. Se usar domínio próprio na raiz, defina a variável de repositório `RITMO_BASE_PATH` como `/` em **Settings → Secrets and variables → Actions → Variables**.

Abra o endereço publicado no navegador do celular **com internet uma vez** e aguarde o carregamento. No Android, use o menu do Chrome → **Instalar app**. No iPhone, use o Safari → **Compartilhar** → **Adicionar à Tela de Início**. Antes de depender do modo offline, abra o ícone instalado uma vez e teste com o modo avião ativado. Depois da instalação e do cache inicial, as telas e os registros locais funcionam sem rede. Atualizações do aplicativo exigem uma nova conexão. A primeira instalação exige HTTPS; um endereço HTTP da rede local não oferece a mesma instalação offline.

Os dados ficam no IndexedDB do navegador de cada aparelho: não são enviados ao GitHub e não sincronizam automaticamente. Apagar os dados do navegador pode removê-los. Faça backups JSON regularmente. O site e os arquivos publicados pelo GitHub Pages são públicos; não inclua backups ou informações pessoais no repositório.

## Backup

Em **Ajustes**, selecione **Exportar backup JSON**. Guarde o arquivo fora do aparelho. Para restaurar, use **Importar backup JSON**; o formato e a versão são validados antes da confirmação.

## Fontes e destinos

| Fonte | Dados e telas |
|---|---|
| `00_LEIA_PRIMEIRO.txt` | prioridades, modos reduzido/mínimo e linguagem geral |
| `01_perfil_e_objetivos.txt` | contexto, trabalho, objetivos e segurança |
| `02_rotina_segunda_a_sexta.txt` | Hoje e Semana nos dias úteis |
| `03_treino_muay_thai_matinal.txt` | treino técnico, condições e alertas |
| `04_fortalecimento_e_cuidados_com_braco.txt` | treino leve, checagem e segurança |
| `05_escala_delivery_escolhida.txt` | turnos opcionais e alertas de pilotagem |
| `06_rotina_sabado_e_domingo.txt` | agenda do fim de semana |
| `07_alimentacao_e_marmitas.txt` | refeições e checklist de marmitas |
| `08_estudos_e_leitura.txt` | agenda e registros de estudo |
| `09_financas_e_controle_delivery.txt` | despesas, turnos e cálculos estimados |
| `10_limpeza_e_organizacao_da_casa.txt` | manutenção diária e checklist doméstico |
| `11_sono_jogos_e_celular.txt` | sono, lazer e preparação noturna |
| `12_plano_30_dias_e_checklist.txt` | Progresso e modos da rotina |

Cada atividade padrão conserva `sourceFile`. A camada `repository.ts` concentra o acesso local para permitir uma implementação futura de sincronização sem reescrever as telas.

As instruções exibidas ao tocar em uma atividade ficam em `src/activity-guides.ts`, incorporadas ao aplicativo para funcionar offline. Elas resumem os arquivos de planejamento sem alterar a rotina ou os registros. As descrições gerais dos movimentos do fortalecimento foram conferidas com orientações de [exercícios de força do NHS](https://www.nhs.uk/live-well/exercise/strength-exercises/), [exercícios em pé do University Hospitals Sussex NHS Foundation Trust](https://www.uhsussex.nhs.uk/resources/standing-exercises-2/) e [fortalecimento do quadril do Cambridge University Hospitals NHS Foundation Trust](https://www.cuh.nhs.uk/patient-information/hip-strengthening-exercises/); séries e repetições continuam as do arquivo `04_fortalecimento_e_cuidados_com_braco.txt`.
