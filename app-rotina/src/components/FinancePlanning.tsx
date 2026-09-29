import { useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { expenseCategories } from '../data'
import { categoryBudgetId, formatMoney } from '../domain'
import { budgetLabel, dateLabel, deliveryCostLabels, goalTypeLabels, numberLabel, type BudgetUsage, type GoalProgress } from '../finance-analysis'
import { financialPeriod } from '../finance'
import type { CategoryBudget, DeliveryCostKind, FinancialGoal, FinancialGoalType } from '../types'
import { Field } from './FormPrimitives'
import { MoneyInput } from './MoneyInput'

export function PlanningProgress({ name, percentage, detail }: { name: string; percentage: number | null; detail: string }) {
  return <div className="planning-progress"><div role="progressbar" aria-label={name} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage === null ? undefined : Math.min(100, Math.max(0, percentage))} aria-valuetext={detail}><span style={{ width: `${Math.min(100, Math.max(0, percentage ?? 0))}%` }} /></div><small>{detail}</small></div>
}

const goalStatus: Record<GoalProgress['status'], string> = { scheduled: 'Ainda não começou', 'no-data': 'Sem registros realizados', active: 'Em andamento', achieved: 'Meta atingida', expired: 'Período encerrado', within: 'Dentro do limite', near: 'Próximo do limite', exceeded: 'Limite ultrapassado' }
const budgetStatus: Record<BudgetUsage['status'], string> = { 'no-data': 'Sem gastos registrados nesta categoria', within: 'Dentro do orçamento', near: 'Próximo do limite', reached: 'Limite atingido', exceeded: 'Orçamento ultrapassado' }

function usePlanningFormFocus() {
  const ref = useRef<HTMLFormElement>(null)
  useLayoutEffect(() => {
    ref.current?.scrollIntoView({ block: 'start' })
    ref.current?.querySelector<HTMLInputElement>('input:not(:disabled)')?.focus()
  }, [])
  return ref
}

function GoalForm({ today, initial, onSave, onCancel }: { today: string; initial?: FinancialGoal; onSave: (goal: FinancialGoal) => Promise<boolean>; onCancel: () => void }) {
  const ref = usePlanningFormFocus()
  const month = financialPeriod('month', today)
  const [form, setForm] = useState({ name: initial?.name ?? '', type: initial?.type ?? 'income' as FinancialGoalType, target: initial?.target ?? null as number | null, startDate: initial?.startDate ?? month.start, endDate: initial?.endDate ?? month.end })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    if (form.target === null || form.target <= 0 || form.endDate < form.startDate) { setError('Informe um alvo maior que zero e datas válidas.'); return }
    setSaving(true); setError('')
    try {
      const item: FinancialGoal = { ...form, name: form.name.trim(), target: form.target, id: initial?.id ?? globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`, createdAt: initial?.createdAt ?? new Date().toISOString() }
      if (await onSave(item)) onCancel(); else setError('A meta não foi salva. Confira os dados e tente novamente.')
    } finally { setSaving(false) }
  }
  return <form ref={ref} className="form-card planning-form" aria-label="Meta financeira" onSubmit={submit}>
    <h3>{initial ? 'Editar meta' : 'Nova meta financeira'}</h3>
    <Field label="Nome da meta"><input required maxLength={200} pattern=".*\S.*" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
    <div className="form-grid"><Field label="Tipo de meta"><select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as FinancialGoalType })}>{Object.entries(goalTypeLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></Field><Field label="Valor alvo (R$)"><MoneyInput required value={form.target} onChange={(target) => setForm({ ...form, target })} /></Field></div>
    <div className="form-grid"><Field label="Início da meta"><input type="date" required value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></Field><Field label="Fim da meta"><input type="date" min={form.startDate} required value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} /></Field></div>
    <p className="fine-print">O realizado é atualizado pelos registros. Renda líquida pessoal e economia usam entradas menos saídas; não comprovam dinheiro transferido para uma poupança. Líquido do delivery não desconta reserva.</p>
    {error && <p role="alert" className="warning-text">{error}</p>}
    <div className="finance-row-actions"><button className="primary-button" disabled={saving}>{saving ? 'Salvando…' : 'Salvar meta'}</button><button className="text-button" type="button" disabled={saving} onClick={onCancel}>Cancelar</button></div>
  </form>
}

function BudgetForm({ today, initial, onSave, onCancel }: { today: string; initial?: CategoryBudget; onSave: (budget: CategoryBudget) => Promise<boolean>; onCancel: () => void }) {
  const ref = usePlanningFormFocus()
  const [form, setForm] = useState({ month: initial?.month ?? today.slice(0, 7), category: initial?.category ?? 'Alimentação' as CategoryBudget['category'], deliveryCostKind: initial?.deliveryCostKind ?? '' as DeliveryCostKind | '', limit: initial?.limit ?? null as number | null })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    if (form.limit === null || form.limit <= 0) { setError('Informe um limite maior que zero.'); return }
    setSaving(true); setError('')
    try {
      const deliveryCostKind = form.deliveryCostKind || undefined
      const item: CategoryBudget = { ...form, limit: form.limit, deliveryCostKind, id: categoryBudgetId(form.month, form.category, deliveryCostKind), createdAt: initial?.createdAt ?? new Date().toISOString() }
      if (await onSave(item)) onCancel(); else setError('O orçamento não foi salvo. Confira os dados e tente novamente.')
    } finally { setSaving(false) }
  }
  return <form ref={ref} className="form-card planning-form" aria-label="Orçamento mensal" onSubmit={submit}>
    <h3>{initial ? 'Editar orçamento' : 'Novo orçamento mensal'}</h3>
    <div className="form-grid"><Field label="Mês do orçamento"><input type="month" required disabled={!!initial} value={form.month} onChange={(event) => setForm({ ...form, month: event.target.value })} /></Field><Field label="Categoria do orçamento"><select disabled={!!initial} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as CategoryBudget['category'] })}>{expenseCategories.map((category) => <option key={category}>{category}</option>)}</select></Field></div>
    <Field label="Escopo do orçamento"><select disabled={!!initial} value={form.deliveryCostKind} onChange={(event) => setForm({ ...form, deliveryCostKind: event.target.value as DeliveryCostKind | '' })}><option value="">Toda a categoria</option>{Object.entries(deliveryCostLabels).map(([id, label]) => <option key={id} value={id}>{label} · delivery</option>)}</select><small>Ao escolher um custo específico, somente valores classificados ou identificados no turno entram; a categoria geral deixa de ser o filtro.</small></Field>
    <Field label="Limite mensal (R$)"><MoneyInput required value={form.limit} onChange={(limit) => setForm({ ...form, limit })} /></Field>
    <p className="fine-print">Planejamento não é gasto. Salvar a mesma categoria/escopo e mês atualiza o limite existente. Orçamentos gerais e específicos podem se sobrepor e não são somados.</p>
    {error && <p role="alert" className="warning-text">{error}</p>}
    <div className="finance-row-actions"><button className="primary-button" disabled={saving}>{saving ? 'Salvando…' : 'Salvar orçamento'}</button><button className="text-button" type="button" disabled={saving} onClick={onCancel}>Cancelar</button></div>
  </form>
}

export interface PlanningCallbacks {
  onGoal: (goal: FinancialGoal) => Promise<boolean>
  onBudget: (budget: CategoryBudget) => Promise<boolean>
  onDeleteGoal: (id: string) => Promise<boolean>
  onDeleteBudget: (id: string) => Promise<boolean>
}

export function FinancePlanning({ today, goals, budgets, ...callbacks }: PlanningCallbacks & { today: string; goals: readonly GoalProgress[]; budgets: readonly BudgetUsage[] }) {
  const [form, setForm] = useState<'goal' | 'budget' | null>(null)
  const [editingGoal, setEditingGoal] = useState<FinancialGoal>()
  const [editingBudget, setEditingBudget] = useState<CategoryBudget>()
  const [deleting, setDeleting] = useState<string | null>(null)
  function open(kind: 'goal' | 'budget', goal?: FinancialGoal, budget?: CategoryBudget) {
    setEditingGoal(goal); setEditingBudget(budget); setForm(kind)
  }
  async function remove(kind: 'goal' | 'budget', id: string) {
    if (deleting || !window.confirm('Excluir este planejamento? Os registros de dinheiro serão preservados.')) return
    setDeleting(id)
    try { if (await (kind === 'goal' ? callbacks.onDeleteGoal(id) : callbacks.onDeleteBudget(id))) setForm(null) } finally { setDeleting(null) }
  }
  return <section className="form-card finance-planning" aria-label="Metas e orçamentos">
    <div className="section-heading"><div><h2>Metas e orçamento</h2><p className="section-description">Planejamentos que se cruzam com o período escolhido. Progresso considera todo o prazo da meta ou mês do orçamento.</p></div><div className="finance-row-actions"><button type="button" className="secondary-button" onClick={() => open('goal')}>Criar meta</button><button type="button" className="secondary-button" onClick={() => open('budget')}>Definir orçamento</button></div></div>
    <div className="planning-columns"><section aria-label="Metas do período"><h3>Metas</h3>{!goals.length && <p className="section-description">Nenhuma meta neste período. Defina um alvo e acompanhe o realizado automaticamente.</p>}{goals.map((item) => <article className={`planning-item planning-${item.status}`} key={item.goal.id}>
      <h4>{item.goal.name}</h4><p className="section-description">{goalTypeLabels[item.goal.type]} · {dateLabel(item.goal.startDate)} a {dateLabel(item.goal.endDate)}</p>
      <p className="planning-values"><strong>{item.current === null ? 'Sem dados' : formatMoney(item.current)}</strong><span> / {formatMoney(item.goal.target)}</span></p>
      <PlanningProgress name={`Progresso de ${item.goal.name}`} percentage={item.percentage} detail={item.percentage === null ? goalStatus[item.status] : `${numberLabel(item.percentage)}% · ${goalStatus[item.status]}`} />
      <div className="finance-row-actions"><button className="text-button" type="button" onClick={() => open('goal', item.goal)}>Editar meta</button><button className="text-button" type="button" disabled={!!deleting} onClick={() => remove('goal', item.goal.id)}>Excluir meta</button></div>
    </article>)}</section><section aria-label="Orçamentos do período"><h3>Orçamentos mensais</h3>{!budgets.length && <p className="section-description">Nenhum orçamento neste período. Defina quanto deseja gastar por categoria.</p>}{budgets.map((item) => <article className={`planning-item planning-${item.status}`} key={item.budget.id}>
      <h4>{budgetLabel(item.budget)}</h4><p className="section-description">{item.budget.month.split('-').reverse().join('/')} · limite mensal</p>
      <p className="planning-values"><strong>{item.spent === null ? 'Sem dados' : formatMoney(item.spent)}</strong><span> / {formatMoney(item.budget.limit)}</span></p>
      <PlanningProgress name={`Consumo de ${budgetLabel(item.budget)}`} percentage={item.percentage} detail={item.percentage === null ? budgetStatus[item.status] : `${numberLabel(item.percentage)}% utilizado · ${budgetStatus[item.status]}`} />
      {item.remaining !== null && <p className="fine-print">{item.remaining < 0 ? `Excesso: ${formatMoney(-item.remaining)}` : `Restante: ${formatMoney(item.remaining)}`}</p>}
      <div className="finance-row-actions"><button className="text-button" type="button" onClick={() => open('budget', undefined, item.budget)}>Editar orçamento</button><button className="text-button" type="button" disabled={!!deleting} onClick={() => remove('budget', item.budget.id)}>Excluir orçamento</button></div>
    </article>)}</section></div>
    <div className="planning-form-container">{form === 'goal' && <GoalForm key={editingGoal?.id ?? 'new'} today={today} initial={editingGoal} onSave={callbacks.onGoal} onCancel={() => setForm(null)} />}{form === 'budget' && <BudgetForm key={editingBudget?.id ?? 'new'} today={today} initial={editingBudget} onSave={callbacks.onBudget} onCancel={() => setForm(null)} />}</div>
  </section>
}
