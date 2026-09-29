export interface MuayPractice {
  id: string
  title: string
  objective: string
  instructions: string
  attention: string
  videoTitle: string
  videoUrl: string
  provider: string
}

// Exercícios adaptados do plano editorial em docs/muay-thai/pesquisa-e-plano.md.
// Os tempos e rounds da sessão vêm de training-plan.ts, não dos vídeos.
const practices = {
  base: {
    id: 'base', title: 'Base, guarda e ritmo', objective: 'Encontrar uma posição estável antes de se mover.',
    instructions: 'Deixe espaço confortável entre os pés, destrave os joelhos, mantenha as mãos em guarda e faça pequenos ajustes de peso sem prender a respiração.',
    attention: 'Observe se os pés ficam próximos demais, os joelhos travam ou as mãos descem.',
    videoTitle: 'Primeira aula de Muay Thai', videoUrl: 'https://www.youtube.com/watch?v=BRJy0lhOKt4&t=60s', provider: 'Spring Sia',
  },
  directions: {
    id: 'directions', title: 'Passos em quatro direções', objective: 'Mover-se sem perder a base.',
    instructions: 'Dê um passo curto para frente, para trás ou para um lado e reajuste o outro pé. Volte à base antes de mudar a direção.',
    attention: 'Evite cruzar ou arrastar os pés e mantenha o olhar à frente.',
    videoTitle: 'Trabalho de pés para iniciantes', videoUrl: 'https://www.youtube.com/watch?v=qHBYtdR4xHg&t=240s', provider: 'GMAU',
  },
  return: {
    id: 'return', title: 'Entrar, sair e recuperar a base', objective: 'Controlar a distância e terminar equilibrado.',
    instructions: 'Aproxime-se de um ponto imaginário com um passo curto, pare equilibrado e recue. Encontre novamente a base antes de repetir.',
    attention: 'Evite passos grandes, tronco inclinado e saída com os pés cruzados.',
    videoTitle: 'Trabalho de pés para iniciantes', videoUrl: 'https://www.youtube.com/watch?v=qHBYtdR4xHg&t=595s', provider: 'GMAU',
  },
  knee: {
    id: 'knee', title: 'Joelhada controlada no ar', objective: 'Praticar equilíbrio e retorno à base.',
    instructions: 'Eleve um joelho até uma altura confortável, baixe com controle e reencontre a base. Alterne os lados sem contato.',
    attention: 'Observe se o tronco cai, o apoio fica instável ou a respiração é presa.',
    videoTitle: 'Muay Thai para iniciantes — joelhadas', videoUrl: 'https://www.youtube.com/watch?v=QrcEYNzuZQg&t=180s', provider: 'Martial Spirit',
  },
  jab: {
    id: 'jab', title: 'Golpe reto leve e volta à guarda', objective: 'Coordenar braço, passo e retorno à guarda.',
    instructions: 'Se o braço estiver confortável, faça um golpe reto leve no ar, recolha a mão e volte à base. Se não estiver, pratique só o deslocamento.',
    attention: 'Não acelere nem faça grande volume. Observe tensão no ombro e qualquer mudança de sintomas.',
    videoTitle: 'Sombra de Muay Thai — parte 1', videoUrl: 'https://www.youtube.com/watch?v=s3uW3XSOdvA&t=300s', provider: 'Martial Spirit',
  },
  teep: {
    id: 'teep', title: 'Teep no ar e recuperação', objective: 'Elevar e recolher a perna mantendo equilíbrio.',
    instructions: 'Comece com a perna da frente em altura confortável, recolha e pouse na base. Experimente a de trás apenas se o retorno estiver estável.',
    attention: 'Evite cair para frente ou para trás e abandonar a guarda.',
    videoTitle: 'Teep para iniciantes', videoUrl: 'https://www.youtube.com/watch?v=wx8JZfwH3P0&t=215s', provider: 'GMAU',
  },
  layers: {
    id: 'layers', title: 'Duas ações em camadas', objective: 'Ligar habilidades já conhecidas sem perder a base.',
    instructions: 'Repita passo → base. Depois acrescente passo → joelho no ar → base. Se o braço estiver confortável, o joelho pode ser substituído por um golpe reto leve no ar.',
    attention: 'Adicione uma ação por vez. Não acelere só para lembrar a sequência.',
    videoTitle: 'Combinações por camadas', videoUrl: 'https://www.youtube.com/watch?v=Cn5Z0bOhr1M&t=480s', provider: 'Spring Sia',
  },
  check: {
    id: 'check', title: 'Check isolado e pouso', objective: 'Praticar uma defesa sem contato e recuperar equilíbrio.',
    instructions: 'Eleve uma perna no gesto de check, pouse com controle e volte à base. Faça sem colisão ou contra-ataque.',
    attention: 'Não incline o tronco demais nem combine outro movimento antes de pousar estável.',
    videoTitle: 'Check de Muay Thai', videoUrl: 'https://www.youtube.com/watch?v=A8um9fxAgko', provider: 'Spring Sia',
  },
  exit: {
    id: 'exit', title: 'Saída lateral ou diagonal', objective: 'Mudar de direção após uma ação simples.',
    instructions: 'Depois de um passo ou joelhada já conhecidos, faça uma saída curta para o lado ou diagonal, retome a base e pause.',
    attention: 'Evite passo excessivo e pés estreitos ao terminar.',
    videoTitle: 'Saídas e ângulos', videoUrl: 'https://www.youtube.com/watch?v=APIjooz_ulY&t=360s', provider: 'Spring Sia',
  },
  shadow: {
    id: 'shadow', title: 'Sombra curta pessoal', objective: 'Combinar duas ou três habilidades conhecidas.',
    instructions: 'Experimente passo → joelhada controlada no ar → saída lateral. Volte à base e troque apenas um elemento por vez.',
    attention: 'Prefira sequência curta e técnica estável; não transforme a sessão em teste de potência.',
    videoTitle: 'Combinações por camadas', videoUrl: 'https://www.youtube.com/watch?v=Cn5Z0bOhr1M', provider: 'Spring Sia',
  },
} satisfies Record<string, MuayPractice>

type PracticeId = keyof typeof practices

const byBlock: readonly (readonly PracticeId[])[] = [
  ['base', 'directions', 'return', 'knee'],
  ['base', 'return', 'jab', 'teep', 'layers'],
  ['directions', 'layers', 'check', 'exit'],
  ['directions', 'knee', 'check', 'exit'],
  ['return', 'layers', 'exit', 'shadow'],
  ['base', 'directions', 'shadow'],
]

export function getMuayPractices(week: number, itemId: 'muay-mon' | 'muay-fri', mode: 'normal' | 'reduzido' | 'minimo'): MuayPractice[] {
  if (mode === 'minimo') return [practices.base]
  if (itemId === 'muay-fri' || mode === 'reduzido') return [practices.base, practices.directions]
  const index = Math.min(5, Math.max(0, Math.floor((week - 1) / 4)))
  return byBlock[index].map((id) => practices[id])
}
