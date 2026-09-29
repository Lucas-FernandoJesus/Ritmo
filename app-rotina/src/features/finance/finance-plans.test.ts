import { describe, expect, it } from 'vitest'
import { defaultSettings, isValidAssetAccount, isValidInstallmentPlan, isValidRecurringPlan, validateBackup } from '../../core/domain'
import { accountBalances, buildRecurringAnnualOverview, calculateScenario, createOccurrenceRecord, financeSyncSnapshot, installmentAmounts, installmentProgress, planOccurrences, plannedMovements } from './finance-plans'
import { buildMonthlyClosing } from './finance-closing'
import { buildFinancialMovements, summarizeFinance } from './finance'
import { calculateProjectedBalance } from './finance-analysis'
import type { AssetAccount, BackupData, DeliveryShift, FinancialRecord, InstallmentPlan, RecurringPlan } from '../../core/types'

const stamp = '2026-09-22T13:00:00.000Z'
const recurrence: RecurringPlan = { id: 'rent', name: 'Aluguel', type: 'saida', amount: 100, category: 'Moradia', frequency: 'monthly', startDate: '2026-01-31', active: true, createdAt: stamp, updatedAt: stamp }
const installment: InstallmentPlan = { id: 'buy', name: 'Compra', total: 100, count: 3, firstDueDate: '2026-09-22', category: 'Outros', active: true, createdAt: stamp, updatedAt: stamp }
const account: AssetAccount = { id: 'bank', name: 'Conta', kind: 'bank', openingBalance: 1000, openingDate: '2026-09-01', createdAt: stamp, updatedAt: stamp }
const record = (amount = 100): FinancialRecord => ({ id: 'income', type: 'entrada', amount, description: 'Renda', category: 'Outros', localDate: '2026-09-22', createdAt: stamp })
const sources = { today: '2026-09-22', shifts: [], expenses: [], records: [] as FinancialRecord[] }
const backup = (): BackupData => ({ schemaVersion: 1, exportedAt: stamp, completions: [], checkIns: [], deliveryShifts: [], expenses: [], studyLogs: [], progress: [], settings: defaultSettings() })

describe('planejamento recorrente e parcelas', () => {
  it('ancora meses no dia original, inclusive fevereiro e sem deriva', () => {
    expect(planOccurrences([recurrence], [], [], { start: '2026-01-01', end: '2026-03-31' }).map(o => o.dueDate)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31'])
  })
  it('mantém 29 de fevereiro como âncora anual', () => {
    const item = { ...recurrence, frequency: 'yearly' as const, startDate: '2024-02-29' }
    expect(planOccurrences([item], [], [], { start: '2025-01-01', end: '2028-12-31' }).map(o => o.dueDate)).toEqual(['2025-02-28', '2026-02-28', '2027-02-28', '2028-02-29'])
  })
  it('respeita semana, fim inclusivo e pausa sem apagar confirmações', () => {
    expect(planOccurrences([{ ...recurrence, frequency: 'weekly', startDate: '2026-09-01', endDate: '2026-09-15' }], [], [], { start: '2026-09-01', end: '2026-09-30' }).map(o => o.dueDate)).toEqual(['2026-09-01', '2026-09-08', '2026-09-15'])
    expect(planOccurrences([{ ...recurrence, active: false }], [], [], { start: '2026-09-01', end: '2026-09-30' })).toEqual([])
  })
  it.each(['entrada', 'saida', 'credito', 'pendencia'] as const)('confirma %s sem antecipar realização do planejamento', (type) => {
    const occurrence = planOccurrences([{ ...recurrence, type, startDate: sources.today }], [], [], { start: sources.today, end: sources.today })[0]
    const rows = plannedMovements([occurrence])
    expect(summarizeFinance(rows).balance).toBeNull()
    const confirmed = createOccurrenceRecord(occurrence, sources.today, stamp)
    expect(confirmed.type).toBe(type)
    expect(confirmed.id).toBe(occurrence.id)
    expect(confirmed.planningRef?.dueDate).toBe(sources.today)
    expect(plannedMovements(planOccurrences([{ ...recurrence, type, startDate: sources.today }], [], [confirmed], { start: sources.today, end: sources.today }))).toEqual([])
  })
  it('mantém identidade ao pagar em outra data e não projeta novamente', () => {
    const occurrence = planOccurrences([], [installment], [], { start: sources.today, end: sources.today })[0]
    const paid = createOccurrenceRecord(occurrence, '2026-09-24', stamp)
    expect(paid.localDate).toBe('2026-09-24')
    expect(planOccurrences([], [installment], [paid], { start: sources.today, end: sources.today })[0].record?.id).toBe(paid.id)
    expect(plannedMovements(planOccurrences([], [installment], [paid], { start: sources.today, end: sources.today }))).toEqual([])
  })
  it.each([[100, 3, [33.34, 33.33, 33.33]], [0.05, 3, [0.02, 0.02, 0.01]], [10, 1, [10]]] as const)('distribui %s em %s parcelas com soma exata', (total, count, expected) => {
    expect(installmentAmounts(total, count)).toEqual(expected)
    expect(installmentAmounts(total, count).reduce((s, n) => s + Math.round(n * 100), 0)).toBe(Math.round(total * 100))
  })
  it('rejeita contagens inválidas e parcelas menores que um centavo', () => {
    expect(installmentAmounts(1, 0)).toEqual([])
    expect(installmentAmounts(.01, 3)).toEqual([])
    expect(installmentAmounts(NaN, 3)).toEqual([])
  })
  it('calcula próxima, pagas, restantes e saldo sem persistir totais', () => {
    const first = planOccurrences([], [installment], [], { start: '2026-09-01', end: '2027-01-01' })[0]
    const paid = createOccurrenceRecord(first, sources.today, stamp)
    const result = installmentProgress(installment, [paid], sources.today)
    expect(result.paidCount).toBe(1)
    expect(result.remainingCount).toBe(2)
    expect(result.remaining).toBe(66.66)
    expect(result.next?.dueDate).toBe('2026-10-22')
  })
  it('parcela confirmada em aberto ainda não está paga', () => {
    const occurrence = planOccurrences([], [installment], [], { start: sources.today, end: sources.today })[0]
    const open = { ...createOccurrenceRecord(occurrence, sources.today, stamp), type: 'pendencia' as const }
    expect(installmentProgress(installment, [open], sources.today).paidCount).toBe(0)
    expect(installmentProgress(installment, [open], sources.today).remaining).toBe(100)
  })
  it('leva ocorrências planejadas à projeção, inclusive vencidas, sem saldo realizado', () => {
    const rows = buildFinancialMovements({ ...sources, records: [record()], recurringPlans: [{ ...recurrence, startDate: '2026-09-20' }], installmentPlans: [] })
    expect(summarizeFinance(rows).balance).toBe(100)
    expect(calculateProjectedBalance(rows, sources.today, 7).projected).toBe(0)
  })
})

describe('gastos recorrentes do ano', () => {
  it('distribui uma recorrência mensal pelos 12 meses do ano civil', () => {
    const overview = buildRecurringAnnualOverview([recurrence], [], 2026, '2026-09-22')
    expect(overview.months).toHaveLength(12)
    expect(overview.months.map(month => month.occurrenceCount)).toEqual(Array(12).fill(1))
    expect(overview.months.map(month => month.planned)).toEqual(Array(12).fill(100))
    expect(overview.planned).toBe(1200)
    expect(overview.realized).toBe(0)
    expect(overview.open).toBe(1200)
  })

  it('usa as datas civis reais nas recorrências semanais', () => {
    const weekly = { ...recurrence, amount: 10, frequency: 'weekly' as const, startDate: '2026-01-01' }
    const overview = buildRecurringAnnualOverview([weekly], [], 2026, '2026-09-22')
    expect(overview.months[0].occurrenceCount).toBe(5)
    expect(overview.months[1].occurrenceCount).toBe(4)
    expect(overview.months[0].planned).toBe(50)
    expect(overview.months[1].planned).toBe(40)
  })

  it('respeita início e término no meio do ano e identifica meses vazios', () => {
    const bounded = { ...recurrence, startDate: '2026-04-15', endDate: '2026-06-15' }
    const overview = buildRecurringAnnualOverview([bounded], [], 2026, '2026-09-22')
    expect(overview.months.map(month => month.occurrenceCount)).toEqual([0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0])
    expect(overview.months[0].state).toBe('sem-compromissos')
  })

  it('separa planejado, realizado, aberto e vencido sem realizar valores futuros', () => {
    const plans: RecurringPlan[] = [
      { ...recurrence, id: 'late', frequency: 'yearly', startDate: '2026-09-20' },
      { ...recurrence, id: 'open', type: 'pendencia', frequency: 'yearly', startDate: '2026-09-30' },
      { ...recurrence, id: 'paid', frequency: 'yearly', startDate: '2026-09-22' },
      { ...recurrence, id: 'future', frequency: 'yearly', startDate: '2026-10-22' },
    ]
    const generated = planOccurrences(plans, [], [], { start: '2026-01-01', end: '2026-12-31' })
    const paid = createOccurrenceRecord(generated.find(item => item.ref.planId === 'paid')!, '2026-09-22', stamp)
    const open = createOccurrenceRecord(generated.find(item => item.ref.planId === 'open')!, '2026-09-22', stamp)
    const overview = buildRecurringAnnualOverview(plans, [paid, open], 2026, '2026-09-22')
    expect(overview.planned).toBe(400)
    expect(overview.realized).toBe(100)
    expect(overview.open).toBe(300)
    expect(overview.months.flatMap(month => month.occurrences).map(item => item.state).sort()).toEqual(['aberto', 'planejado', 'realizado', 'vencido'])
  })

  it('reconcilia por planningRef sem duplicar a ocorrência', () => {
    const january = planOccurrences([recurrence], [], [], { start: '2026-01-01', end: '2026-01-31' })[0]
    const paid = createOccurrenceRecord(january, '2026-01-31', stamp)
    const overview = buildRecurringAnnualOverview([recurrence], [paid], 2026, '2026-09-22')
    expect(overview.months[0].occurrenceCount).toBe(1)
    expect(overview.months[0].occurrences[0].record?.id).toBe(paid.id)
  })

  it('herda a forma de pagamento ao confirmar uma despesa recorrente', () => {
    const plan = { ...recurrence, paymentMethod: 'credito' as const }
    const occurrence = planOccurrences([plan], [], [], { start: '2026-01-01', end: '2026-01-31' })[0]
    expect(createOccurrenceRecord(occurrence, occurrence.dueDate, stamp).paymentMethod).toBe('credito')
  })

  it('aceita recorrência legada sem forma de pagamento e rejeita forma de despesa em entradas', () => {
    expect(isValidRecurringPlan(recurrence)).toBe(true)
    expect(isValidRecurringPlan({ ...recurrence, paymentMethod: 'debito' })).toBe(true)
    expect(isValidRecurringPlan({ ...recurrence, type: 'entrada', paymentMethod: 'debito' })).toBe(false)
  })

  it('preserva o valor e a forma históricos após edição do plano', () => {
    const original = { ...recurrence, paymentMethod: 'credito' as const }
    const january = planOccurrences([original], [], [], { start: '2026-01-01', end: '2026-01-31' })[0]
    const paid = createOccurrenceRecord(january, january.dueDate, stamp)
    const edited = { ...original, amount: 999, paymentMethod: 'alimentacao' as const }
    const overview = buildRecurringAnnualOverview([edited], [paid], 2026, '2026-09-22')
    expect(overview.months[0].occurrences[0]).toMatchObject({ amount: 100, paymentMethod: 'credito', state: 'realizado' })
    expect(overview.months[1].occurrences[0]).toMatchObject({ amount: 999, paymentMethod: 'alimentacao', state: 'vencido' })
  })

  it('em plano pausado mantém somente ocorrências confirmadas, sem inventar histórico', () => {
    const january = planOccurrences([recurrence], [], [], { start: '2026-01-01', end: '2026-01-31' })[0]
    const paid = createOccurrenceRecord(january, january.dueDate, stamp)
    const overview = buildRecurringAnnualOverview([{ ...recurrence, active: false }], [paid], 2026, '2026-09-22')
    expect(overview.months[0].occurrenceCount).toBe(1)
    expect(overview.months.slice(1).every(month => month.occurrenceCount === 0)).toBe(true)
  })
})

describe('patrimônio, fechamento e cenários', () => {
  it('deriva ativos, passivos e líquido do saldo inicial e valores vinculados', () => {
    const debt = { ...account, id: 'debt', kind: 'liability' as const, openingBalance: 300 }
    const data = accountBalances([account, debt], [{ ...record(100), accountId: account.id }, { ...record(50), id: 'payment', type: 'saida', accountId: account.id, liabilityAccountId: debt.id }], [], [], sources.today)
    expect(data.assets).toBe(1050)
    expect(data.liabilities).toBe(250)
    expect(data.netWorth).toBe(800)
  })
  it('transferência conserva patrimônio e não altera renda/despesa', () => {
    const saving = { ...account, id: 'saving', kind: 'savings' as const, openingBalance: 0 }
    const transfer = { id: 't', fromAccountId: 'bank', toAccountId: 'saving', amount: 250, localDate: sources.today, createdAt: stamp, updatedAt: stamp }
    const data = accountBalances([account, saving], [], [], [transfer], sources.today)
    expect(data.balances.map(a => a.balance)).toEqual([750, 250])
    expect(data.netWorth).toBe(1000)
    expect(summarizeFinance(buildFinancialMovements(sources)).balance).toBeNull()
  })
  it('exclui futuro, anterior ao saldo inicial e valores abertos; sinaliza não vinculados', () => {
    const data = accountBalances([account], [record(), { ...record(), id: 'old', accountId: 'bank', localDate: '2026-08-01' }, { ...record(), id: 'future', accountId: 'bank', localDate: '2026-10-01' }, { ...record(), id: 'open', type: 'credito', accountId: 'bank' }], [], [], sources.today)
    expect(data.assets).toBe(1000)
    expect(data.unassignedCount).toBe(1)
    expect(accountBalances([], [], [], [], sources.today).netWorth).toBeNull()
    expect(accountBalances([{ ...account, openingDate: '2026-10-01' }], [], [], [], sources.today).netWorth).toBeNull()
  })
  it('fechamento usa mês civil, realizado, planejamento separado e patrimônio no corte', () => {
    const closing = buildMonthlyClosing({ ...sources, records: [record(), { ...record(), id: 'future', localDate: '2026-09-30' }], accounts: [account], transfers: [], recurringPlans: [], installmentPlans: [], goals: [], budgets: [] }, '2026-09')
    expect(closing.summary.entries).toBe(100)
    expect(closing.summary.futureEntries).toBe(100)
    expect(closing.wealth.netWorth).toBe(1000)
    expect(closing.partial).toBe(true)
    expect(closing.comparison.previousInterval.start).toBe('2026-08-01')
  })
  it('cenário combina hipóteses em centavos sem modificar os registros', () => {
    const base = [record(1000), { ...record(600), id: 'expense', type: 'saida' as const }]
    const before = JSON.stringify(base)
    const result = calculateScenario({ balance: 400, entries: 1000, exits: 600, deliveryNetPerHour: 25, deliveryGross: 200, deliveryNet: 100 }, { extraIncome: 100, expenseReduction: 100, extraExpense: 50, purchase: 200, target: 1000 })
    expect(result.balance).toBe(350)
    expect(result.shortfall).toBe(650)
    expect(result.deliveryHours).toBe(26)
    expect(result.requiredGross).toBe(1300)
    expect(JSON.stringify(base)).toBe(before)
  })
  it('protege simulação sem histórico, taxa zero e redução além dos gastos', () => {
    const result = calculateScenario({ balance: null, entries: null, exits: null, deliveryNetPerHour: 0, deliveryGross: 0, deliveryNet: 0 }, { extraIncome: 0, expenseReduction: 0, extraExpense: 0, purchase: 0, target: 100 })
    expect(result.balance).toBeNull()
    expect(result.deliveryHours).toBeNull()
    expect(result.requiredGross).toBeNull()
    expect(calculateScenario({ balance: 0, entries: 0, exits: 20, deliveryNetPerHour: null, deliveryGross: null, deliveryNet: null }, { extraIncome: 0, expenseReduction: 100, extraExpense: 0, purchase: 0, target: 0 }).balance).toBe(20)
  })
  it('simulador sinaliza resultado indisponível se a diferença exceder centavos seguros', () => {
    const max = Number.MAX_SAFE_INTEGER / 100
    const result = calculateScenario({ balance: -max, entries: 0, exits: max, deliveryNetPerHour: 10, deliveryGross: 10, deliveryNet: 10 }, { extraIncome: 0, expenseReduction: 0, extraExpense: 0, purchase: 0, target: max })
    expect(result.shortfall).toBeNull()
    expect(result.deliveryHours).toBeNull()
  })
  it('backup antigo continua válido; novos dados são opcionais e referências são verificadas', () => {
    expect(validateBackup(backup())).toBe(true)
    expect(validateBackup({ ...backup(), recurringPlans: [recurrence], installmentPlans: [installment], assetAccounts: [account], accountTransfers: [] })).toBe(true)
    expect(validateBackup({ ...backup(), accountTransfers: [{ id: 't', fromAccountId: 'missing', toAccountId: 'bank', amount: 10, localDate: sources.today, createdAt: stamp, updatedAt: stamp }] })).toBe(false)
    expect(validateBackup({ ...backup(), financialRecords: [{ ...record(), accountId: 'missing' }] })).toBe(false)
    expect(validateBackup({ ...backup(), recurringPlans: [recurrence, recurrence] })).toBe(false)
  })
  it('valida definições sem migrar dados legados', () => {
    expect(isValidRecurringPlan(recurrence)).toBe(true)
    expect(isValidRecurringPlan({ ...recurrence, endDate: '2025-01-01' })).toBe(false)
    expect(isValidInstallmentPlan(installment)).toBe(true)
    expect(isValidInstallmentPlan({ ...installment, count: 1.5 })).toBe(false)
    expect(isValidAssetAccount(account)).toBe(true)
    expect(isValidAssetAccount({ ...account, openingBalance: Infinity })).toBe(false)
  })
  it('backup rejeita valor, direção e vencimento de parcela adulterados', () => {
    const occurrence = planOccurrences([], [installment], [], { start: sources.today, end: sources.today })[0]
    const paid = createOccurrenceRecord(occurrence, sources.today, stamp)
    const data = { ...backup(), installmentPlans: [installment], financialRecords: [paid] }
    expect(validateBackup(data)).toBe(true)
    expect(validateBackup({ ...data, financialRecords: [{ ...paid, amount: 1 }] })).toBe(false)
    expect(validateBackup({ ...data, financialRecords: [{ ...paid, type: 'entrada' }] })).toBe(false)
    expect(validateBackup({ ...data, financialRecords: [{ ...paid, planningRef: { ...paid.planningRef, dueDate: '2026-09-23' } }] })).toBe(false)
  })
  it('patrimônio recebe delivery sem transformar reserva em dinheiro gasto', () => {
    const shift: DeliveryShift = { id: 'shift', accountId: 'bank', localDate: sources.today, startTime: '20:00', endTime: '02:00', hours: 6, kilometers: 10, grossRevenue: 100, fuelCost: 10, otherExpenses: 5, maintenanceReserve: 20, estimatedResult: 65, resultPerHour: 65 / 6, resultPerKilometer: 6.5, fatigueLevel: 1, armCondition: 'habitual', createdAt: stamp }
    expect(accountBalances([account], [], [], [], sources.today, [shift]).assets).toBe(1085)
    expect(accountBalances([account], [], [], [], sources.today, [{ ...shift, grossRevenue: null }]).assets).toBeNull()
  })
  it('simulação de meta bruta não transforma economia em faturamento', () => {
    const result = calculateScenario({ balance: 100, entries: 100, exits: 50, deliveryNetPerHour: 20, deliveryGrossPerHour: 25, deliveryGross: 125, deliveryNet: 100, objective: 'gross' }, { extraIncome: 50, expenseReduction: 50, extraExpense: 40, purchase: 100, target: 250 })
    expect(result.balance).toBe(150)
    expect(result.shortfall).toBe(100)
    expect(result.requiredGross).toBe(100)
    expect(result.deliveryHours).toBe(4)
  })
  it('contrato futuro contém identidades e dados de origem, sem totais ou serviço', () => {
    const snapshot = financeSyncSnapshot({ recurringPlans: [recurrence], installmentPlans: [installment], accounts: [account], transfers: [], records: [] })
    expect(snapshot.version).toBe(1)
    expect(snapshot.entities.recurringPlans[0].id).toBe(recurrence.id)
    expect(snapshot.entities.assetAccounts[0].updatedAt).toBe(stamp)
    expect(snapshot).not.toHaveProperty('service')
    expect(snapshot).not.toHaveProperty('netWorth')
  })
})
