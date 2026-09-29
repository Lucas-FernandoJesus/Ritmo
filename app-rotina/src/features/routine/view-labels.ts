import type { RoutineArea, RoutineMode } from '../../core/types'

export const areaLabels: Record<RoutineArea, string> = {
  sono: 'Sono', saude: 'Bem-estar', trabalho: 'Trabalho', treino: 'Treino', alimentacao: 'Alimentação', casa: 'Casa', estudos: 'Estudos', financas: 'Finanças', delivery: 'Delivery', lazer: 'Tempo livre',
}

export const modeCopy: Record<RoutineMode, { label: string; detail: string }> = {
  normal: { label: 'Normal', detail: 'Rotina completa' },
  reduzido: { label: 'Reduzido', detail: 'Só o sustentável' },
  minimo: { label: 'Mínimo', detail: 'Essencial e descanso' },
}
