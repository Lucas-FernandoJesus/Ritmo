import { describe, expect, it } from 'vitest'
import { defaultSettings } from './domain'
import { repository } from './repository'
import type { BackupData, DeliveryShift, Expense } from './types'

describe('barreiras do repositório', () => {
  it('rejeita despesa inválida antes de acessar a IndexedDB', () => {
    const expense: Expense = { id: 'expense-1', localDate: '2026-09-24', description: 'Inválida', category: 'Outros', amount: -1, createdAt: '2026-09-24T18:00:00.000Z' }
    expect(() => repository.saveExpense(expense)).toThrow('Despesa inválida')
  })

  it('rejeita cálculo de delivery adulterado antes de acessar a IndexedDB', () => {
    const shift: DeliveryShift = { id: 'shift-1', localDate: '2026-09-24', startTime: '18:00', endTime: '20:00', hours: 2, kilometers: 40, grossRevenue: 120, fuelCost: 20, maintenanceReserve: 10, otherExpenses: 5, estimatedResult: 999, resultPerHour: 42.5, resultPerKilometer: 2.125, fatigueLevel: 1, armCondition: 'habitual', createdAt: '2026-09-24T21:00:00.000Z' }
    expect(() => repository.saveDeliveryShift(shift)).toThrow('Turno de delivery inválido')
  })

  it('rejeita configurações adulteradas antes de acessar a IndexedDB', () => {
    const settings = { ...defaultSettings(), preferredMode: 'turbo' as 'normal' }
    expect(() => repository.saveSettings(settings)).toThrow('Ajustes inválidos')
  })

  it('rejeita importação malformada antes de abrir uma transação', async () => {
    const malformed = {
      schemaVersion: 1,
      exportedAt: '2026-09-24T18:00:00.000Z',
      completions: [],
      checkIns: [],
      deliveryShifts: [],
      expenses: [{ id: 'duplicate', amount: -1 }],
      studyLogs: [],
      progress: [],
      settings: defaultSettings(),
    } as unknown as BackupData

    await expect(repository.importAll(malformed)).rejects.toThrow('Backup inválido')
  })
})
