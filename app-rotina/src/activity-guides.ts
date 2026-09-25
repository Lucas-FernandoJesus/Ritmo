export interface GuideStep {
  title: string
  amount?: string
  description: string
}

export interface ActivityGuide {
  introduction: string
  steps: readonly GuideStep[]
  closing?: string
}

// Orientações adaptadas dos arquivos de planejamento 02–12, disponíveis ao lado
// da pasta do projeto. As quantidades dos exercícios vêm do plano original.
// Explicações gerais dos movimentos foram conferidas com:
// https://www.nhs.uk/live-well/exercise/strength-exercises/
// https://www.uhsussex.nhs.uk/resources/standing-exercises-2/
// https://www.cuh.nhs.uk/patient-information/hip-strengthening-exercises/
export const activityGuides: Record<string, ActivityGuide> = {
  'wake-weekday': {
    introduction: 'Uma preparação breve para começar a manhã sem pressa.',
    steps: [
      { title: 'Levantar e cuidar do básico', description: 'Vá ao banheiro, beba água e comece a se preparar para a atividade da manhã.' },
      { title: 'Deixar o celular para depois', description: 'O plano sugere não abrir o feed antes do treino e dos preparativos.' },
    ],
  },
  'bed-morning': {
    introduction: 'Deixe o quarto funcional e a roupa do exercício pronta.',
    steps: [
      { title: 'Arrumar a cama', description: 'Faça o suficiente para deixar a cama organizada; não é uma limpeza do quarto.' },
      { title: 'Trocar de roupa', description: 'Vista uma roupa confortável para o treino previsto para hoje.' },
    ],
  },
  'muay-mon': {
    introduction: 'Sessão técnica sem contato, leve a moderada. A referência do plano é conseguir conversar durante o esforço.',
    steps: [
      { title: 'Aquecimento', amount: '5 min', description: 'Faça 1 minuto de cada: marcha no lugar, passos laterais, elevação confortável dos joelhos, movimentação na base e deslocamentos para frente e para trás.' },
      { title: 'Base e deslocamento', amount: '1 min + 1 min leve', description: 'Mova-se em diferentes direções. Depois, faça um minuto de recuperação leve.' },
      { title: 'Shadowboxing técnico', amount: '1 min + 1 min leve', description: 'Treine gestos leves no ar, sem contato e sem golpes explosivos com o braço esquerdo. Recupere-se por um minuto.' },
      { title: 'Joelhadas no ar', amount: '1 min + 1 min leve', description: 'Faça movimentos controlados, sem impacto. Recupere-se por um minuto.' },
      { title: 'Defesa e combinação', amount: '2 blocos de 1 min + 1 min leve', description: 'No primeiro bloco, faça passos diagonais, esquivas suaves e defesa sem prender o braço. No segundo, combine passos e joelhadas leves.' },
      { title: 'Desaceleração', amount: '5 min', description: 'Caminhe devagar por 2 minutos, faça mobilidade confortável de quadris e tornozelos por 2 minutos e use o último minuto para recuperar a respiração e observar sintomas.' },
    ],
    closing: 'Se estiver pesado, o plano permite começar com apenas 3 rounds. Não use o saco de pancadas sem liberação específica para impacto.',
  },
  'muay-fri': {
    introduction: 'Sexta é opcional: escolha treino leve sem impacto somente se estiver recuperado; descansar também atende ao plano.',
    steps: [
      { title: 'Verificar como está', description: 'Observe sono, cansaço e a condição habitual do braço antes de decidir.' },
      { title: 'Se treinar', description: 'Priorize aquecimento, base, deslocamentos e movimentos técnicos confortáveis no ar. Não faça contato nem golpes fortes.' },
      { title: 'Se descansar', description: 'Use este horário para recuperação, sem compensar o treino em outro momento do dia.' },
    ],
  },
  strength: {
    introduction: 'Uma série contém os quatro movimentos abaixo. Comece com 1 série; o plano prevê 2 apenas se você se recuperar bem.',
    steps: [
      { title: 'Sentar e levantar de uma cadeira', amount: '8–12 repetições', description: 'Use uma cadeira firme, sem rodas. Sente-se com os pés apoiados no chão, incline o tronco um pouco à frente, levante-se usando as pernas e volte a sentar de forma controlada. Não force o braço para se impulsionar.' },
      { title: 'Elevação de panturrilhas', amount: '10–15 repetições', description: 'Em pé, perto de um apoio estável se precisar de equilíbrio, eleve os calcanhares até ficar na ponta dos pés. Abaixe devagar até apoiar os pés novamente.' },
      { title: 'Elevação de quadril', amount: '8–12 repetições', description: 'Deite-se de costas com os joelhos dobrados e os pés no chão. Contraia levemente o abdômen e os glúteos, levante o quadril até onde for confortável e abaixe de maneira controlada.' },
      { title: 'Elevação alternada de joelhos em pé', amount: '30–45 segundos', description: 'Fique em pé junto a um apoio estável, se necessário. Eleve um joelho até uma altura confortável, volte o pé ao chão e alterne as pernas lentamente, como uma marcha no lugar.' },
    ],
    closing: 'O plano prioriza as pernas e não substitui a reabilitação do antebraço. Pare se aparecerem sintomas novos ou piores; para adaptações ao braço, peça orientação ao profissional que acompanha sua recuperação.',
  },
  'reduced-move': {
    introduction: 'Movimento confortável é uma possibilidade no modo Reduzido, não uma obrigação.',
    steps: [
      { title: 'Escolher o que cabe hoje', amount: 'Até 5 min', description: 'Faça apenas uma movimentação leve que seja apropriada e confortável para você. O plano não fixa exercícios nem meta de intensidade para este bloco.' },
      { title: 'Encerrar sem compensação', description: 'Se o movimento não estiver adequado hoje, descansar é uma escolha válida.' },
    ],
  },
  'morning-hygiene': {
    introduction: 'Um bloco curto para banho e higiene antes do café e da saída.',
    steps: [{ title: 'Cuidar da higiene', description: 'Tome banho e faça os cuidados habituais de que precisa para começar o dia.' }],
  },
  breakfast: {
    introduction: 'O objetivo é uma refeição simples e planejada, sem meta de calorias ou peso definida no plano.',
    steps: [
      { title: 'Montar o café', description: 'Escolha uma combinação disponível em casa: ovos, pão e fruta; iogurte natural, aveia e banana; ou tapioca com ovos e fruta.' },
      { title: 'Preparar a saída', description: 'Depois, confira a marmita e os itens de trabalho antes de sair.' },
    ],
  },
  'prepare-work': {
    introduction: 'Finalize a manhã com o essencial já separado.',
    steps: [
      { title: 'Conferir a comida', description: 'Pegue a marmita e o que for necessário para conservá-la e transportá-la de acordo com seu local de trabalho.' },
      { title: 'Conferir itens pessoais', description: 'Pegue mochila, roupa e objetos de trabalho que preparou na noite anterior.' },
    ],
  },
  work: {
    introduction: 'Este bloco representa seu expediente presencial; o Ritmo não define as tarefas do seu emprego.',
    steps: [{ title: 'Seguir o expediente real', description: 'Use o horário como referência. Faça o intervalo conforme as condições do trabalho e ajuste a rotina se o deslocamento mudar.' }],
  },
  transition: {
    introduction: 'Uma pausa real entre o trabalho e as atividades da noite.',
    steps: [
      { title: 'Chegar e descansar', description: 'Deixe o trabalho para trás por alguns minutos antes de jantar ou estudar.' },
      { title: 'Ajustar a noite', description: 'Se o dia foi mais cansativo, reduza o estudo ou escolha um ritmo mais leve, preservando o sono.' },
    ],
  },
  'dinner-weekday': {
    introduction: 'Jantar simples, usando o que estiver preparado ou disponível.',
    steps: [{ title: 'Montar a refeição', description: 'O plano sugere combinar uma fonte de proteína, um carboidrato, feijão ou lentilha e vegetais quando possível. Não há obrigação de eliminar arroz e feijão.' }],
  },
  'kitchen-daily': {
    introduction: 'A meta é deixar a cozinha funcional, não fazer uma faxina completa.',
    steps: [
      { title: 'Lavar a louça necessária', description: 'Cuide da louça usada e deixe a bancada minimamente limpa.' },
      { title: 'Olhar o essencial', description: 'Guarde objetos fora do lugar e observe lixo ou alimentos que pedem atenção.' },
    ],
  },
  english: {
    introduction: 'Bloco de estudo do curso Fluency. A divisão abaixo é um exemplo do plano; adapte-a ao formato real da aula.',
    steps: [
      { title: 'Aula', amount: '25 min', description: 'Acompanhe a lição prevista no curso.' },
      { title: 'Exercícios', amount: '10 min', description: 'Faça a prática oferecida pela aula.' },
      { title: 'Revisão e oralidade', amount: '10 min', description: 'Retome o ponto principal e pratique dizer ou ouvir o que estudou.' },
    ],
  },
  programming: {
    introduction: 'O plano reserva este bloco para prática, não apenas para assistir a vídeos.',
    steps: [
      { title: 'Escolher um tema', description: 'Se ainda não houver uma área preferida, o plano sugere começar por Python: variáveis, tipos, operadores e condicionais no primeiro mês.' },
      { title: 'Escrever código', description: 'Resolva um exercício pequeno sobre o tema e execute o código para conferir o resultado.' },
      { title: 'Registrar o que aprendeu', description: 'Anote o conteúdo e os minutos em Registros para facilitar a próxima sessão.' },
    ],
  },
  'short-study': {
    introduction: 'Uma versão curta para dias de menos energia. É opcional.',
    steps: [{ title: 'Revisar ou ler', amount: '10 min', description: 'Retome algo já estudado ou leia um pouco. Se estiver muito cansado, proteja o horário de dormir.' }],
  },
  finances: {
    introduction: 'A revisão semanal serve para entender o dinheiro que entra e sai, sem cobrança.',
    steps: [
      { title: 'Conferir a situação', description: 'Olhe saldo, faturas e contas próximas do vencimento.' },
      { title: 'Registrar os gastos', description: 'Lance as despesas da semana em Registros e confira quanto resta no orçamento do mês.' },
      { title: 'Observar padrões', description: 'Note gastos que poderiam ser evitados sem transformar isso em culpa ou meta radical.' },
    ],
  },
  'free-time': {
    introduction: 'Jogos, leitura e descanso são usos legítimos deste tempo.',
    steps: [{ title: 'Escolher o que faz sentido', description: 'Use o período conforme sua disposição. O cuidado do plano é não deixar o lazer consumir automaticamente o sono e a preparação do dia seguinte.' }],
  },
  'tomorrow-prep': {
    introduction: 'Deixe o mínimo necessário pronto para que a manhã comece com menos decisões.',
    steps: [
      { title: 'Separar itens', description: 'Prepare roupa, mochila, comida e o que precisará no trabalho ou nas entregas.' },
      { title: 'Conferir pendências curtas', description: 'Veja se há lixo, louça ou algum alimento que precise de atenção. Não transforme o bloco em faxina.' },
    ],
  },
  'wind-down': {
    introduction: 'Este período é para reduzir o ritmo antes de deitar.',
    steps: [
      { title: 'Higiene', description: 'Faça seus cuidados noturnos habituais.' },
      { title: 'Leitura leve', description: 'Se quiser ler, a meta inicial do plano é 5 páginas ou 15 minutos. Uma ideia ou pergunta anotada já basta.' },
      { title: 'Deixar o feed de lado', description: 'Evite rolagem infinita na hora de dormir e deixe o celular afastado da cama se isso ajudar.' },
    ],
  },
  sleep: {
    introduction: 'O horário é uma referência para apagar as luzes e tentar dormir, não uma exigência de adormecer imediatamente.',
    steps: [{ title: 'Encerrar o dia', description: 'Desligue as telas e deite-se. Se houver sonolência persistente, o próprio plano prevê rever a janela de sono.' }],
  },
  'friday-reset': {
    introduction: 'Sexta à noite começa com comida e recuperação, antes de qualquer decisão sobre entregas.',
    steps: [
      { title: 'Comer e descansar', description: 'Reserve este período após o expediente para uma refeição e uma pausa real.' },
      { title: 'Decidir sobre o turno', description: 'Se estiver esgotado, o plano permite cancelar o delivery sem compensar em outro dia.' },
    ],
  },
  'friday-delivery': {
    introduction: 'Turno opcional. Só comece se sono, cansaço, braço e controle da moto estiverem favoráveis.',
    steps: [
      { title: 'Antes de sair', description: 'Faça a checagem rápida em Hoje e confira moto e equipamentos. Se não conseguir manobrar e frear com segurança, não pilote.' },
      { title: 'Durante o turno', description: 'Faça pausas e mude de posição para não manter o antebraço rigidamente parado. Encerre se houver sono, fadiga, dor ou perda de controle.' },
      { title: 'Depois', description: 'Registre o turno, os custos e como ficaram seu cansaço e o braço.' },
    ],
  },
  'sat-breakfast': {
    introduction: 'Comece o sábado com café da manhã antes das tarefas e dos turnos opcionais.',
    steps: [{ title: 'Comer e se preparar', description: 'Escolha uma refeição simples disponível em casa e observe como está sua disposição para o restante do dia.' }],
  },
  'sat-clean': {
    introduction: 'Limpeza essencial para manter a casa funcional, sem transformar o sábado em faxina grande.',
    steps: [
      { title: 'Áreas principais', description: 'Varra ou aspire e passe pano onde houver necessidade.' },
      { title: 'Banheiro', description: 'Cuide de vaso, pia e piso conforme a condição do dia.' },
      { title: 'Fechar o básico', description: 'Confira roupas limpas e sujas e recolha o lixo.' },
    ],
    closing: 'Cômodos menos usados podem entrar em rodízio. Preserve o descanso entre os turnos.',
  },
  'sat-market': {
    introduction: 'Este horário é flexível: mercado, alguma pendência ou tempo livre se nada for necessário.',
    steps: [{ title: 'Conferir o que falta', description: 'Veja a lista de mercado e os alimentos para as marmitas. Se a compra não couber hoje, o plano permite mudar o dia.' }],
  },
  'sat-delivery-lunch': {
    introduction: 'Primeiro turno opcional de sábado. O horário não é garantia de pedidos nem de renda.',
    steps: [
      { title: 'Antes de sair', description: 'Coma, prepare a moto e faça a checagem de segurança em Hoje.' },
      { title: 'Durante o turno', description: 'Faça pausas e observe sono, cansaço, braço e controle da moto. Pare se não estiver seguro.' },
      { title: 'Ao terminar', description: 'Registre horas, quilômetros, receita e custos. Depois reserve a tarde para almoço e descanso.' },
    ],
  },
  'sat-rest': {
    introduction: 'A tarde é um intervalo real entre os dois turnos, não um convite para mais trabalho.',
    steps: [{ title: 'Almoçar e recuperar', description: 'Coma, descanse e jogue ou faça outra atividade leve se tiver vontade. Reavalie sua condição antes de decidir pelo turno da noite.' }],
  },
  'sat-delivery-night': {
    introduction: 'Segundo turno opcional de sábado. Reavalie sua condição depois do descanso da tarde.',
    steps: [
      { title: 'Antes de sair', description: 'Coma, hidrate-se, prepare a moto e atualize a checagem de sono, cansaço e braço.' },
      { title: 'Durante o turno', description: 'Faça pausas e encerre se houver fadiga, dor ou dificuldade para controlar a moto.' },
      { title: 'Depois', description: 'Registre o turno e dê espaço para banho e descanso, sem prolongar a madrugada.' },
    ],
  },
  'sun-calm': {
    introduction: 'O domingo começa sem pressa, com café e espaço para observar sua disposição.',
    steps: [{ title: 'Cuidar da manhã', description: 'Acorde, tome café e escolha um começo tranquilo antes do preparo das marmitas.' }],
  },
  'meal-prep': {
    introduction: 'Preparação principal das refeições de segunda a quarta.',
    steps: [
      { title: 'Decidir refeições', description: 'Escolha combinações simples para os próximos dias.' },
      { title: 'Cozinhar', description: 'Prepare uma proteína, um carboidrato, feijão ou lentilha e vegetais conforme o que tiver disponível.' },
      { title: 'Separar e conservar', description: 'Divida em recipientes. Refrigere as porções de curto prazo e congele as que serão usadas depois; evite deixar comida pronta por longos períodos fora da geladeira.' },
      { title: 'Preparar segunda', description: 'Deixe itens práticos da manhã separados.' },
    ],
  },
  'sun-delivery': {
    introduction: 'Turno opcional de domingo. Pode ser cancelado sem compensação se não estiver seguro.',
    steps: [
      { title: 'Antes de sair', description: 'Almoce e faça a checagem de sono, cansaço, braço e capacidade de controlar a moto.' },
      { title: 'Durante o turno', description: 'Faça pausas e não insista se perder segurança ou aparecerem sintomas.' },
      { title: 'Depois', description: 'Registre o turno e preserve descanso e preparação para segunda. O plano não prevê estendê-lo regularmente até 23h.' },
    ],
  },
  'sun-leisure': {
    introduction: 'Um período de descanso e lazer depois das tarefas principais do domingo.',
    steps: [{ title: 'Usar o tempo livre', description: 'Escolha jogos, leitura, visita a pessoas ou descanso. Se não fizer delivery, o plano também admite uma caminhada leve opcional se estiver recuperado.' }],
  },
  'weekly-plan': {
    introduction: 'Feche o domingo deixando a segunda mais simples.',
    steps: [
      { title: 'Olhar a semana', description: 'Confira compromissos, trabalho, estudos e turnos opcionais sem preencher todos os espaços livres.' },
      { title: 'Preparar segunda', description: 'Separe roupa, mochila, alimentação e itens necessários para a manhã seguinte.' },
    ],
  },
}
