import { useCallback, useState } from 'react'
import type { CategoryBudget, FinancialGoal, FinancialRecord, FinancePlanningData } from '../../core/types'
import { repository } from '../../infrastructure/repository'
import { settleFinancialRecord } from './finance'

const emptyPlanning: FinancePlanningData = { recurringPlans: [], installmentPlans: [], accounts: [], transfers: [] }
const readableError = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback

export function useFinanceState(today: string, onMessage: (message: string) => void) {
  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>([])
  const [financialGoals, setFinancialGoals] = useState<FinancialGoal[]>([])
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudget[]>([])
  const [financePlanning, setFinancePlanning] = useState<FinancePlanningData>(emptyPlanning)

  const hydrateFinance = useCallback((data: { financialRecords: FinancialRecord[]; financialGoals: FinancialGoal[]; categoryBudgets: CategoryBudget[]; financePlanning: FinancePlanningData }) => {
    setFinancialRecords(data.financialRecords)
    setFinancialGoals(data.financialGoals)
    setCategoryBudgets(data.categoryBudgets)
    setFinancePlanning(data.financePlanning)
  }, [])

  async function saveFinancialRecord(item: FinancialRecord) {
    try {
      await repository.saveFinancialRecord(item)
      setFinancialRecords((current) => [item, ...current.filter((existing) => existing.id !== item.id)])
      onMessage('Movimentação financeira salva.')
      return true
    } catch (error) { onMessage(readableError(error, 'Não foi possível salvar a movimentação.')); return false }
  }

  async function saveFinancialGoal(item: FinancialGoal) {
    try {
      await repository.saveFinancialGoal(item)
      setFinancialGoals((current) => [item, ...current.filter((existing) => existing.id !== item.id)])
      onMessage('Meta financeira salva.')
      return true
    } catch (error) { onMessage(readableError(error, 'Não foi possível salvar a meta.')); return false }
  }

  async function saveCategoryBudget(item: CategoryBudget) {
    try {
      await repository.saveCategoryBudget(item)
      setCategoryBudgets((current) => [item, ...current.filter((existing) => existing.id !== item.id)])
      onMessage('Orçamento salvo.')
      return true
    } catch (error) { onMessage(readableError(error, 'Não foi possível salvar o orçamento.')); return false }
  }

  async function removeFinancialPlan(kind: 'goal' | 'budget', id: string) {
    try {
      if (kind === 'goal') { await repository.deleteFinancialGoal(id); setFinancialGoals((current) => current.filter((item) => item.id !== id)) }
      else { await repository.deleteCategoryBudget(id); setCategoryBudgets((current) => current.filter((item) => item.id !== id)) }
      onMessage('Planejamento excluído.')
      return true
    } catch (error) { onMessage(readableError(error, 'Não foi possível excluir o planejamento.')); return false }
  }

  async function saveFinanceOperation(action: () => Promise<unknown>, success: string) {
    try {
      await action()
      const [recurringPlans, installmentPlans, accounts, transfers, records] = await Promise.all([repository.getRecurringPlans(), repository.getInstallmentPlans(), repository.getAssetAccounts(), repository.getAccountTransfers(), repository.getFinancialRecords()])
      setFinancePlanning({ recurringPlans, installmentPlans, accounts, transfers })
      setFinancialRecords(records)
      onMessage(success)
      return true
    } catch (error) { onMessage(readableError(error, 'Não foi possível salvar.')); return false }
  }

  const financeOperations = {
    onRecurring: (plan: Parameters<typeof repository.saveRecurringPlan>[0]) => saveFinanceOperation(() => repository.saveRecurringPlan(plan), 'Recorrência salva.'),
    onInstallment: (plan: Parameters<typeof repository.saveInstallmentPlan>[0]) => saveFinanceOperation(() => repository.saveInstallmentPlan(plan), 'Parcelamento salvo.'),
    onAccount: (account: Parameters<typeof repository.saveAssetAccount>[0]) => saveFinanceOperation(() => repository.saveAssetAccount(account), 'Conta patrimonial salva.'),
    onTransfer: (transfer: Parameters<typeof repository.saveAccountTransfer>[0]) => saveFinanceOperation(() => repository.saveAccountTransfer(transfer), 'Transferência salva sem alterar entradas ou saídas.'),
    onConfirm: (ref: Parameters<typeof repository.confirmOccurrence>[0], date: string) => saveFinanceOperation(() => repository.confirmOccurrence(ref, date), 'Ocorrência confirmada uma única vez.'),
    onSettle: (record: FinancialRecord) => saveFinancialRecord(settleFinancialRecord(record, today, new Date().toISOString())),
  }

  return { financialRecords, financialGoals, categoryBudgets, financePlanning, hydrateFinance, saveFinancialRecord, saveFinancialGoal, saveCategoryBudget, removeFinancialPlan, financeOperations }
}
