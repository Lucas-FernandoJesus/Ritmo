import { describe, expect, it } from 'vitest'
import { localDateKey } from '../../core/domain'
import { buildDashboard, type DashboardCategory, type DashboardInput, type DashboardPeriod, type DashboardViewModel } from './dashboard'
import type { DailyCompletion, DailyPlanActivity, DailyPlanSnapshot, DeliveryShift, Expense, StudyLog } from '../../core/types'

const emptyInput = (
  category: DashboardCategory,
  period: DashboardPeriod,
  referenceDate: string,
  today = referenceDate,
): DashboardInput => ({
  category,
  period,
  referenceDate,
  today,
  snapshots: [],
  completions: [],
  studyLogs: [],
  deliveryShifts: [],
  expenses: [],
})

const activity = (routineItemId: string, area: DailyPlanActivity['area'], nature: DailyPlanActivity['nature']): DailyPlanActivity => ({
  routineItemId,
  title: routineItemId,
  area,
  nature,
})

const snapshot = (localDate: string, activities: DailyPlanActivity[]): DailyPlanSnapshot => ({
  id: localDate,
  localDate,
  mode: 'normal',
  activities,
  capturedAt: `${localDate}T12:00:00.000Z`,
})

const completion = (localDate: string, routineItemId: string, state: DailyCompletion['state'] = 'done'): DailyCompletion => ({
  id: `${localDate}:${routineItemId}`,
  localDate,
  routineItemId,
  state,
  changedAt: `${localDate}T18:00:00.000Z`,
})

const study = (id: string, localDate: string, area: StudyLog['area'], minutes: number): StudyLog => ({
  id,
  localDate,
  area,
  minutes,
  content: `Conteúdo ${id}`,
  createdAt: `${localDate}T20:00:00.000Z`,
})

function shift(id: string, localDate: string, overrides: Partial<DeliveryShift> = {}): DeliveryShift {
  return {
    id,
    localDate,
    startTime: '18:00',
    endTime: '20:00',
    hours: 2,
    kilometers: 20,
    grossRevenue: 100,
    fuelCost: 10,
    maintenanceReserve: 5,
    otherExpenses: 0,
    estimatedResult: 85,
    resultPerHour: 42.5,
    resultPerKilometer: 4.25,
    fatigueLevel: 1,
    armCondition: 'habitual',
    createdAt: `${localDate}T20:30:00.000Z`,
    ...overrides,
  }
}

const expense = (id: string, localDate: string, amount: number): Expense => ({
  id,
  localDate,
  description: id,
  category: 'Outros',
  amount,
  createdAt: `${localDate}T10:00:00.000Z`,
})

function kpi(model: DashboardViewModel, id: string) {
  const result = model.kpis.find((item) => item.id === id)
  expect(result, `KPI ausente: ${id}`).toBeDefined()
  return result!
}

function series(model: DashboardViewModel, id: string) {
  const result = model.series.find((item) => item.id === id)
  expect(result, `Série ausente: ${id}`).toBeDefined()
  return result!
}

function comparisonMetric(model: DashboardViewModel, id: string) {
  const result = model.comparison.metrics.find((item) => item.id === id)
  expect(result, `Comparação ausente: ${id}`).toBeDefined()
  return result!
}

describe('períodos civis do dashboard', () => {
  it.each([
    ['2026-02-10', '2026-02-28', 28],
    ['2024-02-10', '2024-02-29', 29],
    ['2026-04-10', '2026-04-30', 30],
    ['2026-01-10', '2026-01-31', 31],
  ])('gera o mês civil de %s com o último dia correto', (referenceDate, expectedEnd, days) => {
    const model = buildDashboard(emptyInput('estudos', 'month', referenceDate, expectedEnd))

    expect(model.interval).toMatchObject({ start: referenceDate.slice(0, 8) + '01', end: expectedEnd })
    expect(series(model, 'study-minutes').points).toHaveLength(days)
  })

  it('faz a comparação de janeiro com dezembro do ano anterior', () => {
    const model = buildDashboard({
      ...emptyInput('estudos', 'month', '2026-01-15', '2026-01-31'),
      studyLogs: [study('current', '2026-01-05', 'Inglês', 20), study('previous', '2025-12-20', 'Inglês', 10)],
    })

    expect(model.interval).toEqual({ start: '2026-01-01', end: '2026-01-31', label: 'janeiro de 2026' })
    expect(model.comparison.previousInterval).toEqual({ start: '2025-12-01', end: '2025-12-31', label: 'dezembro de 2025' })
    expect(comparisonMetric(model, 'minutes-total')).toMatchObject({
      current: { status: 'available', value: 20, unit: 'minutes' },
      previous: { status: 'available', value: 10, unit: 'minutes' },
      change: { status: 'available', value: 10, unit: 'minutes' },
      changePercentage: { status: 'available', value: 100, unit: 'percent' },
    })
  })

  it('gera janeiro a dezembro e compara com o ano civil anterior', () => {
    const model = buildDashboard({
      ...emptyInput('estudos', 'year', '2026-06-15', '2026-12-31'),
      studyLogs: [study('current', '2026-03-05', 'Programação', 60), study('previous', '2025-08-20', 'Programação', 30)],
    })

    expect(model.interval).toEqual({ start: '2026-01-01', end: '2026-12-31', label: '2026' })
    expect(model.comparison.previousInterval).toEqual({ start: '2025-01-01', end: '2025-12-31', label: '2025' })
    expect(series(model, 'study-minutes').points).toHaveLength(12)
    expect(comparisonMetric(model, 'minutes-total').changePercentage).toEqual({ status: 'available', value: 100, unit: 'percent' })
  })

  it('usa a data local próxima da meia-noite sem deslocar o mês por UTC', () => {
    const localNearMidnight = localDateKey(new Date(2026, 0, 31, 23, 59, 59))
    const model = buildDashboard(emptyInput('estudos', 'month', localNearMidnight, localNearMidnight))

    expect(localNearMidnight).toBe('2026-01-31')
    expect(model.interval).toMatchObject({ start: '2026-01-01', end: '2026-01-31' })
  })

  it('exclui registros futuros do realizado e marca seus pontos como futuros', () => {
    const model = buildDashboard({
      ...emptyInput('estudos', 'month', '2026-09-10', '2026-09-10'),
      studyLogs: [study('today', '2026-09-10', 'Leitura', 10), study('future', '2026-09-11', 'Leitura', 20)],
    })

    expect(kpi(model, 'minutes-total')).toMatchObject({ status: 'available', value: 10 })
    expect(series(model, 'study-minutes').points[10]).toMatchObject({ key: '2026-09-11', status: 'future', value: null })
    expect(model.warnings.map((item) => item.code)).toContain('future-dates-excluded')
  })

  it('marca um período integral como futuro sem transformar registros em zero', () => {
    const model = buildDashboard({
      ...emptyInput('estudos', 'month', '2026-10-10', '2026-09-30'),
      studyLogs: [study('future', '2026-10-01', 'Inglês', 15)],
    })

    expect(model.hasData).toBe(false)
    expect(kpi(model, 'minutes-total')).toEqual(expect.objectContaining({ status: 'future', value: null }))
    expect(series(model, 'study-minutes').points.every((point) => point.status === 'future' && point.value === null)).toBe(true)
  })
})

describe('categorias do dashboard', () => {
  it('mantém zero, ausência, futuro e cálculo indisponível como estados distintos', () => {
    const model = buildDashboard({
      ...emptyInput('delivery', 'month', '2026-01-03', '2026-01-03'),
      deliveryShifts: [
        shift('zero', '2026-01-01', { grossRevenue: 0, fuelCost: 0, maintenanceReserve: 0, otherExpenses: 0, estimatedResult: 0, resultPerHour: 0, resultPerKilometer: 0 }),
        shift('missing', '2026-01-03', { grossRevenue: null, estimatedResult: null, resultPerHour: null, resultPerKilometer: null }),
      ],
    })
    const points = series(model, 'delivery-gross-revenue').points

    expect(points[0]).toMatchObject({ status: 'available', value: 0 })
    expect(points[1]).toMatchObject({ status: 'no-data', value: null })
    expect(points[2]).toMatchObject({ status: 'unavailable', value: null })
    expect(points[3]).toMatchObject({ status: 'future', value: null })
  })

  it('não converte snapshots históricos ausentes em tarefas zero', () => {
    const model = buildDashboard({
      ...emptyInput('tarefas', 'month', '2026-02-02', '2026-02-02'),
      snapshots: [snapshot('2026-02-01', [activity('work', 'trabalho', 'fixa')])],
    })

    expect(kpi(model, 'required-planned')).toMatchObject({ status: 'available', value: 1 })
    expect(series(model, 'tasks-completion-rate').points[1]).toMatchObject({ key: '2026-02-02', status: 'no-data', value: null })
    expect(model.warnings.map((item) => item.code)).toContain('incomplete-snapshots')
  })

  it('agrega tarefas obrigatórias, opcionais e puladas sem treino, estudo ou checklist de 30 dias', () => {
    const date = '2026-03-01'
    const model = buildDashboard({
      ...emptyInput('tarefas', 'month', date, date),
      snapshots: [snapshot(date, [
        activity('work-done', 'trabalho', 'fixa'),
        activity('home-skipped', 'casa', 'flexivel'),
        activity('leisure-optional', 'lazer', 'opcional'),
        activity('strength', 'treino', 'fixa'),
        activity('english', 'estudos', 'flexivel'),
      ])],
      completions: [
        completion(date, 'work-done'),
        completion(date, 'home-skipped', 'skipped'),
        completion(date, 'leisure-optional'),
        completion(date, 'strength'),
        completion(date, 'english'),
        completion(date, 'week-1-0'),
      ],
    })

    expect(kpi(model, 'required-planned').value).toBe(2)
    expect(kpi(model, 'required-completed').value).toBe(1)
    expect(kpi(model, 'optional-planned').value).toBe(1)
    expect(kpi(model, 'optional-completed').value).toBe(1)
    expect(kpi(model, 'skipped').value).toBe(1)
    expect(kpi(model, 'completion-rate')).toMatchObject({ status: 'available', value: 50, unit: 'percent' })
  })

  it('agrega somente atividades classificadas como treino e mantém opcionais separados', () => {
    const date = '2026-03-02'
    const model = buildDashboard({
      ...emptyInput('treinos', 'month', date, date),
      snapshots: [snapshot(date, [
        activity('strength', 'treino', 'flexivel'),
        activity('muay-optional', 'treino', 'opcional'),
        activity('work', 'trabalho', 'fixa'),
      ])],
      completions: [completion(date, 'strength'), completion(date, 'muay-optional', 'skipped'), completion(date, 'work')],
    })

    expect(kpi(model, 'planned').value).toBe(2)
    expect(kpi(model, 'completed').value).toBe(1)
    expect(kpi(model, 'skipped').value).toBe(1)
    expect(kpi(model, 'optional-planned').value).toBe(1)
    expect(kpi(model, 'completion-rate').value).toBe(100)
    expect(series(model, 'training-completion-rate').points[1]).toMatchObject({ status: 'available', value: 100 })
  })

  it('agrega sessões, minutos, média e distribuição dos estudos registrados', () => {
    const model = buildDashboard({
      ...emptyInput('estudos', 'month', '2026-03-31', '2026-03-31'),
      studyLogs: [
        study('english-1', '2026-03-01', 'Inglês', 30),
        study('english-2', '2026-03-02', 'Inglês', 30),
        study('programming', '2026-03-02', 'Programação', 60),
      ],
    })

    expect(kpi(model, 'sessions')).toMatchObject({ status: 'available', value: 3, unit: 'count' })
    expect(kpi(model, 'minutes-total')).toMatchObject({ status: 'available', value: 120, unit: 'minutes' })
    expect(kpi(model, 'minutes-average')).toMatchObject({ status: 'available', value: 40, unit: 'minutes' })
    expect(model.breakdown.find((item) => item.id === 'Inglês')?.metrics).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'sessions', value: 2 }),
      expect.objectContaining({ id: 'minutes', value: 60 }),
    ]))
    expect(model.breakdown.find((item) => item.id === 'Leitura')?.metrics).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'sessions', status: 'available', value: 0 }),
    ]))
  })

  it('agrega delivery completo e recalcula resultados com a função financeira existente', () => {
    const model = buildDashboard({
      ...emptyInput('delivery', 'month', '2026-03-31', '2026-03-31'),
      deliveryShifts: [
        shift('first', '2026-03-01'),
        shift('second', '2026-03-02', { kilometers: 30, grossRevenue: 120, fuelCost: 20, estimatedResult: 999, resultPerHour: 999, resultPerKilometer: 999 }),
      ],
    })

    expect(kpi(model, 'shifts').value).toBe(2)
    expect(kpi(model, 'hours').value).toBe(4)
    expect(kpi(model, 'kilometers').value).toBe(50)
    expect(kpi(model, 'gross-revenue').value).toBe(220)
    expect(kpi(model, 'estimated-result').value).toBe(180)
    expect(kpi(model, 'revenue-per-hour').value).toBe(55)
    expect(kpi(model, 'result-per-hour').value).toBe(45)
    expect(kpi(model, 'result-per-kilometer').value).toBe(3.6)
  })

  it('preserva cálculos financeiros indisponíveis quando um turno tem campos ausentes', () => {
    const model = buildDashboard({
      ...emptyInput('delivery', 'month', '2026-03-31', '2026-03-31'),
      deliveryShifts: [shift('missing', '2026-03-01', { grossRevenue: null, estimatedResult: null, resultPerHour: null, resultPerKilometer: null })],
    })

    expect(kpi(model, 'shifts')).toMatchObject({ status: 'available', value: 1 })
    expect(kpi(model, 'gross-revenue')).toMatchObject({ status: 'unavailable', value: null })
    expect(kpi(model, 'estimated-result')).toMatchObject({ status: 'unavailable', value: null })
    expect(kpi(model, 'revenue-per-hour')).toMatchObject({ status: 'unavailable', value: null })
    expect(model.warnings.map((item) => item.code)).toContain('incomplete-financial-data')
  })

  it('agrega renda somente com receita, custos e resultado estimado dos turnos', () => {
    const model = buildDashboard({
      ...emptyInput('renda', 'month', '2026-03-31', '2026-03-31'),
      deliveryShifts: [
        shift('first', '2026-03-01'),
        shift('second', '2026-03-02', { grossRevenue: 120, fuelCost: 20, estimatedResult: 95, resultPerHour: 47.5, resultPerKilometer: 4.75 }),
      ],
    })

    expect(kpi(model, 'gross-revenue')).toMatchObject({ value: 220, unit: 'BRL' })
    expect(kpi(model, 'fuel-cost').value).toBe(30)
    expect(kpi(model, 'maintenance-reserve').value).toBe(10)
    expect(kpi(model, 'other-expenses').value).toBe(0)
    expect(kpi(model, 'registered-costs').value).toBe(40)
    expect(kpi(model, 'estimated-result').value).toBe(180)
    expect(series(model, 'income-estimated-result').unit).toBe('BRL')
  })

  it('ignora despesas gerais na renda e evita dupla contagem', () => {
    const base = {
      ...emptyInput('renda', 'month', '2026-03-31', '2026-03-31'),
      deliveryShifts: [shift('delivery', '2026-03-01')],
    }
    const withoutGeneralExpenses = buildDashboard(base)
    const withGeneralExpenses = buildDashboard({ ...base, expenses: [expense('rent', '2026-03-01', 10_000)] })

    expect(kpi(withGeneralExpenses, 'estimated-result')).toEqual(kpi(withoutGeneralExpenses, 'estimated-result'))
    expect(kpi(withGeneralExpenses, 'registered-costs')).toEqual(kpi(withoutGeneralExpenses, 'registered-costs'))
  })

  it('recalcula horas pela madrugada e inclui despesas pagas vinculadas de ambas as fontes', () => {
    const model = buildDashboard({
      ...emptyInput('delivery', 'month', '2026-03-31'),
      deliveryShifts: [shift('night', '2026-03-01', { startTime: '20:00', endTime: '02:00', hours: 99 })],
      expenses: [{ ...expense('meal', '2026-03-01', 10), deliveryShiftId: 'night' }, expense('rent', '2026-03-01', 1000)],
      financialRecords: [{ id: 'fee', localDate: '2026-03-01', description: 'Taxa', type: 'saida', category: 'Outros', amount: 5, deliveryShiftId: 'night', createdAt: '2026-03-01T21:00:00.000Z' }, { id: 'open', localDate: '2026-03-01', description: 'Pendente', type: 'pendencia', category: 'Outros', amount: 100, deliveryShiftId: 'night', createdAt: '2026-03-01T21:00:00.000Z' }],
    })
    expect(kpi(model, 'hours').value).toBe(6)
    expect(kpi(model, 'registered-costs').value).toBe(30)
    expect(kpi(model, 'estimated-result').value).toBe(70)
    expect(kpi(model, 'result-per-hour').value).toBeCloseTo(70 / 6)
  })

  it('mantém séries anuais com 12 meses sem misturar unidades', () => {
    const model = buildDashboard({
      ...emptyInput('renda', 'year', '2026-12-31', '2026-12-31'),
      deliveryShifts: [shift('january', '2026-01-10'), shift('december', '2026-12-10')],
    })

    expect(model.series.every((item) => item.points.length === 12)).toBe(true)
    expect(model.series.find((item) => item.id === 'income-gross-revenue')?.unit).toBe('BRL')
    expect(model.series.find((item) => item.id === 'income-estimated-result')?.unit).toBe('BRL')
  })

  it('marca a comparação como sem dados quando o período anterior não tem registros', () => {
    const model = buildDashboard({
      ...emptyInput('estudos', 'month', '2026-03-31', '2026-03-31'),
      studyLogs: [study('current', '2026-03-01', 'Inglês', 30)],
    })

    expect(model.comparison.status).toBe('no-data')
    expect(comparisonMetric(model, 'minutes-total').previous).toEqual({ status: 'no-data', value: null, unit: 'minutes' })
    expect(comparisonMetric(model, 'minutes-total').change).toEqual({ status: 'no-data', value: null, unit: 'minutes' })
  })

  it('não modifica snapshots, conclusões, estudos, turnos ou despesas recebidos', () => {
    const input: DashboardInput = {
      ...emptyInput('renda', 'month', '2026-03-31', '2026-03-31'),
      snapshots: [snapshot('2026-03-02', [activity('work', 'trabalho', 'fixa')])],
      completions: [completion('2026-03-02', 'work')],
      studyLogs: [study('study', '2026-03-02', 'Inglês', 20)],
      deliveryShifts: [shift('later', '2026-03-02'), shift('earlier', '2026-03-01')],
      expenses: [expense('expense', '2026-03-02', 15)],
    }
    const before = structuredClone(input)

    buildDashboard(input)

    expect(input).toEqual(before)
  })
})
