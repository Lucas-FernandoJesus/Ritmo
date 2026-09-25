import { describe, expect, it } from 'vitest'
import { calculateDelivery, defaultSettings, filterRoutineForDay, localDateKey, recentRecords, rideSafety, rideSafetyForDate, summarizePlanProgress, upgradeAppearance, validateBackup, withScheduleStart } from './domain'
import { progressPlan, routineItems } from './data'
import type { BackupData } from './types'

function validBackup(): BackupData {
  return {
    schemaVersion: 1,
    exportedAt: '2026-09-24T18:00:00.000Z',
    completions: [{ id: '2026-09-24:wake', localDate: '2026-09-24', routineItemId: 'wake', state: 'done', changedAt: '2026-09-24T10:00:00.000Z' }],
    checkIns: [{ localDate: '2026-09-24', enoughSleep: true, fatigueLevel: 1, armCondition: 'habitual', safeToRide: true }],
    deliveryShifts: [{ id: 'shift-1', localDate: '2026-09-24', startTime: '18:00', endTime: '20:00', hours: 2, kilometers: 40, grossRevenue: 120, fuelCost: 20, maintenanceReserve: 10, otherExpenses: 5, estimatedResult: 85, resultPerHour: 42.5, resultPerKilometer: 2.125, fatigueLevel: 1, armCondition: 'habitual', createdAt: '2026-09-24T21:00:00.000Z' }],
    expenses: [{ id: 'expense-1', localDate: '2026-09-24', description: 'Mercado', category: 'Alimentação', amount: 42.5, createdAt: '2026-09-24T18:00:00.000Z' }],
    studyLogs: [{ id: 'study-1', localDate: '2026-09-24', area: 'Inglês', minutes: 25, content: 'Vocabulário', createdAt: '2026-09-24T18:00:00.000Z' }],
    progress: [{ id: 'week-1-0', week: 1, item: 'Testar rotina', state: 'done', completedAt: '2026-09-24T18:00:00.000Z' }],
    settings: defaultSettings(),
  }
}

const cloneBackup = () => structuredClone(validBackup())

describe('regras críticas', () => {
  it('calcula resultado estimado e índices', () => {
    expect(calculateDelivery({ grossRevenue: 200, fuelCost: 30, maintenanceReserve: 20, otherExpenses: 10, hours: 4, kilometers: 80 }))
      .toEqual({ estimatedResult: 140, resultPerHour: 35, resultPerKilometer: 1.75 })
  })

  it('protege divisões por zero e dados ausentes', () => {
    expect(calculateDelivery({ grossRevenue: 100, fuelCost: 10, maintenanceReserve: 5, otherExpenses: 0, hours: 0, kilometers: 0 }))
      .toEqual({ estimatedResult: 85, resultPerHour: null, resultPerKilometer: null })
    expect(calculateDelivery({ grossRevenue: null, fuelCost: 10, maintenanceReserve: 5, otherExpenses: 0, hours: 2, kilometers: 20 }).estimatedResult).toBeNull()
  })

  it('rejeita valores financeiros negativos ou não finitos', () => {
    expect(calculateDelivery({ grossRevenue: -1, fuelCost: 0, maintenanceReserve: 0, otherExpenses: 0, hours: 1, kilometers: 1 }))
      .toEqual({ estimatedResult: null, resultPerHour: null, resultPerKilometer: null })
    expect(calculateDelivery({ grossRevenue: 100, fuelCost: Number.POSITIVE_INFINITY, maintenanceReserve: 0, otherExpenses: 0, hours: 1, kilometers: 1 }))
      .toEqual({ estimatedResult: null, resultPerHour: null, resultPerKilometer: null })
    expect(calculateDelivery({ grossRevenue: Number.MAX_VALUE, fuelCost: Number.MAX_VALUE, maintenanceReserve: Number.MAX_VALUE, otherExpenses: 0, hours: 1, kilometers: 1 }))
      .toEqual({ estimatedResult: null, resultPerHour: null, resultPerKilometer: null })
  })

  it('mantém cálculos finitos e coerentes em uma grade ampla de valores', () => {
    for (const revenue of [0, 1, 99.99, 10_000, 1_000_000]) {
      for (const fuel of [0, 0.01, 100, 999.99]) {
        for (const hours of [0, 0.25, 1, 12, 100]) {
          const result = calculateDelivery({ grossRevenue: revenue, fuelCost: fuel, maintenanceReserve: 10, otherExpenses: 5, hours, kilometers: 40 })
          expect(result.estimatedResult).toBeCloseTo(revenue - fuel - 15)
          expect(result.resultPerHour).toBe(hours === 0 ? null : (revenue - fuel - 15) / hours)
          expect(result.resultPerKilometer).toBeCloseTo((revenue - fuel - 15) / 40)
          expect(Object.values(result).every((value) => value === null || Number.isFinite(value))).toBe(true)
        }
      }
    }
  })

  it('mantém data local sem conversão UTC', () => {
    expect(localDateKey(new Date(2026, 8, 4, 23, 59))).toBe('2026-09-04')
  })

  it('produz listas diferentes por modo', () => {
    const settings = defaultSettings()
    const normal = filterRoutineForDay(routineItems, 1, 'normal', settings)
    const reduced = filterRoutineForDay(routineItems, 1, 'reduzido', settings)
    const minimum = filterRoutineForDay(routineItems, 1, 'minimo', settings)
    expect(normal.length).toBeGreaterThan(reduced.length)
    expect(reduced.length).toBeGreaterThan(minimum.length)
  })

  it('bloqueia pilotagem sem checagem ou com risco', () => {
    expect(rideSafety(null).allowed).toBe(false)
    expect(rideSafety({ localDate: '2026-09-24', enoughSleep: true, fatigueLevel: 2, armCondition: 'habitual', safeToRide: true }).allowed).toBe(false)
    expect(rideSafety({ localDate: '2026-09-24', enoughSleep: true, fatigueLevel: 1, armCondition: 'habitual', safeToRide: true }).allowed).toBe(true)
    expect(rideSafetyForDate({ localDate: '2026-09-23', enoughSleep: true, fatigueLevel: 1, armCondition: 'habitual', safeToRide: true }, '2026-09-24').allowed).toBe(false)
  })

  it('rejeita backup com versão incompatível', () => {
    expect(validateBackup({ schemaVersion: 999 })).toBe(false)
  })

  it('aceita backup completo e coerente', () => {
    expect(validateBackup(validBackup())).toBe(true)
  })

  it('recusa datas ISO que o motor JavaScript normalizaria para outro dia', () => {
    const invalidExport = cloneBackup()
    invalidExport.exportedAt = '2026-02-31T18:00:00.000Z'
    expect(validateBackup(invalidExport)).toBe(false)

    const invalidCreation = cloneBackup()
    invalidCreation.expenses[0].createdAt = '2026-09-31T18:00:00.000Z'
    expect(validateBackup(invalidCreation)).toBe(false)
  })

  it('conta somente etapas existentes no plano de progresso', () => {
    const extra = { id: 'week-1-99', week: 1 as const, item: 'Etapa antiga', state: 'done' as const, completedAt: '2026-09-24T18:00:00.000Z' }
    const summary = summarizePlanProgress([...validBackup().progress, extra], progressPlan)
    expect(summary.completedCount).toBe(1)
    expect(summary.total).toBe(19)
    expect(summary.percentage).toBe(5)
    expect(summary.completedIds.has(extra.id)).toBe(false)
  })

  it('preserva horário final ao limpar apenas o horário inicial', () => {
    const settings = defaultSettings()
    settings.scheduleOverrides.work = { startTime: '09:00', endTime: '17:00' }
    const updated = withScheduleStart(settings, 'work', '')
    expect(updated.scheduleOverrides.work).toEqual({ endTime: '17:00' })
    expect(settings.scheduleOverrides.work).toEqual({ startTime: '09:00', endTime: '17:00' })
    expect(withScheduleStart(defaultSettings(), 'work', '').scheduleOverrides).toEqual({})
  })

  it('mostra os registros mais recentes mesmo quando as chaves estão fora de ordem', () => {
    const records = [
      { id: 'z', createdAt: '2026-09-22T18:00:00.000Z' },
      { id: 'a', createdAt: '2026-09-24T18:00:00.000Z' },
      { id: 'm', createdAt: '2026-09-23T18:00:00.000Z' },
    ]
    expect(recentRecords(records, 2).map((item) => item.id)).toEqual(['a', 'm'])
    expect(records.map((item) => item.id)).toEqual(['z', 'a', 'm'])
  })

  it('mantém backups antigos compatíveis e valida a preferência de aparência', () => {
    const oldBackup = cloneBackup()
    delete oldBackup.settings.theme
    expect(validateBackup(oldBackup)).toBe(true)

    const darkBackup = cloneBackup()
    darkBackup.settings.theme = 'dark'
    expect(validateBackup(darkBackup)).toBe(true)

    const invalidTheme = cloneBackup()
    invalidTheme.settings.theme = 'neon' as 'light'
    expect(validateBackup(invalidTheme)).toBe(false)
  })

  it('ativa o novo tema escuro apenas na primeira migração de aparência', () => {
    const oldSystem = { ...defaultSettings(), theme: 'system' as const, appearanceVersion: undefined }
    const upgraded = upgradeAppearance(oldSystem)
    expect(upgraded.theme).toBe('dark')
    expect(upgraded.appearanceVersion).toBe(2)
    expect(upgradeAppearance({ ...upgraded, theme: 'system' }).theme).toBe('system')
    expect(upgradeAppearance({ ...oldSystem, theme: 'light' }).theme).toBe('light')
  })

  it('rejeita IDs duplicados, datas impossíveis e vínculos adulterados', () => {
    const duplicate = cloneBackup()
    duplicate.expenses.push({ ...duplicate.expenses[0] })
    expect(validateBackup(duplicate)).toBe(false)

    const impossibleDate = cloneBackup()
    impossibleDate.checkIns[0].localDate = '2026-02-31'
    expect(validateBackup(impossibleDate)).toBe(false)

    const mismatchedId = cloneBackup()
    mismatchedId.completions[0].id = '2026-09-23:wake'
    expect(validateBackup(mismatchedId)).toBe(false)

    const looseTimestamp = cloneBackup()
    looseTimestamp.exportedAt = '1'
    expect(validateBackup(looseTimestamp)).toBe(false)
  })

  it('rejeita totais de delivery adulterados e números negativos', () => {
    const tamperedResult = cloneBackup()
    tamperedResult.deliveryShifts[0].estimatedResult = 999
    expect(validateBackup(tamperedResult)).toBe(false)

    const negativeExpense = cloneBackup()
    negativeExpense.expenses[0].amount = -10
    expect(validateBackup(negativeExpense)).toBe(false)
  })

  it('rejeita configurações e estados internos desconhecidos', () => {
    const invalidMode = cloneBackup()
    invalidMode.settings.preferredMode = 'turbo' as 'normal'
    expect(validateBackup(invalidMode)).toBe(false)

    const invalidTime = cloneBackup()
    invalidTime.settings.scheduleOverrides.wake = { startTime: '29:90' }
    expect(validateBackup(invalidTime)).toBe(false)

    const pendingWithDate = cloneBackup()
    pendingWithDate.progress[0].state = 'pending'
    expect(validateBackup(pendingWithDate)).toBe(false)
  })
})
