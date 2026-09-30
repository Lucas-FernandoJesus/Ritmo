import type { WeeklyProgressSummary } from '../../core/types'

export type WeeklyComparison = {
  status: 'no-data' | 'up' | 'stable' | 'down'
  delta: number | null
  message: string
}

export function compareWeeklyProgress(current: WeeklyProgressSummary, previous: WeeklyProgressSummary): WeeklyComparison {
  if (!current.plannedDays || !current.requiredActivities || !previous.plannedDays || !previous.requiredActivities) {
    return { status: 'no-data', delta: null, message: 'Ainda sem base anterior para comparar.' }
  }
  const delta = current.activityPercentage - previous.activityPercentage
  if (Math.abs(delta) < 5) return { status: 'stable', delta, message: 'Ritmo semelhante à semana anterior. Preserve o que está sustentável.' }
  if (delta > 0) return { status: 'up', delta, message: `Você avançou ${delta} pontos percentuais. Mantenha o ritmo que coube.` }
  return { status: 'down', delta, message: 'A semana está mais leve. Escolha uma atividade essencial para retomar.' }
}
