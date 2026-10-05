# Revisão com leitor de tela

Estado em 05/10/2026: verificação auditiva pendente. O Narrador está disponível no Windows, mas a automação deste ambiente não consegue capturar o áudio que ele anuncia. Os testes automatizados cobrem nomes de controles, campos, salto ao conteúdo e foco da prévia de backup; não comprovam a experiência falada.

Use uma sessão de navegador isolada, sem dados pessoais, com o leitor de tela ligado. Registre o anúncio ouvido e qualquer diferença em relação ao esperado.

| Fluxo | Ação | Anúncio/comportamento esperado | Resultado auditivo |
|---|---|---|---|
| Entrada | Abrir o app, usar Tab até “Ir para o conteúdo” e Enter | O link tem nome compreensível e leva o foco ao conteúdo principal | Pendente |
| Navegação | Abrir o menu, percorrer as áreas com Tab, escolher Ajustes, fechar com Esc | Menu e destino são identificados; o foco volta ao controle de origem ao fechar | Pendente |
| Importação | Em Ajustes, selecionar um backup JSON válido de teste e percorrer a prévia | A região “Prévia do backup” recebe foco; arquivo, data, quantidades e aviso de substituição são lidos em ordem | Pendente |
| Cancelamento | Escolher “Cancelar importação” | A prévia fecha e o foco volta a “Importar backup JSON”; nenhum dado muda | Pendente |
| Erro | Selecionar um JSON inválido de teste | A mensagem informa que o backup é inválido e que nenhum dado foi alterado | Pendente |
| Exclusão | Abrir a exclusão de um registro de teste e cancelar | O registro continua presente; a confirmação e suas alternativas são compreensíveis | Pendente |

Não marque esta revisão como aprovada apenas porque os testes automatizados passaram. Se algum anúncio não corresponder ao esperado, registre o navegador, o leitor de tela, o fluxo e as palavras ouvidas antes de corrigir a interface.
