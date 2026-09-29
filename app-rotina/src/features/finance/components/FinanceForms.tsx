import { useState, type FormEvent } from 'react'
import { expenseCategories } from '../../routine/data'
import { financialTypeLabels } from '../finance'
import { deliveryCostLabels } from '../finance-analysis'
import type { AssetAccount, DeliveryCostKind, DeliveryShift, Expense, FinancialRecord, FinancialType, PaymentMethod } from '../../../core/types'
import { Field } from '../../../components/FormPrimitives'
import { MoneyInput } from '../../../components/MoneyInput'
import { AccountField } from './FinanceSchedules'
import { PaymentMethodField } from './PaymentMethodField'

const uid = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
export { PaymentMethodField } from './PaymentMethodField'
export function DeliveryCostField({ value, onChange }: { value: DeliveryCostKind | '', onChange: (value: DeliveryCostKind | '') => void }) {
  return <Field label="Tipo de custo do delivery"><select value={value} onChange={(event) => onChange(event.target.value as DeliveryCostKind | '')}><option value="">Sem classificação específica</option>{Object.entries(deliveryCostLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select><small>A categoria geral permanece disponível no histórico e no orçamento.</small></Field>
}
export function DeliveryAssociation({ shifts, value, onChange }: { shifts: readonly DeliveryShift[], value: string, onChange: (value: string) => void }) {
  return <Field label="Associar ao delivery"><select value={value} onChange={(event) => onChange(event.target.value)}><option value="">Despesa geral</option>{[...shifts].sort((a, b) => b.localDate.localeCompare(a.localDate)).map((shift) => <option key={shift.id} value={shift.id}>{new Date(`${shift.localDate}T12:00`).toLocaleDateString('pt-BR')} · {shift.startTime}–{shift.endTime}</option>)}</select><small>Use para custos adicionais que ainda não foram informados no turno.</small></Field>
}

export function ExpenseForm({ accounts = [], today, shifts, initial, onSave, onCancel }: { accounts?: readonly AssetAccount[], today: string, shifts: readonly DeliveryShift[], initial?: Expense, onSave: (item: Expense) => Promise<boolean>, onCancel?: () => void }) {
  const [form, setForm] = useState({ localDate: initial?.localDate ?? today, description: initial?.description ?? '', category: initial?.category ?? 'Alimentação' as Expense['category'], amount: initial?.amount ?? null as number | null, paymentMethod: initial?.paymentMethod ?? '' as PaymentMethod | '', deliveryShiftId: initial?.deliveryShiftId ?? '', deliveryCostKind: initial?.deliveryCostKind ?? '' as DeliveryCostKind | '', note: initial?.note ?? '', accountId: initial?.accountId ?? '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving || form.amount === null) return
    setSaving(true)
    setError('')
    try {
      const item: Expense = { ...initial, ...form, accountId: form.accountId || undefined, paymentMethod: form.paymentMethod || undefined, id: initial?.id ?? uid(), amount: form.amount, description: form.description.trim(), deliveryShiftId: form.deliveryShiftId || undefined, deliveryCostKind: form.deliveryShiftId && form.deliveryCostKind ? form.deliveryCostKind : undefined, createdAt: initial?.createdAt ?? new Date().toISOString() }
      if (await onSave(item)) { if (!initial) setForm({ ...form, description: '', amount: null, note: '' }); else onCancel?.() }
      else setError('A despesa não foi salva. Confira os dados e tente novamente.')
    } finally { setSaving(false) }
  }
  return <form className="form-card" aria-label="Registro de despesa" onSubmit={submit}>
    <h2>{initial ? 'Editar despesa' : 'Nova despesa'}</h2>
    <div className="form-grid"><Field label="Data"><input type="date" required value={form.localDate} onChange={(event) => setForm({ ...form, localDate: event.target.value })} /></Field><Field label="Categoria"><select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as Expense['category'] })}>{expenseCategories.map((item) => <option key={item}>{item}</option>)}</select></Field></div>
    <Field label="Descrição"><input required maxLength={1000} pattern=".*\S.*" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Ex.: mercado" /></Field>
    <Field label="Valor (R$)"><MoneyInput required value={form.amount} onChange={(amount) => setForm({ ...form, amount })} /></Field>
    <PaymentMethodField value={form.paymentMethod} onChange={(paymentMethod) => setForm({ ...form, paymentMethod })} />
    <DeliveryAssociation shifts={shifts} value={form.deliveryShiftId} onChange={(deliveryShiftId) => setForm({ ...form, deliveryShiftId, deliveryCostKind: deliveryShiftId ? form.deliveryCostKind : '' })} />
    {form.deliveryShiftId && <DeliveryCostField value={form.deliveryCostKind} onChange={(deliveryCostKind) => setForm({ ...form, deliveryCostKind })} />}
    {accounts.length > 0 && <AccountField accounts={accounts} value={form.accountId} onChange={accountId => setForm({ ...form, accountId })} />}
    <Field label="Observação"><textarea maxLength={5000} value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></Field>
    {error && <p className="warning-text" role="alert">{error}</p>}
    <button className="primary-button" disabled={saving}>{saving ? 'Salvando despesa…' : initial ? 'Salvar alterações' : 'Salvar despesa'}</button>
    {initial && <button className="text-button" type="button" disabled={saving} onClick={onCancel}>Cancelar edição</button>}
  </form>
}

export function FinancialRecordForm({ accounts = [], today, shifts, initial, onSave, onCancel }: { accounts?: readonly AssetAccount[], today: string, shifts: readonly DeliveryShift[], initial?: FinancialRecord, onSave: (item: FinancialRecord) => Promise<boolean>, onCancel: () => void }) {
  const [form, setForm] = useState({ localDate: initial?.localDate ?? today, description: initial?.description ?? '', category: initial?.category ?? 'Outros' as FinancialRecord['category'], type: initial?.type ?? 'entrada' as FinancialType, liabilityAccountId: initial?.liabilityAccountId ?? '', amount: initial?.amount ?? null as number | null, paymentMethod: initial?.paymentMethod ?? '' as PaymentMethod | '', deliveryShiftId: initial?.deliveryShiftId ?? '', deliveryCostKind: initial?.deliveryCostKind ?? '' as DeliveryCostKind | '', note: initial?.note ?? '', accountId: initial?.accountId ?? '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving || form.amount === null) return
    setSaving(true)
    setError('')
    try {
      const item: FinancialRecord = { ...initial, ...form, updatedAt: new Date().toISOString(), accountId: form.accountId || undefined, paymentMethod: form.paymentMethod || undefined, liabilityAccountId: form.type === 'saida' || form.type === 'pendencia' ? form.liabilityAccountId || undefined : undefined, id: initial?.id ?? uid(), amount: form.amount, description: form.description.trim(), deliveryShiftId: form.deliveryShiftId || undefined, deliveryCostKind: form.deliveryShiftId && form.deliveryCostKind ? form.deliveryCostKind : undefined, createdAt: initial?.createdAt ?? new Date().toISOString() }
      if (await onSave(item)) { if (!initial) setForm({ ...form, description: '', amount: null, note: '' }); else onCancel() }
      else setError('A movimentação não foi salva. Confira os dados e tente novamente.')
    } finally { setSaving(false) }
  }
  const hint = form.type === 'credito' ? 'Valor a receber. Não altera o saldo até o recebimento.' : form.type === 'pendencia' ? 'Valor a pagar. Não altera o saldo até o pagamento.' : form.type === 'entrada' ? 'Use a data em que o dinheiro foi recebido.' : 'Use a data em que o dinheiro foi pago.'
  return <form className="form-card" aria-label="Movimentação financeira" onSubmit={submit}>
    <h2>{initial ? 'Editar movimentação' : 'Nova movimentação'}</h2>
    <p className="section-description">Registre aqui outras receitas, gastos e valores em aberto.</p>
    <div className="form-grid"><Field label="Tipo"><select disabled={!!initial?.planningRef} value={form.type} onChange={(event) => { const type = event.target.value as FinancialType; setForm({ ...form, type, deliveryShiftId: type === 'saida' || type === 'pendencia' ? form.deliveryShiftId : '' }) }}>{Object.entries(financialTypeLabels).map(([type, label]) => <option key={type} value={type}>{label}</option>)}</select></Field><Field label="Data"><input type="date" required value={form.localDate} onChange={(event) => setForm({ ...form, localDate: event.target.value })} /></Field></div>
    <p className="fine-print">{hint} Para valores em aberto, a data é o vencimento previsto.</p>
    <Field label="Descrição"><input required maxLength={1000} pattern=".*\S.*" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Ex.: salário, conta de luz" /></Field>
    <div className="form-grid"><Field label="Categoria"><select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as FinancialRecord['category'] })}>{expenseCategories.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Valor (R$)"><MoneyInput required disabled={!!initial?.planningRef} value={form.amount} onChange={(amount) => setForm({ ...form, amount })} /></Field></div>
    <PaymentMethodField value={form.paymentMethod} onChange={(paymentMethod) => setForm({ ...form, paymentMethod })} />
    {(form.type === 'saida' || form.type === 'pendencia') && <DeliveryAssociation shifts={shifts} value={form.deliveryShiftId} onChange={(deliveryShiftId) => setForm({ ...form, deliveryShiftId, deliveryCostKind: deliveryShiftId ? form.deliveryCostKind : '' })} />}
    {form.deliveryShiftId && (form.type === 'saida' || form.type === 'pendencia') && <DeliveryCostField value={form.deliveryCostKind} onChange={(deliveryCostKind) => setForm({ ...form, deliveryCostKind })} />}
    {accounts.length > 0 && <AccountField accounts={accounts} value={form.accountId} onChange={accountId => setForm({ ...form, accountId })} />}
    {accounts.some(a => a.kind === 'liability') && (form.type === 'saida' || form.type === 'pendencia') && <AccountField accounts={accounts} value={form.liabilityAccountId} liability label="Dívida a reduzir após pagamento" onChange={liabilityAccountId => setForm({ ...form, liabilityAccountId })} />}
    <Field label="Observação"><textarea maxLength={5000} value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></Field>
    {error && <p className="warning-text" role="alert">{error}</p>}
    <button className="primary-button" disabled={saving}>{saving ? 'Salvando…' : initial ? 'Salvar alterações' : 'Salvar movimentação'}</button>
    {initial && <button type="button" className="text-button" disabled={saving} onClick={onCancel}>Cancelar edição</button>}
  </form>
}
