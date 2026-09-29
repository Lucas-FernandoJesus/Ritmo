import { describe, expect, it } from 'vitest'
import { defaultSettings } from './domain'
import { repository } from './repository'
import type { BackupData, DeliveryShift, Expense, FinancialRecord } from './types'

const snapshotRepository = repository as unknown as {
  saveDailySnapshot: (snapshot: unknown) => Promise<void>
}

describe('barreiras do repositório', () => {
  it('rejeita novas estruturas inválidas antes de abrir IndexedDB', () => {
    const stamp = '2026-09-22T13:00:00.000Z'
    expect(() => repository.saveRecurringPlan({ id: 'r', name: 'Teste', type: 'saida', amount: 0, category: 'Outros', frequency: 'monthly', startDate: '2026-09-22', active: true, createdAt: stamp, updatedAt: stamp })).toThrow('Recorrência inválida')
    expect(() => repository.saveInstallmentPlan({ id: 'p', name: 'Teste', total: .01, count: 2, category: 'Outros', firstDueDate: '2026-09-22', active: true, createdAt: stamp, updatedAt: stamp })).toThrow('Parcelamento inválido')
    expect(() => repository.saveAssetAccount({ id: 'a', name: '', kind: 'bank', openingBalance: 0, openingDate: '2026-09-22', createdAt: stamp, updatedAt: stamp })).toThrow('Conta patrimonial inválida')
    expect(() => repository.saveAccountTransfer({ id: 't', fromAccountId: 'same', toAccountId: 'same', amount: 10, localDate: '2026-09-22', createdAt: stamp, updatedAt: stamp })).toThrow('Transferência inválida')
  })
  it('rejeita meta e orçamento inválidos antes de abrir o banco', () => {
    expect(() => repository.saveFinancialGoal({ id: 'bad', name: '', type: 'income', target: 100, startDate: '2026-09-01', endDate: '2026-09-30', createdAt: '2026-09-24T18:00:00.000Z' })).toThrow('Meta financeira inválida')
    expect(() => repository.saveCategoryBudget({ id: 'bad', month: '2026-09', category: 'Outros', limit: 0, createdAt: '2026-09-24T18:00:00.000Z' })).toThrow('Orçamento inválido')
  })
  it('rejeita movimentação financeira inválida antes de acessar a IndexedDB', () => {
    const item: FinancialRecord = { id: 'bad', localDate: '2026-09-24', description: 'Inválida', category: 'Outros', type: 'credito', amount: -1, createdAt: '2026-09-24T18:00:00.000Z' }
    expect(() => repository.saveFinancialRecord(item)).toThrow('Movimentação financeira inválida')
  })
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

  it('rejeita snapshot diário inválido antes de acessar a IndexedDB', () => {
    const snapshot = {
      id: '2026-09-24',
      localDate: '2026-09-23',
      mode: 'normal',
      activities: [],
      capturedAt: '2026-09-24T18:00:00.000Z',
    }
    expect(() => snapshotRepository.saveDailySnapshot(snapshot)).toThrow('Snapshot diário inválido')
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
