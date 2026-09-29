import { useState } from 'react'
import { formatMoney, paymentMethodLabel } from '../../../core/domain'
import type { FinancialRecord, RecurringPlan } from '../../../core/types'
import { dateLabel } from '../finance-analysis'
import { buildRecurringAnnualOverview, type PlanOccurrence, type RecurringAnnualState } from '../finance-plans'

const stateLabels: Record<RecurringAnnualState, string> = { planejado: 'Planejado', realizado: 'Realizado', aberto: 'Em aberto', vencido: 'Vencido' }
const monthStateLabels = { 'sem-compromissos': 'Sem compromissos', planejado: 'Planejado', realizado: 'Realizado', 'em-aberto': 'Em aberto', vencido: 'Vencido' }
const monthNames = Array.from({ length: 12 }, (_, month) => {
  const value = new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, month, 1)))
  return value[0].toUpperCase() + value.slice(1)
})

export function RecurringAnnualView({ today, recurringPlans, records, onConfirm, onEdit, onSettle }: {
  today: string
  recurringPlans: readonly RecurringPlan[]
  records: readonly FinancialRecord[]
  onConfirm: (occurrence: PlanOccurrence) => void
  onEdit: (plan: RecurringPlan) => void
  onSettle: (record: FinancialRecord) => Promise<boolean>
}) {
  const currentYear = Number(today.slice(0, 4))
  const [year, setYear] = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState(Number(today.slice(5, 7)) - 1)
  const [settling, setSettling] = useState<string>()
  const availableYears = [...new Set([
    ...Array.from({ length: 11 }, (_, index) => currentYear - 5 + index), year,
    ...recurringPlans.flatMap(plan => [Number(plan.startDate.slice(0, 4)), plan.endDate ? Number(plan.endDate.slice(0, 4)) : currentYear]),
    ...records.flatMap(record => record.planningRef?.kind === 'recurring' ? [Number(record.planningRef.dueDate.slice(0, 4))] : []),
  ])].filter(value => Number.isInteger(value) && value >= 1000 && value <= 9999).sort((a, b) => b - a)
  const overview = buildRecurringAnnualOverview(recurringPlans, records, year, today)
  const selected = overview.months[selectedMonth]
  async function settle(record: FinancialRecord) {
    if (settling) return
    setSettling(record.id)
    try { await onSettle(record) } finally { setSettling(undefined) }
  }
  return <section className="recurring-year" aria-label="Gastos recorrentes do ano">
    <div className="recurring-year-heading">
      <div><h3>Gastos recorrentes do ano</h3><p className="fine-print">Compromissos de saída e pendências, derivados das recorrências cadastradas.</p></div>
      <div className="recurring-year-navigation" role="group" aria-label="Selecionar ano civil">
        <button type="button" className="text-button" aria-label="Ano anterior" onClick={() => setYear(value => value - 1)}>‹</button>
        <select aria-label="Ano civil" value={year} onChange={event => setYear(Number(event.target.value))}>{availableYears.map(value => <option key={value} value={value}>{value}</option>)}</select>
        <button type="button" className="text-button" aria-label="Ano seguinte" onClick={() => setYear(value => value + 1)}>›</button>
      </div>
    </div>
    <div className="recurring-year-totals" aria-label={`Totais de ${year}`}>
      <article><span>Total anual planejado</span><strong>{formatMoney(overview.planned)}</strong></article>
      <article><span>Total anual realizado</span><strong>{formatMoney(overview.realized)}</strong></article>
      <article><span>Total ainda em aberto</span><strong>{formatMoney(overview.open)}</strong></article>
    </div>
    <div className="recurring-year-grid" aria-label={`Meses de ${year}`}>
      {overview.months.map(month => {
        const label = monthStateLabels[month.state]
        return <button type="button" key={month.key} className={`recurring-year-month${selectedMonth === month.month ? ' selected' : ''}`} aria-pressed={selectedMonth === month.month} aria-label={`${monthNames[month.month]} de ${year}: ${label}, ${month.occurrenceCount} ocorrência(s)`} onClick={() => setSelectedMonth(month.month)}>
          <span className="recurring-year-month-name">{monthNames[month.month]}</span>
          <strong>{formatMoney(month.planned)}</strong>
          <span>{label}</span>
          <small>{month.occurrenceCount ? `${month.occurrenceCount} ocorrência(s) · aberto ${formatMoney(month.open)}` : 'Sem compromissos'}</small>
        </button>
      })}
    </div>
    {selected && <section className="recurring-year-details" aria-label={`Ocorrências de ${monthNames[selected.month]} de ${year}`}>
      <h4>{monthNames[selected.month]} de {year}</h4>
      {!selected.occurrences.length && <p className="empty-state">Sem compromissos recorrentes neste mês.</p>}
      {selected.occurrences.map(occurrence => <article key={occurrence.id} className="finance-movement recurring-year-occurrence">
        <div className="finance-movement-heading"><h5>{occurrence.name}</h5><strong>{formatMoney(occurrence.amount)}</strong></div>
        <p><time dateTime={occurrence.dueDate}>{dateLabel(occurrence.dueDate)}</time> · {occurrence.category}</p>
        <p className="finance-status">{stateLabels[occurrence.state]} · Forma de pagamento: {paymentMethodLabel(occurrence.paymentMethod)}</p>
        <div className="finance-row-actions">
          {!occurrence.record && <button type="button" className="secondary-button" aria-label={`Confirmar ${occurrence.name} ${occurrence.dueDate}`} onClick={() => onConfirm(occurrence)}>Confirmar ocorrência</button>}
          {occurrence.record?.type === 'pendencia' && <button type="button" className="secondary-button" disabled={!!settling} onClick={() => settle(occurrence.record!)}>{settling === occurrence.record.id ? 'Salvando…' : 'Pagar'}</button>}
          <button type="button" className="text-button" onClick={() => { const plan = recurringPlans.find(item => item.id === occurrence.ref.planId); if (plan) onEdit(plan) }}>Editar recorrência de origem</button>
        </div>
      </article>)}
    </section>}
  </section>
}
