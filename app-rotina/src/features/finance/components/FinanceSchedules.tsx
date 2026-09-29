import { useState, type FormEvent } from 'react'
import { expenseCategories } from '../../routine/data'
import { formatMoney } from '../../../core/domain'
import { dateLabel } from '../finance-analysis'
import { financialTypeLabels } from '../finance'
import { anchoredMonth } from '../../../core/finance-schedule'
import { frequencyLabels, installmentAmounts, installmentProgress, planOccurrences, type PlanOccurrence } from '../finance-plans'
import type { AssetAccount, FinancialRecord, FinancialType, InstallmentPlan, PlanningReference, RecurringPlan } from '../../../core/types'
import { Field } from '../../../components/FormPrimitives'
import { MoneyInput } from '../../../components/MoneyInput'
import { entityId, useFinanceFormFocus } from './finance-form-utils'

export interface ScheduleCallbacks {
  onRecurring: (plan: RecurringPlan) => Promise<boolean>
  onInstallment: (plan: InstallmentPlan) => Promise<boolean>
  onConfirm: (ref: PlanningReference, date: string) => Promise<boolean>
}
export function AccountField({ accounts, value, onChange, label = 'Conta da movimentação', liability = false }: { accounts: readonly AssetAccount[]; value: string; onChange: (value: string) => void; label?: string; liability?: boolean }) {
  return <Field label={label}><select value={value} onChange={e => onChange(e.target.value)}><option value="">Sem vínculo</option>{accounts.filter(a => liability ? a.kind === 'liability' : a.kind !== 'liability').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
}

function ScheduleForm({ today, accounts, recurring, installment, locked, onRecurring, onInstallment, onCancel, kind }: ScheduleCallbacks & { today: string; accounts: readonly AssetAccount[]; recurring?: RecurringPlan; installment?: InstallmentPlan; locked: boolean; onCancel: () => void; kind: 'recurring' | 'installment' }) {
  const ref = useFinanceFormFocus(), initial = recurring ?? installment
  const [form, setForm] = useState({ name: initial?.name ?? '', category: initial?.category ?? 'Outros', type: recurring?.type ?? 'saida' as FinancialType, amount: recurring?.amount ?? installment?.total ?? null as number | null, count: installment?.count ?? 3, frequency: recurring?.frequency ?? 'monthly', startDate: recurring?.startDate ?? installment?.firstDueDate ?? today, endDate: recurring?.endDate ?? '', accountId: initial?.accountId ?? '', liabilityAccountId: initial?.liabilityAccountId ?? '' })
  const [saving, setSaving] = useState(false), [error, setError] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    if (form.amount === null || form.amount <= 0 || kind === 'installment' && !installmentAmounts(form.amount, form.count).length || form.endDate && form.endDate < form.startDate) { setError('Informe valor positivo, datas válidas e parcelas de pelo menos R$ 0,01.'); return }
    setSaving(true); setError('')
    try {
      const timestamp = new Date().toISOString()
      const base = { id: initial?.id ?? entityId(), name: form.name.trim(), category: form.category, accountId: form.accountId || undefined, liabilityAccountId: kind === 'installment' || form.type === 'saida' || form.type === 'pendencia' ? form.liabilityAccountId || undefined : undefined, active: initial?.active ?? true, createdAt: initial?.createdAt ?? timestamp, updatedAt: timestamp }
      const success = kind === 'recurring' ? await onRecurring({ ...base, type: form.type, amount: form.amount, frequency: form.frequency, startDate: form.startDate, endDate: form.endDate || undefined })
        : await onInstallment({ ...base, total: form.amount, count: form.count, firstDueDate: form.startDate })
      if (success) onCancel(); else setError('O planejamento não foi salvo. Confira os dados e vínculos informados.')
    } finally { setSaving(false) }
  }
  const amounts = kind === 'installment' && form.amount !== null ? installmentAmounts(form.amount, form.count) : []
  return <form ref={ref} className="form-card planning-form" aria-label={kind === 'recurring' ? 'Planejamento recorrente' : 'Novo parcelamento'} onSubmit={submit}>
    <h3>{initial ? 'Editar planejamento' : kind === 'recurring' ? 'Nova recorrência' : 'Novo parcelamento'}</h3>
    <Field label="Nome do planejamento"><input required maxLength={200} pattern=".*\S.*" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field>
    <div className="form-grid"><Field label="Categoria do planejamento"><select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as typeof form.category })}>{expenseCategories.map(c => <option key={c}>{c}</option>)}</select></Field><Field label={kind === 'recurring' ? 'Valor recorrente (R$)' : 'Valor total da compra (R$)'}><MoneyInput required disabled={kind === 'installment' && locked} value={form.amount} onChange={amount => setForm({ ...form, amount })} /></Field></div>
    {kind === 'recurring' ? <div className="form-grid"><Field label="Tipo da recorrência"><select disabled={locked} value={form.type} onChange={e => setForm({ ...form, type: e.target.value as FinancialType })}>{Object.entries(financialTypeLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></Field><Field label="Frequência"><select disabled={locked} value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value as typeof form.frequency })}>{Object.entries(frequencyLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></Field></div>
      : <Field label="Quantidade de parcelas"><input type="number" min={1} max={600} step={1} required disabled={locked} value={form.count} onChange={e => setForm({ ...form, count: Number(e.target.value) })} /><small>As parcelas mensais distribuem o resto em centavos nas primeiras parcelas; a soma preserva o total.</small></Field>}
    <div className="form-grid"><Field label={kind === 'recurring' ? 'Primeiro vencimento' : 'Vencimento da primeira parcela'}><input required type="date" disabled={locked} value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} /></Field>{kind === 'recurring' && <Field label="Último vencimento (opcional)"><input type="date" min={form.startDate} value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} /></Field>}</div>
    <AccountField accounts={accounts} value={form.accountId} onChange={accountId => setForm({ ...form, accountId })} label="Conta prevista" />
    {(kind === 'installment' || form.type === 'saida' || form.type === 'pendencia') && <AccountField accounts={accounts} value={form.liabilityAccountId} onChange={liabilityAccountId => setForm({ ...form, liabilityAccountId })} label="Dívida a reduzir após pagamento" liability />}
    {amounts.length > 0 && <p className="fine-print">{amounts.length} parcela(s): primeira {formatMoney(amounts[0])}, última {formatMoney(amounts.at(-1)!)}. Último vencimento: {dateLabel(anchoredMonth(form.startDate, form.count - 1))}.</p>}
    <p className="fine-print">Planejamento não é pagamento nem recebimento. Use Saída para contas fixas a pagar. Créditos e pendências confirmados continuam em aberto até a baixa.</p>
    {locked && <p className="fine-print">Há ocorrências confirmadas. Datas, frequência, tipo e estrutura de parcelas permanecem fixos; pause e crie outro planejamento para substituí-los.</p>}
    {error && <p role="alert" className="warning-text">{error}</p>}
    <div className="finance-row-actions"><button className="primary-button" disabled={saving}>{saving ? 'Salvando…' : 'Salvar planejamento'}</button><button type="button" className="text-button" disabled={saving} onClick={onCancel}>Cancelar</button></div>
  </form>
}

function ConfirmForm({ occurrence, today, onConfirm, onCancel }: { occurrence: PlanOccurrence; today: string; onConfirm: ScheduleCallbacks['onConfirm']; onCancel: () => void }) {
  const ref = useFinanceFormFocus(), [date, setDate] = useState(today), [saving, setSaving] = useState(false), [error, setError] = useState('')
  const open = occurrence.type === 'credito' || occurrence.type === 'pendencia'
  async function submit(e: FormEvent) {
    e.preventDefault(); if (saving) return; setSaving(true); setError('')
    try { if (await onConfirm(occurrence.ref, date)) onCancel(); else setError('Não foi possível confirmar. Confira a data e o planejamento.') } finally { setSaving(false) }
  }
  return <form ref={ref} aria-label="Confirmar ocorrência" className="form-card planning-form" onSubmit={submit}><h3>{occurrence.name}</h3><p>{formatMoney(occurrence.amount)} · vencimento {dateLabel(occurrence.dueDate)}</p>{!open && <Field label="Data efetiva da ocorrência"><input required type="date" max={today} value={date} onChange={e => setDate(e.target.value)} /></Field>}<p className="fine-print">{open ? 'Será criado um valor em aberto, com o vencimento planejado. Registre a baixa no histórico quando o dinheiro entrar ou sair.' : 'Confirme somente se o dinheiro já entrou ou saiu. A data efetiva será usada no saldo realizado.'}</p>{error && <p role="alert" className="warning-text">{error}</p>}<div className="finance-row-actions"><button className="primary-button" disabled={saving}>{saving ? 'Confirmando…' : open ? 'Confirmar valor em aberto' : 'Confirmar recebimento/pagamento'}</button><button type="button" className="text-button" disabled={saving} onClick={onCancel}>Cancelar</button></div></form>
}

export function FinanceSchedules({ today, accounts, recurringPlans, installmentPlans, records, interval, ...callbacks }: ScheduleCallbacks & { today: string; accounts: readonly AssetAccount[]; recurringPlans: readonly RecurringPlan[]; installmentPlans: readonly InstallmentPlan[]; records: readonly FinancialRecord[]; interval: { start: string; end: string } }) {
  const [form, setForm] = useState<'recurring' | 'installment' | null>(null), [editing, setEditing] = useState<RecurringPlan | InstallmentPlan>(), [confirming, setConfirming] = useState<PlanOccurrence>(), [busy, setBusy] = useState(false), [limit, setLimit] = useState(30)
  const occurrences = planOccurrences(recurringPlans, installmentPlans, records, interval)
  function open(kind: 'recurring' | 'installment', item?: RecurringPlan | InstallmentPlan) { setForm(kind); setEditing(item); setConfirming(undefined) }
  async function toggle(item: RecurringPlan | InstallmentPlan, kind: 'recurring' | 'installment') {
    if (busy) return; setBusy(true)
    try { const next = { ...item, active: !item.active, updatedAt: new Date().toISOString() }; await (kind === 'recurring' ? callbacks.onRecurring(next as RecurringPlan) : callbacks.onInstallment(next as InstallmentPlan)) } finally { setBusy(false) }
  }
  return <div className="finance-schedules">
    <div className="finance-row-actions"><button type="button" className="secondary-button" onClick={() => open('recurring')}>Criar recorrência</button><button type="button" className="secondary-button" onClick={() => open('installment')}>Criar parcelamento</button></div>
    {form && <ScheduleForm key={editing?.id ?? form} kind={form} today={today} accounts={accounts} recurring={form === 'recurring' ? editing as RecurringPlan : undefined} installment={form === 'installment' ? editing as InstallmentPlan : undefined} locked={!!editing && records.some(r => r.planningRef?.planId === editing.id)} {...callbacks} onCancel={() => setForm(null)} />}
    {confirming && <ConfirmForm key={confirming.id} occurrence={confirming} today={today} onConfirm={callbacks.onConfirm} onCancel={() => setConfirming(undefined)} />}
    <div className="planning-columns"><section aria-label="Recorrências cadastradas"><h3>Recorrências</h3>{!recurringPlans.length && <p className="empty-state">Nenhuma recorrência. Planeje renda, contas fixas e valores em aberto.</p>}{recurringPlans.map(plan => <article key={plan.id} className="planning-item"><h4>{plan.name}</h4><p>{financialTypeLabels[plan.type]} · {frequencyLabels[plan.frequency]} · {formatMoney(plan.amount)}</p><p className="fine-print">{dateLabel(plan.startDate)}{plan.endDate && ` até ${dateLabel(plan.endDate)}`} · {plan.active ? 'Ativa' : 'Pausada'}</p><div className="finance-row-actions"><button type="button" className="text-button" onClick={() => open('recurring', plan)}>Editar recorrência {plan.name}</button><button type="button" className="text-button" disabled={busy} onClick={() => toggle(plan, 'recurring')}>{plan.active ? 'Pausar' : 'Retomar'} {plan.name}</button></div></article>)}</section>
      <section aria-label="Parcelamentos cadastrados"><h3>Parcelamentos</h3>{!installmentPlans.length && <p className="empty-state">Nenhuma compra parcelada cadastrada.</p>}{installmentPlans.map(plan => { const progress = installmentProgress(plan, records, today); return <article key={plan.id} className="planning-item"><h4>{plan.name}</h4><p>Total {formatMoney(plan.total)} · {plan.count} parcelas</p><p>{progress.paidCount} paga(s) · {progress.remainingCount} restante(s) · saldo restante {formatMoney(progress.remaining)}</p><p className="fine-print">{progress.next ? `Próxima não paga: ${dateLabel(progress.next.dueDate)} · ${formatMoney(progress.next.amount)}` : 'Todas as parcelas pagas.'} · {plan.active ? 'Ativo' : 'Pausado; fora da projeção'}</p><div className="finance-row-actions"><button type="button" className="text-button" onClick={() => open('installment', plan)}>Editar parcelamento {plan.name}</button><button type="button" className="text-button" disabled={busy} onClick={() => toggle(plan, 'installment')}>{plan.active ? 'Pausar' : 'Retomar'} {plan.name}</button></div></article> })}</section></div>
    <section aria-label="Ocorrências do período"><h3>Ocorrências do período</h3><p className="fine-print">{dateLabel(interval.start)} a {dateLabel(interval.end)}. Confirmações usam um lançamento único; pausas preservam pagamentos anteriores.</p>{!occurrences.length && <p className="empty-state">Nenhuma ocorrência neste período.</p>}{occurrences.slice(0, limit).map(o => <article key={o.id} className="finance-movement"><div className="finance-movement-heading"><h4>{o.name}{o.ref.kind === 'installment' && ` · parcela ${o.ref.key}`}</h4><strong>{formatMoney(o.amount)}</strong></div><p>{dateLabel(o.dueDate)} · {financialTypeLabels[o.type]}</p><p className="fine-print">{o.record ? o.record.type === 'credito' || o.record.type === 'pendencia' ? 'Confirmada em aberto · faça a baixa no histórico' : `Realizada em ${dateLabel(o.record.localDate)}` : o.dueDate < today ? 'Vencida no planejamento · confira antes de confirmar' : 'Planejada · ainda não confirmada'}</p>{!o.record && <button type="button" className="secondary-button" aria-label={`Confirmar ${o.name}${o.ref.kind === 'installment' ? ` parcela ${o.ref.key}` : ''} ${o.dueDate}`} onClick={() => { setConfirming(o); setForm(null) }}>Confirmar ocorrência</button>}</article>)}{occurrences.length > limit && <button type="button" className="text-button" onClick={() => setLimit(limit + 30)}>Mostrar mais ocorrências</button>}</section>
  </div>
}
