import { localDateKey, weekBounds } from './domain'
import { buildFinancialMovements, deliveryFinancials, filterFinancialMovements, summarizeFinance, type FinancialMovement, type FinancialPeriod, type FinanceSources } from './finance'
import { moneyRatio, subtractMoney, sumMoney } from './money'
import type { CategoryBudget, DeliveryCostKind, FinancialGoal, FinancialGoalType } from './types'
import type { DashboardSeries, DashboardUnit } from './dashboard'

export interface FinanceInterval { start: string; end: string }
export const goalTypeLabels: Record<FinancialGoalType, string> = {
  income: 'Renda recebida', 'net-income': 'Renda líquida pessoal', 'delivery-income': 'Renda bruta do delivery',
  'delivery-net': 'Renda líquida do delivery', savings: 'Economia do período', 'expense-limit': 'Limite de despesas',
}
export const deliveryCostLabels: Record<DeliveryCostKind, string> = { combustivel: 'Combustível', manutencao: 'Manutenção', alimentacao: 'Alimentação no turno', taxas: 'Taxas', outros: 'Outros custos' }
export const numberLabel = (value: number | null) => value === null || !Number.isFinite(value) ? 'Sem base' : new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value)
export const percentLabel = (value: number | null) => value === null ? 'Sem base de comparação' : `${value > 0 ? '+' : ''}${numberLabel(value)}%`
export const dateLabel = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR')

function addDays(date: string, amount: number): string {
  const parsed = new Date(`${date}T12:00:00`)
  parsed.setDate(parsed.getDate() + amount)
  return localDateKey(parsed)
}
const realized = (rows: readonly FinancialMovement[], today: string) => rows.filter((row) => row.status === 'realizado' && row.localDate <= today)
const amountOf = (rows: readonly FinancialMovement[]) => sumMoney(rows.map((row) => row.amount))
const inInterval = (date: string, interval: FinanceInterval) => date >= interval.start && date <= interval.end
const finiteSum = (values: readonly (number | null)[]) => values.some((value) => value === null || !Number.isFinite(value)) ? null : values.reduce<number>((total, value) => total + value!, 0)

export function calculateGoalProgress(goal: FinancialGoal, rows: readonly FinancialMovement[], today: string) {
  const scoped = realized(rows, today).filter((row) => row.localDate >= goal.startDate && row.localDate <= goal.endDate)
  const summary = summarizeFinance(scoped)
  const current = goal.type === 'income' ? summary.entries : goal.type === 'delivery-income' ? summary.deliveryGross
    : goal.type === 'delivery-net' ? summary.operationalNet : goal.type === 'expense-limit' ? summary.exits : summary.balance
  const percentage = moneyRatio(current, goal.target)
  const progress = percentage === null ? null : percentage * 100
  const limit = goal.type === 'expense-limit'
  const status = goal.startDate > today ? 'scheduled' : current === null ? 'no-data'
    : limit && current > goal.target ? 'exceeded' : !limit && current >= goal.target ? 'achieved'
    : goal.endDate < today ? limit ? 'within' : 'expired' : limit && current >= goal.target * .8 ? 'near' : 'active'
  return { goal, current, percentage: progress, status }
}
export type GoalProgress = ReturnType<typeof calculateGoalProgress>

export function calculateBudgetUsage(budget: CategoryBudget, rows: readonly FinancialMovement[], today: string) {
  const paid = realized(rows, today).filter((row) => row.localDate.slice(0, 7) === budget.month)
  const scoped = paid.filter((row) => row.type === 'saida' && (budget.deliveryCostKind ? row.deliveryCostKind === budget.deliveryCostKind : row.category === budget.category))
  // A ausência de registros na categoria não comprova gasto zero.
  const spent = scoped.length ? amountOf(scoped) : null
  const percentage = moneyRatio(spent, budget.limit)
  const status = spent === null ? 'no-data' : spent > budget.limit ? 'exceeded' : spent === budget.limit ? 'reached' : spent >= budget.limit * .8 ? 'near' : 'within'
  return { budget, spent, remaining: subtractMoney(budget.limit, spent), percentage: percentage === null ? null : percentage * 100, status }
}
export type BudgetUsage = ReturnType<typeof calculateBudgetUsage>
export const budgetLabel = (budget: CategoryBudget) => budget.deliveryCostKind ? `${deliveryCostLabels[budget.deliveryCostKind]} · delivery` : budget.category

function previousInterval(interval: FinanceInterval, period: FinancialPeriod): FinanceInterval {
  const [year, month] = interval.start.split('-').map(Number)
  if (period === 'year') return { start: `${year - 1}-01-01`, end: `${year - 1}-12-31` }
  if (period === 'month') return { start: localDateKey(new Date(year, month - 2, 1, 12)), end: localDateKey(new Date(year, month - 1, 0, 12)) }
  const days = Math.round((Date.parse(`${interval.end}T12:00:00Z`) - Date.parse(`${interval.start}T12:00:00Z`)) / 86400000) + 1
  return { start: addDays(interval.start, -days), end: addDays(interval.start, -1) }
}

export function calculateDeliveryPerformance(sources: FinanceSources, interval: FinanceInterval) {
  const shifts = sources.shifts.filter((shift) => inInterval(shift.localDate, interval) && shift.localDate <= sources.today)
  const linked = new Map<string, { expenses: typeof sources.expenses[number][], records: typeof sources.records[number][] }>()
  for (const expense of sources.expenses) if (expense.deliveryShiftId) {
    const bucket = linked.get(expense.deliveryShiftId) ?? { expenses: [], records: [] }
    bucket.expenses.push(expense); linked.set(expense.deliveryShiftId, bucket)
  }
  for (const record of sources.records) if (record.deliveryShiftId) {
    const bucket = linked.get(record.deliveryShiftId) ?? { expenses: [], records: [] }
    bucket.records.push(record); linked.set(record.deliveryShiftId, bucket)
  }
  const turns = shifts.map((shift) => {
    const bucket = linked.get(shift.id)
    return { shift, ...deliveryFinancials(shift, bucket?.expenses ?? [], bucket?.records ?? [], sources.today) }
  })
  const count = turns.length
  const gross = count ? sumMoney(shifts.map((shift) => shift.grossRevenue)) : null
  const expenses = count ? sumMoney(turns.map((turn) => turn.operationalExpenses)) : null
  const net = subtractMoney(gross, expenses)
  const reserve = count ? sumMoney(shifts.map((shift) => shift.maintenanceReserve)) : null
  const afterReserve = subtractMoney(net, reserve)
  const hours = count ? finiteSum(turns.map((turn) => turn.hours !== null && turn.hours > 0 ? turn.hours : null)) : null
  const validRates = turns.map((turn) => turn.operationalNetPerHour).filter((rate): rate is number => rate !== null && Number.isFinite(rate))
  const shiftIds = new Set(shifts.map((shift) => shift.id))
  const allCostRows = buildFinancialMovements({ ...sources, shifts })
    .filter((row) => row.deliveryShiftId && shiftIds.has(row.deliveryShiftId) && row.status === 'realizado' && row.type === 'saida')
  const costs = groupFinancialAmounts(allCostRows, (row) => row.deliveryCostKind ?? `category:${row.category}`).map((cost) => ({
    ...cost, label: cost.key.startsWith('category:') ? `${cost.key.slice(9)} (sem classificação)` : deliveryCostLabels[cost.key as DeliveryCostKind],
    percentage: moneyRatio(cost.amount, expenses) === null ? null : moneyRatio(cost.amount, expenses)! * 100,
    revenuePercentage: moneyRatio(cost.amount, gross) === null ? null : moneyRatio(cost.amount, gross)! * 100,
    perHour: moneyRatio(cost.amount, hours),
  }))
  function groups(key: (turn: typeof turns[number]) => string) {
    const buckets = new Map<string, typeof turns>()
    for (const turn of turns) { const label = key(turn); const bucket = buckets.get(label) ?? []; bucket.push(turn); buckets.set(label, bucket) }
    return [...buckets].sort(([a], [b]) => a.localeCompare(b)).map(([label, bucket]) => {
      const totalHours = finiteSum(bucket.map((turn) => turn.hours !== null && turn.hours > 0 ? turn.hours : null))
      const totalNet = sumMoney(bucket.map((turn) => turn.operationalNet))
      return { label, count: bucket.length, hours: totalHours, gross: sumMoney(bucket.map((turn) => turn.shift.grossRevenue)), expenses: sumMoney(bucket.map((turn) => turn.operationalExpenses)), net: totalNet,
        perHour: moneyRatio(totalNet, totalHours), sufficient: bucket.length >= 3 }
    })
  }
  const weekdays = groups((turn) => new Date(`${turn.shift.localDate}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long' }))
  const durations = groups((turn) => turn.hours === null ? 'Duração incompleta' : turn.hours < 3 ? 'Menos de 3h' : turn.hours < 6 ? 'De 3h a menos de 6h' : '6h ou mais')
  const startTimes = groups((turn) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(turn.shift.startTime) ? 'Horário incompleto' : `${turn.shift.startTime.slice(0, 2)}h (início)`)
  const months = groups((turn) => turn.shift.localDate.slice(0, 7))
  return { count, gross, expenses, net, reserve, afterReserve, hours,
    grossPerHour: moneyRatio(gross, hours), expensesPerHour: moneyRatio(expenses, hours), netPerHour: moneyRatio(net, hours), afterReservePerHour: moneyRatio(afterReserve, hours),
    averageGross: moneyRatio(gross, count), averageNet: moneyRatio(net, count), averageExpenses: moneyRatio(expenses, count), averageHours: moneyRatio(hours, count),
    bestPerHour: validRates.length ? Math.max(...validRates) : null, sufficient: count >= 3, costs, weekdays, durations, startTimes, months,
    accumulatedReserve: sources.shifts.some((shift) => shift.localDate <= sources.today) ? sumMoney(sources.shifts.filter((shift) => shift.localDate <= sources.today).map((shift) => shift.maintenanceReserve)) : null,
  }
}
export type DeliveryPerformance = ReturnType<typeof calculateDeliveryPerformance>

export function calculatePeriodComparison(sources: FinanceSources, interval: FinanceInterval, period: FinancialPeriod) {
  const previous = previousInterval(interval, period)
  const all = buildFinancialMovements(sources)
  function metrics(scope: FinanceInterval) {
    const summary = summarizeFinance(filterFinancialMovements(all, scope))
    const delivery = calculateDeliveryPerformance(sources, scope)
    return [
      { id: 'entries', label: 'Entradas', value: summary.entries, unit: 'BRL' as DashboardUnit },
      { id: 'exits', label: 'Saídas / gastos', value: summary.exits, unit: 'BRL' as DashboardUnit },
      { id: 'balance', label: 'Saldo / renda líquida pessoal', value: summary.balance, unit: 'BRL' as DashboardUnit },
      { id: 'delivery-gross', label: 'Renda bruta do delivery', value: delivery.gross, unit: 'BRL' as DashboardUnit },
      { id: 'delivery-costs', label: 'Despesas do delivery', value: delivery.expenses, unit: 'BRL' as DashboardUnit },
      { id: 'delivery-net', label: 'Renda líquida operacional', value: delivery.net, unit: 'BRL' as DashboardUnit },
      { id: 'delivery-result', label: 'Resultado após reserva', value: delivery.afterReserve, unit: 'BRL' as DashboardUnit },
      { id: 'hours', label: 'Horas trabalhadas', value: delivery.hours, unit: 'hours' as DashboardUnit },
      { id: 'hourly', label: 'Líquido operacional / hora', value: delivery.netPerHour, unit: 'BRL/hour' as DashboardUnit },
    ]
  }
  const current = metrics(interval)
  const old = metrics(previous)
  const comparison = current.map((item, index) => {
    const before = old[index].value
    const difference = item.unit === 'hours' ? item.value === null || before === null ? null : item.value - before : subtractMoney(item.value, before)
    const percentage = difference === null || before === null || before === 0 ? null : difference / Math.abs(before) * 100
    return { ...item, current: item.value, previous: before, difference, percentage, status: percentage === null ? 'no-base' : 'available' }
  })
  return { currentInterval: interval, previousInterval: previous, metrics: comparison, partial: interval.end > sources.today && interval.start <= sources.today }
}
export type PeriodComparison = ReturnType<typeof calculatePeriodComparison>

export function groupFinancialAmounts(rows: readonly FinancialMovement[], key: (row: FinancialMovement) => string) {
  const groups = new Map<string, FinancialMovement[]>()
  for (const row of rows) { const name = key(row); const bucket = groups.get(name) ?? []; bucket.push(row); groups.set(name, bucket) }
  const amounts = [...groups].map(([name, bucket]) => ({ key: name, amount: amountOf(bucket), count: bucket.length }))
  const maximum = Math.max(1, ...amounts.map((item) => item.amount ?? 0))
  const total = sumMoney(amounts.map((item) => item.amount))
  return amounts.map((item) => ({ ...item, relative: Math.max(0, (item.amount ?? 0) / maximum * 100), percentage: moneyRatio(item.amount, total) === null ? null : moneyRatio(item.amount, total)! * 100 })).sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0))
}

export type TrendScale = 'daily' | 'weekly' | 'monthly'
export function calculateExpenseTrend(rows: readonly FinancialMovement[], scale: TrendScale, today: string) {
  const bucketKey = (date: string) => scale === 'monthly' ? date.slice(0, 7) : scale === 'weekly' ? weekBounds(date).weekStart : date
  const currentBucket = bucketKey(today)
  const paid = realized(rows, today).filter((row) => row.type === 'saida' && bucketKey(row.localDate) < currentBucket)
  const groups = groupFinancialAmounts(paid, (row) => bucketKey(row.localDate)).sort((a, b) => a.key.localeCompare(b.key)).slice(-6)
  let contiguous = groups.length === 6
  for (let index = 1; index < groups.length; index++) {
    const previous = groups[index - 1].key
    const next = scale === 'monthly' ? localDateKey(new Date(Number(previous.slice(0, 4)), Number(previous.slice(5, 7)), 1, 12)).slice(0, 7) : addDays(previous, scale === 'weekly' ? 7 : 1)
    if (groups[index].key !== next) contiguous = false
  }
  const before = contiguous ? sumMoney(groups.slice(0, 3).map((group) => group.amount)) : null
  const after = contiguous ? sumMoney(groups.slice(3).map((group) => group.amount)) : null
  const delta = subtractMoney(after, before)
  const percentage = delta === null || before === null || before <= 0 ? null : delta / before * 100
  const direction = percentage === null ? 'insufficient' : percentage > 5 ? 'increasing' : percentage < -5 ? 'decreasing' : 'stable'
  const categories = direction === 'insufficient' ? [] : groupFinancialAmounts(paid.filter((row) => bucketKey(row.localDate) >= groups[0].key && bucketKey(row.localDate) <= groups[5].key), (row) => row.category).map((category) => {
    const categoryRows = paid.filter((row) => row.category === category.key)
    const oldRows = categoryRows.filter((row) => bucketKey(row.localDate) >= groups[0].key && bucketKey(row.localDate) <= groups[2].key)
    const newRows = categoryRows.filter((row) => bucketKey(row.localDate) >= groups[3].key && bucketKey(row.localDate) <= groups[5].key)
    const old = oldRows.length ? amountOf(oldRows) : null
    const now = newRows.length ? amountOf(newRows) : null
    const change = subtractMoney(now, old)
    return { category: category.key, difference: change, percentage: change === null || old === null || old <= 0 ? null : change / old * 100 }
  }).filter((item) => item.percentage !== null && item.percentage > 5).sort((a, b) => b.percentage! - a.percentage!).slice(0, 3)
  return { scale, direction, percentage, sampleCount: groups.length, categories, groups }
}

export function calculateProjectedBalance(rows: readonly FinancialMovement[], today: string, days: number) {
  const end = addDays(today, days)
  const current = summarizeFinance(realized(rows, today)).balance
  const future = rows.filter((row) => row.localDate <= end && ((row.status === 'aberto' && (row.type === 'credito' || row.type === 'pendencia'))
    || row.status === 'planejado'
    || (row.status === 'previsto' && row.localDate > today && (row.type === 'entrada' || row.type === 'saida'))))
  const credits = amountOf(future.filter((row) => row.type === 'credito'))
  const pending = amountOf(future.filter((row) => row.type === 'pendencia'))
  const futureEntries = amountOf(future.filter((row) => row.type === 'entrada'))
  const futureExits = amountOf(future.filter((row) => row.type === 'saida'))
  const impact = subtractMoney(sumMoney([credits, futureEntries]), sumMoney([pending, futureExits]))
  const projected = current === null || impact === null ? null : sumMoney([current, impact])
  const dates = [...new Set(future.map((row) => row.localDate < today ? today : row.localDate))].sort()
  let running = current
  let minimum = current
  let riskDate: string | null = current !== null && current < 0 ? today : null
  const schedule = dates.map((date) => {
    const bucket = future.filter((row) => (row.localDate < today ? today : row.localDate) === date)
    const net = subtractMoney(amountOf(bucket.filter((row) => row.type === 'entrada' || row.type === 'credito')), amountOf(bucket.filter((row) => row.type === 'saida' || row.type === 'pendencia')))
    running = running === null || net === null ? null : sumMoney([running, net])
    if (running !== null && (minimum === null || running < minimum)) minimum = running
    if (running !== null && running < 0 && riskDate === null) riskDate = date
    return { date, impact: net, balance: running }
  })
  return { days, end, current, credits, pending, futureEntries, futureExits, impact, projected, minimum, riskDate, schedule,
    overdueCount: future.filter((row) => (row.type === 'pendencia' || row.type === 'saida') && row.localDate < today).length,
    upcomingCount: future.filter((row) => (row.type === 'pendencia' || row.type === 'saida') && row.localDate >= today && row.localDate <= addDays(today, 7)).length,
  }
}
export type FinancialProjection = ReturnType<typeof calculateProjectedBalance>
export interface FinancialAlert { code: string; severity: 'attention' | 'critical' | 'info'; message: string }
export function calculateFinancialAlerts(input: { rows: readonly FinancialMovement[]; today: string; goals: readonly GoalProgress[]; budgets: readonly BudgetUsage[]; projections: readonly FinancialProjection[]; comparison?: PeriodComparison }) {
  const alerts: FinancialAlert[] = []
  const open = input.rows.filter((row) => row.status === 'aberto' && row.type === 'pendencia' || row.status === 'planejado' && (row.type === 'pendencia' || row.type === 'saida'))
  const overdue = open.filter((row) => row.localDate < input.today)
  const upcoming = open.filter((row) => row.localDate >= input.today && row.localDate <= addDays(input.today, 7))
  if (overdue.length) alerts.push({ code: 'overdue', severity: 'critical', message: `${overdue.length} pendência(s) vencida(s). Confira as datas e registre pagamentos já realizados.` })
  if (upcoming.length) alerts.push({ code: 'upcoming', severity: 'attention', message: `${upcoming.length} pendência(s) vence(m) nos próximos 7 dias, incluindo hoje.` })
  const exceeded = input.budgets.filter((item) => item.status === 'exceeded')
  const near = input.budgets.filter((item) => item.status === 'near' || item.status === 'reached')
  if (exceeded.length) alerts.push({ code: 'budget-exceeded', severity: 'critical', message: `${exceeded.length} orçamento(s) ultrapassado(s): ${exceeded.map((item) => budgetLabel(item.budget)).join(', ')}.` })
  if (near.length) alerts.push({ code: 'budget-near', severity: 'attention', message: `${near.length} orçamento(s) com pelo menos 80% utilizado.` })
  if (input.goals.some((item) => item.goal.type !== 'expense-limit' && item.status === 'active' && item.percentage !== null && item.percentage >= 80)) alerts.push({ code: 'goal-near', severity: 'info', message: 'Uma ou mais metas atingiram pelo menos 80% do alvo.' })
  if (input.goals.some((item) => item.status === 'exceeded')) alerts.push({ code: 'goal-limit', severity: 'attention', message: 'Um limite desejado de despesas foi ultrapassado.' })
  const risk = input.projections.find((item) => item.riskDate !== null)
  if (risk) alerts.push({ code: 'negative-projection', severity: 'critical', message: `O saldo dos registros pode ficar negativo até ${dateLabel(risk.riskDate!)}. Projeção baseada somente nos compromissos cadastrados.` })
  // Alertas de variação exigem períodos completos e observações em três dias de cada lado.
  const comparison = input.comparison
  if (comparison && !comparison.partial) {
    const currentDates = new Set(realized(input.rows, input.today).filter((row) => inInterval(row.localDate, comparison.currentInterval)).map((row) => row.localDate))
    const previousDates = new Set(realized(input.rows, input.today).filter((row) => inInterval(row.localDate, comparison.previousInterval)).map((row) => row.localDate))
    if (currentDates.size >= 3 && previousDates.size >= 3) {
      const income = comparison.metrics.find((metric) => metric.id === 'entries')
      const spending = comparison.metrics.find((metric) => metric.id === 'exits')
      if (income?.percentage !== null && income?.percentage !== undefined && income.percentage <= -20) alerts.push({ code: 'income-drop', severity: 'attention', message: 'Entradas caíram pelo menos 20% em relação ao período anterior. Compare os registros.' })
      if (spending?.percentage !== null && spending?.percentage !== undefined && spending.percentage >= 20) alerts.push({ code: 'expense-growth', severity: 'attention', message: 'Despesas cresceram pelo menos 20% em relação ao período anterior. Revise as categorias.' })
    }
  }
  return alerts.sort((a, b) => ['critical', 'attention', 'info'].indexOf(a.severity) - ['critical', 'attention', 'info'].indexOf(b.severity))
}

export function financialSeries(rows: readonly FinancialMovement[], interval: FinanceInterval, today: string): DashboardSeries[] {
  const monthly = (Date.parse(`${interval.end}T12:00:00Z`) - Date.parse(`${interval.start}T12:00:00Z`)) / 86400000 > 62
  const buckets = new Map<string, FinancialMovement[]>()
  for (const row of realized(rows, today).filter((row) => inInterval(row.localDate, interval))) {
    const key = monthly ? `${row.localDate.slice(0, 7)}-01` : row.localDate
    const bucket = buckets.get(key) ?? []; bucket.push(row); buckets.set(key, bucket)
  }
  const series: DashboardSeries[] = [['entries', 'Entradas recebidas'], ['exits', 'Saídas pagas'], ['balance', 'Saldo acumulado no período']].map(([id, label]) => ({ id: `finance-${id}`, label, unit: 'BRL', points: [] }))
  const cursor = new Date(`${interval.start}T12:00:00`)
  if (monthly) cursor.setDate(1)
  let balance: number | null = 0
  for (let index = 0; index < 1200 && localDateKey(cursor) <= interval.end; index++) {
    const key = localDateKey(cursor)
    const bucket = buckets.get(key) ?? []
    const summary = summarizeFinance(bucket)
    if (bucket.length) balance = balance === null || summary.balance === null ? null : sumMoney([balance, summary.balance])
    const values = [summary.entries, summary.exits, bucket.length ? balance : null]
    series.forEach((item, position) => item.points.push({ key, label: monthly ? key.slice(0, 7).split('-').reverse().join('/') : key.slice(5).split('-').reverse().join('/'), unit: 'BRL', value: values[position], status: key > today ? 'future' : !bucket.length ? 'no-data' : values[position] === null ? 'unavailable' : 'available' }))
    if (monthly) cursor.setMonth(cursor.getMonth() + 1); else cursor.setDate(cursor.getDate() + 1)
  }
  return series
}

export function buildFinanceAnalysis(input: FinanceSources & { goals: readonly FinancialGoal[]; budgets: readonly CategoryBudget[]; interval: FinanceInterval; period: FinancialPeriod }) {
  const rows = buildFinancialMovements({ ...input, planningInterval: { start: [input.interval.start, ...input.recurringPlans?.map(p => p.startDate) ?? [], ...input.installmentPlans?.map(p => p.firstDueDate) ?? []].sort()[0], end: input.interval.end > addDays(input.today, 30) ? input.interval.end : addDays(input.today, 30) } })
  const periodRows = filterFinancialMovements(rows, input.interval)
  const goals = input.goals.filter((goal) => goal.startDate <= input.interval.end && goal.endDate >= input.interval.start).map((goal) => calculateGoalProgress(goal, rows, input.today))
  const budgets = input.budgets.filter((budget) => `${budget.month}-01` <= input.interval.end && `${budget.month}-31` >= input.interval.start).map((budget) => calculateBudgetUsage(budget, rows, input.today))
  const comparison = calculatePeriodComparison(input, input.interval, input.period)
  const projections = [7, 15, 30].map((days) => calculateProjectedBalance(rows, input.today, days))
  const delivery = calculateDeliveryPerformance(input, input.interval)
  const previousDelivery = calculateDeliveryPerformance(input, comparison.previousInterval)
  const costs = delivery.costs.map((cost) => {
    const previous = previousDelivery.costs.find((item) => item.key === cost.key)?.amount ?? null
    const difference = subtractMoney(cost.amount, previous)
    return { ...cost, previous, changePercentage: difference === null || previous === null || previous <= 0 ? null : difference / previous * 100 }
  })
  return { rows, periodRows, goals, budgets, comparison, projections, delivery: { ...delivery, costs },
    trends: (['daily', 'weekly', 'monthly'] as const).map((scale) => calculateExpenseTrend(periodRows, scale, input.today)),
    alerts: calculateFinancialAlerts({ rows, today: input.today, goals, budgets, projections, comparison }),
    series: financialSeries(periodRows, input.interval, input.today),
    distributions: {
      types: groupFinancialAmounts(realized(periodRows, input.today), (row) => row.type === 'entrada' ? 'Entradas' : 'Saídas'),
      expenses: groupFinancialAmounts(realized(periodRows, input.today).filter((row) => row.type === 'saida'), (row) => row.category),
      origins: groupFinancialAmounts(realized(periodRows, input.today).filter((row) => row.type === 'entrada'), (row) => row.origin),
    },
  }
}
export type FinanceAnalysis = ReturnType<typeof buildFinanceAnalysis>
