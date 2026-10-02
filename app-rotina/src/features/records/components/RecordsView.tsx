import { useEffect, useMemo, useRef, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import { calculateDelivery, formatMoney, paymentMethodLabel, recentRecords, shiftDuration } from '../../../core/domain'
import type { AssetAccount, DeliveryShift, Expense, FinancialRecord, PaymentMethod, StudyLog } from '../../../core/types'
import { Field, PageTitle } from '../../../components/FormPrimitives'
import { MoneyInput } from '../../../components/MoneyInput'
import { deliveryFinancials } from '../../finance/finance'
import { AccountField } from '../../finance/components/FinanceSchedules'
import { PaymentMethodField } from '../../finance/components/PaymentMethodField'

export type RecordKind = 'delivery' | 'estudo'
export type DeliverySelection = { id?: string; revision: number }

const uid = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`

function useRecordDate<T extends { localDate: string }>(dateKey: string, setForm: Dispatch<SetStateAction<T>>, preserveDate = false) {
  const previousDate = useRef(dateKey)
  useEffect(() => {
    if (previousDate.current === dateKey) return
    const oldDate = previousDate.current
    previousDate.current = dateKey
    if (!preserveDate) setForm((form) => form.localDate === oldDate ? { ...form, localDate: dateKey } : form)
  }, [dateKey, setForm, preserveDate])
}

export function RecordsView({ accounts, deliverySelection, kind, onKind, onExpenseRegistration, dateKey, shifts, expenses, financialRecords, studyLogs, onShift, onStudy }: { accounts: readonly AssetAccount[]; deliverySelection: DeliverySelection; kind: RecordKind; onKind: (kind: RecordKind) => void; onExpenseRegistration: () => void; dateKey: string; shifts: DeliveryShift[]; expenses: Expense[]; financialRecords: FinancialRecord[]; studyLogs: StudyLog[]; onShift: (item: DeliveryShift) => Promise<boolean>; onStudy: (item: StudyLog) => Promise<boolean> }) {
  return <>
    <PageTitle eyebrow="Acompanhar sem culpa" title="Registros" subtitle="Registre seus turnos de delivery e sessões de estudo. Despesas são registradas no Financeiro." />
    <div className="subnav" role="group" aria-label="Tipo de registro">
      {([['delivery', 'Delivery'], ['estudo', 'Estudos']] as const).map(([id, label]) => <button key={id} type="button" aria-pressed={kind === id} className={kind === id ? 'active' : ''} onClick={() => onKind(id)}>{label}</button>)}
      <button type="button" onClick={onExpenseRegistration}>Despesas</button>
    </div>
    <div hidden={kind !== 'delivery'}><DeliveryRecord accounts={accounts} key={deliverySelection.revision} initial={shifts.find((shift) => shift.id === deliverySelection.id)} dateKey={dateKey} shifts={shifts} expenses={expenses} financialRecords={financialRecords} onSave={onShift} /></div>
    <div hidden={kind !== 'estudo'}><StudyRecord dateKey={dateKey} logs={studyLogs} onSave={onStudy} /></div>
  </>
}

function deliveryForm(item: DeliveryShift | undefined, dateKey: string) {
  return { localDate: item?.localDate ?? dateKey, startTime: item?.startTime ?? '', endTime: item?.endTime ?? '', kilometers: item?.kilometers == null ? '' : String(item.kilometers), grossRevenue: item?.grossRevenue ?? null, fuelCost: item?.fuelCost ?? null, maintenanceReserve: item?.maintenanceReserve ?? null, otherExpenses: item?.otherExpenses ?? null, paymentMethod: item?.paymentMethod ?? '' as PaymentMethod | '', fatigueLevel: item?.fatigueLevel == null ? '' : String(item.fatigueLevel), armCondition: item?.armCondition ?? '', accountId: item?.accountId ?? '', note: item?.note ?? '' }
}

function DeliveryRecord({ accounts, initial, dateKey, shifts, expenses, financialRecords, onSave }: { accounts: readonly AssetAccount[]; initial?: DeliveryShift; dateKey: string; shifts: DeliveryShift[]; expenses: Expense[]; financialRecords: FinancialRecord[]; onSave: (item: DeliveryShift) => Promise<boolean> }) {
  const blank = deliveryForm(undefined, dateKey)
  const [form, setForm] = useState(() => deliveryForm(initial, dateKey))
  const [editing, setEditing] = useState<DeliveryShift | null>(initial ?? null)
  useRecordDate(dateKey, setForm, !!editing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const latestShifts = useMemo(() => recentRecords(shifts, 8), [shifts])
  const set = (key: keyof typeof blank, value: string | number | null) => setForm((current) => ({ ...current, [key]: value }))
  const hours = shiftDuration(form.startTime, form.endTime)
  const kilometers = form.kilometers === '' ? null : Number(form.kilometers)
  const calculation = calculateDelivery({ ...form, hours, kilometers })
  const preview: DeliveryShift = { ...form, accountId: form.accountId || undefined, paymentMethod: form.paymentMethod || undefined, id: editing?.id ?? 'new', hours, kilometers, ...calculation, fatigueLevel: form.fatigueLevel === '' ? null : Number(form.fatigueLevel) as 0 | 1 | 2 | 3, armCondition: (form.armCondition || null) as DeliveryShift['armCondition'], createdAt: editing?.createdAt ?? new Date().toISOString() }
  const display = deliveryFinancials(preview, expenses, financialRecords, dateKey)
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError('')
    try {
      if (await onSave({ ...preview, id: editing?.id ?? uid() })) { setForm(blank); setEditing(null) }
      else setError('O turno não foi salvo. Confira os dados e tente novamente.')
    } finally { setSaving(false) }
  }
  function edit(item: DeliveryShift) {
    setEditing(item)
    setForm(deliveryForm(item, dateKey))
    document.querySelector<HTMLFormElement>('[aria-label="Turno de delivery"]')?.scrollIntoView({ block: 'start' })
    document.querySelector<HTMLInputElement>('[aria-label="Turno de delivery"] input')?.focus()
  }
  return <div className="records-layout">
    <form className="form-card" aria-label="Turno de delivery" onSubmit={submit}>
      <h2>{editing ? 'Editar turno' : 'Novo turno'}</h2>
      <fieldset className="form-group"><legend>Período e distância</legend><div className="form-grid"><Field label="Data"><input type="date" required value={form.localDate} onChange={(e) => set('localDate', e.target.value)} /></Field><Field label="Início"><input type="time" required value={form.startTime} onChange={(e) => set('startTime', e.target.value)} /></Field><Field label="Fim"><input type="time" required value={form.endTime} onChange={(e) => set('endTime', e.target.value)} /></Field><Field label="Horas em turno"><input type="number" readOnly value={hours ?? ''} /><small>Calculadas pelo início e fim; fim anterior ao início indica o dia seguinte.</small></Field><Field label="Quilômetros"><input type="number" min="0" step="0.1" required value={form.kilometers} onChange={(e) => set('kilometers', e.target.value)} /></Field></div></fieldset>
      <fieldset className="form-group"><legend>Valores informados</legend><div className="form-grid"><Field label="Receita bruta (R$)"><MoneyInput required value={form.grossRevenue} onChange={(value) => set('grossRevenue', value)} /></Field><Field label="Combustível (R$)"><MoneyInput required value={form.fuelCost} onChange={(value) => set('fuelCost', value)} /></Field><Field label="Reserva manutenção (R$)"><MoneyInput required value={form.maintenanceReserve} onChange={(value) => set('maintenanceReserve', value)} /></Field><Field label="Outras despesas (R$)"><MoneyInput required value={form.otherExpenses} onChange={(value) => set('otherExpenses', value)} /></Field></div><p className="fine-print">Informe zero quando não houver custo. Despesas adicionais podem ser associadas em Despesas ou Financeiro; registre cada gasto uma única vez.</p></fieldset>
      <PaymentMethodField value={form.paymentMethod} onChange={(value) => set('paymentMethod', value)} />
      {accounts.length > 0 && <AccountField accounts={accounts} value={form.accountId} label="Conta do turno" onChange={value => set('accountId', value)} />}
      <fieldset className="form-group"><legend>Como foi o turno</legend><div className="form-grid"><Field label="Cansaço"><select required value={form.fatigueLevel} onChange={(e) => set('fatigueLevel', e.target.value)}><option value="">Selecione</option><option value="0">Bem disposto</option><option value="1">Leve</option><option value="2">Cansado</option><option value="3">Muito cansado</option></select></Field><Field label="Braço"><select required value={form.armCondition} onChange={(e) => set('armCondition', e.target.value)}><option value="">Selecione</option><option value="habitual">Habitual</option><option value="alterado">Alterado</option><option value="dor">Dor</option></select></Field></div><Field label="Observação"><textarea maxLength={5000} value={form.note} onChange={(e) => set('note', e.target.value)} /></Field></fieldset>
      <section className="calculation" aria-label="Valores calculados"><h3>Estimativa automática</h3><div className="result-strip"><div><span>Renda bruta</span><strong>{formatMoney(form.grossRevenue)}</strong></div><div><span>Despesas pagas</span><strong>{formatMoney(display.operationalExpenses)}</strong></div><div><span>Renda líquida operacional</span><strong>{formatMoney(display.operationalNet)}</strong></div><div><span>Reserva estimada</span><strong>{formatMoney(form.maintenanceReserve)}</strong></div><div><span>Despesas e reserva</span><strong>{formatMoney(display.expenses)}</strong></div><div><span>Renda líquida estimada</span><strong>{formatMoney(display.net)}</strong></div><div><span>Por hora</span><strong>{formatMoney(display.perHour)}</strong></div><div><span>Por km</span><strong>{formatMoney(display.perKilometer)}</strong></div></div><p className="fine-print">Resultado estimado com os custos informados, reserva e despesas vinculadas já pagas. Pendências abertas não são descontadas até o pagamento.</p><dl className="financial-metrics"><div><dt>Bruto / hora</dt><dd>{formatMoney(display.grossPerHour)}/h</dd></div><div><dt>Despesas / hora</dt><dd>{formatMoney(display.expensesPerHour)}/h</dd></div><div><dt>Líquido operacional / hora</dt><dd>{formatMoney(display.operationalNetPerHour)}/h</dd></div><div><dt>Resultado após reserva / hora</dt><dd>{formatMoney(display.perHour)}/h</dd></div></dl></section>
      {error && <p className="warning-text" role="alert">{error}</p>}
      <button className="primary-button" disabled={saving}>{saving ? 'Salvando turno…' : editing ? 'Salvar alterações do turno' : 'Salvar turno'}</button>
      {editing && <button type="button" className="text-button" disabled={saving} onClick={() => { setEditing(null); setForm(blank) }}>Cancelar edição</button>}
    </form>
    <RecordList title="Últimos turnos" empty="Nenhum turno registrado.">{latestShifts.map((item) => { const values = deliveryFinancials(item, expenses, financialRecords, dateKey); return <div className="record-row" key={item.id}><div><strong>{new Date(`${item.localDate}T12:00`).toLocaleDateString('pt-BR')}</strong><span>{item.startTime}–{item.endTime} · {values.hours ?? '—'}h · {item.kilometers ?? '—'} km</span><span>Bruta {formatMoney(item.grossRevenue)} · despesas e reserva {formatMoney(values.expenses)}</span><span>Forma de pagamento: {paymentMethodLabel(item.paymentMethod)}</span><span>Líquida estimada {formatMoney(values.net)} · {formatMoney(values.perHour)}/h</span><button type="button" className="text-button" onClick={() => edit(item)}>Editar turno</button></div><strong>{formatMoney(values.net)}</strong></div> })}</RecordList>
  </div>
}

function StudyRecord({ dateKey, logs, onSave }: { dateKey: string; logs: StudyLog[]; onSave: (item: StudyLog) => Promise<boolean> }) {
  const [form, setForm] = useState({ localDate: dateKey, area: 'Inglês', minutes: '', content: '', note: '' })
  const [editing, setEditing] = useState<StudyLog | null>(null)
  useRecordDate(dateKey, setForm, !!editing)
  const [saving, setSaving] = useState(false)
  const latestLogs = useMemo(() => recentRecords(logs, 10), [logs])
  async function submit(event: FormEvent) { event.preventDefault(); if (saving) return; const item: StudyLog = { id: editing?.id ?? uid(), localDate: form.localDate, area: form.area as StudyLog['area'], minutes: Number(form.minutes), content: form.content, note: form.note, createdAt: editing?.createdAt ?? new Date().toISOString() }; setSaving(true); try { if (await onSave(item)) { setForm({ ...form, localDate: dateKey, minutes: '', content: '', note: '' }); setEditing(null) } } finally { setSaving(false) } }
  function edit(item: StudyLog) {
    setEditing(item)
    setForm({ localDate: item.localDate, area: item.area, minutes: String(item.minutes), content: item.content, note: item.note ?? '' })
    document.querySelector<HTMLFormElement>('[aria-label="Registro de estudo"]')?.scrollIntoView({ block: 'start' })
    document.querySelector<HTMLInputElement>('[aria-label="Registro de estudo"] input')?.focus()
  }
  return <div className="records-layout"><form className="form-card" aria-label="Registro de estudo" onSubmit={submit}><h2>{editing ? 'Editar estudo ou leitura' : 'Novo estudo ou leitura'}</h2><div className="form-grid"><Field label="Data"><input type="date" required value={form.localDate} onChange={(e) => setForm({ ...form, localDate: e.target.value })} /></Field><Field label="Área"><select value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })}><option>Inglês</option><option>Programação</option><option>Leitura</option><option>Outro</option></select></Field><Field label="Minutos"><input type="number" min="1" required value={form.minutes} onChange={(e) => setForm({ ...form, minutes: e.target.value })} /></Field></div><Field label="Conteúdo"><input required value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="O que você praticou?" /></Field><Field label="Observação curta"><textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field><button className="primary-button" disabled={saving}>{saving ? 'Salvando registro…' : editing ? 'Salvar alterações do estudo' : 'Salvar registro'}</button>{editing && <button type="button" className="text-button" disabled={saving} onClick={() => { setEditing(null); setForm({ localDate: dateKey, area: 'Inglês', minutes: '', content: '', note: '' }) }}>Cancelar edição</button>}</form><RecordList title="Atividades recentes" empty="Nenhum estudo registrado.">{latestLogs.map((item) => <div className="record-row" key={item.id}><div><strong>{item.area}: {item.content}</strong><span>{item.minutes} min · {new Date(`${item.localDate}T12:00`).toLocaleDateString('pt-BR')}</span><button type="button" className="text-button" onClick={() => edit(item)}>Editar estudo</button></div></div>)}</RecordList></div>
}

function RecordList({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) { const hasChildren = Array.isArray(children) ? children.length > 0 : !!children; return <section className="record-list"><h2>{title}</h2>{hasChildren ? children : <div className="empty-state"><p>{empty}</p></div>}</section> }
