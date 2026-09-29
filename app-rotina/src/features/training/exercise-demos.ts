import type { TrainingExercise } from './training-plan'

export interface ExerciseDemo {
  videoTitle: string
  videoUrl: string
  provider: string
  example: string
  note?: string
}

const demos = {
  chair: {
    videoTitle: 'Sit to stand', videoUrl: 'https://www.youtube.com/watch?v=gJys6ExNtXA', provider: 'Barts Health NHS',
    example: 'Sente na parte da frente de uma cadeira firme, deixe os pés apoiados, incline o tronco levemente, levante e volte a sentar devagar.',
    note: 'O vídeo mostra sentar e levantar. Nas versões de agachamento, siga a pausa ou o toque na cadeira descritos acima.',
  },
  push: {
    videoTitle: 'Standing press-up', videoUrl: 'https://www.youtube.com/watch?v=NL8IRKjLPf0', provider: 'NHS',
    example: 'De frente para uma parede firme, apoie as mãos, leve o peito em direção à parede com o corpo alinhado e empurre para voltar.',
    note: 'O vídeo mostra a versão na parede. Use bancada somente se essa inclinação já for confortável para o braço.',
  },
  bridge: {
    videoTitle: 'Bridge exercise', videoUrl: 'https://www.youtube.com/watch?v=T9xBCdMimL8', provider: 'Barts Health NHS',
    example: 'Deite de costas, dobre os joelhos, apoie os pés e eleve o quadril sem exagerar o arco da lombar; desça com controle.',
    note: 'O vídeo mostra a ponte básica. Faça a pausa ou a marcha curta somente conforme a instrução do treino.',
  },
  bridgeMarch: {
    videoTitle: 'Glute Bridge with a March', videoUrl: 'https://www.youtube.com/watch?v=L1s4_F_qB6Q', provider: 'Physical Therapy First',
    example: 'Eleve o quadril como na ponte comum e alivie um pé por vez, por pouco tempo, tentando manter a bacia nivelada.',
    note: 'No Ritmo, o pé sobe só um pouco. Volte à ponte comum se perder o controle.',
  },
  row: {
    videoTitle: 'Seated Towel Row', videoUrl: 'https://www.youtube.com/watch?v=3L9Gzz2EQ3w', provider: 'GrabGains',
    example: 'Sentado, passe uma toalha resistente pelas solas dos pés. Puxe os cotovelos para trás enquanto os pés oferecem resistência, sem prender a respiração.',
    note: 'O vídeo mostra a posição com toalha nos pés. No Ritmo, mantenha a tração parada pelo tempo indicado, sem fazer remadas rápidas.',
  },
  deadBug: {
    videoTitle: 'Dead Bug — Legs Only', videoUrl: 'https://www.youtube.com/watch?v=gA8NWz4hEwA', provider: 'Rehab My Patient',
    example: 'Deitado de costas, estabilize o tronco e afaste uma perna por vez. Pare antes que a lombar comece a arquear.',
    note: 'O vídeo mostra a perna mais estendida; no Ritmo, reduza a amplitude e mantenha o joelho dobrado se necessário.',
  },
  heelTap: {
    videoTitle: 'Supine Heel Taps', videoUrl: 'https://www.youtube.com/watch?v=Xxv-9mA3qLc', provider: 'B3 Physical Therapy',
    example: 'Deite de costas, erga as pernas com os joelhos dobrados e toque o chão com um calcanhar de cada vez, sem deixar o tronco balançar.',
  },
  lunge: {
    videoTitle: 'Lunge exercise', videoUrl: 'https://www.youtube.com/watch?v=UVuoO1OtZCs', provider: 'Barts Health NHS',
    example: 'Com uma mão em apoio firme, deixe um pé à frente e outro atrás. Flexione os joelhos um pouco e volte a subir com controle.',
    note: 'O vídeo mostra o avanço básico. No Ritmo, use apoio, passo menor e amplitude confortável; o passo para trás começa com os pés juntos.',
  },
  lateral: {
    videoTitle: 'How to Do Side Lunges', videoUrl: 'https://www.youtube.com/watch?v=u1K3p7YS31g', provider: 'Hinge Health',
    example: 'Dê um passo curto para o lado, leve o quadril discretamente para trás e retorne. Segure um apoio estável se precisar.',
    note: 'O vídeo mostra uma flexão lateral mais ampla. No Ritmo, mantenha o passo curto e a flexão pequena, como descrito no treino.',
  },
  hinge: {
    videoTitle: 'How to Do a Hip Hinge', videoUrl: 'https://www.youtube.com/watch?v=2W_gXhut5S8', provider: 'Hinge Health',
    example: 'Em pé, destrave os joelhos e leve o quadril para trás, como se fosse encostar a parte de trás do corpo numa parede; volte a ficar ereto.',
    note: 'O vídeo mostra a dobra de quadril básica. Nas versões de base alternada ou descida lenta, siga o detalhe descrito acima.',
  },
  calf: {
    videoTitle: 'Double leg heel raise exercise', videoUrl: 'https://www.youtube.com/watch?v=1jjrOWwbCOo', provider: 'Barts Health NHS',
    example: 'Perto de um apoio firme, fique na ponta dos pés e abaixe os calcanhares devagar, sem inclinar o corpo para a frente.',
    note: 'O vídeo mostra os dois pés. Para a versão com ênfase unilateral, transfira só parte do peso e mantenha o outro pé ajudando.',
  },
  march: {
    videoTitle: 'Marching on the Spot', videoUrl: 'https://www.youtube.com/watch?v=_Ox0N-Ab3Sc', provider: 'Dr O’Donovan e fisioterapeuta Ella Boys',
    example: 'Marche no lugar alternando os pés e mantendo o tronco ereto. Comece devagar; ajuste a altura do joelho e o ritmo ao treino.',
    note: 'O vídeo apresenta variações de marcha. No Ritmo, siga o ritmo e o tempo indicados acima, sempre sem saltos.',
  },
  mobility: {
    videoTitle: 'Basic warm-up — 5 minutes', videoUrl: 'https://www.youtube.com/watch?v=oLu9kwDzBdg', provider: 'NHS',
    example: 'Movimente suavemente ombros, cotovelos, mãos, quadris e tornozelos dentro de uma amplitude confortável.',
    note: 'O vídeo é um aquecimento mais longo; na versão mínima, faça apenas os movimentos confortáveis pelo tempo do Ritmo.',
  },
} satisfies Record<string, ExerciseDemo>

export function getExerciseDemo(exercise: TrainingExercise): ExerciseDemo | null {
  const id = exercise.id
  if (id === 'minimum-mobility') return demos.mobility
  if (id.includes('march') && !id.includes('bridge')) return demos.march
  if (id.includes('bridge') && id.includes('march')) return demos.bridgeMarch
  if (id.includes('bridge')) return demos.bridge
  if (id.includes('push')) return demos.push
  if (id.includes('row')) return demos.row
  if (id.includes('dead-bug')) return demos.deadBug
  if (id.includes('heel-tap')) return demos.heelTap
  if (id.includes('calf')) return demos.calf
  if (id.includes('lateral')) return demos.lateral
  if (id.includes('step-back') || id.includes('split-squat')) return demos.lunge
  if (id.includes('hinge') || id.includes('good-morning')) return demos.hinge
  if (id.includes('chair') || id.includes('squat')) return demos.chair
  return null
}
