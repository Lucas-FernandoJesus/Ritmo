import { localDateKey, shiftDuration, weekBounds } from './domain'
import { moneyRatio, subtractMoney, sumMoney } from './money'
import type { DeliveryCostKind, DeliveryShift, Expense, FinancialRecord, FinancialType } from './types'

export const financialTypeLabels: Record<FinancialType, string> = { entrada: 'Entrada', saida: 'Saída', credito: 'Crédito', pendencia: 'Pendência' }
export type FinancialStatus = 'realizado' | 'aberto' | 'previsto' | 'reservado'
export const financialStatusLabels: Record<FinancialStatus, string> = { realizado: 'Realizado', aberto: 'Em aberto', previsto: 'Previsto', reservado: 'Reservado' }

export interface FinancialMovement {
  id: string
  sourceId: string
  source: 'delivery' | 'expense' | 'financial'
  origin: 'Delivery' | 'Despesas' | 'Financeiro'
  localDate: string
  description: string
  category: string
  type: FinancialType
  amount: number | null
  status: FinancialStatus
  deliveryShiftId?: string
  deliveryCostKind?: DeliveryCostKind
  note?: string
}

export interface FinanceSources {
  shifts: readonly DeliveryShift[]
  expenses: readonly Expense[]
  records: readonly FinancialRecord[]
  today: string
}

export type FinancialPeriod = 'today' | 'week' | 'month' | 'year' | 'custom'
export interface FinancialFilters {
  start: string
  end: string
  type?: FinancialType | ''
  category?: string
  origin?: string
  status?: FinancialStatus | ''
  search?: string
}

export function financialPeriod(period: FinancialPeriod, today: string, start = today, end = today): { start: string, end: string } {
  if (period === 'custom') return { start, end }
  if (period === 'today') return { start: today, end: today }
  if (period === 'week') { const bounds = weekBounds(today); return { start: bounds.weekStart, end: bounds.weekEnd } }
  const [year, month] = today.split('-').map(Number)
  if (period === 'year') return { start: `${year}-01-01`, end: `${year}-12-31` }
  return { start: `${today.slice(0, 7)}-01`, end: localDateKey(new Date(year, month, 0, 12)) }
}

const cents = (value: number) => Math.round(value * 100)
function sum(items: readonly FinancialMovement[]): number | null {
  return sumMoney(items.map((item) => item.amount))
}
const realizedStatus = (localDate: string, today: string): FinancialStatus => localDate > today ? 'previsto' : 'realizado'

// Projeções das fontes: nenhuma linha de delivery/despesa é copiada para outra coleção.
export function buildFinancialMovements({ shifts, expenses, records, today }: FinanceSources): FinancialMovement[] {
  const rows: FinancialMovement[] = []
  for (const shift of shifts) {
    const base = { sourceId: shift.id, source: 'delivery' as const, origin: 'Delivery' as const, localDate: shift.localDate, deliveryShiftId: shift.id, note: shift.note }
    rows.push({ ...base, id: `delivery:${shift.id}:grossRevenue`, description: `Receita do turno ${shift.startTime}–${shift.endTime}`, category: 'Delivery', type: 'entrada', amount: shift.grossRevenue, status: realizedStatus(shift.localDate, today) })
    for (const [key, description, category] of [['fuelCost', 'Combustível do turno', 'Transporte'], ['otherExpenses', 'Outras despesas do turno', 'Outros'], ['maintenanceReserve', 'Reserva de manutenção', 'Transporte']] as const) {
      const reserved = key === 'maintenanceReserve'
      rows.push({ ...base, id: `delivery:${shift.id}:${key}`, description, category, deliveryCostKind: key === 'fuelCost' ? 'combustivel' : key === 'otherExpenses' ? 'outros' : undefined, type: reserved ? 'pendencia' : 'saida', amount: shift[key], status: reserved && shift.localDate <= today ? 'reservado' : realizedStatus(shift.localDate, today) })
    }
  }
  for (const expense of expenses) rows.push({ ...expense, id: `expense:${expense.id}`, sourceId: expense.id, source: 'expense', origin: 'Despesas', type: 'saida', status: realizedStatus(expense.localDate, today) })
  for (const record of records) rows.push({ ...record, id: `financial:${record.id}`, sourceId: record.id, source: 'financial', origin: 'Financeiro', status: record.type === 'credito' || record.type === 'pendencia' ? 'aberto' : realizedStatus(record.localDate, today) })
  return rows.sort((a, b) => b.localDate.localeCompare(a.localDate) || a.id.localeCompare(b.id))
}

export function filterFinancialMovements(rows: readonly FinancialMovement[], filter: FinancialFilters): FinancialMovement[] {
  const search = filter.search?.trim().toLocaleLowerCase('pt-BR')
  return rows.filter((row) => row.localDate >= filter.start && row.localDate <= filter.end
    && (!filter.type || row.type === filter.type)
    && (!filter.category || row.category === filter.category)
    && (!filter.origin || row.origin === filter.origin)
    && (!filter.status || row.status === filter.status)
    && (!search || row.description.toLocaleLowerCase('pt-BR').includes(search)))
}

export function summarizeFinance(rows: readonly FinancialMovement[]) {
  const hasData = rows.length > 0
  const realized = rows.filter((row) => row.status === 'realizado')
  const hasRealizedData = realized.length > 0
  const entries = hasRealizedData ? sum(realized.filter((row) => row.type === 'entrada')) : null
  const exits = hasRealizedData ? sum(realized.filter((row) => row.type === 'saida')) : null
  const delivery = rows.filter((row) => row.deliveryShiftId && (row.status === 'realizado' || row.status === 'reservado'))
  const deliveryGross = delivery.length ? sum(delivery.filter((row) => row.type === 'entrada')) : null
  const deliveryExpenses = delivery.length ? sum(delivery.filter((row) => row.type === 'saida' || row.status === 'reservado')) : null
  const operationalExpenses = delivery.length ? sum(delivery.filter((row) => row.type === 'saida')) : null
  return {
    hasData, hasRealizedData, hasDeliveryData: delivery.length > 0, entries, exits,
    credits: hasData ? sum(rows.filter((row) => row.type === 'credito')) : null,
    pending: hasData ? sum(rows.filter((row) => row.type === 'pendencia')) : null,
    payablePending: hasData ? sum(rows.filter((row) => row.type === 'pendencia' && row.status === 'aberto')) : null,
    balance: entries === null || exits === null ? null : (cents(entries) - cents(exits)) / 100,
    deliveryGross, deliveryExpenses,
    operationalExpenses, operationalNet: subtractMoney(deliveryGross, operationalExpenses),
    maintenanceReserve: delivery.length ? sum(delivery.filter((row) => row.status === 'reservado')) : null,
    deliveryNet: deliveryGross === null || deliveryExpenses === null ? null : (cents(deliveryGross) - cents(deliveryExpenses)) / 100,
    futureEntries: sum(rows.filter((row) => row.type === 'entrada' && row.status === 'previsto')),
    futureExits: sum(rows.filter((row) => row.type === 'saida' && row.status === 'previsto')),
  }
}

export function deliveryFinancials(shift: DeliveryShift, expenses: readonly Expense[], records: readonly FinancialRecord[], today: string) {
  const hours = shiftDuration(shift.startTime, shift.endTime)
  const extraCosts = sumMoney([...expenses, ...records.filter((record) => record.type === 'saida')]
    .filter((record) => record.deliveryShiftId === shift.id && record.localDate <= today).map((record) => record.amount))
  const costs = [shift.fuelCost, shift.maintenanceReserve, shift.otherExpenses]
  const totalExpenses = sumMoney([...costs, extraCosts])
  const operationalExpenses = sumMoney([shift.fuelCost, shift.otherExpenses, extraCosts])
  const operationalNet = subtractMoney(shift.grossRevenue, operationalExpenses)
  const net = subtractMoney(operationalNet, shift.maintenanceReserve)
  return { hours, expenses: totalExpenses, operationalExpenses, operationalNet, linkedExpenses: extraCosts, net,
    grossPerHour: moneyRatio(sumMoney([shift.grossRevenue]), hours), expensesPerHour: moneyRatio(operationalExpenses, hours), operationalNetPerHour: moneyRatio(operationalNet, hours),
    perHour: moneyRatio(net, hours), perKilometer: moneyRatio(net, shift.kilometers) }
}

export function settleFinancialRecord(record: FinancialRecord, localDate: string): FinancialRecord {
  if (record.type !== 'credito' && record.type !== 'pendencia') throw new Error('Esta movimentação já está realizada.')
  return { ...record, type: record.type === 'credito' ? 'entrada' : 'saida', localDate }
}
