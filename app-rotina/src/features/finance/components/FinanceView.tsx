import { useMemo, useRef, useState } from 'react'
import { formatMoney, paymentMethodLabel } from '../../../core/domain'
import { filterFinancialMovements, financialPeriod, financialStatusLabels, financialTypeLabels, settleFinancialRecord, summarizeFinance, type FinancialMovement, type FinancialPeriod, type FinancialStatus } from '../finance'
import type { CategoryBudget, DeliveryShift, Expense, FinancialGoal, FinancialRecord, FinancialType, FinancePlanningData } from '../../../core/types'
import { Field, PageTitle } from '../../../components/FormPrimitives'
import { ExpenseForm, FinancialRecordForm } from './FinanceForms'
import { FinanceSummary } from './FinanceSummary'
import { buildFinanceAnalysis } from '../finance-analysis'
import { FinancePlanning, type PlanningCallbacks } from './FinancePlanning'
import { FinanceAlerts, FinanceComparison, FinanceDeliveryInsights, FinancePeriodAnalysis, FinanceProjection } from './FinanceInsights'
import { FinanceAdvanced, type FinanceOperationCallbacks } from './FinanceAdvanced'

interface FinanceViewProps extends PlanningCallbacks {
  planning: FinancePlanningData
  operations: FinanceOperationCallbacks
  goals: readonly FinancialGoal[]
  budgets: readonly CategoryBudget[]
  today: string
  shifts: readonly DeliveryShift[]
  expenses: readonly Expense[]
  records: readonly FinancialRecord[]
  onSave: (record: FinancialRecord) => Promise<boolean>
  onExpense: (expense: Expense) => Promise<boolean>
  onDelivery: (id?: string) => void
}

export function FinanceView({ planning, operations, today, shifts, expenses, records, onSave, onExpense, onDelivery, goals, budgets, onGoal, onBudget, onDeleteGoal, onDeleteBudget }: FinanceViewProps) {
  const [period, setPeriod] = useState<FinancialPeriod>('month')
  const [start, setStart] = useState(financialPeriod('month', today).start)
  const [end, setEnd] = useState(today)
  const [type, setType] = useState<FinancialType | ''>('')
  const [category, setCategory] = useState('')
  const [origin, setOrigin] = useState('')
  const [status, setStatus] = useState<FinancialStatus | ''>('')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<FinancialRecord | undefined>()
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>()
  const [settling, setSettling] = useState<string | null>(null)
  const [limit, setLimit] = useState(50)
  const formContainer = useRef<HTMLDivElement>(null)
  const interval = financialPeriod(period, today, start, end)
  const validInterval = !!interval.start && !!interval.end && interval.start <= interval.end
  const analysis = useMemo(() => buildFinanceAnalysis({ shifts, expenses, records, today, goals, budgets, ...planning, period, interval: validInterval ? { start: interval.start, end: interval.end } : { start: today, end: today } }), [shifts, expenses, records, today, goals, budgets, planning, period, interval.start, interval.end, validInterval])
  const allRows = analysis.rows
  const periodRows = validInterval ? analysis.periodRows : []
  const visibleRows = filterFinancialMovements(periodRows, { ...interval, type, category, origin, status, search })
  const summary = summarizeFinance(periodRows)
  const categories = [...new Set(allRows.map((row) => row.category))].sort()
  function focusForm() { window.requestAnimationFrame(() => { formContainer.current?.scrollIntoView({ block: 'start' }); formContainer.current?.querySelector<HTMLSelectElement>('select')?.focus() }) }
  function edit(row: FinancialMovement) {
    setEditing(undefined)
    setEditingExpense(undefined)
    if (row.source === 'financial') setEditing(records.find((record) => record.id === row.sourceId))
    else if (row.source === 'expense') setEditingExpense(expenses.find((expense) => expense.id === row.sourceId))
    focusForm()
  }
  async function settle(row: FinancialMovement) {
    if (settling) return
    const record = records.find((record) => record.id === row.sourceId)
    if (!record) return
    setSettling(record.id)
    try { await onSave(settleFinancialRecord(record, today, new Date().toISOString())) } finally { setSettling(null) }
  }


  return <>
    <PageTitle eyebrow="Dinheiro e compromissos" title="Financeiro" subtitle="O que entrou, o que saiu e o que ainda precisa acontecer." />
    <section className="finance-period form-card" aria-label="Filtros do período financeiro">
      <div className="subnav" role="group" aria-label="Período financeiro">{([['today', 'Hoje'], ['week', 'Semana'], ['month', 'Mês'], ['year', 'Ano'], ['custom', 'Personalizado']] as const).map(([id, label]) => <button type="button" key={id} aria-pressed={period === id} className={period === id ? 'active' : ''} onClick={() => setPeriod(id)}>{label}</button>)}</div>
      {period === 'custom' && <div className="form-grid"><Field label="De"><input type="date" required value={start} onChange={(event) => setStart(event.target.value)} /></Field><Field label="Até"><input type="date" required min={start} value={end} onChange={(event) => setEnd(event.target.value)} /></Field></div>}
      {validInterval ? <p className="fine-print">{new Date(`${interval.start}T12:00:00`).toLocaleDateString('pt-BR')} a {new Date(`${interval.end}T12:00:00`).toLocaleDateString('pt-BR')} · dados deste aparelho</p> : <p className="warning-text" role="alert">Informe um intervalo válido. A data final deve ser igual ou posterior à inicial.</p>}
    </section>
    <FinanceSummary rows={periodRows} />
    {(summary.futureEntries !== 0 || summary.futureExits !== 0) && <p className="finance-forecast fine-print">Previstos no período: {formatMoney(summary.futureEntries)} de entradas e {formatMoney(summary.futureExits)} de saídas. Não alteram o saldo realizado.</p>}
    <FinanceAlerts alerts={analysis.alerts} />
    <FinancePlanning today={today} goals={validInterval ? analysis.goals : []} budgets={validInterval ? analysis.budgets : []} onGoal={onGoal} onBudget={onBudget} onDeleteGoal={onDeleteGoal} onDeleteBudget={onDeleteBudget} />
    {validInterval && <FinanceAdvanced sources={{ today, shifts, expenses, records }} planning={planning} analysis={analysis} interval={interval} goals={goals} budgets={budgets} callbacks={operations} />}
    {validInterval && <><FinanceComparison comparison={analysis.comparison} /><FinanceProjection analysis={analysis} today={today} /><FinanceDeliveryInsights analysis={analysis} onDelivery={() => onDelivery()} /></>}

    <div className="finance-workspace">
      <div ref={formContainer} className="finance-form-container">{editingExpense ? <ExpenseForm accounts={planning.accounts} key={editingExpense.id} today={today} shifts={shifts} initial={editingExpense} onSave={onExpense} onCancel={() => setEditingExpense(undefined)} /> : <FinancialRecordForm accounts={planning.accounts} key={editing?.id ?? today} today={today} shifts={shifts} initial={editing} onSave={onSave} onCancel={() => setEditing(undefined)} />}</div>
      <section className="form-card finance-history" aria-label="Histórico financeiro">
        <div className="section-heading"><div><h2>Movimentações</h2><p className="section-description">{visibleRows.length} lançamentos no filtro</p></div></div>
        <div className="finance-filters"><Field label="Tipo do histórico"><select value={type} onChange={(event) => setType(event.target.value as FinancialType | '')}><option value="">Todos os tipos</option>{Object.entries(financialTypeLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></Field><Field label="Categoria do histórico"><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Todas as categorias</option>{categories.map((label) => <option key={label}>{label}</option>)}</select></Field><Field label="Origem do histórico"><select value={origin} onChange={(event) => setOrigin(event.target.value)}><option value="">Todas as origens</option>{['Delivery', 'Despesas', 'Financeiro', 'Recorrências', 'Parcelamentos'].map((label) => <option key={label}>{label}</option>)}</select></Field><Field label="Status do histórico"><select value={status} onChange={(event) => setStatus(event.target.value as FinancialStatus | '')}><option value="">Todos os status</option>{Object.entries(financialStatusLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></Field></div>
        <Field label="Buscar descrição"><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar movimentação" /></Field>
        {!visibleRows.length && <div className="empty-state"><p>Nenhuma movimentação neste filtro. Registre um valor ou escolha outro período.</p></div>}
        {visibleRows.slice(0, limit).map((row) => <article key={row.id} className={`finance-movement finance-${row.type}`}><div className="finance-movement-heading"><span className="finance-type">{financialTypeLabels[row.type]}</span><strong>{row.amount === null ? 'Não informado' : formatMoney(row.amount)}</strong></div><h3>{row.description}</h3><p className="section-description"><time dateTime={row.localDate}>{new Date(`${row.localDate}T12:00:00`).toLocaleDateString('pt-BR')}</time> · {row.category} · {row.origin}</p><p className="finance-status">{financialStatusLabels[row.status]}{row.deliveryShiftId && ' · Vinculado ao delivery'} · Forma de pagamento: {paymentMethodLabel(row.paymentMethod)}</p>{row.note && <p className="fine-print finance-note">{row.note}</p>}<div className="finance-row-actions">{row.source === 'planning' ? <button type="button" className="text-button" onClick={() => { const section = document.getElementById('finance-advanced'); section?.scrollIntoView({ block: 'start' }); section?.querySelector<HTMLButtonElement>('button')?.focus() }}>Ver planejamento</button> : row.source === 'delivery' ? <button type="button" className="text-button" onClick={() => onDelivery(row.sourceId)}>Editar em Registros</button> : <button type="button" className="text-button" onClick={() => edit(row)}>Editar</button>}{row.source === 'financial' && row.status === 'aberto' && <button type="button" className="secondary-button" disabled={!!settling} onClick={() => settle(row)}>{settling === row.sourceId ? 'Salvando…' : row.type === 'credito' ? 'Receber' : 'Pagar'}</button>}</div></article>)}
        {visibleRows.length > limit && <button type="button" className="secondary-button" onClick={() => setLimit(limit + 50)}>Mostrar mais movimentações</button>}
      </section>
    </div>
    {validInterval && <FinancePeriodAnalysis analysis={analysis} />}
  </>
}
