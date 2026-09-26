import type { ActivityGuide, RoutineMode } from './types'

export type TrainingDay = 'A' | 'B'

export interface TrainingExercise {
  id: string
  title: string
  amount: string
  description: string
  reduced?: boolean
}

export interface TrainingWeekPrescription {
  week: number
  title: string
  focus: string
  circuits: number
  rest: string
  progression: string
  consolidation: boolean
}

export interface TrainingCriteria {
  advance: string
  repeat: string
  regress: string
}

export interface TrainingBlock {
  id: string
  title: string
  range: string
  objective: string
  weeks: readonly TrainingWeekPrescription[]
  workouts: Record<TrainingDay, readonly TrainingExercise[]>
  reduced: string
  minimum: readonly TrainingExercise[]
  criteria: TrainingCriteria
  muayThai: {
    objective: string
    rounds: number
    roundDuration: string
    recovery: string
    progression: string
    friday: string
  }
}

const minimumSession: readonly TrainingExercise[] = [
  { id: 'minimum-march', title: 'Marcha confortável', amount: '2 min', description: 'Marche sem impacto, em ritmo que permita respirar e conversar normalmente.' },
  { id: 'minimum-chair', title: 'Sentar e levantar', amount: '5–8 repetições', description: 'Use uma cadeira firme, levante com as pernas e sente novamente com controle, sem se impulsionar com os braços.' },
  { id: 'minimum-mobility', title: 'Mobilidade confortável', amount: '1–2 min', description: 'Movimente ombros, cotovelos, mãos, quadris e tornozelos sem forçar amplitude. Descansar também é válido.' },
]

const criteria = (advance: string): TrainingCriteria => ({
  advance,
  repeat: 'Repita a semana se faltou uma sessão, a técnica ainda estiver instável ou o esforço ficou acima do planejado, desde que não existam sinais de alerta.',
  regress: 'Volte à variação anterior ou interrompa a carga no braço se houver dor maior que a habitual, dormência ou formigamento novo, alteração de força ou pegada, inchaço, limitação de movimento ou piora no dia seguinte.',
})

const push = (amount = '6–10 repetições', description = 'Mãos na parede ou bancada firme, corpo alinhado e movimento controlado. Use a inclinação que preserve conforto no punho, cotovelo e antebraço.'):
  TrainingExercise => ({ id: 'incline-push-up', title: 'Flexão inclinada', amount, description, reduced: true })

const row = (amount = '5 × 5 segundos', description = 'Sentado, passe uma toalha resistente pelas solas dos pés. Puxe os cotovelos para trás enquanto os pés oferecem resistência; respire normalmente.'):
  TrainingExercise => ({ id: 'towel-row', title: 'Remada isométrica com toalha', amount, description, reduced: true })

const deadBug = (amount = '6–8 por lado', description = 'Deitado de costas, mantenha o tronco estável e afaste uma perna por vez. Reduza a amplitude se a lombar arquear.'):
  TrainingExercise => ({ id: 'dead-bug', title: 'Dead bug', amount, description, reduced: true })

export const trainingBlocks: readonly TrainingBlock[] = [
  {
    id: 'adaptacao',
    title: 'Adaptação',
    range: 'Semanas 1–4',
    objective: 'Aprender os padrões, encontrar amplitudes confortáveis e observar a resposta do braço durante o treino e no dia seguinte.',
    weeks: [
      { week: 1, title: 'Aprender', focus: 'Faça os movimentos devagar e encerre cada série com 2 ou 3 repetições possíveis.', circuits: 1, rest: '45–60 s quando necessário', progression: 'Sem progressão: registre apenas técnica e tolerância.', consolidation: false },
      { week: 2, title: 'Repetir com qualidade', focus: 'Mantenha as mesmas variações e acrescente somente o segundo circuito.', circuits: 2, rest: '45–60 s entre circuitos', progression: 'A única variável nova é o número de circuitos.', consolidation: false },
      { week: 3, title: 'Estabilizar', focus: 'Mantenha dois circuitos e aproxime-se do topo das repetições somente nos movimentos confortáveis.', circuits: 2, rest: '45–60 s entre circuitos', progression: 'Aumente 1–2 repetições em apenas um exercício por sessão.', consolidation: false },
      { week: 4, title: 'Consolidar e avaliar', focus: 'Reduza o volume, revise a técnica e decida se o bloco está pronto para avançar.', circuits: 1, rest: '60 s ou mais, se necessário', progression: 'Nenhuma progressão; semana deliberadamente mais leve.', consolidation: true },
    ],
    workouts: {
      A: [
        { id: 'chair-stand', title: 'Sentar e levantar', amount: '8–12 repetições', description: 'Use uma cadeira firme e sem rodas. Levante usando as pernas e volte a sentar devagar.', reduced: true },
        push(),
        { id: 'glute-bridge', title: 'Elevação de quadril', amount: '10–15 repetições', description: 'Eleve o quadril contraindo os glúteos, sem arquear a lombar, e desça com controle.' },
        row(),
        deadBug(),
      ],
      B: [
        { id: 'assisted-step-back', title: 'Passo para trás assistido', amount: '6–8 por perna', description: 'Apoie levemente uma mão numa cadeira firme, leve um pé para trás e flexione os joelhos numa amplitude confortável. Use sentar e levantar como regressão.', reduced: true },
        push(),
        { id: 'good-morning', title: 'Bom-dia sem peso', amount: '10–15 repetições', description: 'Com joelhos destravados e mãos cruzadas no peito, leve o quadril para trás mantendo a coluna neutra.' },
        row(),
        { id: 'calf-raise', title: 'Elevação de panturrilhas', amount: '12–20 repetições', description: 'Perto de um apoio estável, eleve os calcanhares e abaixe devagar.' },
        deadBug(),
      ],
    },
    reduced: 'Faça 1 circuito apenas com os movimentos marcados como essenciais, sem reduzir a qualidade da execução.',
    minimum: minimumSession,
    criteria: criteria('Avance depois de cumprir os dois treinos com técnica estável e o braço no padrão habitual durante a sessão e no dia seguinte.'),
    muayThai: { objective: 'Base, guarda, deslocamentos simples, esquivas suaves e joelhadas controladas no ar.', rounds: 3, roundDuration: '1 min', recovery: '1 min leve', progression: 'Mude apenas a fluidez dos movimentos; não aumente impacto nem velocidade do braço esquerdo.', friday: 'Repita base e deslocamento por poucos minutos ou descanse.' },
  },
  {
    id: 'consolidacao',
    title: 'Consolidação dos movimentos-base',
    range: 'Semanas 5–8',
    objective: 'Repetir os mesmos padrões com pausas curtas e controle maior, sem trocar os exercícios por novidade.',
    weeks: [
      { week: 5, title: 'Novo ponto de partida', focus: 'Use as pausas descritas, mantendo a faixa inferior de repetições.', circuits: 2, rest: '60 s entre circuitos', progression: 'A única variável nova é a pausa durante os movimentos.', consolidation: false },
      { week: 6, title: 'Acumular repetições boas', focus: 'Mantenha as pausas e acrescente repetições onde a técnica estiver estável.', circuits: 2, rest: '60 s entre circuitos', progression: 'Acrescente 1–2 repetições em um exercício por sessão.', consolidation: false },
      { week: 7, title: 'Sustentar controle', focus: 'Mantenha volume e repetições; torne a descida mais controlada em um movimento.', circuits: 2, rest: '60 s entre circuitos', progression: 'Use descida de 3 segundos em somente um exercício.', consolidation: false },
      { week: 8, title: 'Consolidar e avaliar', focus: 'Volte a um circuito e confira quais pausas e amplitudes ficaram consistentes.', circuits: 1, rest: '60–75 s quando necessário', progression: 'Nenhuma progressão; preserve as melhores variações.', consolidation: true },
    ],
    workouts: {
      A: [
        { id: 'chair-pause-squat', title: 'Agachamento até a cadeira com pausa', amount: '8–12 repetições', description: 'Toque ou sente brevemente na cadeira, pause 1 segundo e levante sem usar os braços.', reduced: true },
        push(),
        { id: 'bridge-pause', title: 'Elevação de quadril com pausa', amount: '10–15 repetições', description: 'Segure 2 segundos no alto sem arquear a lombar e desça de forma controlada.' },
        row('6 × 6 segundos'),
        deadBug(),
      ],
      B: [
        { id: 'step-back-pause', title: 'Passo para trás assistido com pausa', amount: '6–9 por perna', description: 'Pause 1 segundo na amplitude confortável antes de retornar. Mantenha apoio leve e estável.', reduced: true },
        push(),
        { id: 'slow-good-morning', title: 'Bom-dia com descida lenta', amount: '10–15 repetições', description: 'Leve o quadril para trás em 3 segundos e retorne em ritmo natural.' },
        row('6 × 6 segundos'),
        { id: 'calf-pause', title: 'Panturrilha com pausa', amount: '12–20 repetições', description: 'Segure 1 segundo no alto e abaixe devagar usando apoio para equilíbrio.' },
        deadBug(),
      ],
    },
    reduced: 'Faça 1 circuito com perna, empurrar, puxar e core; mantenha as pausas, mas use a faixa inferior de repetições.',
    minimum: minimumSession,
    criteria: criteria('Avance quando as pausas não desorganizarem a postura e os dois circuitos couberem no tempo sem apressar os movimentos.'),
    muayThai: { objective: 'Consolidar base, entradas e saídas, retorno à guarda e combinações curtas no ar.', rounds: 4, roundDuration: '1 min', recovery: '45–60 s leve', progression: 'Acrescente uma combinação curta, mantendo ritmo conversável e nenhum contato.', friday: 'Faça 2 rounds leves de base e retorno à guarda ou escolha descanso.' },
  },
  {
    id: 'progressao-controlada',
    title: 'Progressão controlada',
    range: 'Semanas 9–12',
    objective: 'Aumentar amplitude ou complexidade de uma variação por vez, conservando os padrões já aprendidos.',
    weeks: [
      { week: 9, title: 'Conhecer as variações', focus: 'Use amplitude pequena nas novas variações e mantenha todo o restante igual.', circuits: 2, rest: '60 s entre circuitos', progression: 'A única variável nova é a variação indicada.', consolidation: false },
      { week: 10, title: 'Ganhar amplitude', focus: 'Aumente ligeiramente a amplitude de um movimento, se continuar confortável.', circuits: 2, rest: '60 s entre circuitos', progression: 'Altere amplitude em um único exercício.', consolidation: false },
      { week: 11, title: 'Ganhar repetições', focus: 'Mantenha a amplitude da semana anterior e acrescente poucas repetições.', circuits: 2, rest: '45–60 s entre circuitos', progression: 'Acrescente 1–2 repetições em um exercício por sessão.', consolidation: false },
      { week: 12, title: 'Consolidar e avaliar', focus: 'Faça um circuito, compare as variações com o bloco anterior e preserve a mais estável.', circuits: 1, rest: '60–75 s quando necessário', progression: 'Nenhuma progressão; não teste máximos.', consolidation: true },
    ],
    workouts: {
      A: [
        { id: 'chair-target-squat', title: 'Agachamento com a cadeira como alvo', amount: '8–12 repetições', description: 'Encoste levemente na cadeira sem descarregar todo o peso e retorne. Sente de verdade se perder controle.', reduced: true },
        push('7–11 repetições', 'Mantenha a inclinação já tolerada. Abaixe a superfície somente após duas sessões confortáveis e sem mudança no braço.'),
        { id: 'bridge-march', title: 'Ponte com marcha curta', amount: '6–8 por lado', description: 'No alto da ponte, alivie um pé de cada vez sem deixar a pelve girar. Volte à ponte comum se perder estabilidade.' },
        row('6 × 8 segundos'),
        deadBug('6–10 por lado', 'Afaste a perna um pouco mais, somente enquanto a lombar permanecer estável.'),
      ],
      B: [
        { id: 'assisted-split-squat', title: 'Agachamento dividido assistido', amount: '6–9 por perna', description: 'Mantenha os pés separados, use apoio leve e flexione os dois joelhos numa amplitude confortável.', reduced: true },
        push('7–11 repetições'),
        { id: 'staggered-hinge', title: 'Bom-dia com base alternada', amount: '8–12 por lado', description: 'Deixe um pé meio passo atrás, com pouco peso nele, e leve o quadril para trás mantendo a coluna neutra.' },
        row('6 × 8 segundos'),
        { id: 'single-calf', title: 'Panturrilha com apoio e ênfase unilateral', amount: '8–12 por lado', description: 'Transfira mais peso para uma perna sem retirar totalmente a outra do chão. Use apoio estável.' },
        { id: 'heel-tap', title: 'Toque alternado do calcanhar', amount: '8–12 por lado', description: 'Deitado com joelhos dobrados, mantenha o tronco estável e toque um calcanhar de cada vez no chão.' },
      ],
    },
    reduced: 'Faça 1 circuito com quatro padrões essenciais e use a regressão conhecida sempre que a nova variação perder estabilidade.',
    minimum: minimumSession,
    criteria: criteria('Avance quando cada variação nova puder ser feita sem pressa, compensação evidente ou mudança nos sintomas do braço até o dia seguinte.'),
    muayThai: { objective: 'Ligar deslocamento, esquiva e combinações de 2 ou 3 movimentos no ar, sempre retornando à guarda.', rounds: 4, roundDuration: '75 s', recovery: '45 s leve', progression: 'Aumente primeiro a duração do round; mantenha a quantidade de rounds.', friday: 'Faça 2 rounds técnicos de deslocamento e esquiva ou descanse.' },
  },
  {
    id: 'novas-variacoes',
    title: 'Novas variações dos mesmos padrões',
    range: 'Semanas 13–16',
    objective: 'Explorar novos ângulos e pausas sem abandonar agachar, dobrar o quadril, empurrar, puxar e estabilizar.',
    weeks: [
      { week: 13, title: 'Aprender novos ângulos', focus: 'Use pouca amplitude e apoio suficiente nos movimentos laterais e de base alternada.', circuits: 2, rest: '60 s entre circuitos', progression: 'A única variável nova é a direção ou posição dos pés.', consolidation: false },
      { week: 14, title: 'Repetir com controle', focus: 'Mantenha as variações e aproxime-se do centro das faixas de repetição.', circuits: 2, rest: '60 s entre circuitos', progression: 'Acrescente 1 repetição em um exercício por sessão.', consolidation: false },
      { week: 15, title: 'Usar pausas', focus: 'Mantenha repetições e use uma pausa curta em um movimento por treino.', circuits: 2, rest: '45–60 s entre circuitos', progression: 'Inclua pausa de 1–2 segundos em somente um exercício.', consolidation: false },
      { week: 16, title: 'Consolidar e avaliar', focus: 'Faça um circuito e escolha as variações mais estáveis para o bloco de capacidade.', circuits: 1, rest: '60–75 s quando necessário', progression: 'Nenhuma progressão; descarregue volume.', consolidation: true },
    ],
    workouts: {
      A: [
        { id: 'pause-target-squat', title: 'Agachamento ao alvo com pausa', amount: '9–13 repetições', description: 'Encoste levemente na cadeira, pause 1 segundo mantendo tensão nas pernas e retorne.', reduced: true },
        push('7–12 repetições', 'Na inclinação já segura, pause brevemente próximo à parede ou bancada e empurre sem explosão.'),
        { id: 'bridge-march-controlled', title: 'Ponte com marcha controlada', amount: '7–10 por lado', description: 'Alterne os pés devagar e mantenha a pelve nivelada. Use a ponte comum como regressão.' },
        row('6 × 8 segundos', 'Aumente a resistência dos pés apenas até manter pegada, punhos e cotovelos confortáveis.'),
        deadBug('8–10 por lado'),
      ],
      B: [
        { id: 'assisted-lateral-step', title: 'Passo lateral com flexão assistida', amount: '6–8 por lado', description: 'Dê um passo lateral curto, leve o quadril para trás e retorne. Use apoio e amplitude pequena.', reduced: true },
        push('7–12 repetições'),
        { id: 'staggered-slow-hinge', title: 'Bom-dia alternado com descida lenta', amount: '8–12 por lado', description: 'Use base alternada e desça em 3 segundos, mantendo a coluna neutra.' },
        row('6 × 8 segundos'),
        { id: 'single-calf-pause', title: 'Panturrilha unilateral assistida com pausa', amount: '8–12 por lado', description: 'Use apoio firme, mantenha o outro pé como ajuda e pause 1 segundo no alto.' },
        { id: 'slow-high-march', title: 'Marcha lenta com joelho alto', amount: '30–40 s', description: 'Alterne os joelhos sem inclinar o tronco e use apoio se o equilíbrio pedir.' },
      ],
    },
    reduced: 'Escolha a amplitude mais conhecida e faça 1 circuito com quatro movimentos; o modo reduzido não é o momento de testar a nova variação.',
    minimum: minimumSession,
    criteria: criteria('Avance quando as novas direções e bases não reduzirem o equilíbrio nem exigirem compensar com o braço ou prender a respiração.'),
    muayThai: { objective: 'Variar saídas laterais e diagonais, esquivas suaves, joelhadas e chutes controlados no ar.', rounds: 4, roundDuration: '90 s', recovery: '45 s leve', progression: 'Mude a direção dos deslocamentos, não a força ou o impacto.', friday: 'Faça 2 rounds leves de base, saída lateral e retorno ou descanse.' },
  },
  {
    id: 'capacidade',
    title: 'Aumento gradual de capacidade',
    range: 'Semanas 17–20',
    objective: 'Sustentar técnica por mais tempo e acrescentar condicionamento de baixo impacto sem aumentar simultaneamente dificuldade e volume.',
    weeks: [
      { week: 17, title: 'Adicionar o finalizador', focus: 'Mantenha o circuito conhecido e acrescente somente o bloco curto de condicionamento.', circuits: 2, rest: '60 s entre circuitos', progression: 'A única variável nova é o finalizador de baixo impacto.', consolidation: false },
      { week: 18, title: 'Sustentar o tempo', focus: 'Repita o mesmo finalizador e acrescente repetições em um exercício, se apropriado.', circuits: 2, rest: '60 s entre circuitos', progression: 'Acrescente 1–2 repetições em um exercício por sessão.', consolidation: false },
      { week: 19, title: 'Reduzir uma pausa', focus: 'Mantenha exercícios e repetições; reduza somente o intervalo entre circuitos.', circuits: 2, rest: '45 s entre circuitos', progression: 'A única variável é o intervalo, sem acelerar a execução.', consolidation: false },
      { week: 20, title: 'Consolidar e avaliar', focus: 'Retire o finalizador, faça um circuito e confira a recuperação no dia seguinte.', circuits: 1, rest: '60–75 s quando necessário', progression: 'Nenhuma progressão; semana mais leve.', consolidation: true },
    ],
    workouts: {
      A: [
        { id: 'capacity-chair-squat', title: 'Agachamento controlado até a cadeira', amount: '10–15 repetições', description: 'Use a versão de cadeira mais estável do bloco anterior e mantenha o ritmo controlado.', reduced: true },
        push('8–12 repetições'),
        { id: 'capacity-bridge', title: 'Ponte com pausa ou marcha', amount: '10–15 ou 6–10 por lado', description: 'Escolha uma única versão e mantenha-a durante todo o bloco.' },
        row('6 × 8–10 segundos'),
        deadBug('8–12 por lado'),
        { id: 'fast-march', title: 'Marcha rápida sem impacto', amount: '30–45 s', description: 'Aumente o ritmo dos pés sem saltar e mantendo capacidade de falar frases curtas.' },
      ],
      B: [
        { id: 'capacity-split-squat', title: 'Agachamento dividido assistido', amount: '8–12 por perna', description: 'Use apoio e a amplitude já consolidada; não aprofunde e aumente repetições na mesma semana.', reduced: true },
        push('8–12 repetições'),
        { id: 'capacity-hinge', title: 'Bom-dia com base alternada', amount: '10–14 por lado', description: 'Use descida controlada e mantenha o peso principal na perna da frente.' },
        row('6 × 8–10 segundos'),
        { id: 'capacity-calf', title: 'Panturrilha unilateral assistida', amount: '10–15 por lado', description: 'Use apoio e o outro pé como ajuda suficiente para manter o tornozelo alinhado.' },
        { id: 'lateral-low-impact', title: 'Passos laterais contínuos', amount: '30–45 s', description: 'Dê passos curtos de um lado para o outro sem saltar e sem cruzar os pés.' },
      ],
    },
    reduced: 'Retire o finalizador e faça 1 circuito dos quatro padrões essenciais com descanso livre.',
    minimum: minimumSession,
    criteria: criteria('Avance quando o condicionamento adicional não deteriorar a técnica, o sono, a recuperação geral ou a condição habitual do braço no dia seguinte.'),
    muayThai: { objective: 'Sustentar deslocamentos, defesa e combinações no ar em rounds um pouco mais longos, sem impacto.', rounds: 4, roundDuration: '90 s', recovery: '30–45 s leve', progression: 'Reduza primeiro a recuperação; não aumente também rounds ou velocidade.', friday: 'Faça até 2 rounds leves ou substitua por marcha e mobilidade.' },
  },
  {
    id: 'consolidacao-final',
    title: 'Consolidação e avaliação',
    range: 'Semanas 21–24',
    objective: 'Consolidar as variações mais estáveis, observar evolução técnica e encerrar o ciclo sem testes máximos.',
    weeks: [
      { week: 21, title: 'Fixar escolhas', focus: 'Use as variações prescritas sem buscar dificuldade adicional.', circuits: 2, rest: '60 s entre circuitos', progression: 'Nenhuma mudança além de iniciar o bloco final.', consolidation: false },
      { week: 22, title: 'Refinar', focus: 'Acrescente poucas repetições no padrão que estiver mais consistente.', circuits: 2, rest: '60 s entre circuitos', progression: 'Acrescente 1–2 repetições em um exercício por sessão.', consolidation: false },
      { week: 23, title: 'Confirmar capacidade', focus: 'Mantenha repetições e reduza o intervalo apenas se a técnica continuar igual.', circuits: 2, rest: '45–60 s entre circuitos', progression: 'A única variável possível é o intervalo.', consolidation: false },
      { week: 24, title: 'Avaliação sem máximos', focus: 'Faça um circuito, registre as variações dominadas e escolha o que deve continuar.', circuits: 1, rest: 'Livre, sem pressa', progression: 'Nenhuma progressão; não teste força máxima, velocidade ou impacto.', consolidation: true },
    ],
    workouts: {
      A: [
        { id: 'final-chair-squat', title: 'Agachamento controlado até a cadeira', amount: '10–15 repetições', description: 'Use a amplitude que permaneceu estável e compare a qualidade, não a velocidade.', reduced: true },
        push('8–12 repetições', 'Use a inclinação mais baixa que já tenha sido tolerada em duas sessões, sem experimentar nova altura neste bloco.'),
        { id: 'final-bridge', title: 'Ponte com pausa', amount: '12–15 repetições', description: 'Pause 2 segundos no alto com a pelve nivelada.' },
        row('6 × 10 segundos'),
        deadBug('8–12 por lado'),
        { id: 'final-march', title: 'Marcha rápida sem impacto', amount: '30–45 s', description: 'Mantenha ritmo estável e postura ereta, sem usar saltos.' },
      ],
      B: [
        { id: 'final-split-squat', title: 'Agachamento dividido assistido', amount: '8–12 por perna', description: 'Use a amplitude já dominada e apoio suficiente para manter equilíbrio.', reduced: true },
        push('8–12 repetições'),
        { id: 'final-staggered-hinge', title: 'Bom-dia com base alternada', amount: '10–14 por lado', description: 'Desça com controle e mantenha coluna e quadril organizados.' },
        row('6 × 10 segundos'),
        { id: 'final-calf', title: 'Panturrilha unilateral assistida', amount: '10–15 por lado', description: 'Pause no alto e use apoio estável.' },
        { id: 'final-lateral-step', title: 'Passos laterais contínuos', amount: '30–45 s', description: 'Use passos curtos sem impacto e mantenha respiração controlada.' },
      ],
    },
    reduced: 'Faça 1 circuito com as variações já dominadas, sem finalizador e sem transformar a avaliação em teste máximo.',
    minimum: minimumSession,
    criteria: criteria('Conclua o ciclo quando reconhecer variações estáveis para os sete padrões e conseguir mantê-las dentro de 20 minutos com recuperação adequada.'),
    muayThai: { objective: 'Reunir base, deslocamentos, esquivas, joelhadas e combinações no ar com técnica consistente.', rounds: 4, roundDuration: '90 s', recovery: '45 s leve', progression: 'Avalie fluidez e retorno à guarda; não teste potência, grande volume ou impacto.', friday: 'Faça uma revisão técnica curta ou descanse para fechar a semana.' },
  },
]

export const trainingPlanWeeks = trainingBlocks.flatMap((block) => block.weeks.map((week) => ({ block, week })))

export function clampTrainingWeek(week: number | undefined): number {
  if (!Number.isInteger(week)) return 1
  return Math.min(24, Math.max(1, week as number))
}

export function getTrainingPlanWeek(week: number | undefined) {
  return trainingPlanWeeks[clampTrainingWeek(week) - 1]
}

function sessionFormat(block: TrainingBlock, week: TrainingWeekPrescription, mode: RoutineMode) {
  if (mode === 'minimo') return { duration: '4–5 min', circuits: 1, rest: 'livre', note: 'Faça a versão mínima ou descanse se esse for o cuidado apropriado hoje.' }
  if (mode === 'reduzido') return { duration: '8–12 min', circuits: 1, rest: 'livre', note: block.reduced }
  return { duration: 'aprox. 20 min', circuits: week.circuits, rest: week.rest, note: week.progression }
}

export function getStrengthSession(weekNumber: number | undefined, day: TrainingDay, mode: RoutineMode) {
  const { block, week } = getTrainingPlanWeek(weekNumber)
  const format = sessionFormat(block, week, mode)
  const exercises = mode === 'minimo' ? block.minimum : mode === 'reduzido' ? block.workouts[day].filter((exercise) => exercise.reduced) : block.workouts[day]
  return { block, week, format, exercises }
}

export function getStrengthGuide(weekNumber: number | undefined, day: TrainingDay, mode: RoutineMode): ActivityGuide {
  const { block, week, format, exercises } = getStrengthSession(weekNumber, day, mode)
  return {
    introduction: `Semana ${week.week} · ${block.title}. ${block.objective}`,
    steps: [
      { title: 'Checagem e aquecimento', amount: mode === 'minimo' ? '1 min' : '3 min', description: 'Observe sono, fadiga, pegada, sensibilidade, inchaço e movimento. Aqueça com marcha e movimentos confortáveis de ombros, cotovelos, mãos, quadris e tornozelos.' },
      { title: `Formato ${mode === 'normal' ? 'normal' : mode === 'reduzido' ? 'reduzido' : 'mínimo'}`, amount: format.duration, description: `${format.circuits} circuito${format.circuits === 1 ? '' : 's'}; descanso ${format.rest}. ${format.note}` },
      ...exercises.map(({ title, amount, description }) => ({ title, amount, description })),
      { title: week.consolidation ? 'Consolidar e registrar' : 'Encerrar e observar', amount: '1–2 min', description: `${week.focus} Observe novamente o braço após o treino e no dia seguinte.` },
    ],
    closing: `${block.criteria.advance} ${block.criteria.repeat} ${block.criteria.regress} A ausência de dor, isoladamente, não garante segurança.`,
  }
}

export function getStrengthOverviewGuide(weekNumber = 1): ActivityGuide {
  const { block, week } = getTrainingPlanWeek(weekNumber)
  return {
    introduction: `Semana ${week.week} · ${block.title}. Terça é treino A e quinta é treino B, sempre dentro de aproximadamente 20 minutos.`,
    steps: [
      { title: 'Treino A — terça', description: block.workouts.A.map((exercise) => `${exercise.title}: ${exercise.amount}`).join('; ') + '.' },
      { title: 'Treino B — quinta', description: block.workouts.B.map((exercise) => `${exercise.title}: ${exercise.amount}`).join('; ') + '.' },
      { title: 'Progressão da semana', amount: `${week.circuits} circuito${week.circuits === 1 ? '' : 's'}`, description: `${week.focus} ${week.progression}` },
    ],
    closing: `${block.criteria.advance} ${block.criteria.repeat} ${block.criteria.regress}`,
  }
}

export function getMuayThaiGuide(itemId: 'muay-mon' | 'muay-fri', weekNumber: number | undefined, mode: RoutineMode): ActivityGuide {
  const { block, week } = getTrainingPlanWeek(weekNumber)
  const muay = block.muayThai
  const consolidationRounds = week.consolidation ? Math.max(2, muay.rounds - 1) : muay.rounds
  const rounds = mode === 'minimo' ? 0 : mode === 'reduzido' ? 2 : itemId === 'muay-fri' ? Math.min(2, consolidationRounds) : consolidationRounds
  const duration = mode === 'minimo' ? '3–5 min' : mode === 'reduzido' ? '8–10 min' : 'aprox. 20 min'
  const mainDescription = itemId === 'muay-fri' ? muay.friday : `${muay.objective} ${muay.progression}`
  return {
    introduction: `Semana ${week.week} · ${block.title}. Muay Thai técnico sem contato, sem saco e sem movimentos explosivos com o braço esquerdo.`,
    steps: [
      { title: 'Checagem e aquecimento', amount: mode === 'minimo' ? '1 min' : '4–5 min', description: 'Observe o braço e aqueça com marcha, base, passos laterais e deslocamentos confortáveis.' },
      rounds > 0
        ? { title: itemId === 'muay-fri' ? 'Sessão opcional' : 'Rounds técnicos', amount: `${rounds} × ${muay.roundDuration}`, description: `${mainDescription} Faça ${muay.recovery} entre os rounds.` }
        : { title: 'Versão mínima ou descanso', amount: duration, description: 'Faça somente base e deslocamentos confortáveis, ou descanse se sono, fadiga ou braço não estiverem favoráveis.' },
      { title: 'Desacelerar', amount: mode === 'normal' ? '3–4 min' : '1–2 min', description: 'Caminhe devagar, recupere a respiração e confira força, pegada, sensibilidade e movimento.' },
    ],
    closing: 'Não acrescente impacto, saco de pancadas, golpes fortes, grande volume de socos ou velocidade explosiva sem liberação específica. Regresse ou interrompa se houver sintomas novos, piores ou persistentes no dia seguinte.',
  }
}

export function getTrainingActivityGuide(itemId: string, week: number | undefined, day: number, mode: RoutineMode): ActivityGuide | null {
  if (itemId === 'strength') return getStrengthGuide(week, day === 4 ? 'B' : 'A', mode)
  if (itemId === 'muay-mon' || itemId === 'muay-fri') return getMuayThaiGuide(itemId, week, mode)
  return null
}
