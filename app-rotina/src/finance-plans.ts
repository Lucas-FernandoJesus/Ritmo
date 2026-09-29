import { isLocalDate, isValidInstallmentPlan, isValidRecurringPlan } from './domain'
import { anchoredMonth, occurrenceId, recurringDate } from './finance-schedule'
import { moneyRatio, subtractMoney, sumMoney } from './money'
import type { FinancialMovement } from './finance'
import type { AccountTransfer, AssetAccount, AssetKind, DeliveryShift, Expense, FinancialRecord, InstallmentPlan, PlanningReference, RecurringPlan } from './types'

export const frequencyLabels = { weekly: 'Semanal', monthly: 'Mensal', yearly: 'Anual' }
export const assetKindLabels: Record<AssetKind, string> = { cash: 'Dinheiro', bank: 'Conta', savings: 'Poupança', reserve: 'Reserva financeira', investment: 'Investimento', liability: 'Dívida / passivo' }
export interface PlanOccurrence {
  id: string
  ref: PlanningReference
  dueDate: string
  name: string
  type: FinancialRecord['type']
  category: FinancialRecord['category']
  amount: number
  accountId?: string
  liabilityAccountId?: string
  record?: FinancialRecord
}

export function installmentAmounts(total: number, count: number): number[] {
  const cents = Math.round(total * 100)
  if (!Number.isFinite(total) || !Number.isSafeInteger(cents) || !Number.isInteger(count) || count < 1 || count > 600 || cents < count) return []
  const each = Math.floor(cents / count), remainder = cents % count
  return Array.from({ length: count }, (_, index) => (each + (index < remainder ? 1 : 0)) / 100)
}

export function planOccurrences(recurring: readonly RecurringPlan[], installments: readonly InstallmentPlan[], records: readonly FinancialRecord[], interval: { start: string; end: string }): PlanOccurrence[] {
  if (!isLocalDate(interval.start) || !isLocalDate(interval.end) || interval.start > interval.end) return []
  const byId = new Map(records.map(record => [record.id, record]))
  const result: PlanOccurrence[] = []
  function append(ref: PlanningReference, plan: RecurringPlan | InstallmentPlan, amount: number, type: FinancialRecord['type']) {
    if (ref.dueDate < interval.start || ref.dueDate > interval.end) return
    const id = occurrenceId(ref)
    result.push({ id, ref, dueDate: ref.dueDate, name: plan.name, amount, type, category: plan.category, accountId: plan.accountId, liabilityAccountId: plan.liabilityAccountId, record: byId.get(id) })
  }
  for (const plan of recurring) {
    if (!plan.active || !isValidRecurringPlan(plan)) continue
    // Começa junto ao período consultado, sem percorrer anos de ocorrências antigas.
    const [year, month] = interval.start.split('-').map(Number), [startYear, startMonth] = plan.startDate.split('-').map(Number)
    let index = Math.max(0, plan.frequency === 'weekly'
      ? Math.floor((Date.parse(`${interval.start}T12:00:00Z`) - Date.parse(`${plan.startDate}T12:00:00Z`)) / 604800000)
      : plan.frequency === 'yearly' ? year - startYear : (year - startYear) * 12 + month - startMonth)
    for (; ; index++) {
      const date = recurringDate(plan, index)
      if (date > interval.end || date.slice(0, 4).length !== 4 || (plan.endDate && date > plan.endDate)) break
      append({ kind: 'recurring', planId: plan.id, key: date, dueDate: date }, plan, plan.amount, plan.type)
    }
  }
  for (const plan of installments) {
    if (!plan.active || !isValidInstallmentPlan(plan)) continue
    installmentAmounts(plan.total, plan.count).forEach((amount, index) => append({ kind: 'installment', planId: plan.id, key: String(index + 1), dueDate: anchoredMonth(plan.firstDueDate, index) }, plan, amount, 'saida'))
  }
  return result.sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.id.localeCompare(b.id))
}

export function createOccurrenceRecord(occurrence: PlanOccurrence, date: string, timestamp: string): FinancialRecord {
  if (occurrence.record) return occurrence.record
  if (!isLocalDate(date)) throw new Error('Data de confirmação inválida.')
  return { id: occurrence.id, planningRef: occurrence.ref, localDate: occurrence.type === 'credito' || occurrence.type === 'pendencia' ? occurrence.dueDate : date,
    description: occurrence.ref.kind === 'installment' ? `${occurrence.name} · parcela ${occurrence.ref.key}` : occurrence.name,
    category: occurrence.category, type: occurrence.type, amount: occurrence.amount, accountId: occurrence.accountId, liabilityAccountId: occurrence.liabilityAccountId, createdAt: timestamp, updatedAt: timestamp }
}

export function plannedMovements(occurrences: readonly PlanOccurrence[]): FinancialMovement[] {
  return occurrences.filter(o => !o.record).map(o => ({ id: o.id, sourceId: o.ref.planId, source: 'planning', origin: o.ref.kind === 'recurring' ? 'Recorrências' : 'Parcelamentos', localDate: o.dueDate,
    description: o.ref.kind === 'installment' ? `${o.name} · parcela ${o.ref.key}` : o.name, type: o.type, category: o.category, amount: o.amount, status: 'planejado' }))
}

export function installmentProgress(plan: InstallmentPlan, records: readonly FinancialRecord[], today: string) {
  const occurrences = planOccurrences([], [{ ...plan, active: true }], records, { start: plan.firstDueDate, end: anchoredMonth(plan.firstDueDate, plan.count - 1) })
  const paid = occurrences.filter(o => o.record?.type === 'saida' && o.record.localDate <= today)
  const remaining = occurrences.filter(o => !paid.includes(o))
  return { occurrences, paidCount: paid.length, remainingCount: remaining.length, paid: sumMoney(paid.map(o => o.amount)), remaining: sumMoney(remaining.map(o => o.amount)), next: remaining[0] ?? null }
}

export function accountBalances(accounts: readonly AssetAccount[], records: readonly FinancialRecord[], expenses: readonly Expense[], transfers: readonly AccountTransfer[], asOf: string, shifts: readonly DeliveryShift[] = []) {
  const deliveryCash = shifts.flatMap(s => [ { localDate: s.localDate, type: 'entrada' as const, amount: s.grossRevenue, accountId: s.accountId }, { localDate: s.localDate, type: 'saida' as const, amount: s.fuelCost, accountId: s.accountId }, { localDate: s.localDate, type: 'saida' as const, amount: s.otherExpenses, accountId: s.accountId } ])
  const realized = [...records.filter(r => r.type === 'entrada' || r.type === 'saida'), ...expenses.map(e => ({ ...e, type: 'saida' as const })), ...deliveryCash].filter(r => r.localDate <= asOf)
  const balances = accounts.map(account => {
    if (account.openingDate > asOf) return { account, balance: null }
    const applicable = realized.filter(r => r.localDate >= account.openingDate)
    const changes = account.kind === 'liability'
      ? records.filter(r => r.type === 'saida' && r.liabilityAccountId === account.id && r.localDate >= account.openingDate && r.localDate <= asOf).map(r => -r.amount)
      : applicable.filter(r => r.accountId === account.id).map(r => r.amount === null ? null : r.type === 'entrada' ? r.amount : -r.amount)
    const cashTransfers = transfers.filter(t => !t.voidedAt && t.localDate <= asOf && t.localDate >= account.openingDate)
    if (account.kind !== 'liability') for (const transfer of cashTransfers) {
      if (transfer.toAccountId === account.id) changes.push(transfer.amount)
      if (transfer.fromAccountId === account.id) changes.push(-transfer.amount)
    }
    return { account, balance: sumMoney([account.openingBalance, ...changes]) }
  })
  const available = balances.filter(b => b.account.openingDate <= asOf)
  const assets = available.length ? sumMoney(available.filter(b => b.account.kind !== 'liability').map(b => b.balance)) : null
  const liabilities = available.length ? sumMoney(available.filter(b => b.account.kind === 'liability').map(b => b.balance)) : null
  return { balances, assets, liabilities, netWorth: subtractMoney(assets, liabilities),
    liquid: available.length ? sumMoney(available.filter(b => b.account.kind === 'cash' || b.account.kind === 'bank').map(b => b.balance)) : null,
    unassignedCount: realized.filter(r => !r.accountId).length }
}

export interface ScenarioBase { balance: number | null; entries: number | null; exits: number | null; deliveryNetPerHour: number | null; deliveryGross: number | null; deliveryNet: number | null; objective?: 'gross' | 'net'; deliveryGrossPerHour?: number | null }
export interface ScenarioInput { extraIncome: number; expenseReduction: number; extraExpense: number; purchase: number; target: number }
export function calculateScenario(base: ScenarioBase, input: ScenarioInput) {
  if (Object.values(input).some(n => !Number.isFinite(n) || n < 0 || !Number.isSafeInteger(Math.round(n * 100)))) return { balance: null, shortfall: null, deliveryHours: null, requiredGross: null, reduction: null }
  const gross = base.objective === 'gross'
  const reduction = gross ? 0 : base.exits === null ? input.expenseReduction === 0 ? 0 : null : Math.min(base.exits, input.expenseReduction)
  const balance = base.balance === null ? null : sumMoney([base.balance, input.extraIncome, reduction, gross ? 0 : -input.extraExpense, gross ? 0 : -input.purchase])
  const difference = subtractMoney(input.target, balance)
  const shortfall = difference === null ? null : Math.max(0, difference)
  const margin = base.deliveryGross !== null && base.deliveryGross > 0 ? moneyRatio(base.deliveryNet, base.deliveryGross) : null
  const rawGross = margin === null ? null : moneyRatio(shortfall, margin)
  return { balance, shortfall, reduction, deliveryHours: moneyRatio(shortfall, gross ? base.deliveryGrossPerHour ?? null : base.deliveryNetPerHour), requiredGross: gross ? shortfall : rawGross === null ? null : Math.ceil(rawGross * 100) / 100 }
}

// Contrato local para um futuro adaptador. Nenhuma rede, credencial ou serviço escolhido.
export function financeSyncSnapshot(data: { recurringPlans: readonly RecurringPlan[]; installmentPlans: readonly InstallmentPlan[]; accounts: readonly AssetAccount[]; transfers: readonly AccountTransfer[]; records: readonly FinancialRecord[] }) {
  return { version: 1 as const, entities: { recurringPlans: data.recurringPlans, installmentPlans: data.installmentPlans, assetAccounts: data.accounts, accountTransfers: data.transfers, financialRecords: data.records } }
}
