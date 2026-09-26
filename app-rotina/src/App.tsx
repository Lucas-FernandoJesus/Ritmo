import { useEffect, useMemo, useRef, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import { activityGuides } from './activity-guides'
import { getExerciseDemo } from './exercise-demos'
import { dayNames, expenseCategories, homeChecklist, mealPrepChecklist, progressPlan, routineItems } from './data'
import { calculateDelivery, createDailyPlanSnapshot, defaultSettings, filterRoutineForDay, findLinkedActivityId, formatMoney, localDateKey, MAX_BACKUP_BYTES, recentRecords, rideSafetyForDate, summarizeDailyProgress, summarizePlanProgress, summarizeWeeklyProgress, upgradeAppearance, validateBackup, weekBounds, withScheduleStart } from './domain'
import { repository } from './repository'
import { clampTrainingWeek, getStrengthSession, getTrainingActivityGuide, getTrainingPlanWeek, trainingBlocks, type TrainingDay } from './training-plan'
import type { AppSettings, DailyCheckIn, DailyCompletion, DailyPlanSnapshot, DailyProgressSummary, DeliveryShift, Expense, RoutineArea, RoutineItem, RoutineMode, StoragePersistence, StudyLog, ThirtyDayProgress, WeeklyProgressSummary } from './types'

type Tab = 'hoje' | 'semana' | 'registros' | 'progresso' | 'ajustes'
type RecordKind = 'delivery' | 'despesa' | 'estudo' | 'checklists'
type ActivitySelection = { item: RoutineItem; day: number }
type LinkableRecord = { kind: 'study', area: StudyLog['area'] } | { kind: 'delivery', startTime: string, endTime: string } | { kind: 'expense' }

const areaLabels: Record<RoutineArea, string> = {
  sono: 'Sono', saude: 'Bem-estar', trabalho: 'Trabalho', treino: 'Treino', alimentacao: 'Alimentação', casa: 'Casa', estudos: 'Estudos', financas: 'Finanças', delivery: 'Delivery', lazer: 'Tempo livre',
}

const modeCopy: Record<RoutineMode, { label: string; detail: string }> = {
  normal: { label: 'Normal', detail: 'Rotina completa' },
  reduzido: { label: 'Reduzido', detail: 'Só o sustentável' },
  minimo: { label: 'Mínimo', detail: 'Essencial e descanso' },
}

const navItems: { id: Tab; label: string }[] = [
  { id: 'hoje', label: 'Hoje' },
  { id: 'semana', label: 'Semana' },
  { id: 'registros', label: 'Registros' },
  { id: 'progresso', label: 'Progresso' },
  { id: 'ajustes', label: 'Ajustes' },
]

function Icon({ name }: { name: Tab }) {
  const paths: Record<Tab, React.ReactNode> = {
    hoje: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    semana: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18" /></>,
    registros: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
    progresso: <><path d="M4 19V5M4 19h16M7 15l4-4 3 2 5-6" /></>,
    ajustes: <><path d="M4 7h16M4 17h16" /><circle cx="9" cy="7" r="2" /><circle cx="16" cy="17" r="2" /></>,
  }
  return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

const uid = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
const readableError = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback
const workoutFromUrl = (): TrainingDay | null => {
  const value = new URLSearchParams(window.location.search).get('treino')
  return value === 'A' || value === 'B' ? value : null
}

function weekDateKeys(localDate: string): string[] {
  const { weekStart } = weekBounds(localDate)
  const start = new Date(`${weekStart}T12:00:00`)
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return localDateKey(date)
  })
}

function prepareWeekSnapshots(existing: DailyPlanSnapshot[], localDate: string, mode: RoutineMode, settings: AppSettings, replaceFrom?: string) {
  const byDate = new Map(existing.map((snapshot) => [snapshot.localDate, snapshot]))
  const changed: DailyPlanSnapshot[] = []
  for (const date of weekDateKeys(localDate)) {
    if (byDate.has(date) && (!replaceFrom || date < replaceFrom)) continue
    const snapshot = createDailyPlanSnapshot(date, mode, routineItems, settings)
    byDate.set(date, snapshot)
    changed.push(snapshot)
  }
  return { all: [...byDate.values()], changed }
}

function useRecordDate<T extends { localDate: string }>(dateKey: string, setForm: Dispatch<SetStateAction<T>>) {
  const previousDate = useRef(dateKey)
  useEffect(() => {
    if (previousDate.current === dateKey) return
    const oldDate = previousDate.current
    previousDate.current = dateKey
    setForm((form) => form.localDate === oldDate ? { ...form, localDate: dateKey } : form)
  }, [dateKey, setForm])
}

function App() {
  const [now, setNow] = useState(() => new Date())
  const dateKey = localDateKey(now)
  const [tab, setTab] = useState<Tab>('hoje')
  const [trainingDay, setTrainingDay] = useState<TrainingDay | null>(workoutFromUrl)
  const [detailActivity, setDetailActivity] = useState<ActivitySelection | null>(null)
  const [mode, setMode] = useState<RoutineMode>('normal')
  const [modeSaving, setModeSaving] = useState(false)
  const [settings, setSettings] = useState<AppSettings>(defaultSettings())
  const [completions, setCompletions] = useState<DailyCompletion[]>([])
  const [dailySnapshots, setDailySnapshots] = useState<DailyPlanSnapshot[]>([])
  const [checkIn, setCheckIn] = useState<DailyCheckIn | null>(null)
  const [deliveryShifts, setDeliveryShifts] = useState<DeliveryShift[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [studyLogs, setStudyLogs] = useState<StudyLog[]>([])
  const [progress, setProgress] = useState<ThirtyDayProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [savingIds, setSavingIds] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [online, setOnline] = useState(navigator.onLine)
  const [storagePersistence, setStoragePersistence] = useState<StoragePersistence>('checking')

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const appearance = settings.theme ?? 'dark'
    const preference = window.matchMedia('(prefers-color-scheme: light)')
    const update = () => {
      document.documentElement.dataset.theme = appearance
      const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
      if (themeColor) themeColor.content = appearance === 'light' || (appearance === 'system' && preference.matches) ? '#f9f5ed' : '#12100f'
    }
    update()
    preference.addEventListener('change', update)
    return () => preference.removeEventListener('change', update)
  }, [settings.theme])

  useEffect(() => {
    let active = true
    async function load() {
      try {
        await repository.initialize()
        const [loadedSettings, loadedCompletions, loadedSnapshots, loadedCheckIn, shifts, loadedExpenses, logs, loadedProgress] = await Promise.all([
          repository.getSettings(), repository.getCompletions(), repository.getDailySnapshots(), repository.getCheckIn(dateKey), repository.getDeliveryShifts(), repository.getExpenses(), repository.getStudyLogs(), repository.getProgress(),
        ])
        if (!active) return
        const nextSettings = upgradeAppearance(loadedSettings)
        if (nextSettings !== loadedSettings) {
          try { await repository.saveSettings(nextSettings) }
          catch { if (active) setMessage('A nova aparência está ativa, mas não foi possível salvar a preferência.') }
        }
        if (!active) return
        const snapshotPlan = prepareWeekSnapshots(loadedSnapshots, dateKey, nextSettings.preferredMode, nextSettings)
        await Promise.all(snapshotPlan.changed.map((snapshot) => repository.saveDailySnapshot(snapshot)))
        if (!active) return
        setSettings(nextSettings)
        setMode(nextSettings.preferredMode)
        setCompletions(loadedCompletions)
        setDailySnapshots(snapshotPlan.all)
        setCheckIn(loadedCheckIn ?? null)
        setDeliveryShifts(shifts)
        setExpenses(loadedExpenses)
        setStudyLogs(logs)
        setProgress(loadedProgress)
      } catch {
        if (active) setLoadError(true)
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [dateKey])

  useEffect(() => {
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline) }
  }, [])

  useEffect(() => {
    const onPopState = () => setTrainingDay(workoutFromUrl())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    async function requestPersistence() {
      if (!navigator.storage?.persist || !navigator.storage?.persisted) return setStoragePersistence('unsupported')
      try {
        const already = await navigator.storage.persisted()
        const granted = already || await navigator.storage.persist()
        setStoragePersistence(granted ? 'granted' : 'not-granted')
      } catch { setStoragePersistence('not-granted') }
    }
    requestPersistence()
  }, [])

  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => setMessage(''), 5000)
    return () => window.clearTimeout(timer)
  }, [message])

  const todayItems = useMemo(() => filterRoutineForDay(routineItems, now.getDay(), mode, settings), [now, mode, settings])
  const todayStates = new Map(completions.filter((item) => item.localDate === dateKey).map((item) => [item.routineItemId, item.state]))
  const todayCompleted = new Set([...todayStates].filter(([, state]) => state === 'done').map(([id]) => id))
  const todayCheckIn = checkIn?.localDate === dateKey ? checkIn : null
  const safety = rideSafetyForDate(checkIn, dateKey)
  const weeklySummary = useMemo(() => summarizeWeeklyProgress(dateKey, dailySnapshots, completions), [dateKey, dailySnapshots, completions])
  const todaySnapshot = dailySnapshots.find((snapshot) => snapshot.localDate === dateKey)
  const todaySummary = useMemo<DailyProgressSummary>(() => todaySnapshot
    ? summarizeDailyProgress(todaySnapshot, completions)
    : { planned: false, completed: false, requiredCount: 0, completedRequiredCount: 0 }, [todaySnapshot, completions])

  async function setCompletionForDate(localDate: string, itemId: string, nextState: 'done' | 'skipped' | null) {
    const id = `${localDate}:${itemId}`
    if (savingIds.includes(id)) return
    setSavingIds((current) => [...current, id])
    try {
      if (nextState === null) {
        await repository.deleteCompletion(id)
        setCompletions((current) => current.filter((item) => item.id !== id))
      } else {
        const completion: DailyCompletion = { id, localDate, routineItemId: itemId, state: nextState, changedAt: new Date().toISOString() }
        await repository.saveCompletion(completion)
        setCompletions((current) => [...current.filter((item) => item.id !== id), completion])
      }
    } catch { setMessage('A alteração não foi gravada. Nada mudou; tente novamente.') }
    finally { setSavingIds((current) => current.filter((value) => value !== id)) }
  }

  function toggleCompletion(itemId: string) { return setCompletionForDate(dateKey, itemId, todayCompleted.has(itemId) ? null : 'done') }
  function toggleSkipped(itemId: string) { return setCompletionForDate(dateKey, itemId, todayStates.get(itemId) === 'skipped' ? null : 'skipped') }

  async function ensureSnapshot(localDate: string): Promise<DailyPlanSnapshot> {
    const existing = dailySnapshots.find((snapshot) => snapshot.localDate === localDate)
    if (existing) return existing
    const snapshot = createDailyPlanSnapshot(localDate, mode, routineItems, settings)
    await repository.saveDailySnapshot(snapshot)
    setDailySnapshots((current) => [...current.filter((item) => item.id !== snapshot.id), snapshot])
    return snapshot
  }

  async function offerLinkedCompletion(localDate: string, record: LinkableRecord) {
    const snapshot = await ensureSnapshot(localDate)
    const routineItemId = findLinkedActivityId(snapshot, record)
    if (!routineItemId || completions.some((item) => item.id === `${localDate}:${routineItemId}` && item.state === 'done')) return
    const activity = snapshot.activities.find((item) => item.routineItemId === routineItemId)
    if (!activity) return
    const formattedDate = new Date(`${localDate}T12:00:00`).toLocaleDateString('pt-BR')
    if (window.confirm(`Registro salvo. Marcar “${activity.title}” como concluída em ${formattedDate}?`)) {
      await setCompletionForDate(localDate, routineItemId, 'done')
    }
  }

  async function saveLinkedStudy(item: StudyLog) {
    try {
      await repository.saveStudyLog(item)
      setStudyLogs((current) => [item, ...current])
      setMessage('Estudo registrado.')
      await offerLinkedCompletion(item.localDate, { kind: 'study', area: item.area })
      return true
    } catch (error) { setMessage(readableError(error, 'Não foi possível salvar o estudo.')); return false }
  }

  async function saveLinkedExpense(item: Expense) {
    try {
      await repository.saveExpense(item)
      setExpenses((current) => [item, ...current])
      setMessage('Despesa salva.')
      await offerLinkedCompletion(item.localDate, { kind: 'expense' })
      return true
    } catch (error) { setMessage(readableError(error, 'Não foi possível salvar a despesa.')); return false }
  }

  async function saveLinkedShift(item: DeliveryShift) {
    try {
      await repository.saveDeliveryShift(item)
      setDeliveryShifts((current) => [item, ...current])
      setMessage('Turno salvo. O resultado é estimado com os custos informados.')
      await offerLinkedCompletion(item.localDate, { kind: 'delivery', startTime: item.startTime, endTime: item.endTime })
      return true
    } catch (error) { setMessage(readableError(error, 'Não foi possível salvar o turno.')); return false }
  }

  async function changeMode(next: RoutineMode) {
    if (modeSaving || next === mode) return
    setModeSaving(true)
    const nextSettings = { ...settings, preferredMode: next }
    const snapshotPlan = prepareWeekSnapshots(dailySnapshots, dateKey, next, nextSettings, dateKey)
    try { await repository.saveSettingsAndDailySnapshots(nextSettings, snapshotPlan.changed); setSettings(nextSettings); setMode(next); setDailySnapshots(snapshotPlan.all) }
    catch { setMessage('Não foi possível salvar o modo. Tente novamente.') }
    finally { setModeSaving(false) }
  }

  async function changeTrainingWeek(next: number, successMessage: string) {
    const trainingWeek = clampTrainingWeek(next)
    const nextSettings = { ...settings, trainingWeek }
    try {
      await repository.saveSettings(nextSettings)
      setSettings(nextSettings)
      setMessage(successMessage)
    } catch { setMessage('Não foi possível salvar a semana do treino. Tente novamente.') }
  }

  async function saveCheckIn(next: DailyCheckIn) {
    try { await repository.saveCheckIn(next); setCheckIn(next); setMessage('Checagem salva neste aparelho.'); return true }
    catch { setMessage('Não foi possível salvar a checagem. Tente novamente.'); return false }
  }

  function focusContent() {
    window.scrollTo({ top: 0, behavior: 'instant' })
    window.requestAnimationFrame(() => document.getElementById('main-content')?.focus())
  }

  function openWorkout(day: TrainingDay) {
    const url = new URL(window.location.href)
    url.searchParams.set('treino', day)
    window.history.pushState({ ...window.history.state, ritmoWorkout: true }, '', url)
    setTrainingDay(day)
    focusContent()
  }

  function closeWorkout() {
    if (window.history.state?.ritmoWorkout) {
      window.history.back()
    } else {
      const url = new URL(window.location.href)
      url.searchParams.delete('treino')
      window.history.replaceState(window.history.state, '', url)
      setTrainingDay(null)
    }
    focusContent()
  }

  function openActivity(item: RoutineItem, day: number) {
    if (item.id === 'strength') openWorkout(day === 4 ? 'B' : 'A')
    else setDetailActivity({ item, day })
  }

  function navigateTab(next: Tab) {
    if (trainingDay) {
      const url = new URL(window.location.href)
      url.searchParams.delete('treino')
      window.history.replaceState(window.history.state, '', url)
      setTrainingDay(null)
    }
    setTab(next)
    focusContent()
  }

  if (loading) return <main className="loading-state"><div className="spinner" /><p>Preparando sua rotina…</p></main>
  if (loadError) return <main className="loading-state load-error"><h1>Não foi possível abrir seus dados.</h1><p>Os registros deste aparelho não foram alterados.</p><button className="primary-button" onClick={() => window.location.reload()}>Tentar novamente</button></main>

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Ir para o conteúdo</a>
      <header className="topbar">
        <div className="brand-mark" aria-hidden="true">R</div>
        <div><strong>Ritmo</strong><span>Sua rotina, no seu tempo</span></div>
        <span className={`connection ${online ? '' : 'offline'}`}>{online ? 'Local' : 'Offline'}</span>
      </header>

      <main className="content" id="main-content" tabIndex={-1}>
        {trainingDay ? <TrainingWorkoutView day={trainingDay} trainingWeek={clampTrainingWeek(settings.trainingWeek)} mode={mode} online={online} onBack={closeWorkout} /> : <>
          {tab === 'hoje' && <TodayView key={dateKey} now={now} items={todayItems} mode={mode} modeSaving={modeSaving} onMode={changeMode} states={todayStates} savingIds={savingIds} dateKey={dateKey} checkIn={todayCheckIn} safety={safety} weeklySummary={weeklySummary} todaySummary={todaySummary} onCheckIn={saveCheckIn} onToggle={toggleCompletion} onSkip={toggleSkipped} onOpen={(item) => openActivity(item, now.getDay())} />}
          {tab === 'semana' && <WeekView settings={settings} onOpen={openActivity} />}
          {tab === 'progresso' && <ProgressView progress={progress} weeklySummary={weeklySummary} trainingWeek={clampTrainingWeek(settings.trainingWeek)} mode={mode} onTrainingWeek={changeTrainingWeek} onOpenTraining={openWorkout} onToggle={async (item) => { try { await repository.saveProgress(item); setProgress((v) => [...v.filter((p) => p.id !== item.id), item]) } catch (error) { setMessage(readableError(error, 'Não foi possível salvar o progresso.')) } }} />}
          {tab === 'ajustes' && <SettingsView settings={settings} persistence={storagePersistence} onSettings={async (next) => { const snapshotPlan = prepareWeekSnapshots(dailySnapshots, dateKey, next.preferredMode, next, dateKey); try { await repository.saveSettingsAndDailySnapshots(next, snapshotPlan.changed); setSettings(next); setMode(next.preferredMode); setDailySnapshots(snapshotPlan.all); setMessage('Ajustes salvos.') } catch (error) { setMessage(readableError(error, 'Não foi possível salvar os ajustes.')) } }} onMessage={setMessage} onImported={() => window.location.reload()} onCleared={() => window.location.reload()} />}
        </>}
        <div hidden={tab !== 'registros' || !!trainingDay}><RecordsView dateKey={dateKey} shifts={deliveryShifts} expenses={expenses} studyLogs={studyLogs} completed={todayCompleted} onToggle={toggleCompletion} onShift={saveLinkedShift} onExpense={saveLinkedExpense} onStudy={saveLinkedStudy} /></div>
      </main>

      <nav className="bottom-nav" aria-label="Navegação principal">
        {navItems.map((item) => <button key={item.id} className={!trainingDay && tab === item.id ? 'active' : ''} onClick={() => navigateTab(item.id)} aria-current={!trainingDay && tab === item.id ? 'page' : undefined}><Icon name={item.id} /><span>{item.label}</span></button>)}
      </nav>
      {message && <div className="toast" role="status">{message}</div>}
      <ActivityDetailsDialog selection={detailActivity} trainingWeek={clampTrainingWeek(settings.trainingWeek)} mode={mode} onClose={() => setDetailActivity(null)} />
    </div>
  )
}

function TodayView({ now, items, mode, modeSaving, onMode, states, savingIds, dateKey, checkIn, safety, weeklySummary, todaySummary, onCheckIn, onToggle, onSkip, onOpen }: { now: Date; items: RoutineItem[]; mode: RoutineMode; modeSaving: boolean; onMode: (mode: RoutineMode) => void; states: Map<string, DailyCompletion['state']>; savingIds: string[]; dateKey: string; checkIn: DailyCheckIn | null; safety: { allowed: boolean; reason: string }; weeklySummary: WeeklyProgressSummary; todaySummary: DailyProgressSummary; onCheckIn: (item: DailyCheckIn) => Promise<boolean>; onToggle: (id: string) => void; onSkip: (id: string) => void; onOpen: (item: RoutineItem) => void }) {
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
  const openLabel = item.id === 'strength' ? 'Abrir treino' : 'Ver orientações'
  return <article className={`task-card ${featured ? 'featured' : ''} ${state === 'done' ? 'done' : ''} ${state === 'skipped' ? 'skipped' : ''} ${blocked ? 'blocked' : ''}`}>
    <button type="button" className="task-open" onClick={() => onOpen(item)} aria-label={`${openLabel}: ${item.title}`}>
      <span className="task-time"><strong>{item.startTime ?? 'Livre'}</strong>{item.endTime && <span>até {item.endTime}</span>}</span>
      <span className="task-body"><span className={`area-tag area-${item.area}`}>{areaLabels[item.area]}</span><span className="task-title" role="heading" aria-level={3}>{item.title}</span>{state && <span className="task-status">{state === 'done' ? 'Concluída' : 'Deixada para outro momento'}</span>}{item.conditions?.[0] && !state && <span className="task-description">{item.conditions[0]}</span>}{blocked && !state && <span className="warning-text">{safetyReason}</span>}<span className="task-detail-link">{openLabel}</span></span>
    </button>
    <div className="task-actions"><button type="button" className="check-button" onClick={() => onToggle(item.id)} disabled={(blocked && state !== 'done') || saving} aria-label={`${state === 'done' ? 'Desmarcar' : 'Concluir'} ${item.title}`} aria-pressed={state === 'done'}>{saving ? '…' : state === 'done' ? '✓' : ''}</button><button type="button" className="skip-button" onClick={() => onSkip(item.id)} disabled={saving} aria-pressed={state === 'skipped'}>{state === 'skipped' ? 'Retomar' : 'Pular'}</button></div>
  </article>
}

function ActivityDetailsDialog({ selection, trainingWeek, mode, onClose }: { selection: ActivitySelection | null; trainingWeek: number; mode: RoutineMode; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const item = selection?.item ?? null
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (item && !dialog.open) dialog.showModal()
    if (!item && dialog.open) dialog.close()
  }, [item])
  const guide = item ? getTrainingActivityGuide(item.id, trainingWeek, selection?.day ?? new Date().getDay(), mode) ?? activityGuides[item.id] : null
  return <dialog ref={dialogRef} className="activity-dialog" aria-labelledby="activity-dialog-title" aria-describedby="activity-dialog-intro" onClose={onClose} onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close() }}>
    {item && guide && <>
      <div className="activity-dialog-main">
        <header className="activity-dialog-header"><div><span className="activity-dialog-area">{areaLabels[item.area]} · {item.startTime ? `${item.startTime}${item.endTime ? `–${item.endTime}` : ''}` : 'Horário livre'}</span><h2 id="activity-dialog-title">{item.title}</h2></div><button type="button" className="activity-dialog-close" aria-label="Fechar orientações" onClick={() => dialogRef.current?.close()}><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" /></svg></button></header>
        <p className="activity-dialog-intro" id="activity-dialog-intro">{guide.introduction}</p>
        <section className="activity-dialog-section" aria-labelledby="activity-dialog-steps"><h3 id="activity-dialog-steps">O que fazer</h3><ol className="guide-steps">{guide.steps.map((step) => <li key={step.title}><div className="guide-step-heading"><strong>{step.title}</strong>{step.amount && <span>{step.amount}</span>}</div><p>{step.description}</p></li>)}</ol></section>
        {!!item.conditions?.length && <section className="activity-dialog-section guide-conditions" aria-labelledby="activity-dialog-conditions"><h3 id="activity-dialog-conditions">Cuidados do plano</h3><ul>{item.conditions.map((condition) => <li key={condition}>{condition}</li>)}</ul></section>}
        {guide.closing && <p className="guide-closing">{guide.closing}</p>}
      </div>
      <footer className="activity-dialog-footer"><button type="button" className="secondary-button" onClick={() => dialogRef.current?.close()}>Fechar orientações</button></footer>
    </>}
  </dialog>
}

function TrainingWorkoutView({ day, trainingWeek, mode, online, onBack }: { day: TrainingDay; trainingWeek: number; mode: RoutineMode; online: boolean; onBack: () => void }) {
  const { block, week, format, exercises } = getStrengthSession(trainingWeek, day, mode)
  return <div className="workout-view">
    <button type="button" className="workout-back text-button" onClick={onBack}>← Voltar à rotina</button>
    <header className="page-title workout-title">
      <p className="eyebrow">Fortalecimento · {day === 'A' ? 'terça-feira' : 'quinta-feira'} · semana {week.week}</p>
      <h1>Treino {day}</h1>
      <p>{block.title} · {modeCopy[mode].label.toLowerCase()}</p>
    </header>
    <section className="workout-summary" aria-label="Como fazer o treino">
      <div className="workout-stats"><div><span>Tempo previsto</span><strong>{format.duration}</strong></div><div><span>Sequência</span><strong>{format.circuits} circuito{format.circuits === 1 ? '' : 's'}</strong></div><div><span>Descanso</span><strong>{format.rest}</strong></div></div>
      <p>{block.objective}</p>
      <ol className="workout-flow"><li><strong>Antes</strong><span>Observe sono, cansaço, pegada, sensibilidade e movimento do braço. Aqueça com marcha e mobilidade confortável por {mode === 'minimo' ? '1 minuto' : '3 minutos'}.</span></li><li><strong>Durante</strong><span>Faça os exercícios abaixo na ordem. Ao terminar a lista, descanse e repita se houver outro circuito. {format.note}</span></li><li><strong>Depois</strong><span>Desacelere, observe como está o braço e confira novamente no dia seguinte.</span></li></ol>
    </section>
    <div className="section-heading workout-section-heading"><div><h2>Exercícios de hoje</h2><p className="section-description">Leia a variação do Ritmo antes de abrir o exemplo em vídeo.</p></div><span className="count-chip">{exercises.length} movimentos</span></div>
    <ol className="workout-exercises">{exercises.map((exercise, index) => {
      const demo = getExerciseDemo(exercise)
      return <li key={exercise.id} className="workout-exercise">
        <div className="workout-exercise-heading"><span className="workout-order" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><div><h3>{exercise.title}</h3><span className="workout-amount">{exercise.amount}</span></div></div>
        <p className="workout-prescription">{exercise.description}</p>
        {demo && <><div className="workout-example"><strong>Exemplo prático</strong><p>{demo.example}</p></div>
          <p className="workout-video-caption">{demo.videoTitle} · {demo.provider}. {demo.note ?? 'Siga a quantidade e a amplitude descritas no Ritmo.'}</p>
          <a className="workout-video-link secondary-button" href={demo.videoUrl} target="_blank" rel="noopener noreferrer" aria-label={`Ver demonstração de ${exercise.title} no YouTube (abre em nova aba)`}>▶ Ver exemplo no YouTube <span aria-hidden="true">↗</span></a></>}
      </li>
    })}</ol>
    {!online && <p className="workout-offline" role="status">Você está offline. As instruções continuam disponíveis aqui; os vídeos precisam de internet.</p>}
    <section className="workout-finish" aria-labelledby="workout-finish-title"><h2 id="workout-finish-title">Quando avançar</h2><p>{week.focus}</p><p>{block.criteria.advance}</p><p>{block.criteria.repeat}</p><p>{block.criteria.regress}</p></section>
    <button type="button" className="secondary-button workout-end-back" onClick={onBack}>Voltar à rotina</button>
  </div>
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

function WeekView({ settings, onOpen }: { settings: AppSettings; onOpen: (item: RoutineItem, day: number) => void }) {
  const [selectedDay, setSelectedDay] = useState(() => new Date().getDay())
  const days = [1, 2, 3, 4, 5, 6, 0] as const
  const items = routineItems.filter((item) => item.days.includes(selectedDay as 0 | 1 | 2 | 3 | 4 | 5 | 6) && item.active && !settings.disabledActivities.includes(item.id)).map((item) => ({ ...item, ...settings.scheduleOverrides[item.id] })).sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''))
  return <>
    <PageTitle eyebrow="Visão geral" title="Sua semana" subtitle="Veja como os compromissos se distribuem. Ajuste os horários em Ajustes." />
    <div className="week-selector" role="group" aria-label="Escolher dia da semana">{days.map((day) => <button key={day} type="button" className={selectedDay === day ? 'selected' : ''} aria-pressed={selectedDay === day} onClick={() => setSelectedDay(day)}><span>{dayNames[day].slice(0, 3)}</span><i aria-hidden="true" /></button>)}</div>
    <section className="week-panel" aria-live="polite"><div className="section-heading"><div><h2>{dayNames[selectedDay]}</h2><p className="section-description">{items.length} atividades previstas</p></div></div>{items.length ? <div className="week-list">{items.map((item) => { const openLabel = item.id === 'strength' ? 'Abrir treino' : 'Ver orientações'; return <button type="button" className={`week-item nature-${item.nature}`} key={item.id} onClick={() => onOpen(item, selectedDay)} aria-label={`${openLabel}: ${item.title}`}><time>{item.startTime ?? 'Livre'}</time><span className="week-copy"><strong>{item.title}</strong><span className="week-meta">{areaLabels[item.area]} · {item.nature === 'fixa' ? 'Fixa' : item.nature === 'flexivel' ? 'Flexível' : 'Opcional'}</span><span className="week-hint">{openLabel}</span></span></button> })}</div> : <div className="empty-state"><strong>Dia sem atividades.</strong><p>Aproveite o espaço livre.</p></div>}</section>
    <p className="week-footnote">Os turnos opcionais dependem da checagem de segurança no dia.</p>
  </>
}

function RecordsView({ dateKey, shifts, expenses, studyLogs, completed, onToggle, onShift, onExpense, onStudy }: { dateKey: string; shifts: DeliveryShift[]; expenses: Expense[]; studyLogs: StudyLog[]; completed: Set<string>; onToggle: (id: string) => void; onShift: (item: DeliveryShift) => Promise<boolean>; onExpense: (item: Expense) => Promise<boolean>; onStudy: (item: StudyLog) => Promise<boolean> }) {
  const [kind, setKind] = useState<RecordKind>('delivery')
  return <>
    <PageTitle eyebrow="Acompanhar sem culpa" title="Registros" subtitle="Dados simples para entender sua rotina real." />
    <div className="subnav" role="group" aria-label="Tipo de registro">{([['delivery', 'Delivery'], ['despesa', 'Despesas'], ['estudo', 'Estudos'], ['checklists', 'Checklists']] as [RecordKind, string][]).map(([id, label]) => <button key={id} type="button" aria-pressed={kind === id} className={kind === id ? 'active' : ''} onClick={() => setKind(id)}>{label}</button>)}</div>
    <div hidden={kind !== 'delivery'}><DeliveryRecord dateKey={dateKey} shifts={shifts} onSave={onShift} /></div>
    <div hidden={kind !== 'despesa'}><ExpenseRecord dateKey={dateKey} expenses={expenses} onSave={onExpense} /></div>
    <div hidden={kind !== 'estudo'}><StudyRecord dateKey={dateKey} logs={studyLogs} onSave={onStudy} /></div>
    <div hidden={kind !== 'checklists'}><ChecklistRecord completed={completed} onToggle={onToggle} /></div>
  </>
}

function DeliveryRecord({ dateKey, shifts, onSave }: { dateKey: string; shifts: DeliveryShift[]; onSave: (item: DeliveryShift) => Promise<boolean> }) {
  const blank = { localDate: dateKey, startTime: '', endTime: '', hours: '', kilometers: '', grossRevenue: '', fuelCost: '', maintenanceReserve: '', otherExpenses: '', fatigueLevel: '', armCondition: '', note: '' }
  const [form, setForm] = useState(blank)
  useRecordDate(dateKey, setForm)
  const [saving, setSaving] = useState(false)
  const latestShifts = useMemo(() => recentRecords(shifts, 8), [shifts])
  const set = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }))
  const num = (value: string) => value === '' ? null : Number(value)
  const calculation = calculateDelivery({ grossRevenue: num(form.grossRevenue), fuelCost: num(form.fuelCost), maintenanceReserve: num(form.maintenanceReserve), otherExpenses: num(form.otherExpenses), hours: num(form.hours), kilometers: num(form.kilometers) })
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    const item: DeliveryShift = { id: uid(), localDate: form.localDate, startTime: form.startTime, endTime: form.endTime, hours: num(form.hours), kilometers: num(form.kilometers), grossRevenue: num(form.grossRevenue), fuelCost: num(form.fuelCost), maintenanceReserve: num(form.maintenanceReserve), otherExpenses: num(form.otherExpenses), ...calculation, fatigueLevel: form.fatigueLevel === '' ? null : Number(form.fatigueLevel) as 0 | 1 | 2 | 3, armCondition: (form.armCondition || null) as DeliveryShift['armCondition'], note: form.note, createdAt: new Date().toISOString() }
    setSaving(true)
    try { if (await onSave(item)) setForm(blank) }
    finally { setSaving(false) }
  }
  return <div className="records-layout">
    <form className="form-card" onSubmit={submit}>
      <h2>Novo turno</h2>
      <fieldset className="form-group"><legend>Período e distância</legend><div className="form-grid"><Field label="Data"><input type="date" required value={form.localDate} onChange={(e) => set('localDate', e.target.value)} /></Field><Field label="Início"><input type="time" required value={form.startTime} onChange={(e) => set('startTime', e.target.value)} /></Field><Field label="Fim"><input type="time" required value={form.endTime} onChange={(e) => set('endTime', e.target.value)} /></Field><Field label="Horas em turno"><input type="number" min="0" step="0.1" required value={form.hours} onChange={(e) => set('hours', e.target.value)} /></Field><Field label="Quilômetros"><input type="number" min="0" step="0.1" required value={form.kilometers} onChange={(e) => set('kilometers', e.target.value)} /></Field></div></fieldset>
      <fieldset className="form-group"><legend>Valores informados</legend><div className="form-grid"><Field label="Receita bruta (R$)"><input type="number" min="0" step="0.01" required value={form.grossRevenue} onChange={(e) => set('grossRevenue', e.target.value)} /></Field><Field label="Combustível (R$)"><input type="number" min="0" step="0.01" required value={form.fuelCost} onChange={(e) => set('fuelCost', e.target.value)} /></Field><Field label="Reserva manutenção (R$)"><input type="number" min="0" step="0.01" required value={form.maintenanceReserve} onChange={(e) => set('maintenanceReserve', e.target.value)} /></Field><Field label="Outras despesas (R$)"><input type="number" min="0" step="0.01" required value={form.otherExpenses} onChange={(e) => set('otherExpenses', e.target.value)} /></Field></div></fieldset>
      <fieldset className="form-group"><legend>Como foi o turno</legend><div className="form-grid"><Field label="Cansaço"><select required value={form.fatigueLevel} onChange={(e) => set('fatigueLevel', e.target.value)}><option value="">Selecione</option><option value="0">Bem disposto</option><option value="1">Leve</option><option value="2">Cansado</option><option value="3">Muito cansado</option></select></Field><Field label="Braço"><select required value={form.armCondition} onChange={(e) => set('armCondition', e.target.value)}><option value="">Selecione</option><option value="habitual">Habitual</option><option value="alterado">Alterado</option><option value="dor">Dor</option></select></Field></div><Field label="Observação"><textarea value={form.note} onChange={(e) => set('note', e.target.value)} /></Field></fieldset>
      <section className="calculation" aria-label="Valores calculados"><h3>Estimativa automática</h3><div className="result-strip"><div><span>Resultado estimado</span><strong>{formatMoney(calculation.estimatedResult)}</strong></div><div><span>Por hora</span><strong>{formatMoney(calculation.resultPerHour)}</strong></div><div><span>Por km</span><strong>{formatMoney(calculation.resultPerKilometer)}</strong></div></div><p className="fine-print">Estimativa baseada somente nos custos informados; não representa lucro líquido definitivo.</p></section>
      <button className="primary-button" disabled={saving}>{saving ? 'Salvando turno…' : 'Salvar turno'}</button>
    </form>
    <RecordList title="Últimos turnos" empty="Nenhum turno registrado.">{latestShifts.map((item) => <div className="record-row" key={item.id}><div><strong>{new Date(`${item.localDate}T12:00`).toLocaleDateString('pt-BR')}</strong><span>{item.hours ?? '—'}h · {item.kilometers ?? '—'} km</span></div><strong>{formatMoney(item.estimatedResult)}</strong></div>)}</RecordList>
  </div>
}

function ExpenseRecord({ dateKey, expenses, onSave }: { dateKey: string; expenses: Expense[]; onSave: (item: Expense) => Promise<boolean> }) {
  const [form, setForm] = useState({ localDate: dateKey, description: '', category: 'Alimentação', amount: '' })
  useRecordDate(dateKey, setForm)
  const [saving, setSaving] = useState(false)
  const latestExpenses = useMemo(() => recentRecords(expenses, 10), [expenses])
  async function submit(event: FormEvent) { event.preventDefault(); if (saving) return; const item: Expense = { id: uid(), localDate: form.localDate, description: form.description, category: form.category as Expense['category'], amount: Number(form.amount), createdAt: new Date().toISOString() }; setSaving(true); try { if (await onSave(item)) setForm({ ...form, description: '', amount: '' }) } finally { setSaving(false) } }
  return <div className="records-layout"><form className="form-card" onSubmit={submit}><h2>Nova despesa</h2><div className="form-grid"><Field label="Data"><input type="date" required value={form.localDate} onChange={(e) => setForm({ ...form, localDate: e.target.value })} /></Field><Field label="Categoria"><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{expenseCategories.map((item) => <option key={item}>{item}</option>)}</select></Field></div><Field label="Descrição"><input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ex.: mercado" /></Field><Field label="Valor (R$)"><input type="number" min="0" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field><button className="primary-button" disabled={saving}>{saving ? 'Salvando despesa…' : 'Salvar despesa'}</button></form><RecordList title="Despesas recentes" empty="Nenhuma despesa registrada.">{latestExpenses.map((item) => <div className="record-row" key={item.id}><div><strong>{item.description}</strong><span>{item.category} · {new Date(`${item.localDate}T12:00`).toLocaleDateString('pt-BR')}</span></div><strong>{formatMoney(item.amount)}</strong></div>)}</RecordList></div>
}

function StudyRecord({ dateKey, logs, onSave }: { dateKey: string; logs: StudyLog[]; onSave: (item: StudyLog) => Promise<boolean> }) {
  const [form, setForm] = useState({ localDate: dateKey, area: 'Inglês', minutes: '', content: '', note: '' })
  useRecordDate(dateKey, setForm)
  const [saving, setSaving] = useState(false)
  const latestLogs = useMemo(() => recentRecords(logs, 10), [logs])
  async function submit(event: FormEvent) { event.preventDefault(); if (saving) return; const item: StudyLog = { id: uid(), localDate: form.localDate, area: form.area as StudyLog['area'], minutes: Number(form.minutes), content: form.content, note: form.note, createdAt: new Date().toISOString() }; setSaving(true); try { if (await onSave(item)) setForm({ ...form, minutes: '', content: '', note: '' }) } finally { setSaving(false) } }
  return <div className="records-layout"><form className="form-card" onSubmit={submit}><h2>Novo estudo ou leitura</h2><div className="form-grid"><Field label="Data"><input type="date" required value={form.localDate} onChange={(e) => setForm({ ...form, localDate: e.target.value })} /></Field><Field label="Área"><select value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })}><option>Inglês</option><option>Programação</option><option>Leitura</option><option>Outro</option></select></Field><Field label="Minutos"><input type="number" min="1" required value={form.minutes} onChange={(e) => setForm({ ...form, minutes: e.target.value })} /></Field></div><Field label="Conteúdo"><input required value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="O que você praticou?" /></Field><Field label="Observação curta"><textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field><button className="primary-button" disabled={saving}>{saving ? 'Salvando registro…' : 'Salvar registro'}</button></form><RecordList title="Atividades recentes" empty="Nenhum estudo registrado.">{latestLogs.map((item) => <div className="record-row" key={item.id}><div><strong>{item.area}: {item.content}</strong><span>{item.minutes} min · {new Date(`${item.localDate}T12:00`).toLocaleDateString('pt-BR')}</span></div></div>)}</RecordList></div>
}

function ChecklistRecord({ completed, onToggle }: { completed: Set<string>; onToggle: (id: string) => void }) {
  const render = (prefix: string, items: string[]) => items.map((item, index) => { const id = `${prefix}-${index}`; return <label className="checklist-row" key={id}><input type="checkbox" checked={completed.has(id)} onChange={() => onToggle(id)} /><span>{item}</span></label> })
  return <div className="checklist-columns"><section className="form-card"><p className="eyebrow">Domingo</p><h2>Preparo de marmitas</h2>{render('meal-check', mealPrepChecklist)}</section><section className="form-card"><p className="eyebrow">Sábado</p><h2>Manutenção da casa</h2>{render('home-check', homeChecklist)}</section></div>
}

function ProgressView({ progress, weeklySummary, trainingWeek, mode, onTrainingWeek, onOpenTraining, onToggle }: { progress: ThirtyDayProgress[]; weeklySummary: WeeklyProgressSummary; trainingWeek: number; mode: RoutineMode; onTrainingWeek: (week: number, message: string) => Promise<void>; onOpenTraining: (day: TrainingDay) => void; onToggle: (item: ThirtyDayProgress) => Promise<void> }) {
  const { completedIds: completed, total, completedCount, percentage } = summarizePlanProgress(progress, progressPlan)
  const { block, week } = getTrainingPlanWeek(trainingWeek)
  return <>
    <PageTitle eyebrow="Evolução" title="Seu progresso continua" subtitle="A semana do treino pode avançar, repetir ou voltar sem apagar registros anteriores." />

    <WeeklyProgressCard summary={weeklySummary} />

    <section className="training-plan-card" aria-labelledby="training-plan-title">
      <header className="training-plan-header">
        <div><p className="eyebrow">Semana {week.week} de 24 · {block.range}</p><h2 id="training-plan-title">{block.title}</h2></div>
        <span className="count-chip">{modeCopy[mode].label}</span>
      </header>
      <p className="training-objective">{block.objective}</p>
      <div className="training-week-focus"><strong>{week.title}</strong><p>{week.focus}</p><span>{week.circuits} circuito{week.circuits === 1 ? '' : 's'} · descanso {week.rest}</span><small>{week.progression}</small></div>
      <div className="training-workout-actions" aria-label="Treinos da semana"><button type="button" className="secondary-button" onClick={() => onOpenTraining('A')}>Ver treino A · terça</button><button type="button" className="secondary-button" onClick={() => onOpenTraining('B')}>Ver treino B · quinta</button></div>
      <details className="training-criteria"><summary>Critérios para avançar, repetir ou regredir</summary><dl><div><dt>Avançar</dt><dd>{block.criteria.advance}</dd></div><div><dt>Repetir</dt><dd>{block.criteria.repeat}</dd></div><div><dt>Regredir ou interromper</dt><dd>{block.criteria.regress}</dd></div></dl></details>
      <div className="training-week-actions"><button type="button" className="text-button" disabled={week.week === 1} onClick={() => onTrainingWeek(week.week - 1, `Retorno para a semana ${week.week - 1} salvo.`)}>Semana anterior</button><button type="button" className="secondary-button" onClick={() => onTrainingWeek(week.week, `Semana ${week.week} mantida para repetição.`)}>Repetir semana</button><button type="button" className="primary-button" disabled={week.week === 24} onClick={() => onTrainingWeek(week.week + 1, `Semana ${week.week + 1} iniciada.`)}>Avançar semana</button></div>
    </section>

    <details className="training-roadmap"><summary>Ver os seis blocos do plano</summary><ol>{trainingBlocks.map((item) => <li key={item.id} className={item.id === block.id ? 'current' : ''}><span>{item.range}</span><strong>{item.title}</strong><p>{item.objective}</p></li>)}</ol></details>

    <div className="section-heading progress-plan-heading"><div><h2>Plano inicial de 30 dias</h2><p className="section-description">O checklist original permanece separado e com todos os registros preservados.</p></div></div>
    <section className="progress-summary"><div><strong>{completedCount} de {total} passos registrados</strong><span>Continue de onde fizer sentido.</span></div><div className="progress-track" role="progressbar" aria-label="Passos do plano concluídos" aria-valuenow={completedCount} aria-valuemin={0} aria-valuemax={total}><span style={{ width: `${percentage}%` }} /></div></section>
    <div className="progress-weeks">{progressPlan.map((planWeek) => { const weekDone = planWeek.items.filter((_, index) => completed.has(`week-${planWeek.week}-${index}`)).length; return <section className="progress-card" key={planWeek.week}><header><span>Etapa {planWeek.week}</span><strong>{planWeek.title}</strong><small>{weekDone} de {planWeek.items.length}</small></header>{planWeek.items.map((text, index) => { const id = `week-${planWeek.week}-${index}`; const done = completed.has(id); return <label className="checklist-row" key={id}><input type="checkbox" checked={done} onChange={() => onToggle({ id, week: planWeek.week, item: text, state: done ? 'pending' : 'done', completedAt: done ? undefined : new Date().toISOString() })} /><span>{text}</span></label> })}</section> })}</div>
    <div className="info-card"><strong>Uma leitura honesta</strong><p>Dados incompletos não permitem concluir que uma mudança de saúde ou renda ocorreu. Observe tendências e leve decisões clínicas ou financeiras importantes a profissionais habilitados.</p></div>
  </>
}

function WeeklyProgressCard({ summary, today }: { summary: WeeklyProgressSummary; today?: DailyProgressSummary }) {
  return <section className="progress-summary" role="region" aria-labelledby="weekly-progress-title" aria-live="polite">
    <div><h2 id="weekly-progress-title">Progresso desta semana</h2><strong>{summary.completedDays} de {summary.plannedDays} dias concluídos</strong><span>{summary.completedRequiredActivities} de {summary.requiredActivities} atividades obrigatórias · {summary.activityPercentage}%</span></div>
    {today && <p>{today.completed ? 'Dia concluído' : `${today.completedRequiredCount} de ${today.requiredCount} obrigatórias concluídas hoje`}</p>}
    <div className="progress-track" role="progressbar" aria-label="Atividades obrigatórias concluídas na semana" aria-valuenow={summary.completedRequiredActivities} aria-valuemin={0} aria-valuemax={summary.requiredActivities}><span style={{ width: `${summary.activityPercentage}%` }} /></div>
  </section>
}

function SettingsView({ settings, persistence, onSettings, onMessage, onImported, onCleared }: { settings: AppSettings; persistence: StoragePersistence; onSettings: (settings: AppSettings) => Promise<void>; onMessage: (message: string) => void; onImported: () => void; onCleared: () => void }) {
  const [draft, setDraft] = useState(settings)
  function updateTime(item: RoutineItem, startTime: string) { setDraft((current) => withScheduleStart(current, item.id, startTime)) }
  function toggleActive(id: string) { setDraft((current) => ({ ...current, disabledActivities: current.disabledActivities.includes(id) ? current.disabledActivities.filter((item) => item !== id) : [...current.disabledActivities, id] })) }
  async function exportData() { try { const data = await repository.exportAll(); const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `ritmo-backup-${localDateKey()}.json`; document.body.appendChild(anchor); anchor.click(); anchor.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); onMessage('Backup JSON exportado.') } catch (error) { onMessage(readableError(error, 'Não foi possível exportar o backup.')) } }
  async function importData(file: File) { try { if (file.size > MAX_BACKUP_BYTES) return window.alert('O backup excede o limite de 10 MB. Nenhum dado foi alterado.'); const parsed: unknown = JSON.parse(await file.text()); if (!validateBackup(parsed)) return window.alert('Backup inválido ou de versão incompatível. Nenhum dado foi alterado.'); if (!window.confirm('Importar este backup substituirá todos os dados atuais. Deseja continuar?')) return; await repository.importAll(parsed); onImported() } catch { onMessage('Não foi possível ler ou importar o arquivo. Nenhum dado foi alterado.') } }
  async function clearData() { if (!window.confirm('Esta ação apagará permanentemente todos os registros deste aparelho e não pode ser desfeita. Continuar?')) return; try { await repository.clearAll(); onCleared() } catch (error) { onMessage(readableError(error, 'Não foi possível apagar os dados.')) } }
  const storageText = persistence === 'granted' ? 'Proteção persistente concedida' : persistence === 'checking' ? 'Verificando…' : persistence === 'unsupported' ? 'O navegador não informa proteção persistente' : 'Sujeito a limpeza pelo navegador — faça backups periódicos'
  return <><PageTitle eyebrow="Preferências e dados" title="Ajustes" subtitle="Sua rotina pode mudar junto com você." />
    <section className="settings-section"><h2>Aparência</h2><p className="section-description">Escolha como o Ritmo aparece neste aparelho.</p><div className="appearance-options" role="group" aria-label="Aparência">{([['system', 'Do aparelho'], ['light', 'Clara'], ['dark', 'Escura']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={(draft.theme ?? 'system') === value} className={(draft.theme ?? 'system') === value ? 'selected' : ''} onClick={() => setDraft({ ...draft, theme: value })}>{label}</button>)}</div></section>
    <section className="settings-section"><div className="section-heading"><div><h2>Atividades e horários</h2><p className="section-description">Mostre o que importa e ajuste o início de cada atividade.</p></div></div><details className="settings-disclosure"><summary>Personalizar rotina <span>{routineItems.length} atividades</span></summary><div className="settings-list">{routineItems.map((item) => { const enabled = !draft.disabledActivities.includes(item.id); return <div className="setting-row" key={item.id}><button className={`toggle ${enabled ? 'on' : ''}`} role="switch" aria-checked={enabled} aria-label={`${enabled ? 'Desativar' : 'Ativar'} ${item.title}`} onClick={() => toggleActive(item.id)}><span /></button><div><strong>{item.title}</strong><small>{areaLabels[item.area]}</small></div><input aria-label={`Horário inicial de ${item.title}`} type="time" value={draft.scheduleOverrides[item.id]?.startTime ?? item.startTime ?? ''} onChange={(e) => updateTime(item, e.target.value)} /></div> })}</div></details><div className="settings-actions"><button className="primary-button" onClick={() => onSettings(draft)}>Salvar ajustes</button><button className="text-button" onClick={() => { if (window.confirm('Restaurar atividades, horários, ritmo, semana do treino e aparência para os padrões? Salve para confirmar a mudança.')) setDraft(defaultSettings()) }}>Restaurar padrões</button></div></section>
    <section className="settings-section"><h2>Dados neste aparelho</h2><div className="storage-status"><span className={persistence === 'granted' ? 'status-good' : 'status-warn'} aria-hidden="true" /><div><strong>Armazenamento local</strong><p>{storageText}</p></div></div><div className="action-grid"><button className="secondary-button" onClick={exportData}>Exportar backup JSON</button><label className="secondary-button file-button">Importar backup JSON<input type="file" accept="application/json,.json" onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} /></label></div><p className="fine-print">O app funciona sem conta e sem servidor. Guarde uma cópia do backup fora do celular periodicamente.</p></section>
    <section className="danger-section"><h2>Apagar todos os dados</h2><p>Remove registros, progresso e ajustes somente deste aparelho.</p><button className="danger-button" onClick={clearData}>Apagar registros</button></section></>
}

function PageTitle({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) { return <header className="page-title"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{subtitle}</p></header> }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="field"><span>{label}</span>{children}</label> }
function RecordList({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) { const hasChildren = Array.isArray(children) ? children.length > 0 : !!children; return <section className="record-list"><h2>{title}</h2>{hasChildren ? children : <div className="empty-state"><p>{empty}</p></div>}</section> }

export default App
