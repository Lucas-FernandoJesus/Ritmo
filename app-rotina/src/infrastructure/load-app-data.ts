import type { repository } from './repository'

export type AppDataSource = Pick<typeof repository,
  | 'initialize'
  | 'getSettings'
  | 'getCompletions'
  | 'getDailySnapshots'
  | 'getCheckIn'
  | 'getDeliveryShifts'
  | 'getExpenses'
  | 'getStudyLogs'
  | 'getProgress'
  | 'getFinancialRecords'
  | 'getFinancialGoals'
  | 'getCategoryBudgets'
  | 'getRecurringPlans'
  | 'getInstallmentPlans'
  | 'getAssetAccounts'
  | 'getAccountTransfers'
>

export async function loadAppData(source: AppDataSource, dateKey: string) {
  await source.initialize()
  const [settings, completions, dailySnapshots, checkIn, deliveryShifts, expenses, studyLogs, progress, financialRecords, financialGoals, categoryBudgets, recurringPlans, installmentPlans, accounts, transfers] = await Promise.all([
    source.getSettings(),
    source.getCompletions(),
    source.getDailySnapshots(),
    source.getCheckIn(dateKey),
    source.getDeliveryShifts(),
    source.getExpenses(),
    source.getStudyLogs(),
    source.getProgress(),
    source.getFinancialRecords(),
    source.getFinancialGoals(),
    source.getCategoryBudgets(),
    source.getRecurringPlans(),
    source.getInstallmentPlans(),
    source.getAssetAccounts(),
    source.getAccountTransfers(),
  ])

  return {
    settings,
    completions,
    dailySnapshots,
    checkIn: checkIn ?? null,
    deliveryShifts,
    expenses,
    studyLogs,
    progress,
    financialRecords,
    financialGoals,
    categoryBudgets,
    financePlanning: { recurringPlans, installmentPlans, accounts, transfers },
  }
}
