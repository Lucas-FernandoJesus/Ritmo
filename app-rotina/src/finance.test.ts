import { describe, expect, it } from 'vitest'
import { buildFinancialMovements, filterFinancialMovements, financialPeriod, summarizeFinance, deliveryFinancials, settleFinancialRecord } from './finance'
import { shiftDuration, isValidFinancialRecord, validateBackup, defaultSettings } from './domain'
import { moneyFromInput, moneyInputValue } from './money'
import type { DeliveryShift, Expense, FinancialRecord } from './types'

const today = '2026-09-22'
const createdAt = '2026-09-22T12:00:00.000Z'
const shift: DeliveryShift = { id: 'shift-1', localDate: today, startTime: '20:00', endTime: '02:00', hours: 99, kilometers: 30, grossRevenue: 200, fuelCost: 20, maintenanceReserve: 10, otherExpenses: 5, estimatedResult: 999, resultPerHour: 999, resultPerKilometer: 999, fatigueLevel: 1, armCondition: 'habitual', createdAt }
const expense: Expense = { id: 'expense-1', localDate: today, description: 'Refeição no turno', category: 'Alimentação', amount: 15, deliveryShiftId: shift.id, createdAt }
const record = (id: string, type: FinancialRecord['type'], amount: number, extra: Partial<FinancialRecord> = {}): FinancialRecord => ({ id, type, amount, localDate: today, description: id, category: 'Outros', createdAt, ...extra })
const movements = (records: FinancialRecord[] = [], expenses: Expense[] = []) => buildFinancialMovements({ shifts: [shift], expenses, records, today })

describe('Financeiro consolidado', () => {
  it('integra turnos, despesas e registros sem usar resultados armazenados', () => {
    const rows = movements([record('salary', 'entrada', 1000)], [expense])
    expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length)
    expect(rows.find((row) => row.id === 'delivery:shift-1:grossRevenue')).toMatchObject({ type: 'entrada', amount: 200, origin: 'Delivery' })
    expect(rows.find((row) => row.id === 'expense:expense-1')).toMatchObject({ type: 'saida', amount: 15, deliveryShiftId: 'shift-1' })
    expect(summarizeFinance(rows)).toMatchObject({ entries: 1200, exits: 40, credits: 0, pending: 10, balance: 1160, deliveryGross: 200, deliveryExpenses: 50, deliveryNet: 150 })
  })

  it('separa reserva de manutenção das saídas efetivamente realizadas', () => {
    expect(movements().find((row) => row.id.endsWith('maintenanceReserve'))).toMatchObject({ type: 'pendencia', status: 'reservado', amount: 10 })
  })

  it('não transforma créditos, pendências ou datas futuras em saldo realizado', () => {
    const rows = buildFinancialMovements({ shifts: [], expenses: [], records: [record('in', 'entrada', 100), record('out', 'saida', 25), record('credit', 'credito', 70), record('bill', 'pendencia', 45), record('future', 'entrada', 999, { localDate: '2026-09-23' })], today })
    expect(summarizeFinance(rows)).toMatchObject({ entries: 100, exits: 25, balance: 75, credits: 70, pending: 45, futureEntries: 999 })
    expect(rows.find((row) => row.sourceId === 'future')?.status).toBe('previsto')
  })

  it('baixa um crédito ou pendência com o mesmo ID e a data do recebimento/pagamento', () => {
    expect(settleFinancialRecord(record('credit', 'credito', 70), '2026-09-23')).toMatchObject({ id: 'credit', type: 'entrada', localDate: '2026-09-23', amount: 70 })
    expect(settleFinancialRecord(record('bill', 'pendencia', 45), today)).toMatchObject({ id: 'bill', type: 'saida' })
    expect(() => settleFinancialRecord(record('in', 'entrada', 10), today)).toThrow()
  })

  it('desconta somente despesas realizadas explicitamente vinculadas ao turno', () => {
    const result = deliveryFinancials(shift, [expense, { ...expense, id: 'rent', amount: 1000, deliveryShiftId: undefined }], [record('fee', 'saida', 5, { deliveryShiftId: shift.id }), record('open', 'pendencia', 20, { deliveryShiftId: shift.id }), record('later', 'saida', 30, { deliveryShiftId: shift.id, localDate: '2026-10-01' })], today)
    expect(result).toMatchObject({ hours: 6, expenses: 55, net: 145 })
    expect(result.perHour).toBeCloseTo(145 / 6)
  })

  it('preserva valores ausentes e protege divisões por zero', () => {
    expect(deliveryFinancials({ ...shift, grossRevenue: null }, [], [], today).net).toBeNull()
    expect(deliveryFinancials({ ...shift, fuelCost: null }, [], [], today).expenses).toBeNull()
    expect(deliveryFinancials({ ...shift, startTime: '20:00', endTime: '20:00' }, [], [], today).perHour).toBeNull()
    expect(summarizeFinance([])).toMatchObject({ hasData: false, balance: null })
    const rows = buildFinancialMovements({ shifts: [{ ...shift, grossRevenue: null }], expenses: [], records: [], today })
    expect(summarizeFinance(rows)).toMatchObject({ entries: null, balance: null, deliveryNet: null })
  })

  it('arredonda somas monetárias em centavos', () => {
    const rows = buildFinancialMovements({ shifts: [], expenses: [], records: [record('a', 'entrada', 0.1), record('b', 'entrada', 0.2)], today })
    expect(summarizeFinance(rows).balance).toBe(0.3)
  })

  it('não desconta a reserva de um turno futuro do realizado', () => {
    const rows = buildFinancialMovements({ shifts: [{ ...shift, localDate: '2026-09-30' }], expenses: [], records: [], today })
    expect(summarizeFinance(rows)).toMatchObject({ entries: null, exits: null, balance: null, pending: 10, deliveryNet: null, futureEntries: 200, futureExits: 25 })
  })

  it('mostra ausência de realizado quando só existem créditos e pendências', () => {
    const rows = buildFinancialMovements({ shifts: [], expenses: [], records: [record('credit', 'credito', 70), record('bill', 'pendencia', 20)], today })
    expect(summarizeFinance(rows)).toMatchObject({ hasData: true, hasRealizedData: false, entries: null, exits: null, balance: null, credits: 70, pending: 20 })
  })

  it('filtra período, tipo, categoria, origem, status e descrição', () => {
    const rows = movements([record('credit', 'credito', 70, { description: 'Pagamento da aula' })], [expense])
    expect(filterFinancialMovements(rows, { start: today, end: today, type: 'credito', category: 'Outros', origin: 'Financeiro', status: 'aberto', search: 'AULA' })).toHaveLength(1)
    expect(filterFinancialMovements(rows, { start: '2026-09-23', end: '2026-09-30' })).toHaveLength(0)
  })

  it('usa períodos civis locais, segunda-feira e intervalo personalizado inclusivo', () => {
    expect(financialPeriod('today', today)).toEqual({ start: today, end: today })
    expect(financialPeriod('week', today)).toEqual({ start: '2026-09-21', end: '2026-09-27' })
    expect(financialPeriod('month', '2024-02-10')).toEqual({ start: '2024-02-01', end: '2024-02-29' })
    expect(financialPeriod('custom', today, '2026-08-01', '2026-08-31')).toEqual({ start: '2026-08-01', end: '2026-08-31' })
  })
})

describe('duração automática e máscara brasileira', () => {
  it('calcula horas no mesmo dia, na meia-noite e dados incompletos', () => {
    expect(shiftDuration('18:30', '20:00')).toBe(1.5)
    expect(shiftDuration('20:00', '02:00')).toBe(6)
    expect(shiftDuration('23:59', '00:01')).toBeCloseTo(2 / 60)
    expect(shiftDuration('20:00', '20:00')).toBe(0)
    expect(shiftDuration('', '02:00')).toBeNull()
    expect(shiftDuration('25:00', '02:00')).toBeNull()
  })

  it.each([['1', 0.01, 'R$ 0,01'], ['100', 1, 'R$ 1,00'], ['123456', 1234.56, 'R$ 1.234,56'], ['R$ 1.234,56', 1234.56, 'R$ 1.234,56']])('converte %s em número e máscara', (text, value, formatted) => {
    expect(moneyFromInput(text)).toBe(value)
    expect(moneyInputValue(value as number).replace(/\u00a0/g, ' ')).toBe(formatted)
  })

  it('permite limpar e não aceita valores acima da precisão segura', () => {
    expect(moneyFromInput('')).toBeNull()
    expect(moneyInputValue(null)).toBe('')
    expect(moneyFromInput('9999999999999999999999999')).toBeNull()
  })
})

describe('validação e compatibilidade financeira', () => {
  const backup = () => ({ schemaVersion: 1, exportedAt: createdAt, completions: [], checkIns: [], deliveryShifts: [], expenses: [], studyLogs: [], progress: [], settings: defaultSettings() })
  it('valida os quatro tipos e rejeita números, datas e vínculos inválidos', () => {
    for (const type of ['entrada', 'saida', 'credito', 'pendencia'] as const) expect(isValidFinancialRecord(record(type, type, 10))).toBe(true)
    expect(isValidFinancialRecord(record('bad', 'entrada', -1))).toBe(false)
    expect(isValidFinancialRecord(record('bad', 'entrada', NaN))).toBe(false)
    expect(isValidFinancialRecord(record('bad', 'entrada', 1, { deliveryShiftId: shift.id }))).toBe(false)
    expect(isValidFinancialRecord(record('bad', 'saida', 1, { localDate: '2026-02-30' }))).toBe(false)
    expect(isValidFinancialRecord(record('bad', 'saida', 1, { description: ' ' }))).toBe(false)
  })
  it('aceita backup antigo e novo, rejeita duplicatas e vínculos órfãos', () => {
    expect(validateBackup(backup())).toBe(true)
    expect(validateBackup({ ...backup(), financialRecords: [record('salary', 'entrada', 100)] })).toBe(true)
    expect(validateBackup({ ...backup(), financialRecords: [record('a', 'entrada', 1), record('a', 'entrada', 1)] })).toBe(false)
    expect(validateBackup({ ...backup(), financialRecords: [record('a', 'saida', 1, { deliveryShiftId: 'missing' })] })).toBe(false)
    expect(validateBackup({ ...backup(), expenses: [expense] })).toBe(false)
  })
})
