import { isLocalDate } from './domain'
import { financialPeriod, summarizeFinance, type FinanceSources } from './finance'
import { buildFinanceAnalysis } from './finance-analysis'
import { accountBalances } from './finance-plans'
import type { CategoryBudget, FinancialGoal, FinancePlanningData } from './types'

export function buildMonthlyClosing(input: FinanceSources & FinancePlanningData & { goals: readonly FinancialGoal[]; budgets: readonly CategoryBudget[] }, month: string) {
  if (!isLocalDate(`${month}-01`)) throw new Error('Mês inválido.')
  const interval = financialPeriod('month', `${month}-01`)
  const asOf = interval.end < input.today ? interval.end : input.today
  const analysis = buildFinanceAnalysis({ ...input, period: 'month', interval })
  return { month, asOf, partial: interval.end > input.today, analysis, summary: summarizeFinance(analysis.periodRows), comparison: analysis.comparison,
    wealth: accountBalances(input.accounts, input.records, input.expenses, input.transfers, asOf, input.shifts) }
}
