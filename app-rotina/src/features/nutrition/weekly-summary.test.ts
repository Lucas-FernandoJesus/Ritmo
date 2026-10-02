import { describe, expect, it } from 'vitest'
import type { BodyMeasurement, DailyCompletion, DailyPlanSnapshot, Expense, FinancialRecord, MealLog } from '../../core/types'
import { summarizeNutritionWeeks } from './weekly-summary'

const time = '2026-10-01T12:00:00.000Z'
const measurement = (date: string, weightKg: number, waistCm?: number): BodyMeasurement => ({ id: date, localDate: date, weightKg, ...(waistCm === undefined ? {} : { waistCm }), createdAt: time, updatedAt: time })
const meal = (date: string, slot: MealLog['meal'], outcome: MealLog['outcome']): MealLog => ({ id: `${date}:${slot}`, localDate: date, meal: slot, outcome, createdAt: time, updatedAt: time })
const snapshot = (date: string, activities: DailyPlanSnapshot['activities']): DailyPlanSnapshot => ({ id: date, localDate: date, mode: 'normal', activities, capturedAt: time })
const completion = (date: string, id: string, state: DailyCompletion['state'] = 'done'): DailyCompletion => ({ id: `${date}:${id}`, localDate: date, routineItemId: id, state, changedAt: time })
const expense = (date: string, id: string, amount: number): Expense => ({ id, localDate: date, description: 'Mercado', category: 'Alimentação', amount, createdAt: time })
const record = (date: string, id: string, amount: number, type: FinancialRecord['type'] = 'saida'): FinancialRecord => ({ id, localDate: date, description: 'Comida', category: 'Alimentação', type, amount, createdAt: time })

describe('resumo semanal de Nutrição', () => {
  it('compara 7 dias completos com os 7 anteriores usando dados observados', () => {
    const result = summarizeNutritionWeeks('2026-10-01', {
      measurements: [measurement('2026-09-17', 102), measurement('2026-09-21', 100, 117), measurement('2026-09-24', 99), measurement('2026-09-30', 98, 116), measurement('2026-10-01', 90, 110)],
      mealLogs: [meal('2026-09-20', 'lunch', 'with-protein'), meal('2026-09-24', 'breakfast', 'with-protein'), meal('2026-09-24', 'lunch', 'skipped'), meal('2026-09-26', 'dinner', 'without-protein'), meal('2026-10-01', 'breakfast', 'with-protein')],
      snapshots: [snapshot('2026-09-24', [{ routineItemId: 'muay', title: 'Muay Thai', area: 'treino', nature: 'flexivel' }, { routineItemId: 'work', title: 'Trabalho', area: 'trabalho', nature: 'fixa' }]), snapshot('2026-09-25', [{ routineItemId: 'strength', title: 'Força', area: 'treino', nature: 'flexivel' }]), snapshot('2026-10-01', [{ routineItemId: 'future', title: 'Treino', area: 'treino', nature: 'flexivel' }])],
      completions: [completion('2026-09-24', 'muay'), completion('2026-09-25', 'strength', 'skipped'), completion('2026-10-01', 'future')],
      shifts: [], expenses: [expense('2026-09-18', 'previous', 5), expense('2026-09-24', 'legacy', 10), expense('2026-10-01', 'today', 100)],
      records: [record('2026-09-26', 'current', 20), record('2026-09-27', 'pending', 50, 'pendencia')],
    })
    expect(result.current).toMatchObject({ start: '2026-09-24', end: '2026-09-30', weight: { average: 98.5, days: 2 }, waist: { latest: 116, days: 1 }, meals: { days: 2, registered: 3, protein: 1, skipped: 1 }, training: { coverageDays: 2, planned: 2, done: 1 }, spending: { total: 30, count: 2 } })
    expect(result.previous).toMatchObject({ start: '2026-09-17', end: '2026-09-23', weight: { average: 101, days: 2 }, waist: { latest: 117, days: 1 }, spending: { total: 5, count: 1 } })
    expect(result.weightChangeKg).toBe(-2.5)
    expect(result.waistChangeCm).toBe(-1)
  })

  it('preserva sem dados quando falta histórico e não interpreta conclusão sem treino planejado', () => {
    const result = summarizeNutritionWeeks('2026-10-01', { measurements: [measurement('2026-09-30', 100)], mealLogs: [], snapshots: [], completions: [completion('2026-09-30', 'muay')], shifts: [], expenses: [], records: [] })
    expect(result.previous.weight.average).toBeNull()
    expect(result.weightChangeKg).toBeNull()
    expect(result.current.training).toEqual({ coverageDays: 0, planned: 0, done: 0 })
    expect(result.current.spending.total).toBeNull()
    expect(result.current.meals.registered).toBe(0)
    expect(result.message).toContain('Dados ainda insuficientes')
  })
})
