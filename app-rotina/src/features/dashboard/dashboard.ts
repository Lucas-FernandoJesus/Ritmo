import { shiftDuration } from '../../core/domain'
import { deliveryFinancials } from '../finance/finance'
import type { DailyCompletion, DailyPlanSnapshot, DeliveryShift, Expense, FinancialRecord, StudyLog } from '../../core/types'

export type DashboardCategory = 'tarefas' | 'treinos' | 'estudos' | 'delivery' | 'renda'
export type DashboardPeriod = 'month' | 'year'
export type DashboardMetricStatus = 'available' | 'no-data' | 'future' | 'unavailable'
export type DashboardUnit = 'count' | 'percent' | 'minutes' | 'hours' | 'kilometers' | 'BRL' | 'BRL/hour' | 'BRL/kilometer'

export interface DashboardInterval {
  start: string
  end: string
  label: string
}

export interface DashboardValue {
  status: DashboardMetricStatus
  value: number | null
  unit: DashboardUnit
}

export interface DashboardMetric extends DashboardValue {
  id: string
  label: string
}

export interface DashboardSeriesPoint extends DashboardValue {
  key: string
  label: string
}

export interface DashboardSeries {
  id: string
  label: string
  unit: DashboardUnit
  points: DashboardSeriesPoint[]
}

export interface DashboardBreakdownItem {
  id: string
  label: string
  metrics: DashboardMetric[]
}

export interface DashboardComparisonMetric {
  id: string
  label: string
  unit: DashboardUnit
  current: DashboardValue
  previous: DashboardValue
  change: DashboardValue
  changePercentage: DashboardValue
}

export interface DashboardComparison {
  status: DashboardMetricStatus
  partial: boolean
  previousInterval: DashboardInterval
  metrics: DashboardComparisonMetric[]
}

export type DashboardWarningCode =
  | 'future-period'
  | 'future-dates-excluded'
  | 'incomplete-snapshots'
  | 'incomplete-financial-data'
  | 'previous-period-no-data'

export interface DashboardWarning {
  code: DashboardWarningCode
  message: string
}

export interface DashboardViewModel {
  category: DashboardCategory
  period: DashboardPeriod
  interval: DashboardInterval
  hasData: boolean
  kpis: DashboardMetric[]
  series: DashboardSeries[]
  comparison: DashboardComparison
  breakdown: DashboardBreakdownItem[]
  warnings: DashboardWarning[]
}

export interface DashboardInput {
  category: DashboardCategory
  period: DashboardPeriod
  referenceDate: string
  today: string
  snapshots: readonly DailyPlanSnapshot[]
  completions: readonly DailyCompletion[]
  studyLogs: readonly StudyLog[]
  deliveryShifts: readonly DeliveryShift[]
  expenses: readonly Expense[]
  financialRecords?: readonly FinancialRecord[]
}

interface CivilDateParts {
  year: number
  month: number
  day: number
}

interface TimeBucket {
  key: string
  label: string
  start: string
  end: string
}

interface CategoryAggregate {
  hasData: boolean
  kpis: DashboardMetric[]
  series: DashboardSeries[]
  breakdown: DashboardBreakdownItem[]
  warnings: DashboardWarning[]
}

interface ActivityStats {
  hasData: boolean
  planned: number
  completed: number
  skipped: number
  requiredPlanned: number
  requiredCompleted: number
  optionalPlanned: number
  optionalCompleted: number
}

interface FinancialValues {
  shifts: DashboardValue
  hours: DashboardValue
  kilometers: DashboardValue
  grossRevenue: DashboardValue
  fuelCost: DashboardValue
  maintenanceReserve: DashboardValue
  otherExpenses: DashboardValue
  linkedExpenses: DashboardValue
  registeredCosts: DashboardValue
  estimatedResult: DashboardValue
  revenuePerHour: DashboardValue
  resultPerHour: DashboardValue
  resultPerKilometer: DashboardValue
}

const monthNames = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
] as const

const studyAreas: StudyLog['area'][] = ['Inglês', 'Programação', 'Leitura', 'Outro']

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

function daysInMonth(year: number, month: number): number {
  return [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ?? 0
}

function parseCivilDate(value: string): CivilDateParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) throw new Error(`Data local inválida: ${value}`)
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) throw new Error(`Data local inválida: ${value}`)
  return { year, month, day }
}

function civilDateKey(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${pad(month)}-${pad(day)}`
}

function monthInterval(year: number, month: number): DashboardInterval {
  return {
    start: civilDateKey(year, month, 1),
    end: civilDateKey(year, month, daysInMonth(year, month)),
    label: `${monthNames[month - 1]} de ${year}`,
  }
}

function offsetMonth(year: number, month: number, offset: number): { year: number, month: number } {
  const absoluteMonth = year * 12 + month - 1 + offset
  return { year: Math.floor(absoluteMonth / 12), month: ((absoluteMonth % 12) + 12) % 12 + 1 }
}

function civilInterval(period: DashboardPeriod, referenceDate: string, offset: number): DashboardInterval {
  const { year, month } = parseCivilDate(referenceDate)
  if (period === 'month') {
    const target = offsetMonth(year, month, offset)
    return monthInterval(target.year, target.month)
  }
  const targetYear = year + offset
  return { start: `${targetYear}-01-01`, end: `${targetYear}-12-31`, label: String(targetYear) }
}

function nextCivilDate(value: string): string {
  const { year, month, day } = parseCivilDate(value)
  if (day < daysInMonth(year, month)) return civilDateKey(year, month, day + 1)
  if (month < 12) return civilDateKey(year, month + 1, 1)
  return civilDateKey(year + 1, 1, 1)
}

function civilDates(start: string, end: string): string[] {
  if (start > end) return []
  const result: string[] = []
  for (let current = start; current <= end; current = nextCivilDate(current)) result.push(current)
  return result
}

function bucketsFor(period: DashboardPeriod, interval: DashboardInterval): TimeBucket[] {
  const { year, month } = parseCivilDate(interval.start)
  if (period === 'month') {
    return Array.from({ length: daysInMonth(year, month) }, (_, index) => {
      const key = civilDateKey(year, month, index + 1)
      return { key, label: String(index + 1), start: key, end: key }
    })
  }
  return Array.from({ length: 12 }, (_, index) => {
    const targetMonth = index + 1
    const target = monthInterval(year, targetMonth)
    return { key: `${year}-${pad(targetMonth)}`, label: monthNames[index], start: target.start, end: target.end }
  })
}

function realizedEnd(interval: DashboardInterval, today: string): string | null {
  if (interval.start > today) return null
  return interval.end < today ? interval.end : today
}

function inRealizedInterval(localDate: string, interval: DashboardInterval, today: string): boolean {
  return localDate >= interval.start && localDate <= interval.end && localDate <= today
}

function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000
}

function dashboardValue(unit: DashboardUnit, status: DashboardMetricStatus, value: number | null = null): DashboardValue {
  return { status, value, unit }
}

function available(unit: DashboardUnit, value: number): DashboardValue {
  return dashboardValue(unit, 'available', round(value))
}

function metric(id: string, label: string, value: DashboardValue): DashboardMetric {
  return { id, label, ...value }
}

function seriesPoint(bucket: TimeBucket, value: DashboardValue): DashboardSeriesPoint {
  return { key: bucket.key, label: bucket.label, ...value }
}

function warning(code: DashboardWarningCode, message: string): DashboardWarning {
  return { code, message }
}

function completionMap(completions: readonly DailyCompletion[]): Map<string, DailyCompletion['state']> {
  return new Map(completions.map((item) => [item.id, item.state]))
}

function activityStats(
  input: DashboardInput,
  interval: DashboardInterval,
  predicate: (area: DailyPlanSnapshot['activities'][number]['area']) => boolean,
): ActivityStats {
  const snapshots = input.snapshots.filter((item) => inRealizedInterval(item.localDate, interval, input.today))
  const states = completionMap(input.completions)
  const result: ActivityStats = {
    hasData: snapshots.length > 0,
    planned: 0,
    completed: 0,
    skipped: 0,
    requiredPlanned: 0,
    requiredCompleted: 0,
    optionalPlanned: 0,
    optionalCompleted: 0,
  }

  for (const daily of snapshots) {
    for (const planned of daily.activities.filter((item) => predicate(item.area))) {
      const state = states.get(`${daily.localDate}:${planned.routineItemId}`)
      const optional = planned.nature === 'opcional'
      result.planned += 1
      if (state === 'done') result.completed += 1
      if (state === 'skipped') result.skipped += 1
      if (optional) {
        result.optionalPlanned += 1
        if (state === 'done') result.optionalCompleted += 1
      } else {
        result.requiredPlanned += 1
        if (state === 'done') result.requiredCompleted += 1
      }
    }
  }
  return result
}

function activityValue(stats: ActivityStats, unit: DashboardUnit, select: (stats: ActivityStats) => number): DashboardValue {
  return stats.hasData ? available(unit, select(stats)) : dashboardValue(unit, 'no-data')
}

function activityRate(stats: ActivityStats): DashboardValue {
  if (!stats.hasData) return dashboardValue('percent', 'no-data')
  if (stats.requiredPlanned === 0) return dashboardValue('percent', 'unavailable')
  return available('percent', stats.requiredCompleted / stats.requiredPlanned * 100)
}

function snapshotCoverage(input: DashboardInput, interval: DashboardInterval): { available: number, total: number } {
  const end = realizedEnd(interval, input.today)
  if (!end) return { available: 0, total: 0 }
  const availableDates = new Set(input.snapshots
    .filter((item) => item.localDate >= interval.start && item.localDate <= end)
    .map((item) => item.localDate))
  const dates = civilDates(interval.start, end)
  return { available: dates.filter((date) => availableDates.has(date)).length, total: dates.length }
}

function aggregateActivities(
  input: DashboardInput,
  interval: DashboardInterval,
  category: 'tarefas' | 'treinos',
  includeSeries: boolean,
): CategoryAggregate {
  const predicate = category === 'tarefas'
    ? (area: DailyPlanSnapshot['activities'][number]['area']) => area !== 'treino' && area !== 'estudos'
    : (area: DailyPlanSnapshot['activities'][number]['area']) => area === 'treino'
  const stats = activityStats(input, interval, predicate)
  const future = interval.start > input.today
  const countValue = (select: (value: ActivityStats) => number) => future
    ? dashboardValue('count', 'future')
    : activityValue(stats, 'count', select)
  const rate = future ? dashboardValue('percent', 'future') : activityRate(stats)
  const kpis = [
    metric('planned', 'Planejadas', countValue((value) => value.planned)),
    metric('completed', 'Concluídas', countValue((value) => value.completed)),
    metric('required-planned', 'Obrigatórias planejadas', countValue((value) => value.requiredPlanned)),
    metric('required-completed', 'Obrigatórias concluídas', countValue((value) => value.requiredCompleted)),
    metric('skipped', 'Puladas', countValue((value) => value.skipped)),
    metric('optional-planned', 'Opcionais planejadas', countValue((value) => value.optionalPlanned)),
    metric('optional-completed', 'Opcionais concluídas', countValue((value) => value.optionalCompleted)),
    metric('completion-rate', 'Taxa principal de conclusão', rate),
  ]

  const seriesId = category === 'tarefas' ? 'tasks-completion-rate' : 'training-completion-rate'
  const seriesLabel = category === 'tarefas' ? 'Conclusão das tarefas obrigatórias' : 'Conclusão dos treinos obrigatórios'
  const timeSeries: DashboardSeries[] = includeSeries ? [{
    id: seriesId,
    label: seriesLabel,
    unit: 'percent',
    points: bucketsFor(input.period, interval).map((bucket) => {
      if (bucket.start > input.today) return seriesPoint(bucket, dashboardValue('percent', 'future'))
      const bucketStats = activityStats(input, { start: bucket.start, end: bucket.end, label: bucket.label }, predicate)
      return seriesPoint(bucket, activityRate(bucketStats))
    }),
  }] : []

  const coverage = snapshotCoverage(input, interval)
  const warnings = coverage.available < coverage.total
    ? [warning('incomplete-snapshots', `Histórico disponível em ${coverage.available} de ${coverage.total} dias realizados (${Math.round(coverage.available / coverage.total * 100)}%); dias sem snapshot permanecem sem dados. Os indicadores do período consideram apenas os dias disponíveis.`)]
    : []
  return { hasData: future ? false : stats.hasData, kpis, series: timeSeries, breakdown: [], warnings }
}

function aggregateStudies(input: DashboardInput, interval: DashboardInterval, includeSeries: boolean): CategoryAggregate {
  const logs = input.studyLogs.filter((item) => inRealizedInterval(item.localDate, interval, input.today))
  const future = interval.start > input.today
  const hasData = logs.length > 0
  const status = future ? 'future' : hasData ? 'available' : 'no-data'
  const count = future || !hasData ? dashboardValue('count', status) : available('count', logs.length)
  const minutes = future || !hasData ? dashboardValue('minutes', status) : available('minutes', logs.reduce((total, item) => total + item.minutes, 0))
  const average = future || !hasData ? dashboardValue('minutes', status) : available('minutes', (minutes.value ?? 0) / logs.length)
  const kpis = [
    metric('sessions', 'Sessões', count),
    metric('minutes-total', 'Minutos totais', minutes),
    metric('minutes-average', 'Média por sessão', average),
  ]

  const timeSeries: DashboardSeries[] = includeSeries ? [{
    id: 'study-minutes',
    label: 'Minutos de estudo',
    unit: 'minutes',
    points: bucketsFor(input.period, interval).map((bucket) => {
      if (bucket.start > input.today) return seriesPoint(bucket, dashboardValue('minutes', 'future'))
      const bucketLogs = logs.filter((item) => item.localDate >= bucket.start && item.localDate <= bucket.end)
      if (!bucketLogs.length) return seriesPoint(bucket, dashboardValue('minutes', 'no-data'))
      return seriesPoint(bucket, available('minutes', bucketLogs.reduce((total, item) => total + item.minutes, 0)))
    }),
  }] : []

  const breakdown = studyAreas.map((area) => {
    const areaLogs = logs.filter((item) => item.area === area)
    const areaStatus = future ? 'future' : hasData ? 'available' : 'no-data'
    return {
      id: area,
      label: area,
      metrics: [
        metric('sessions', 'Sessões', areaStatus === 'available' ? available('count', areaLogs.length) : dashboardValue('count', areaStatus)),
        metric('minutes', 'Minutos', areaStatus === 'available' ? available('minutes', areaLogs.reduce((total, item) => total + item.minutes, 0)) : dashboardValue('minutes', areaStatus)),
      ],
    }
  })
  return { hasData: future ? false : hasData, kpis, series: timeSeries, breakdown, warnings: [] }
}

function completeSum<T>(items: readonly T[], unit: DashboardUnit, select: (item: T) => number | null): DashboardValue {
  const values = items.map(select)
  if (values.some((value) => value === null || !Number.isFinite(value))) return dashboardValue(unit, 'unavailable')
  return available(unit, (values as number[]).reduce((total, value) => total + value, 0))
}

function ratio(numerator: DashboardValue, denominator: DashboardValue, unit: DashboardUnit): DashboardValue {
  if (numerator.status !== 'available' || denominator.status !== 'available') return dashboardValue(unit, 'unavailable')
  if (denominator.value === 0 || denominator.value === null || numerator.value === null) return dashboardValue(unit, 'unavailable')
  return available(unit, numerator.value / denominator.value)
}

function financialValues(shifts: readonly DeliveryShift[], emptyStatus: 'no-data' | 'future', expenses: readonly Expense[], records: readonly FinancialRecord[], today: string): FinancialValues {
  if (!shifts.length) {
    return {
      shifts: dashboardValue('count', emptyStatus),
      hours: dashboardValue('hours', emptyStatus),
      kilometers: dashboardValue('kilometers', emptyStatus),
      grossRevenue: dashboardValue('BRL', emptyStatus),
      fuelCost: dashboardValue('BRL', emptyStatus),
      maintenanceReserve: dashboardValue('BRL', emptyStatus),
      otherExpenses: dashboardValue('BRL', emptyStatus),
      linkedExpenses: dashboardValue('BRL', emptyStatus),
      registeredCosts: dashboardValue('BRL', emptyStatus),
      estimatedResult: dashboardValue('BRL', emptyStatus),
      revenuePerHour: dashboardValue('BRL/hour', emptyStatus),
      resultPerHour: dashboardValue('BRL/hour', emptyStatus),
      resultPerKilometer: dashboardValue('BRL/kilometer', emptyStatus),
    }
  }

  const hours = completeSum(shifts, 'hours', (item) => shiftDuration(item.startTime, item.endTime))
  const kilometers = completeSum(shifts, 'kilometers', (item) => item.kilometers)
  const grossRevenue = completeSum(shifts, 'BRL', (item) => item.grossRevenue)
  const fuelCost = completeSum(shifts, 'BRL', (item) => item.fuelCost)
  const maintenanceReserve = completeSum(shifts, 'BRL', (item) => item.maintenanceReserve)
  const otherExpenses = completeSum(shifts, 'BRL', (item) => item.otherExpenses)
  const calculated = shifts.map((item) => deliveryFinancials(item, expenses, records, today))
  const estimatedResult = completeSum(calculated, 'BRL', (item) => item.net)
  const registeredCosts = completeSum(calculated, 'BRL', (item) => item.expenses)
  const linkedExpenses = completeSum(calculated, 'BRL', (item) => item.linkedExpenses)

  return {
    shifts: available('count', shifts.length),
    hours,
    kilometers,
    grossRevenue,
    fuelCost,
    maintenanceReserve,
    otherExpenses,
    linkedExpenses,
    registeredCosts,
    estimatedResult,
    revenuePerHour: ratio(grossRevenue, hours, 'BRL/hour'),
    resultPerHour: ratio(estimatedResult, hours, 'BRL/hour'),
    resultPerKilometer: ratio(estimatedResult, kilometers, 'BRL/kilometer'),
  }
}

function financialKpis(values: FinancialValues, category: 'delivery' | 'renda'): DashboardMetric[] {
  const incomeMetrics = [
    metric('gross-revenue', 'Receita bruta', values.grossRevenue),
    metric('fuel-cost', 'Combustível', values.fuelCost),
    metric('maintenance-reserve', 'Reserva de manutenção', values.maintenanceReserve),
    metric('other-expenses', 'Outros custos do turno', values.otherExpenses),
    metric('linked-expenses', 'Despesas vinculadas', values.linkedExpenses),
    metric('registered-costs', 'Custos registrados nos turnos', values.registeredCosts),
    metric('estimated-result', 'Resultado estimado', values.estimatedResult),
  ]
  if (category === 'renda') return incomeMetrics
  return [
    metric('shifts', 'Turnos', values.shifts),
    metric('hours', 'Horas', values.hours),
    metric('kilometers', 'Quilômetros', values.kilometers),
    ...incomeMetrics,
    metric('revenue-per-hour', 'Receita por hora', values.revenuePerHour),
    metric('result-per-hour', 'Resultado por hora', values.resultPerHour),
    metric('result-per-kilometer', 'Resultado por quilômetro', values.resultPerKilometer),
  ]
}

function aggregateFinancial(
  input: DashboardInput,
  interval: DashboardInterval,
  category: 'delivery' | 'renda',
  includeSeries: boolean,
): CategoryAggregate {
  const shifts = input.deliveryShifts.filter((item) => inRealizedInterval(item.localDate, interval, input.today))
  const future = interval.start > input.today
  const values = financialValues(shifts, future ? 'future' : 'no-data', input.expenses, input.financialRecords ?? [], input.today)
  const kpis = financialKpis(values, category)
  const configs = category === 'renda'
    ? [
        ['income-gross-revenue', 'Receita bruta', 'grossRevenue'] as const,
        ['income-registered-costs', 'Custos registrados nos turnos', 'registeredCosts'] as const,
        ['income-estimated-result', 'Resultado estimado', 'estimatedResult'] as const,
      ]
    : [
        ['delivery-shifts', 'Turnos', 'shifts'] as const,
        ['delivery-hours', 'Horas', 'hours'] as const,
        ['delivery-kilometers', 'Quilômetros', 'kilometers'] as const,
        ['delivery-gross-revenue', 'Receita bruta', 'grossRevenue'] as const,
        ['delivery-estimated-result', 'Resultado estimado', 'estimatedResult'] as const,
        ['delivery-revenue-per-hour', 'Receita por hora', 'revenuePerHour'] as const,
        ['delivery-result-per-hour', 'Resultado por hora', 'resultPerHour'] as const,
        ['delivery-result-per-kilometer', 'Resultado por quilômetro', 'resultPerKilometer'] as const,
      ]
  const timeSeries: DashboardSeries[] = includeSeries ? configs.map(([id, label, key]) => ({
    id,
    label,
    unit: values[key].unit,
    points: bucketsFor(input.period, interval).map((bucket) => {
      const bucketFuture = bucket.start > input.today
      const bucketShifts = shifts.filter((item) => item.localDate >= bucket.start && item.localDate <= bucket.end)
      return seriesPoint(bucket, financialValues(bucketShifts, bucketFuture ? 'future' : 'no-data', input.expenses, input.financialRecords ?? [], input.today)[key])
    }),
  })) : []

  const incomplete = shifts.some((item) => [
    shiftDuration(item.startTime, item.endTime),
    item.kilometers,
    item.grossRevenue,
    item.fuelCost,
    item.maintenanceReserve,
    item.otherExpenses,
  ].some((value) => value === null))
  const warnings = incomplete
    ? [warning('incomplete-financial-data', 'Há turnos com campos ausentes; os cálculos correspondentes estão indisponíveis.')]
    : []
  const breakdown = category === 'renda' ? [{
    id: 'turn-costs',
    label: 'Custos registrados nos turnos',
    metrics: [
      metric('fuel-cost', 'Combustível', values.fuelCost),
      metric('maintenance-reserve', 'Reserva de manutenção', values.maintenanceReserve),
      metric('other-expenses', 'Outros custos do turno', values.otherExpenses),
      metric('linked-expenses', 'Despesas vinculadas', values.linkedExpenses),
    ],
  }] : []

  // Somente despesas explicitamente vinculadas participam do resultado dos turnos.
  return { hasData: future ? false : shifts.length > 0, kpis, series: timeSeries, breakdown, warnings }
}

function aggregateCategory(input: DashboardInput, interval: DashboardInterval, includeSeries: boolean): CategoryAggregate {
  if (input.category === 'tarefas' || input.category === 'treinos') return aggregateActivities(input, interval, input.category, includeSeries)
  if (input.category === 'estudos') return aggregateStudies(input, interval, includeSeries)
  return aggregateFinancial(input, interval, input.category, includeSeries)
}

function changeStatus(current: DashboardValue, previous: DashboardValue): DashboardMetricStatus {
  if (current.status === 'future' || previous.status === 'future') return 'future'
  if (current.status === 'no-data' || previous.status === 'no-data') return 'no-data'
  if (current.status === 'unavailable' || previous.status === 'unavailable') return 'unavailable'
  return 'available'
}

function comparisonMetric(current: DashboardMetric, previous: DashboardMetric | undefined): DashboardComparisonMetric {
  const previousValue = previous ?? metric(current.id, current.label, dashboardValue(current.unit, 'no-data'))
  const status = changeStatus(current, previousValue)
  const canCompare = status === 'available' && current.value !== null && previousValue.value !== null
  const change = canCompare
    ? available(current.unit, current.value! - previousValue.value!)
    : dashboardValue(current.unit, status)
  const changePercentage = canCompare && previousValue.value !== 0
    ? available('percent', (current.value! - previousValue.value!) / previousValue.value! * 100)
    : dashboardValue('percent', canCompare ? 'unavailable' : status)
  return {
    id: current.id,
    label: current.label,
    unit: current.unit,
    current: { status: current.status, value: current.value, unit: current.unit },
    previous: { status: previousValue.status, value: previousValue.value, unit: previousValue.unit },
    change,
    changePercentage,
  }
}

function comparisonStatus(current: CategoryAggregate, previous: CategoryAggregate, previousInterval: DashboardInterval, today: string): DashboardMetricStatus {
  if (previousInterval.start > today) return 'future'
  if (!previous.hasData || !current.hasData) return 'no-data'
  const hasComparableMetric = current.kpis.some((item) => {
    const before = previous.kpis.find((candidate) => candidate.id === item.id)
    return before?.status === 'available' && item.status === 'available'
  })
  return hasComparableMetric ? 'available' : 'unavailable'
}

function uniqueWarnings(warnings: DashboardWarning[]): DashboardWarning[] {
  const seen = new Set<DashboardWarningCode>()
  return warnings.filter((item) => {
    if (seen.has(item.code)) return false
    seen.add(item.code)
    return true
  })
}

export function buildDashboard(input: DashboardInput): DashboardViewModel {
  parseCivilDate(input.referenceDate)
  parseCivilDate(input.today)
  const interval = civilInterval(input.period, input.referenceDate, 0)
  const previousInterval = civilInterval(input.period, input.referenceDate, -1)
  const current = aggregateCategory(input, interval, true)
  const previous = aggregateCategory(input, previousInterval, false)
  const status = comparisonStatus(current, previous, previousInterval, input.today)
  const comparison: DashboardComparison = {
    status,
    partial: interval.start <= input.today && input.today < interval.end && previousInterval.end < input.today,
    previousInterval,
    metrics: current.kpis.map((item) => comparisonMetric(item, previous.kpis.find((candidate) => candidate.id === item.id))),
  }
  const periodWarnings: DashboardWarning[] = []
  if (interval.start > input.today) {
    periodWarnings.push(warning('future-period', 'O período selecionado é futuro; nenhum valor realizado foi calculado.'))
  } else if (interval.end > input.today) {
    periodWarnings.push(warning('future-dates-excluded', 'Datas futuras foram excluídas dos valores realizados.'))
  }
  if (!previous.hasData) periodWarnings.push(warning('previous-period-no-data', 'O período civil anterior não possui dados para comparação.'))

  return {
    category: input.category,
    period: input.period,
    interval,
    hasData: current.hasData,
    kpis: current.kpis,
    series: current.series,
    comparison,
    breakdown: current.breakdown,
    warnings: uniqueWarnings([...current.warnings, ...periodWarnings]),
  }
}
