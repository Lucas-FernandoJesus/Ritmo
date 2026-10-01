export type MuayPracticeId = 'base' | 'directions' | 'return' | 'knee' | 'jab' | 'teep' | 'layers' | 'check' | 'exit' | 'roundhouse' | 'shadow'
export type MuayProgressStatus = 'praticado' | 'confortavel' | 'repetir'
export type MuayProgressMap = Partial<Record<MuayPracticeId, MuayProgressStatus>>
export type MuayPracticeLevel = 'fundamento' | 'desenvolvimento' | 'integração'

export interface MuayPractice {
  id: MuayPracticeId
  title: string
  objective: string
  instructions: string
  attention: string
  level: MuayPracticeLevel
  modality: 'sombra'
  prerequisites: readonly MuayPracticeId[]
  qualityCriteria: readonly string[]
  repeatWhen: string
  advanceWhen: string
  sourceReview: 'verbal' | 'visual'
  videoTitle: string
  videoUrl: string
  provider: string
}

export interface MuayPracticeRecommendation {
  kind: 'new' | 'prerequisites' | 'repeat' | 'practice' | 'advance'
  title: string
  description: string
  unmetPrerequisites: MuayPracticeId[]
}

const shared = {
  modality: 'sombra' as const,
  sourceReview: 'verbal' as const,
  repeatWhen: 'Repita quando perder a base, a guarda, o equilíbrio ou o controle do retorno durante a execução.',
  advanceWhen: 'Considere avançar após marcar a prática como confortável em sessões separadas, sem piora de sintomas no dia seguinte.',
}

// Exercícios adaptados do plano editorial em docs/muay-thai/pesquisa-e-plano.md.
// Os tempos e rounds da sessão vêm de training-plan.ts, não dos vídeos.
const practices: Record<MuayPracticeId, MuayPractice> = {
  base: {
    ...shared, id: 'base', title: 'Base, guarda e ritmo', objective: 'Encontrar uma posição estável antes de se mover.', level: 'fundamento', prerequisites: [],
    instructions: 'Deixe espaço confortável entre os pés, destrave os joelhos, mantenha as mãos em guarda e faça pequenos ajustes de peso sem prender a respiração.',
    attention: 'Observe se os pés ficam próximos demais, os joelhos travam ou as mãos descem.',
    qualityCriteria: ['Joelhos destravados e pés separados durante toda a repetição.', 'Guarda retorna ao rosto sem prender a respiração.'],
    videoTitle: 'Primeira aula de Muay Thai', videoUrl: 'https://www.youtube.com/watch?v=BRJy0lhOKt4&t=60s', provider: 'Spring Sia',
  },
  directions: {
    ...shared, id: 'directions', title: 'Passos em quatro direções', objective: 'Mover-se sem perder a base.', level: 'fundamento', prerequisites: ['base'],
    instructions: 'Dê um passo curto para frente, para trás ou para um lado e reajuste o outro pé. Volte à base antes de mudar a direção.',
    attention: 'Evite cruzar ou arrastar os pés e mantenha o olhar à frente.',
    qualityCriteria: ['Os pés não cruzam nem encostam durante a troca de direção.', 'A largura da base reaparece antes do próximo passo.'],
    videoTitle: 'Trabalho de pés para iniciantes', videoUrl: 'https://www.youtube.com/watch?v=qHBYtdR4xHg&t=240s', provider: 'GMAU',
  },
  return: {
    ...shared, id: 'return', title: 'Entrar, sair e recuperar a base', objective: 'Controlar a distância e terminar equilibrado.', level: 'fundamento', prerequisites: ['base', 'directions'],
    instructions: 'Aproxime-se de um ponto imaginário com um passo curto, pare equilibrado e recue. Encontre novamente a base antes de repetir.',
    attention: 'Evite passos grandes, tronco inclinado e saída com os pés cruzados.',
    qualityCriteria: ['A entrada e a saída terminam com a mesma largura de base.', 'É possível pausar no fim sem passo extra para recuperar o equilíbrio.'],
    videoTitle: 'Trabalho de pés para iniciantes', videoUrl: 'https://www.youtube.com/watch?v=qHBYtdR4xHg&t=595s', provider: 'GMAU',
  },
  knee: {
    ...shared, id: 'knee', title: 'Joelhada controlada no ar', objective: 'Praticar equilíbrio e retorno à base.', level: 'fundamento', prerequisites: ['base'],
    instructions: 'Eleve um joelho até uma altura confortável, baixe com controle e reencontre a base. Alterne os lados sem contato.',
    attention: 'Observe se o tronco cai, o apoio fica instável ou a respiração é presa.',
    qualityCriteria: ['O tronco permanece alto e a perna de apoio estável.', 'O pé retorna à base sem bater no chão nem exigir passo de correção.'],
    videoTitle: 'Muay Thai para iniciantes — joelhadas', videoUrl: 'https://www.youtube.com/watch?v=QrcEYNzuZQg&t=180s', provider: 'Martial Spirit',
  },
  jab: {
    ...shared, id: 'jab', title: 'Golpe reto leve e volta à guarda', objective: 'Coordenar braço, passo e retorno à guarda.', level: 'desenvolvimento', prerequisites: ['base', 'return'],
    instructions: 'Se o braço estiver confortável, faça um golpe reto leve no ar, recolha a mão e volte à base. Se não estiver, pratique só o deslocamento.',
    attention: 'Não acelere nem faça grande volume. Observe tensão no ombro e qualquer mudança de sintomas.',
    qualityCriteria: ['A mão retorna à guarda pelo mesmo caminho e sem travar o cotovelo.', 'O golpe leve não muda a condição habitual do braço durante ou após a sessão.'],
    videoTitle: 'Sombra de Muay Thai — parte 1', videoUrl: 'https://www.youtube.com/watch?v=s3uW3XSOdvA&t=300s', provider: 'Martial Spirit',
  },
  teep: {
    ...shared, id: 'teep', title: 'Teep no ar e recuperação', objective: 'Elevar e recolher a perna mantendo equilíbrio.', level: 'desenvolvimento', prerequisites: ['base', 'return'],
    instructions: 'Comece com a perna da frente em altura confortável, recolha e pouse na base. Experimente a de trás apenas se o retorno estiver estável.',
    attention: 'Evite cair para frente ou para trás e abandonar a guarda.',
    qualityCriteria: ['O joelho recolhe antes de o pé voltar ao chão.', 'A postura e a guarda permanecem organizadas no pouso.'],
    videoTitle: 'Teep para iniciantes', videoUrl: 'https://www.youtube.com/watch?v=wx8JZfwH3P0&t=215s', provider: 'GMAU',
  },
  layers: {
    ...shared, id: 'layers', title: 'Duas ações em camadas', objective: 'Ligar habilidades já conhecidas sem perder a base.', level: 'desenvolvimento', prerequisites: ['directions', 'return'],
    instructions: 'Repita passo → base. Depois acrescente passo → joelho no ar → base. Se o braço estiver confortável, o joelho pode ser substituído por um golpe reto leve no ar.',
    attention: 'Adicione uma ação por vez. Não acelere só para lembrar a sequência.',
    qualityCriteria: ['Cada ação termina organizada antes da ação seguinte.', 'A sequência pode ser repetida dos dois lados sem aumentar a velocidade.'],
    videoTitle: 'Combinações por camadas', videoUrl: 'https://www.youtube.com/watch?v=Cn5Z0bOhr1M&t=480s', provider: 'Spring Sia',
  },
  check: {
    ...shared, sourceReview: 'visual', id: 'check', title: 'Check isolado e pouso', objective: 'Praticar uma defesa sem contato e recuperar equilíbrio.', level: 'desenvolvimento', prerequisites: ['base'],
    instructions: 'Com a guarda alta, eleve o joelho para dentro do cotovelo e aponte a canela cerca de 45° para fora. Pouse com controle e volte à base, sem colisão ou contra-ataque.',
    attention: 'Não feche a postura, incline o tronco nem combine outro movimento antes de pousar estável.',
    qualityCriteria: ['Joelho e canela sobem a aproximadamente 45° sem abrir a guarda.', 'O pé pousa na base e permite mover-se novamente sem perder equilíbrio.'],
    videoTitle: 'Check de Muay Thai', videoUrl: 'https://www.youtube.com/watch?v=A8um9fxAgko&t=54s', provider: 'Spring Sia',
  },
  exit: {
    ...shared, id: 'exit', title: 'Saída lateral ou diagonal', objective: 'Mudar de direção após uma ação simples.', level: 'desenvolvimento', prerequisites: ['directions', 'return'],
    instructions: 'Depois de um passo ou joelhada já conhecidos, faça uma saída curta para o lado ou diagonal, retome a base e pause.',
    attention: 'Evite passo excessivo, cruzar os pés e terminar com a base estreita.',
    qualityCriteria: ['A saída curta mantém os pés separados e o olhar à frente.', 'A pausa final acontece sem inclinar o tronco nem reajustar os pés.'],
    videoTitle: 'Base, deslocamento e ângulos', videoUrl: 'https://www.youtube.com/watch?v=APIjooz_ulY&t=290s', provider: 'Spring Sia',
  },
  roundhouse: {
    ...shared, sourceReview: 'visual', id: 'roundhouse', title: 'Roundhouse controlado no ar', objective: 'Aprender passo, rotação e retorno sem impacto.', level: 'integração', prerequisites: ['base', 'directions', 'return', 'teep'],
    instructions: 'Em ritmo lento, dê um pequeno passo fora da linha, gire o pé de apoio e o quadril, passe a canela por um alvo imaginário em altura confortável e retorne à base sem potência.',
    attention: 'Faça somente no ar. Reduza para passo → giro → base se perder equilíbrio, postura, guarda ou controle do retorno.',
    qualityCriteria: ['O calcanhar do apoio gira e libera o quadril sem torcer o joelho.', 'A perna retorna à base com equilíbrio e sem passo extra de correção.', 'A execução permanece relaxada, controlada e sem potência.'],
    repeatWhen: 'Repita o passo e o giro sem completar o chute quando houver desequilíbrio, rigidez, retorno desorganizado ou qualquer mudança de sintomas.',
    advanceWhen: 'Mantenha como roundhouse controlado após marcá-lo confortável em sessões separadas; não avance automaticamente para potência, contato ou saco.',
    videoTitle: 'Roundhouse para iniciantes em sombra', videoUrl: 'https://www.youtube.com/watch?v=66-DnUrbU0o&t=124s', provider: 'Martial Spirit',
  },
  shadow: {
    ...shared, id: 'shadow', title: 'Sombra curta pessoal', objective: 'Combinar duas ou três habilidades conhecidas.', level: 'integração', prerequisites: ['layers', 'exit'],
    instructions: 'Experimente passo → joelhada controlada no ar → saída lateral. Volte à base e troque apenas um elemento por vez.',
    attention: 'Prefira sequência curta e técnica estável; não transforme a sessão em teste de potência.',
    qualityCriteria: ['A sequência usa no máximo três ações já marcadas como confortáveis.', 'Toda repetição termina em base e guarda antes de recomeçar.'],
    videoTitle: 'Combinações por camadas', videoUrl: 'https://www.youtube.com/watch?v=Cn5Z0bOhr1M', provider: 'Spring Sia',
  },
}

const byBlock: readonly (readonly MuayPracticeId[])[] = [
  ['base', 'directions', 'return', 'knee'],
  ['base', 'return', 'jab', 'teep', 'layers'],
  ['directions', 'layers', 'check', 'exit'],
  ['directions', 'knee', 'check', 'exit', 'roundhouse'],
  ['return', 'layers', 'exit', 'roundhouse', 'shadow'],
  ['base', 'directions', 'roundhouse', 'shadow'],
]

export function getMuayPractice(id: MuayPracticeId): MuayPractice {
  return practices[id]
}

export function getMuayPracticeRecommendation(id: MuayPracticeId, progress: MuayProgressMap): MuayPracticeRecommendation {
  const practice = practices[id]
  const status = progress[id]
  const unmetPrerequisites = practice.prerequisites.filter((prerequisite) => progress[prerequisite] !== 'confortavel')

  if (status === 'repetir') return { kind: 'repeat', title: 'Repetir com calma', unmetPrerequisites, description: `${practice.repeatWhen} O registro continua sendo uma escolha sua.` }
  if (unmetPrerequisites.length) return {
    kind: 'prerequisites', title: 'Revisar pré-requisitos', unmetPrerequisites,
    description: `Antes de ampliar esta prática, revise: ${unmetPrerequisites.map((item) => practices[item].title).join(', ')}.`,
  }
  if (status === 'confortavel') return { kind: 'advance', title: 'Confortável para integrar', unmetPrerequisites, description: practice.advanceWhen }
  if (status === 'praticado') return { kind: 'practice', title: 'Praticar novamente', unmetPrerequisites, description: `Você registrou uma prática. ${practice.repeatWhen}` }
  return { kind: 'new', title: 'Prática ainda não registrada', unmetPrerequisites, description: 'Comece devagar, use os critérios de qualidade e escolha um estado somente depois de praticar.' }
}

export function getMuayPractices(week: number, itemId: 'muay-mon' | 'muay-fri', mode: 'normal' | 'reduzido' | 'minimo'): MuayPractice[] {
  if (mode === 'minimo') return [practices.base]
  if (itemId === 'muay-fri' || mode === 'reduzido') return [practices.base, practices.directions]
  const index = Math.min(5, Math.max(0, Math.floor((week - 1) / 4)))
  return byBlock[index].map((id) => practices[id])
}
