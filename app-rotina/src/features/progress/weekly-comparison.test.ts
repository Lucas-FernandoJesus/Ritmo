import { describe, expect, it } from 'vitest'
import type { WeeklyProgressSummary } from '../../core/types'
import { compareWeeklyProgress } from './weekly-comparison'

const summary = (activityPercentage: number, requiredActivities = 10): WeeklyProgressSummary => ({
  weekStart: '2026-09-21',
  weekEnd: '2026-09-27',
  plannedDays: requiredActivities ? 7 : 0,
  completedDays: 0,
  requiredActivities,
  completedRequiredActivities: requiredActivities ? Math.round(requiredActivities * activityPercentage / 100) : 0,
  activityPercentage,
})

describe('compareWeeklyProgress', () => {
  it('preserva ausência de base e oferece sugestões neutras por tendência', () => {
    expect(compareWeeklyProgress(summary(40), summary(0, 0))).toEqual({ status: 'no-data', delta: null, message: 'Ainda sem base anterior para comparar.' })
    expect(compareWeeklyProgress(summary(70), summary(40))).toEqual({ status: 'up', delta: 30, message: 'Você avançou 30 pontos percentuais. Mantenha o ritmo que coube.' })
    expect(compareWeeklyProgress(summary(42), summary(40))).toEqual({ status: 'stable', delta: 2, message: 'Ritmo semelhante à semana anterior. Preserve o que está sustentável.' })
    expect(compareWeeklyProgress(summary(30), summary(60))).toEqual({ status: 'down', delta: -30, message: 'A semana está mais leve. Escolha uma atividade essencial para retomar.' })
  })
})
