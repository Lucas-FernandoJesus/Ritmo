import { useEffect, useState } from 'react'
import type { DailyCheckIn, DailyCompletion, DailyProgressSummary, RoutineItem, RoutineMode, WeeklyProgressSummary } from '../../../core/types'
import { WeeklyProgressCard } from '../../../components/WeeklyProgressCard'
import { areaLabels, modeCopy } from '../view-labels'

export function TodayView({ now, items, mode, modeSaving, onMode, states, savingIds, dateKey, checkIn, safety, weeklySummary, todaySummary, onCheckIn, onToggle, onSkip, onOpen }: { now: Date; items: RoutineItem[]; mode: RoutineMode; modeSaving: boolean; onMode: (mode: RoutineMode) => void; states: Map<string, DailyCompletion['state']>; savingIds: string[]; dateKey: string; checkIn: DailyCheckIn | null; safety: { allowed: boolean; reason: string }; weeklySummary: WeeklyProgressSummary; todaySummary: DailyProgressSummary; onCheckIn: (item: DailyCheckIn) => Promise<boolean>; onToggle: (id: string) => void; onSkip: (id: string) => void; onOpen: (item: RoutineItem) => void }) {
  const [checkInDirty, setCheckInDirty] = useState(false)
  const effectiveSafety = checkInDirty ? { allowed: false, reason: 'Salve a checagem atualizada antes de decidir pilotar.' } : safety
  const formattedDate = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(now)
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const pending = items.filter((item) => !states.has(item.id))
  const focus = pending.find((item) => item.startTime && item.startTime <= currentTime && (!item.endTime || item.endTime >= currentTime))
    ?? pending.find((item) => item.startTime && item.startTime > currentTime)
    ?? pending[0]
  const focusIsNow = !!focus?.startTime && focus.startTime <= currentTime && (!focus.endTime || focus.endTime >= currentTime)
  const focusIsPast = !!focus?.endTime && focus.endTime < currentTime
  const done = items.filter((item) => states.get(item.id) === 'done').length
  const deliveryToday = items.some((item) => item.area === 'delivery')
  return <>
    <header className="today-header">
      <p className="date-line">{formattedDate}</p>
      <h1>Um dia de cada vez.</h1>
      <p>Escolha o ritmo que faz sentido hoje.</p>
    </header>

    <section className="rhythm-section" aria-labelledby="rhythm-heading">
      <div className="section-heading"><h2 id="rhythm-heading">Seu ritmo hoje</h2><span className="quiet-note">Você pode mudar</span></div>
      <div className="mode-switch" role="group" aria-label="Intensidade da rotina">
        {(Object.keys(modeCopy) as RoutineMode[]).map((key) => <button key={key} type="button" onClick={() => onMode(key)} disabled={modeSaving} aria-pressed={mode === key} className={mode === key ? 'selected' : ''}><strong>{modeCopy[key].label}</strong><span>{modeCopy[key].detail}</span></button>)}
      </div>
    </section>

    <WeeklyProgressCard summary={weeklySummary} today={todaySummary} />

    <section className="focus-section" aria-labelledby="focus-heading">
      <div className="section-heading"><h2 id="focus-heading">{focus ? focusIsNow ? 'Agora' : focusIsPast ? 'Ainda em aberto' : focus.startTime ? 'Seu próximo compromisso' : 'Para quando couber' : 'Por enquanto, tudo certo'}</h2><span className="quiet-note">{done} de {items.length} concluídas</span></div>
      {focus ? <ActivityItem item={focus} state={states.get(focus.id)} saving={savingIds.includes(`${dateKey}:${focus.id}`)} blocked={focus.area === 'delivery' && !effectiveSafety.allowed} safetyReason={effectiveSafety.reason} onToggle={onToggle} onSkip={onSkip} onOpen={onOpen} featured /> : <div className="focus-empty"><strong>Há espaço para seguir no seu tempo.</strong><p>{items.length ? 'As atividades de hoje já foram concluídas ou deixadas para outro momento.' : 'Não há atividades previstas neste ritmo.'}</p></div>}
    </section>

    <CheckInCard dateKey={dateKey} value={checkIn} safety={safety} deliveryToday={deliveryToday} onSave={onCheckIn} onDirtyChange={setCheckInDirty} />

    <section className="section-block" aria-labelledby="timeline-heading">
      <div className="section-heading"><div><h2 id="timeline-heading">Ao longo do dia</h2><p className="section-description">Horários são referências, não cobranças.</p></div><span className="count-chip">{items.length} atividades</span></div>
      {items.length === 0 ? <div className="empty-state"><strong>Sem atividades previstas.</strong><p>Use este espaço para descansar ou cuidar do essencial.</p></div> : <div className="timeline">
        {items.filter((item) => item.id !== focus?.id).map((item) => <ActivityItem key={item.id} item={item} state={states.get(item.id)} saving={savingIds.includes(`${dateKey}:${item.id}`)} blocked={item.area === 'delivery' && !effectiveSafety.allowed} safetyReason={effectiveSafety.reason} onToggle={onToggle} onSkip={onSkip} onOpen={onOpen} />)}
      </div>}
    </section>
  </>
}

function ActivityItem({ item, state, saving, blocked, safetyReason, onToggle, onSkip, onOpen, featured = false }: { item: RoutineItem; state?: DailyCompletion['state']; saving: boolean; blocked: boolean; safetyReason: string; onToggle: (id: string) => void; onSkip: (id: string) => void; onOpen: (item: RoutineItem) => void; featured?: boolean }) {
  const openLabel = item.area === 'treino' ? 'Abrir treino' : 'Ver orientações'
  return <article className={`task-card ${featured ? 'featured' : ''} ${state === 'done' ? 'done' : ''} ${state === 'skipped' ? 'skipped' : ''} ${blocked ? 'blocked' : ''}`}>
    <button type="button" className="task-open" onClick={() => onOpen(item)} aria-label={`${openLabel}: ${item.title}`}>
      <span className="task-time"><strong>{item.startTime ?? 'Livre'}</strong>{item.endTime && <span>até {item.endTime}</span>}</span>
      <span className="task-body"><span className={`area-tag area-${item.area}`}>{areaLabels[item.area]}</span><span className="task-title" role="heading" aria-level={3}>{item.title}</span>{state && <span className="task-status">{state === 'done' ? 'Concluída' : 'Deixada para outro momento'}</span>}{item.conditions?.[0] && !state && <span className="task-description">{item.conditions[0]}</span>}{blocked && !state && <span className="warning-text">{safetyReason}</span>}<span className="task-detail-link">{openLabel}</span></span>
    </button>
    <div className="task-actions"><button type="button" className="check-button" onClick={() => onToggle(item.id)} disabled={(blocked && state !== 'done') || saving} aria-label={`${state === 'done' ? 'Desmarcar' : 'Concluir'} ${item.title}`} aria-pressed={state === 'done'}>{saving ? '…' : state === 'done' ? '✓' : ''}</button><button type="button" className="skip-button" onClick={() => onSkip(item.id)} disabled={saving} aria-pressed={state === 'skipped'}>{state === 'skipped' ? 'Retomar' : 'Pular'}</button></div>
  </article>
}

function CheckInCard({ dateKey, value, safety, deliveryToday, onSave, onDirtyChange }: { dateKey: string; value: DailyCheckIn | null; safety: { allowed: boolean; reason: string }; deliveryToday: boolean; onSave: (value: DailyCheckIn) => Promise<boolean>; onDirtyChange: (dirty: boolean) => void }) {
  const [form, setForm] = useState<DailyCheckIn>(value ?? { localDate: dateKey, enoughSleep: null, fatigueLevel: null, armCondition: null, safeToRide: null, note: '' })
  const [saving, setSaving] = useState(false)
  const changed = !!value && JSON.stringify(form) !== JSON.stringify(value)
  useEffect(() => { onDirtyChange(changed) }, [changed, onDirtyChange])
  const set = <K extends keyof DailyCheckIn>(key: K, fieldValue: DailyCheckIn[K]) => setForm((current) => ({ ...current, [key]: fieldValue }))
  async function save() { if (saving) return; setSaving(true); try { await onSave(form) } finally { setSaving(false) } }
  return <details className="checkin-card" open={deliveryToday && !value}>
    <summary><div><span className="pulse-dot" />Checagem rápida</div><span>{value ? 'Atualizar' : '2 minutos'}</span></summary>
    <div className="checkin-content">
      <p>Uma pausa para observar como você está. Isso não substitui avaliação profissional.</p>
      <div className="check-grid">
        <fieldset><legend>Dormiu o suficiente?</legend><div className="choice-row"><Choice active={form.enoughSleep === true} onClick={() => set('enoughSleep', true)}>Sim</Choice><Choice active={form.enoughSleep === false} onClick={() => set('enoughSleep', false)}>Não</Choice></div></fieldset>
        <fieldset><legend>Nível de cansaço</legend><select value={form.fatigueLevel ?? ''} onChange={(e) => set('fatigueLevel', e.target.value === '' ? null : Number(e.target.value) as 0 | 1 | 2 | 3)}><option value="">Selecione</option><option value="0">Bem disposto</option><option value="1">Leve</option><option value="2">Cansado</option><option value="3">Muito cansado</option></select></fieldset>
        <fieldset><legend>Como está o braço?</legend><select value={form.armCondition ?? ''} onChange={(e) => set('armCondition', (e.target.value || null) as DailyCheckIn['armCondition'])}><option value="">Selecione</option><option value="habitual">Condição habitual</option><option value="alterado">Força ou sensibilidade alterada</option><option value="dor">Dor maior que a habitual</option></select></fieldset>
        <fieldset><legend>Consegue manobrar e frear com segurança?</legend><div className="choice-row"><Choice active={form.safeToRide === true} onClick={() => set('safeToRide', true)}>Sim</Choice><Choice active={form.safeToRide === false} onClick={() => set('safeToRide', false)}>Não</Choice></div></fieldset>
      </div>
      <label>Observação opcional<textarea value={form.note ?? ''} onChange={(e) => set('note', e.target.value)} placeholder="Algo importante para lembrar?" /></label>
      <div className={`safety-result ${value && !changed && safety.allowed ? 'safe' : ''}`}><strong>{changed ? 'Alterações não salvas' : !value ? 'Checagem pendente' : safety.allowed ? 'Checagem salva: favorável' : 'Checagem salva: atenção'}</strong><span>{changed ? 'Salve novamente para atualizar a orientação e a situação do delivery.' : value ? safety.reason : 'Salve a checagem para ver a orientação de hoje.'}</span></div>
      <button className="primary-button" type="button" disabled={saving} onClick={save}>{saving ? 'Salvando checagem…' : 'Salvar checagem'}</button>
    </div>
  </details>
}

function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) { return <button type="button" className={active ? 'choice active' : 'choice'} aria-pressed={active} onClick={onClick}>{children}</button> }
