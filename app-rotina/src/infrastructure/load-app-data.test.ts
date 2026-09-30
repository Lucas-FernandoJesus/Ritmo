import { describe, expect, it } from 'vitest'
import { defaultSettings } from '../core/domain'
import { loadAppData, type AppDataSource } from './load-app-data'

describe('loadAppData', () => {
  it('inicializa a persistência e devolve todas as coleções nomeadas', async () => {
    const calls: string[] = []
    const settings = defaultSettings()
    const source: AppDataSource = {
      initialize: async () => { calls.push('initialize') },
      getSettings: async () => settings,
      getCompletions: async () => [],
      getDailySnapshots: async () => [],
      getCheckIn: async (date) => { calls.push(`check-in:${date}`); return undefined },
      getDeliveryShifts: async () => [],
      getExpenses: async () => [],
      getStudyLogs: async () => [],
      getProgress: async () => [],
      getFinancialRecords: async () => [],
      getFinancialGoals: async () => [],
      getCategoryBudgets: async () => [],
      getRecurringPlans: async () => [],
      getInstallmentPlans: async () => [],
      getAssetAccounts: async () => [],
      getAccountTransfers: async () => [],
    }

    const loaded = await loadAppData(source, '2026-09-22')

    expect(calls).toEqual(['initialize', 'check-in:2026-09-22'])
    expect(loaded).toEqual({
      settings,
      completions: [],
      dailySnapshots: [],
      checkIn: null,
      deliveryShifts: [],
      expenses: [],
      studyLogs: [],
      progress: [],
      financialRecords: [],
      financialGoals: [],
      categoryBudgets: [],
      financePlanning: { recurringPlans: [], installmentPlans: [], accounts: [], transfers: [] },
    })
  })
})
