import { localDateKey } from '../../core/domain'
import { sumMoney } from '../../core/money'
import type { BodyMeasurement, DailyCompletion, DailyPlanSnapshot, MealLog } from '../../core/types'
import { buildFinancialMovements, type FinanceSources, type FinancialMovement } from '../finance/finance'

type NutritionWeekSources = Pick<FinanceSources, 'shifts' | 'expenses' | 'records'> & {
  measurements: readonly BodyMeasurement[]
  mealLogs: readonly MealLog[]
  snapshots: readonly DailyPlanSnapshot[]
  completions: readonly DailyCompletion[]
}

function shiftDate(localDate: string, days: number): string {
  const date = new Date(`${localDate}T12:00:00`)
  date.setDate(date.getDate() + days)
  return localDateKey(date)
}

function summarizePeriod(start: string, end: string, sources: NutritionWeekSources, movements: readonly FinancialMovement[]) {
  const inPeriod = (date: string) => date >= start && date <= end
  const measured = sources.measurements.filter((item) => inPeriod(item.localDate))
  const waistMeasurements = measured.filter((item) => item.waistCm !== undefined).sort((a, b) => b.localDate.localeCompare(a.localDate))
  const meals = sources.mealLogs.filter((item) => inPeriod(item.localDate))
  const snapshots = sources.snapshots.filter((item) => inPeriod(item.localDate))
  const completedIds = new Set(sources.completions.filter((item) => inPeriod(item.localDate) && item.state === 'done').map((item) => `${item.localDate}:${item.routineItemId}`))
  const planned = snapshots.flatMap((snapshot) => snapshot.activities.filter((activity) => activity.area === 'treino').map((activity) => `${snapshot.localDate}:${activity.routineItemId}`))
  const uniquePlanned = [...new Set(planned)]
  const foodMovements = movements.filter((row) => inPeriod(row.localDate) && row.category === 'Alimentação' && row.type === 'saida' && row.status === 'realizado' && row.amount !== null)
  return {
    start,
    end,
    weight: { average: measured.length ? measured.reduce((total, item) => total + item.weightKg, 0) / measured.length : null, days: new Set(measured.map((item) => item.localDate)).size },
    waist: { latest: waistMeasurements[0]?.waistCm ?? null, days: new Set(waistMeasurements.map((item) => item.localDate)).size },
    meals: { days: new Set(meals.map((item) => item.localDate)).size, registered: meals.length, protein: meals.filter((item) => item.outcome === 'with-protein').length, skipped: meals.filter((item) => item.outcome === 'skipped').length },
    training: { coverageDays: new Set(snapshots.map((item) => item.localDate)).size, planned: uniquePlanned.length, done: uniquePlanned.filter((id) => completedIds.has(id)).length },
    spending: { total: foodMovements.length ? sumMoney(foodMovements.map((row) => row.amount)) : null, count: foodMovements.length },
  }
}

export function summarizeNutritionWeeks(today: string, sources: NutritionWeekSources) {
  const currentEnd = shiftDate(today, -1)
  const currentStart = shiftDate(today, -7)
  const previousEnd = shiftDate(today, -8)
  const previousStart = shiftDate(today, -14)
  // A mesma projeção canônica usada pelo Financeiro reúne gastos atuais e legados.
  const movements = buildFinancialMovements({ today, shifts: sources.shifts, expenses: sources.expenses, records: sources.records })
  const current = summarizePeriod(currentStart, currentEnd, sources, movements)
  const previous = summarizePeriod(previousStart, previousEnd, sources, movements)
  const weightChangeKg = current.weight.average === null || previous.weight.average === null ? null : current.weight.average - previous.weight.average
  const waistChangeCm = current.waist.latest === null || previous.waist.latest === null ? null : current.waist.latest - previous.waist.latest
  const message = weightChangeKg === null
    ? 'Dados ainda insuficientes para comparar o peso entre os dois períodos.'
    : current.weight.days < 2 || previous.weight.days < 2
      ? 'Há medidas nos dois períodos, mas poucos dias registrados. Observe mais uma semana.'
      : Math.abs(weightChangeKg) < 0.2
        ? 'Tendência de peso estável nos registros disponíveis.'
        : 'As médias de peso diferem. Vale revisar a rotina se fome, energia ou recuperação estiverem difíceis.'
  return { current, previous, weightChangeKg, waistChangeCm, message }
}
