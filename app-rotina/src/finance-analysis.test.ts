import { describe, expect, it } from 'vitest'
import { buildFinancialMovements, deliveryFinancials, financialPeriod } from './finance'
import { calculateBudgetUsage, calculateGoalProgress, calculatePeriodComparison, calculateProjectedBalance, calculateFinancialAlerts, calculateDeliveryPerformance, calculateExpenseTrend, buildFinanceAnalysis, financialSeries } from './finance-analysis'
import { categoryBudgetId, defaultSettings, isValidCategoryBudget, isValidFinancialGoal, validateBackup } from './domain'
import type { CategoryBudget, DeliveryShift, FinancialGoal, FinancialRecord } from './types'
import { sumMoney, subtractMoney } from './money'

const today = '2026-09-22'
const createdAt = `${today}T12:00:00.000Z`
const interval = { start: '2026-09-01', end: '2026-09-30' }
const record = (id: string, type: FinancialRecord['type'], amount: number, localDate = today, extra: Partial<FinancialRecord> = {}): FinancialRecord => ({ id, type, amount, localDate, description: id, category: 'Alimentação', createdAt, ...extra })
const sources = (records: FinancialRecord[] = [], shifts: DeliveryShift[] = []) => ({ today, records, shifts, expenses: [] })
const rows = (records: FinancialRecord[]) => buildFinancialMovements(sources(records))
const goal: FinancialGoal = { id: 'goal', name: 'Renda mensal', type: 'income', target: 1000, startDate: interval.start, endDate: interval.end, createdAt }
const budget: CategoryBudget = { id: categoryBudgetId('2026-09', 'Alimentação'), month: '2026-09', category: 'Alimentação', limit: 100, createdAt }
const shift: DeliveryShift = { id: 'shift', localDate: today, startTime: '20:00', endTime: '02:00', hours: 6, kilometers: 30, grossRevenue: 200, fuelCost: 20, maintenanceReserve: 10, otherExpenses: 5, estimatedResult: 165, resultPerHour: 27.5, resultPerKilometer: 5.5, fatigueLevel: 1, armCondition: 'habitual', createdAt }

describe('metas automáticas e limites', () => {
  it.each([[0, 0], [750, 75], [1000, 100], [1200, 120]])('calcula renda %s e progresso %s', (amount, percentage) => {
    expect(calculateGoalProgress(goal, rows([record('in', 'entrada', amount)]), today)).toMatchObject({ current: amount, percentage })
  })
  it('não inventa realizado e separa datas futuras', () => {
    expect(calculateGoalProgress(goal, [], today)).toMatchObject({ current: null, percentage: null, status: 'no-data' })
    expect(calculateGoalProgress(goal, rows([record('later', 'entrada', 2000, '2026-09-30')]), today).current).toBeNull()
  })
  it('deriva renda líquida e economia do saldo dos registros, sem reserva', () => {
    const data = rows([record('in', 'entrada', 100), record('out', 'saida', 40)])
    for (const type of ['net-income', 'savings'] as const) expect(calculateGoalProgress({ ...goal, type }, data, today).current).toBe(60)
  })
  it('trata limite de despesas como consumo, não como meta de gastar', () => {
    expect(calculateGoalProgress({ ...goal, type: 'expense-limit', target: 100 }, rows([record('out', 'saida', 120)]), today)).toMatchObject({ current: 120, status: 'exceeded', percentage: 120 })
  })
  it('calcula as duas metas de delivery sem descontar reserva do líquido operacional', () => {
    const data = buildFinancialMovements(sources([], [shift]))
    expect(calculateGoalProgress({ ...goal, type: 'delivery-income' }, data, today).current).toBe(200)
    expect(calculateGoalProgress({ ...goal, type: 'delivery-net' }, data, today).current).toBe(175)
  })
  it.each([[50, 'within'], [80, 'near'], [100, 'reached'], [120, 'exceeded']] as const)('orçamento de %s fica %s', (amount, status) => {
    expect(calculateBudgetUsage(budget, rows([record('out', 'saida', amount)]), today)).toMatchObject({ spent: amount, remaining: 100 - amount, percentage: amount, status })
  })
  it('orçamento sem gasto informa ausência de registros, e não cria movimentação', () => {
    expect(calculateBudgetUsage(budget, [], today)).toMatchObject({ spent: null, remaining: null, status: 'no-data' })
  })
  it('usa mês civil, saída paga e categoria; exclui reserva, aberto e futuro', () => {
    const data = rows([record('out', 'saida', 0.1), record('out2', 'saida', 0.2), record('pending', 'pendencia', 10), record('later', 'saida', 99, '2026-09-30'), record('old', 'saida', 50, '2026-08-31')])
    expect(calculateBudgetUsage(budget, data, today).spent).toBe(0.3)
  })
  it('orçamento de combustível conta o campo do turno e vínculos classificados uma vez', () => {
    const data = buildFinancialMovements(sources([record('fuel', 'saida', 5, today, { deliveryShiftId: shift.id, deliveryCostKind: 'combustivel' })], [shift]))
    const plan = { ...budget, deliveryCostKind: 'combustivel' as const }
    expect(calculateBudgetUsage(plan, data, today).spent).toBe(25)
  })
})

describe('comparação e tendências com base verificável', () => {
  it.each([[120, 20], [80, -20]])('compara %s com o mês anterior', (amount, percentage) => {
    const result = calculatePeriodComparison(sources([record('now', 'entrada', amount), record('old', 'entrada', 100, '2026-08-22')]), interval, 'month')
    expect(result.metrics.find((item) => item.id === 'entries')).toMatchObject({ current: amount, previous: 100, percentage })
  })
  it('mantém diferença absoluta, sem divisão por zero', () => {
    const result = calculatePeriodComparison(sources([record('now', 'entrada', 100), record('old', 'entrada', 0, '2026-08-22')]), interval, 'month')
    expect(result.metrics[0]).toMatchObject({ difference: 100, percentage: null, status: 'no-base' })
  })
  it('não troca ausência de histórico por zero', () => {
    expect(calculatePeriodComparison(sources([record('now', 'entrada', 100)]), interval, 'month').metrics[0]).toMatchObject({ previous: null, status: 'no-base' })
  })
  it('compara anos civis e também calcula intervalo anterior personalizado', () => {
    const result = calculatePeriodComparison(sources([record('now', 'entrada', 100), record('old', 'entrada', 50, '2025-09-22')]), financialPeriod('year', today), 'year')
    expect(result.previousInterval).toEqual({ start: '2025-01-01', end: '2025-12-31' })
    expect(result.metrics[0].percentage).toBe(100)
    expect(calculatePeriodComparison(sources(), { start: '2026-09-10', end: '2026-09-12' }, 'custom').previousInterval).toEqual({ start: '2026-09-07', end: '2026-09-09' })
  })
  it.each([['increasing', [10, 10, 10, 20, 20, 20]], ['decreasing', [20, 20, 20, 10, 10, 10]], ['stable', [10, 10, 10, 10, 10, 10]]] as const)('sinaliza %s com seis dias observados', (direction, amounts) => {
    const data = rows(amounts.map((amount, index) => record(`day${index}`, 'saida', amount, `2026-09-${16 + index}`)))
    expect(calculateExpenseTrend(data, 'daily', today)).toMatchObject({ direction, sampleCount: 6 })
  })
  it('não declara tendência com um mês/dia ou lacunas', () => {
    expect(calculateExpenseTrend(rows([record('one', 'saida', 10)]), 'daily', today).direction).toBe('insufficient')
    expect(calculateExpenseTrend(rows([record('one', 'saida', 10)]), 'monthly', today).direction).toBe('insufficient')
  })
  it('analisa semanas e meses completos, e recusa sequência com lacuna', () => {
    const monthly = rows([1, 2, 3, 4, 5, 6].map((month) => record(`m${month}`, 'saida', month < 4 ? 10 : 20, `2026-0${month}-15`)))
    expect(calculateExpenseTrend(monthly, 'monthly', today)).toMatchObject({ direction: 'increasing', percentage: 100 })
    const weekly = rows(['08-03', '08-10', '08-17', '08-24', '08-31', '09-07'].map((date, index) => record(`w${index}`, 'saida', index < 3 ? 20 : 10, `2026-${date}`)))
    expect(calculateExpenseTrend(weekly, 'weekly', today).direction).toBe('decreasing')
    const missing = rows(['09-10', '09-11', '09-12', '09-16', '09-17', '09-18'].map((date) => record(date, 'saida', 10, `2026-${date}`)))
    expect(calculateExpenseTrend(missing, 'daily', today).direction).toBe('insufficient')
  })
  it('retorna categorias crescentes somente com base nos dois blocos', () => {
    const data = rows([10, 10, 10, 20, 20, 20].map((amount, index) => record(`d${index}`, 'saida', amount, `2026-09-${16 + index}`)))
    expect(calculateExpenseTrend(data, 'daily', today).categories).toEqual([expect.objectContaining({ category: 'Alimentação', percentage: 100 })])
  })
})

describe('projeções e alertas separados do realizado', () => {
  it('projeta somente saldo atual quando não há compromissos', () => {
    expect(calculateProjectedBalance(rows([record('in', 'entrada', 2500)]), today, 30)).toMatchObject({ current: 2500, projected: 2500, impact: 0 })
  })
  it('soma créditos e entradas futuras; subtrai pendências e despesas futuras', () => {
    const data = rows([record('in', 'entrada', 2500), record('credit', 'credito', 1000, '2026-09-25'), record('later', 'entrada', 200, '2026-09-26'), record('pending', 'pendencia', 800, '2026-09-27'), record('expense', 'saida', 100, '2026-09-28')])
    expect(calculateProjectedBalance(data, today, 7)).toMatchObject({ current: 2500, credits: 1000, futureEntries: 200, pending: 800, futureExits: 100, projected: 2800 })
  })
  it('exclui reserva futura e protege saldo ausente', () => {
    const data = buildFinancialMovements(sources([record('credit', 'credito', 100, '2026-09-25')], [{ ...shift, localDate: '2026-10-30' }]))
    expect(calculateProjectedBalance(data, today, 30)).toMatchObject({ current: null, projected: null, pending: 0, impact: 100 })
  })
  it('inclui vencidos nos horizontes, sem contar o mesmo compromisso duas vezes', () => {
    const result = calculateProjectedBalance(rows([record('in', 'entrada', 100), record('old', 'pendencia', 300, '2026-09-20'), record('far', 'pendencia', 100, '2026-10-20')]), today, 7)
    expect(result).toMatchObject({ pending: 300, projected: -200, overdueCount: 1 })
  })
  it('detecta falta de saldo intermediária mesmo com saldo final positivo', () => {
    const data = rows([record('in', 'entrada', 100), record('bill', 'pendencia', 200, '2026-09-24'), record('credit', 'credito', 400, '2026-09-28')])
    expect(calculateProjectedBalance(data, today, 30)).toMatchObject({ projected: 300, minimum: -100, riskDate: '2026-09-24' })
  })
  it('distingue horizontes 7, 15 e 30 dias', () => {
    const data = rows([record('in', 'entrada', 100), record('seven', 'credito', 10, '2026-09-29'), record('fifteen', 'credito', 20, '2026-10-07'), record('thirty', 'credito', 30, '2026-10-22')])
    expect([7, 15, 30].map((days) => calculateProjectedBalance(data, today, days).projected)).toEqual([110, 130, 160])
  })
  it('alerta queda e crescimento somente em períodos completos com dados suficientes', () => {
    const records = [1, 2, 3].flatMap((day) => [record(`old-in${day}`, 'entrada', 100, `2026-08-0${day}`), record(`in${day}`, 'entrada', 50, `2026-09-0${day}`), record(`old-out${day}`, 'saida', 10, `2026-08-0${day}`), record(`out${day}`, 'saida', 20, `2026-09-0${day}`)])
    const data = buildFinanceAnalysis({ ...sources(records), today: '2026-10-01', goals: [], budgets: [], interval, period: 'month' })
    expect(data.alerts.map((alert) => alert.code)).toEqual(expect.arrayContaining(['income-drop', 'expense-growth']))
    const partial = buildFinanceAnalysis({ ...sources(records), goals: [], budgets: [], interval, period: 'month' })
    expect(partial.alerts.map((alert) => alert.code)).not.toEqual(expect.arrayContaining(['income-drop']))
  })
  it('alerta vencido, próximo e saldo negativo em grupos', () => {
    const result = buildFinanceAnalysis({ ...sources([record('in', 'entrada', 100), record('old', 'pendencia', 200, '2026-09-20'), record('next', 'pendencia', 50, '2026-09-25')]), goals: [], budgets: [], interval, period: 'month' })
    expect(result.alerts.map((alert) => alert.code)).toEqual(expect.arrayContaining(['overdue', 'upcoming', 'negative-projection']))
  })
  it('alerta orçamento excedido e meta próxima; não inventa alertas em vazio', () => {
    const data = rows([record('in', 'entrada', 900), record('out', 'saida', 120)])
    const alerts = calculateFinancialAlerts({ rows: data, today, goals: [calculateGoalProgress(goal, data, today)], budgets: [calculateBudgetUsage(budget, data, today)], projections: [calculateProjectedBalance(data, today, 30)] })
    expect(alerts.map((alert) => alert.code)).toEqual(expect.arrayContaining(['budget-exceeded', 'goal-near']))
    expect(calculateFinancialAlerts({ rows: [], today, goals: [], budgets: [], projections: [] })).toEqual([])
  })
})

describe('desempenho operacional do delivery', () => {
  it('calcula as quatro taxas e reserva separada', () => {
    const result = calculateDeliveryPerformance(sources([], [shift]), interval)
    expect(result).toMatchObject({ gross: 200, expenses: 25, net: 175, reserve: 10, afterReserve: 165, hours: 6, count: 1, averageGross: 200, averageNet: 175, sufficient: false })
    expect(result.grossPerHour).toBeCloseTo(200 / 6)
    expect(result.expensesPerHour).toBeCloseTo(25 / 6)
    expect(result.netPerHour).toBeCloseTo(175 / 6)
    expect(result.afterReservePerHour).toBeCloseTo(165 / 6)
  })
  it('inclui gastos vinculados classificados, mas não gerais ou futuros', () => {
    const result = calculateDeliveryPerformance(sources([record('fee', 'saida', 5, today, { deliveryShiftId: shift.id, deliveryCostKind: 'taxas' }), record('rent', 'saida', 500), record('future', 'saida', 100, '2026-10-01', { deliveryShiftId: shift.id })], [shift]), interval)
    expect(result).toMatchObject({ expenses: 30, net: 170 })
    expect(result.costs.find((cost) => cost.key === 'taxas')).toMatchObject({ amount: 5, revenuePercentage: 2.5 })
  })
  it.each([['20:00', '20:00'], ['', '02:00']])('protege taxas com horários %s–%s', (startTime, endTime) => {
    const result = calculateDeliveryPerformance(sources([], [{ ...shift, startTime, endTime }]), interval)
    expect(result.grossPerHour).toBeNull()
    expect(result.netPerHour).toBeNull()
    expect(result.bestPerHour).toBeNull()
  })
  it('preserva dados incompletos sem Infinity ou NaN', () => {
    const result = calculateDeliveryPerformance(sources([], [{ ...shift, fuelCost: null }]), interval)
    expect(result.net).toBeNull()
    expect(result.expensesPerHour).toBeNull()
    expect(calculateDeliveryPerformance(sources(), interval).gross).toBeNull()
    expect(deliveryFinancials({ ...shift, grossRevenue: NaN }, [], [], today).net).toBeNull()
  })
  it('expõe grupos por dia, duração e horário sem afirmar tendência com um turno', () => {
    const result = calculateDeliveryPerformance(sources([], [shift]), interval)
    expect(result.weekdays[0]).toMatchObject({ count: 1, sufficient: false })
    expect(result.durations).toHaveLength(1)
    expect(result.startTimes).toHaveLength(1)
  })
  it('usa taxa ponderada por horas e acumula reserva sem virar gasto', () => {
    const second = { ...shift, id: 'short', startTime: '18:00', endTime: '19:00', grossRevenue: 100, fuelCost: 0, otherExpenses: 0 }
    const result = calculateDeliveryPerformance(sources([], [shift, second]), interval)
    expect(result.netPerHour).toBeCloseTo(275 / 7)
    expect(result.bestPerHour).toBe(100)
    expect(result.accumulatedReserve).toBe(20)
    expect(result.expenses).toBe(25)
  })
  it('gráficos vazios e dados futuros preservam estados', () => {
    const series = financialSeries([], interval, today)
    expect(series[0].points[0]).toMatchObject({ value: null, status: 'no-data' })
    expect(series[0].points.at(-1)).toMatchObject({ value: null, status: 'future' })
  })
})

describe('planejamento, validação e backups compatíveis', () => {
  const backup = { schemaVersion: 1, exportedAt: createdAt, completions: [], checkIns: [], deliveryShifts: [], expenses: [], studyLogs: [], progress: [], settings: defaultSettings() }
  it('aceita definições de metas e orçamento e backup antigo sem elas', () => {
    expect(isValidFinancialGoal(goal)).toBe(true)
    expect(isValidCategoryBudget(budget)).toBe(true)
    expect(validateBackup(backup)).toBe(true)
    expect(validateBackup({ ...backup, financialGoals: [goal], categoryBudgets: [budget] })).toBe(true)
  })
  it('rejeita valores inválidos, períodos invertidos e orçamento duplicado', () => {
    expect(isValidFinancialGoal({ ...goal, target: 0 })).toBe(false)
    expect(isValidFinancialGoal({ ...goal, endDate: '2026-08-01' })).toBe(false)
    expect(isValidCategoryBudget({ ...budget, limit: Infinity })).toBe(false)
    expect(isValidCategoryBudget({ ...budget, month: '2026-13' })).toBe(false)
    expect(validateBackup({ ...backup, financialGoals: [goal, goal] })).toBe(false)
    expect(validateBackup({ ...backup, categoryBudgets: [budget, budget] })).toBe(false)
  })
  it('respeita filtro anual/customizado e não persiste resultados do planejamento', () => {
    const data = buildFinanceAnalysis({ ...sources([record('in', 'entrada', 50)]), goals: [goal], budgets: [budget], interval: { start: '2026-08-01', end: '2026-08-31' }, period: 'month' })
    expect(data.goals).toHaveLength(0)
    expect(data.budgets).toHaveLength(0)
    expect(goal).not.toHaveProperty('current')
    expect(budget).not.toHaveProperty('spent')
  })
  it('calcula participação das despesas e conserva ausência em categoria incompleta', () => {
    const data = buildFinanceAnalysis({ ...sources([record('food', 'saida', 75), record('other', 'saida', 25, today, { category: 'Outros' })]), goals: [], budgets: [], interval, period: 'month' })
    expect(data.distributions.expenses.find((item) => item.key === 'Alimentação')).toMatchObject({ amount: 75, percentage: 75 })
    const incomplete = buildFinanceAnalysis({ ...sources([], [{ ...shift, fuelCost: null }]), goals: [], budgets: [], interval, period: 'month' })
    expect(incomplete.distributions.expenses.every((item) => item.percentage === null)).toBe(true)
  })
  it('mantém centavos exatos, sinal e valores inválidos explícitos', () => {
    expect(sumMoney([0.1, 0.2])).toBe(0.3)
    expect(subtractMoney(0.3, 0.2)).toBe(0.1)
    expect(subtractMoney(0.1, 0.3)).toBe(-0.2)
    expect(sumMoney([NaN])).toBeNull()
    expect(sumMoney([1e100])).toBeNull()
    expect(sumMoney([null, 10])).toBeNull()
  })
})
