import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
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
  registrationRequest?: FinanceRegistrationRequest
}

type FinanceArea = 'overview' | 'planning' | 'wealth' | 'analysis' | 'tools'
type RegisterIntent = 'entrada' | 'saida' | 'credito' | 'pendencia'
export interface FinanceRegistrationRequest { intent: RegisterIntent; revision: number }

const financeAreas: readonly { id: FinanceArea; label: string }[] = [
  { id: 'overview', label: 'Visão geral' },
  { id: 'planning', label: 'Planejamento' },
  { id: 'wealth', label: 'Patrimônio' },
  { id: 'analysis', label: 'Análises' },
  { id: 'tools', label: 'Ferramentas' },
]

const registerIntents: readonly { id: RegisterIntent; label: string }[] = [
  { id: 'entrada', label: 'Entrada' },
  { id: 'saida', label: 'Saída' },
  { id: 'credito', label: 'A receber' },
  { id: 'pendencia', label: 'A pagar' },
]

export function FinanceView({ planning, operations, today, shifts, expenses, records, onSave, onExpense, onDelivery, registrationRequest, goals, budgets, onGoal, onBudget, onDeleteGoal, onDeleteBudget }: FinanceViewProps) {
  const [area, setArea] = useState<FinanceArea>('overview')
  const [registering, setRegistering] = useState<RegisterIntent | null>(registrationRequest?.intent ?? null)
  const [handledRegistrationRevision, setHandledRegistrationRevision] = useState(registrationRequest?.revision)
  const [registerOpen, setRegisterOpen] = useState(false)
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
  const [guideDismissed, setGuideDismissed] = useState(false)
  const formContainer = useRef<HTMLDivElement>(null)
  const registerDialog = useRef<HTMLDialogElement>(null)
  const registerTrigger = useRef<HTMLButtonElement>(null)
  const registerDialogId = useId()
  const interval = financialPeriod(period, today, start, end)
  const validInterval = !!interval.start && !!interval.end && interval.start <= interval.end
  const analysis = useMemo(() => buildFinanceAnalysis({ shifts, expenses, records, today, goals, budgets, ...planning, period, interval: validInterval ? { start: interval.start, end: interval.end } : { start: today, end: today } }), [shifts, expenses, records, today, goals, budgets, planning, period, interval.start, interval.end, validInterval])
  const allRows = analysis.rows
  const periodRows = validInterval ? analysis.periodRows : []
  const visibleRows = filterFinancialMovements(periodRows, { ...interval, type, category, origin, status, search })
  const summary = summarizeFinance(periodRows)
  const categories = [...new Set(allRows.map((row) => row.category))].sort()
  const firstUse = !shifts.length && !expenses.length && !records.length && !goals.length && !budgets.length && !planning.recurringPlans.length && !planning.installmentPlans.length && !planning.accounts.length && !planning.transfers.length
  if (registrationRequest && registrationRequest.revision !== handledRegistrationRevision) {
    setHandledRegistrationRevision(registrationRequest.revision)
    setArea('overview')
    setEditing(undefined)
    setEditingExpense(undefined)
    setRegistering(registrationRequest.intent)
  }
  useLayoutEffect(() => {
    if (!registerOpen) return
    const dialog = registerDialog.current
    if (!dialog) return
    dialog.showModal()
    dialog.querySelector<HTMLButtonElement>('button')?.focus()
    return () => { if (dialog.open) dialog.close() }
  }, [registerOpen])
  useEffect(() => {
    if (!registrationRequest) return
    focusForm()
  }, [registrationRequest])
  function focusForm() { window.requestAnimationFrame(() => { formContainer.current?.scrollIntoView({ block: 'start' }); formContainer.current?.querySelector<HTMLSelectElement>('select')?.focus() }) }
  function edit(row: FinancialMovement) {
    setEditing(undefined)
    setEditingExpense(undefined)
    if (row.source === 'financial') { setEditing(records.find((record) => record.id === row.sourceId)); setRegistering('entrada') }
    else if (row.source === 'expense') { setEditingExpense(expenses.find((expense) => expense.id === row.sourceId)); setRegistering('saida') }
    focusForm()
  }
  function closeRegisterMenu() { registerDialog.current?.close() }
  function afterRegisterMenuClose() { setRegisterOpen(false); registerTrigger.current?.focus() }
  function chooseRegisterIntent(intent: RegisterIntent) {
    setEditing(undefined)
    setEditingExpense(undefined)
    setRegistering(intent)
    closeRegisterMenu()
    focusForm()
  }
  function closeForm() { setRegistering(null); setEditing(undefined); setEditingExpense(undefined); registerTrigger.current?.focus() }
  function openArea(next: FinanceArea) { setArea(next); setRegistering(null); setEditing(undefined); setEditingExpense(undefined); window.scrollTo({ top: 0 }) }
  async function settle(row: FinancialMovement) {
    if (settling) return
    const record = records.find((record) => record.id === row.sourceId)
    if (!record) return
    setSettling(record.id)
    try { await onSave(settleFinancialRecord(record, today, new Date().toISOString())) } finally { setSettling(null) }
  }

  const areaNavigation = <nav className="finance-area-nav" aria-label="Áreas do Financeiro">{financeAreas.map(item => <button type="button" key={item.id} aria-current={area === item.id ? 'page' : undefined} onClick={() => openArea(item.id)}>{item.label}</button>)}</nav>


  return <>
    <PageTitle eyebrow="Dinheiro e compromissos" title="Financeiro" subtitle="O que entrou, o que saiu e o que ainda precisa acontecer." />
    {area !== 'overview' && areaNavigation}
    {area === 'overview' && <section className="finance-overview" aria-label="Visão geral financeira"><div className="finance-overview-actions"><button ref={registerTrigger} type="button" className="primary-button" aria-haspopup="dialog" aria-expanded={registerOpen} aria-controls={registerDialogId} onClick={() => setRegisterOpen(true)}>Registrar</button></div>
    <section className="finance-period form-card" aria-label="Filtros do período financeiro">
      <div className="subnav" role="group" aria-label="Período financeiro">{([['today', 'Hoje'], ['week', 'Semana'], ['month', 'Mês'], ['year', 'Ano'], ['custom', 'Personalizado']] as const).map(([id, label]) => <button type="button" key={id} aria-pressed={period === id} className={period === id ? 'active' : ''} onClick={() => setPeriod(id)}>{label}</button>)}</div>
      {period === 'custom' && <div className="form-grid"><Field label="De"><input type="date" required value={start} onChange={(event) => setStart(event.target.value)} /></Field><Field label="Até"><input type="date" required min={start} value={end} onChange={(event) => setEnd(event.target.value)} /></Field></div>}
      {validInterval ? <p className="fine-print">{new Date(`${interval.start}T12:00:00`).toLocaleDateString('pt-BR')} a {new Date(`${interval.end}T12:00:00`).toLocaleDateString('pt-BR')} · dados deste aparelho</p> : <p className="warning-text" role="alert">Informe um intervalo válido. A data final deve ser igual ou posterior à inicial.</p>}
    </section>
    <FinanceSummary rows={periodRows} />
    {firstUse && !guideDismissed && <section className="getting-started-card" aria-labelledby="finance-getting-started-title">
      <div><h2 id="finance-getting-started-title">Comece pelo essencial</h2><p>Registre o que já aconteceu antes de planejar o restante.</p></div>
      <div className="getting-started-actions"><button type="button" className="secondary-button" onClick={() => chooseRegisterIntent('entrada')}>Registrar primeira entrada</button><button type="button" className="secondary-button" onClick={() => openArea('wealth')}>Cadastrar uma conta</button><button type="button" className="secondary-button" onClick={() => onDelivery()}>Registrar um turno</button><button type="button" className="text-button" onClick={() => setGuideDismissed(true)}>Agora não</button></div>
    </section>}
    {areaNavigation}
    {(summary.futureEntries !== 0 || summary.futureExits !== 0) && <p className="finance-forecast fine-print">Previstos no período: {formatMoney(summary.futureEntries)} de entradas e {formatMoney(summary.futureExits)} de saídas. Não alteram o saldo realizado.</p>}
    <FinanceAlerts alerts={analysis.alerts} />

    <div className="finance-workspace">
      {registering && <div ref={formContainer} className="finance-form-container">{editingExpense || registering === 'saida' && !editing ? <ExpenseForm accounts={planning.accounts} key={editingExpense?.id ?? `expense-${today}`} today={today} shifts={shifts} initial={editingExpense} onSave={async (item) => { const saved = await onExpense(item); if (saved) closeForm(); return saved }} onCancel={closeForm} /> : <FinancialRecordForm accounts={planning.accounts} key={editing?.id ?? `${registering}-${today}`} today={today} shifts={shifts} intent={editing?.type ?? registering} initial={editing} onSave={async (item) => { const saved = await onSave(item); if (saved) closeForm(); return saved }} onCancel={closeForm} />}<button type="button" className="text-button finance-form-close" onClick={closeForm}>Fechar cadastro</button></div>}
      <section className="form-card finance-history" aria-label="Histórico financeiro">
        <div className="section-heading"><div><h2>Movimentações</h2><p className="section-description">{visibleRows.length} lançamentos no filtro</p></div></div>
        <div className="finance-filters"><Field label="Tipo do histórico"><select value={type} onChange={(event) => setType(event.target.value as FinancialType | '')}><option value="">Todos os tipos</option>{Object.entries(financialTypeLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></Field><Field label="Categoria do histórico"><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Todas as categorias</option>{categories.map((label) => <option key={label}>{label}</option>)}</select></Field><Field label="Origem do histórico"><select value={origin} onChange={(event) => setOrigin(event.target.value)}><option value="">Todas as origens</option>{['Delivery', 'Despesas', 'Financeiro', 'Recorrências', 'Parcelamentos'].map((label) => <option key={label}>{label}</option>)}</select></Field><Field label="Status do histórico"><select value={status} onChange={(event) => setStatus(event.target.value as FinancialStatus | '')}><option value="">Todos os status</option>{Object.entries(financialStatusLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></Field></div>
        <Field label="Buscar descrição"><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar movimentação" /></Field>
        {!visibleRows.length && <div className="empty-state"><p>Nenhuma movimentação neste filtro. Registre um valor ou escolha outro período.</p></div>}
        {visibleRows.slice(0, limit).map((row) => <article key={row.id} className={`finance-movement finance-${row.type}`}><div className="finance-movement-heading"><span className="finance-type">{financialTypeLabels[row.type]}</span><strong>{row.amount === null ? 'Não informado' : formatMoney(row.amount)}</strong></div><h3>{row.description}</h3><p className="section-description"><time dateTime={row.localDate}>{new Date(`${row.localDate}T12:00:00`).toLocaleDateString('pt-BR')}</time> · {row.category} · {row.origin}</p><p className="finance-status">{financialStatusLabels[row.status]}{row.deliveryShiftId && ' · Vinculado ao delivery'} · Forma de pagamento: {paymentMethodLabel(row.paymentMethod)}</p>{row.note && <p className="fine-print finance-note">{row.note}</p>}<div className="finance-row-actions">{row.source === 'planning' ? <button type="button" className="text-button" onClick={() => openArea('planning')}>Ver planejamento</button> : row.source === 'delivery' ? <button type="button" className="text-button" onClick={() => onDelivery(row.sourceId)}>Editar em Registros</button> : <button type="button" className="text-button" onClick={() => edit(row)}>Editar</button>}{row.source === 'financial' && row.status === 'aberto' && <button type="button" className="secondary-button" disabled={!!settling} onClick={() => settle(row)}>{settling === row.sourceId ? 'Salvando…' : row.type === 'credito' ? 'Receber' : 'Pagar'}</button>}</div></article>)}
        {visibleRows.length > limit && <button type="button" className="secondary-button" onClick={() => setLimit(limit + 50)}>Mostrar mais movimentações</button>}
      </section>
    </div>
    </section>}
    {area !== 'overview' && <div className="finance-area-heading"><button type="button" className="text-button" onClick={() => openArea('overview')}>Voltar à visão geral</button></div>}
    {area === 'planning' && <section aria-label="Planejamento financeiro"><FinancePlanning today={today} goals={validInterval ? analysis.goals : []} budgets={validInterval ? analysis.budgets : []} onGoal={onGoal} onBudget={onBudget} onDeleteGoal={onDeleteGoal} onDeleteBudget={onDeleteBudget} />{validInterval && <FinanceAdvanced area="planning" sources={{ today, shifts, expenses, records }} planning={planning} analysis={analysis} interval={interval} goals={goals} budgets={budgets} callbacks={operations} />}</section>}
    {area === 'wealth' && validInterval && <FinanceAdvanced area="wealth" sources={{ today, shifts, expenses, records }} planning={planning} analysis={analysis} interval={interval} goals={goals} budgets={budgets} callbacks={operations} />}
    {area === 'analysis' && validInterval && <section className="finance-secondary-area" aria-label="Análises financeiras"><FinanceComparison comparison={analysis.comparison} /><FinanceProjection analysis={analysis} today={today} /><FinanceDeliveryInsights analysis={analysis} onDelivery={() => onDelivery()} /><FinancePeriodAnalysis analysis={analysis} /></section>}
    {area === 'tools' && validInterval && <section className="finance-secondary-area" aria-label="Ferramentas financeiras"><FinanceAdvanced area="tools" sources={{ today, shifts, expenses, records }} planning={planning} analysis={analysis} interval={interval} goals={goals} budgets={budgets} callbacks={operations} /></section>}
    <dialog ref={registerDialog} id={registerDialogId} className="finance-register-dialog" aria-label="Registrar" onClose={afterRegisterMenuClose} onClick={(event) => { if (event.target === event.currentTarget) closeRegisterMenu() }}><div className="finance-register-content"><h2>O que você quer registrar?</h2>{registerIntents.map(intent => <button type="button" key={intent.id} onClick={() => chooseRegisterIntent(intent.id)}>{intent.label}</button>)}<button type="button" className="text-button" onClick={closeRegisterMenu}>Fechar</button></div></dialog>
  </>
}
