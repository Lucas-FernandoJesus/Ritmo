import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { routineItems } from './features/routine/data'
import { TodayView } from './features/routine/components/TodayView'
import { WeekView } from './features/routine/components/WeekView'
import { ActivityDetailsDialog, type ActivitySelection } from './features/routine/components/ActivityDetailsDialog'
import { createDailyPlanSnapshot, defaultSettings, filterRoutineForDay, findLinkedActivityId, localDateKey, rideSafetyForDate, summarizeDailyProgress, summarizeWeeklyProgress, upgradeAppearance, weekBounds } from './core/domain'
import { applyDocumentTheme, deviceTheme, effectiveTheme, type AppearanceFeedback, type EffectiveTheme } from './features/settings/theme'
import { useDailyReminder } from './features/settings/useDailyReminder'
import type { FinanceRegistrationRequest } from './features/finance/components/FinanceView'
import type { DeliverySelection, RecordKind } from './features/records/components/RecordsView'
import { MainMenu } from './components/MainMenu'
import { useFinanceState } from './features/finance/useFinanceState'
import { repository } from './infrastructure/repository'
import { loadAppData } from './infrastructure/load-app-data'
import { clampTrainingWeek } from './features/training/training-plan'
import type { TrainingSelection } from './features/training/components/TrainingViews'
import type { MuayPracticeId, MuayProgressStatus } from './features/training/muay-exercises'
import type { AppSettings, BodyMeasurement, DailyCheckIn, DailyCompletion, DailyPlanSnapshot, DailyProgressSummary, DeliveryShift, Expense, MealLog, RoutineItem, RoutineMode, StoragePersistence, StudyLog, ThirtyDayProgress } from './core/types'

const FinanceView = lazy(() => import('./features/finance/components/FinanceView').then((module) => ({ default: module.FinanceView })))
const ProgressView = lazy(() => import('./features/progress/components/ProgressView').then((module) => ({ default: module.ProgressView })))
const SettingsView = lazy(() => import('./features/settings/components/SettingsView').then((module) => ({ default: module.SettingsView })))
const RecordsView = lazy(() => import('./features/records/components/RecordsView').then((module) => ({ default: module.RecordsView })))
const TrainingHubView = lazy(() => import('./features/training/components/TrainingViews').then((module) => ({ default: module.TrainingHubView })))
const TrainingWorkoutView = lazy(() => import('./features/training/components/TrainingViews').then((module) => ({ default: module.TrainingWorkoutView })))
const MuayWorkoutView = lazy(() => import('./features/training/components/TrainingViews').then((module) => ({ default: module.MuayWorkoutView })))
const NutritionView = lazy(() => import('./features/nutrition/components/NutritionView').then((module) => ({ default: module.NutritionView })))

type Tab = 'hoje' | 'semana' | 'treinos' | 'nutricao' | 'registros' | 'financeiro' | 'progresso' | 'ajustes'
type QuickAction = 'shift' | 'study' | 'income' | 'expense'
type LinkableRecord = { kind: 'study', area: StudyLog['area'] } | { kind: 'delivery', startTime: string, endTime: string } | { kind: 'expense' }


const navItems: { id: Tab; label: string }[] = [
  { id: 'hoje', label: 'Hoje' },
  { id: 'semana', label: 'Semana' },
  { id: 'treinos', label: 'Treinos' },
  { id: 'nutricao', label: 'Nutrição' },
  { id: 'registros', label: 'Registros' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'progresso', label: 'Progresso' },
  { id: 'ajustes', label: 'Ajustes' },
]

const quickActions: { id: QuickAction; label: string }[] = [
  { id: 'shift', label: 'Turno' },
  { id: 'study', label: 'Estudo' },
  { id: 'income', label: 'Entrada' },
  { id: 'expense', label: 'Saída' },
]

const readableError = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback
const workoutFromUrl = (): TrainingSelection | null => {
  const value = new URLSearchParams(window.location.search).get('treino')
  return value === 'A' || value === 'B' || value === 'muay-mon' || value === 'muay-fri' ? value : null
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


function App() {
  useDailyReminder()
  const [now, setNow] = useState(() => new Date())
  const dateKey = localDateKey(now)
  const [tab, setTab] = useState<Tab>(() => workoutFromUrl() ? 'treinos' : 'hoje')
  const [selectedWeekDay, setSelectedWeekDay] = useState(() => new Date().getDay())
  const [trainingSelection, setTrainingSelection] = useState<TrainingSelection | null>(workoutFromUrl)
  const [detailActivity, setDetailActivity] = useState<ActivitySelection | null>(null)
  const [mode, setMode] = useState<RoutineMode>('normal')
  const [modeSaving, setModeSaving] = useState(false)
  const [settings, setSettings] = useState<AppSettings>(defaultSettings())
  const [appearanceSaving, setAppearanceSaving] = useState(false)
  const [appearanceFeedback, setAppearanceFeedback] = useState<AppearanceFeedback>({ kind: 'idle', message: '' })
  const [completions, setCompletions] = useState<DailyCompletion[]>([])
  const [dailySnapshots, setDailySnapshots] = useState<DailyPlanSnapshot[]>([])
  const [checkIn, setCheckIn] = useState<DailyCheckIn | null>(null)
  const [deliveryShifts, setDeliveryShifts] = useState<DeliveryShift[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [recordKind, setRecordKind] = useState<RecordKind>('delivery')
  const [recordsVisited, setRecordsVisited] = useState(false)
  const [financeRegistration, setFinanceRegistration] = useState<FinanceRegistrationRequest>()
  const [deliverySelection, setDeliverySelection] = useState<DeliverySelection>({ revision: 0 })
  const [studyLogs, setStudyLogs] = useState<StudyLog[]>([])
  const [progress, setProgress] = useState<ThirtyDayProgress[]>([])
  const [bodyMeasurements, setBodyMeasurements] = useState<BodyMeasurement[]>([])
  const [mealLogs, setMealLogs] = useState<MealLog[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [savingIds, setSavingIds] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const { financialRecords, financialGoals, categoryBudgets, financePlanning, hydrateFinance, saveFinancialRecord, saveFinancialGoal, saveCategoryBudget, removeFinancialPlan, financeOperations } = useFinanceState(dateKey, setMessage)
  const [online, setOnline] = useState(navigator.onLine)
  const [storagePersistence, setStoragePersistence] = useState<StoragePersistence>('checking')

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    applyDocumentTheme(effectiveTheme(settings.theme))
  }, [settings.theme])

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const loaded = await loadAppData(repository, dateKey)
        if (!active) return
        const upgradedSettings = upgradeAppearance(loaded.settings)
        const resolvedTheme = loaded.settings.theme === 'system' ? deviceTheme() : effectiveTheme(upgradedSettings.theme)
        const nextSettings = upgradedSettings.theme === resolvedTheme && upgradedSettings.appearanceVersion === 2
          ? upgradedSettings
          : { ...upgradedSettings, theme: resolvedTheme, appearanceVersion: 2 as const }
        setSettings(nextSettings)
        setMode(nextSettings.preferredMode)
        if (nextSettings !== loaded.settings) {
          try { await repository.saveSettings(nextSettings) }
          catch { if (active) setMessage('A aparência compatível está ativa, mas não foi possível salvar a preferência explícita.') }
        }
        if (!active) return
        const snapshotPlan = prepareWeekSnapshots(loaded.dailySnapshots, dateKey, nextSettings.preferredMode, nextSettings)
        await Promise.all(snapshotPlan.changed.map((snapshot) => repository.saveDailySnapshot(snapshot)))
        if (!active) return
        setCompletions(loaded.completions)
        setDailySnapshots(snapshotPlan.all)
        setCheckIn(loaded.checkIn)
        setDeliveryShifts(loaded.deliveryShifts)
        setExpenses(loaded.expenses)
        hydrateFinance(loaded)
        setStudyLogs(loaded.studyLogs)
        setProgress(loaded.progress)
        setBodyMeasurements(loaded.bodyMeasurements)
        setMealLogs(loaded.mealLogs)
      } catch {
        if (active) setLoadError(true)
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [dateKey, hydrateFinance])

  useEffect(() => {
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline) }
  }, [])

  useEffect(() => {
    const onPopState = () => setTrainingSelection(workoutFromUrl())
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
  const previousWeekReference = useMemo(() => { const date = new Date(`${dateKey}T12:00:00`); date.setDate(date.getDate() - 7); return localDateKey(date) }, [dateKey])
  const previousWeeklySummary = useMemo(() => summarizeWeeklyProgress(previousWeekReference, dailySnapshots, completions), [previousWeekReference, dailySnapshots, completions])
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
      const existing = studyLogs.some((log) => log.id === item.id)
      setStudyLogs((current) => [item, ...current.filter((log) => log.id !== item.id)])
      setMessage(existing ? 'Estudo atualizado.' : 'Estudo registrado.')
      if (!existing) await offerLinkedCompletion(item.localDate, { kind: 'study', area: item.area })
      return true
    } catch (error) { setMessage(readableError(error, 'Não foi possível salvar o estudo.')); return false }
  }

  async function saveLinkedExpense(item: Expense) {
    try {
      await repository.saveExpense(item)
      setExpenses((current) => [item, ...current.filter((existing) => existing.id !== item.id)])
      setMessage('Despesa salva.')
      if (!expenses.some((existing) => existing.id === item.id)) await offerLinkedCompletion(item.localDate, { kind: 'expense' })
      return true
    } catch (error) { setMessage(readableError(error, 'Não foi possível salvar a despesa.')); return false }
  }

  async function saveLinkedShift(item: DeliveryShift) {
    try {
      await repository.saveDeliveryShift(item)
      setDeliveryShifts((current) => [item, ...current.filter((existing) => existing.id !== item.id)])
      setMessage('Turno salvo. O resultado é estimado com os custos informados.')
      if (!deliveryShifts.some((existing) => existing.id === item.id)) await offerLinkedCompletion(item.localDate, { kind: 'delivery', startTime: item.startTime, endTime: item.endTime })
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

  async function changeMuayProgress(practiceId: MuayPracticeId, status: MuayProgressStatus) {
    const nextSettings: AppSettings = { ...settings, muayProgress: { ...(settings.muayProgress ?? {}), [practiceId]: status } }
    try {
      await repository.saveSettings(nextSettings)
      setSettings(nextSettings)
      setMessage('Progresso técnico salvo neste aparelho.')
    } catch { setMessage('Não foi possível salvar o progresso técnico. Tente novamente.') }
  }

  async function changeAppearance(nextTheme: EffectiveTheme) {
    if (appearanceSaving) return false
    if (effectiveTheme(settings.theme) === nextTheme) return true
    const previousSettings = settings
    const nextSettings: AppSettings = { ...settings, theme: nextTheme, appearanceVersion: 2 }
    applyDocumentTheme(nextTheme)
    setSettings(nextSettings)
    setAppearanceSaving(true)
    setAppearanceFeedback({ kind: 'saving', message: 'Salvando aparência…' })
    try {
      await repository.saveSettings(nextSettings)
      setAppearanceFeedback({ kind: 'saved', message: `Aparência ${nextTheme === 'light' ? 'clara' : 'escura'} salva neste aparelho.` })
      return true
    } catch {
      const previousTheme = effectiveTheme(previousSettings.theme)
      applyDocumentTheme(previousTheme)
      setSettings((current) => ({ ...current, theme: previousTheme, appearanceVersion: 2 }))
      setAppearanceFeedback({ kind: 'error', message: `Não foi possível salvar a aparência. O modo ${previousTheme === 'light' ? 'claro' : 'escuro'} foi restaurado; tente novamente.` })
      return false
    } finally {
      setAppearanceSaving(false)
    }
  }

  async function saveCheckIn(next: DailyCheckIn) {
    try { await repository.saveCheckIn(next); setCheckIn(next); setMessage('Checagem salva neste aparelho.'); return true }
    catch { setMessage('Não foi possível salvar a checagem. Tente novamente.'); return false }
  }

  async function saveBodyMeasurement(next: BodyMeasurement) {
    try {
      await repository.saveBodyMeasurement(next)
      setBodyMeasurements((current) => [...current.filter((item) => item.id !== next.id), next])
      setMessage('Medida salva neste aparelho.')
      return true
    } catch (error) { setMessage(readableError(error, 'Não foi possível salvar a medida.')); return false }
  }

  async function saveMealLog(next: MealLog) {
    try {
      await repository.saveMealLog(next)
      setMealLogs((current) => [...current.filter((item) => item.id !== next.id), next])
      setMessage('Refeição salva neste aparelho.')
      return true
    } catch (error) { setMessage(readableError(error, 'Não foi possível salvar a refeição.')); return false }
  }

  function focusContent() {
    window.scrollTo({ top: 0, behavior: 'instant' })
    document.getElementById('main-content')?.focus({ preventScroll: true })
  }

  function openWorkout(selection: TrainingSelection) {
    const url = new URL(window.location.href)
    url.searchParams.set('treino', selection)
    window.history.pushState({ ...window.history.state, ritmoWorkout: true }, '', url)
    setTrainingSelection(selection)
    focusContent()
  }

  function closeWorkout() {
    if (window.history.state?.ritmoWorkout) {
      window.history.back()
    } else {
      const url = new URL(window.location.href)
      url.searchParams.delete('treino')
      window.history.replaceState(window.history.state, '', url)
      setTrainingSelection(null)
    }
    focusContent()
  }

  function openActivity(item: RoutineItem, day: number) {
    if (item.id === 'strength') openWorkout(day === 4 ? 'B' : 'A')
    else if (item.id === 'muay-mon' || item.id === 'muay-fri') openWorkout(item.id)
    else setDetailActivity({ item, day })
  }

  function navigateTab(next: Tab) {
    if (trainingSelection) {
      const url = new URL(window.location.href)
      url.searchParams.delete('treino')
      window.history.replaceState(window.history.state, '', url)
      setTrainingSelection(null)
    }
    if (next === 'registros') setRecordsVisited(true)
    setTab(next)
    focusContent()
  }

  function runQuickAction(action: string) {
    if (action === 'shift' || action === 'study') {
      setRecordKind(action === 'shift' ? 'delivery' : 'estudo')
      navigateTab('registros')
      return
    }
    setFinanceRegistration((current) => ({ intent: action === 'income' ? 'entrada' : 'saida', revision: (current?.revision ?? 0) + 1 }))
    navigateTab('financeiro')
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
        <Suspense fallback={<section className="section-loading" role="status"><div className="spinner" /><p>Abrindo área…</p></section>}>
        {trainingSelection ? trainingSelection === 'A' || trainingSelection === 'B'
          ? <TrainingWorkoutView day={trainingSelection} trainingWeek={clampTrainingWeek(settings.trainingWeek)} mode={mode} online={online} onBack={closeWorkout} />
          : <MuayWorkoutView itemId={trainingSelection} trainingWeek={clampTrainingWeek(settings.trainingWeek)} mode={mode} online={online} progress={settings.muayProgress ?? {}} onProgress={changeMuayProgress} onBack={closeWorkout} /> : <>
          {tab === 'hoje' && <TodayView key={dateKey} now={now} items={todayItems} mode={mode} modeSaving={modeSaving} onMode={changeMode} states={todayStates} savingIds={savingIds} dateKey={dateKey} checkIn={todayCheckIn} safety={safety} weeklySummary={weeklySummary} previousWeeklySummary={previousWeeklySummary} todaySummary={todaySummary} onCheckIn={saveCheckIn} onToggle={toggleCompletion} onSkip={toggleSkipped} onOpen={(item) => openActivity(item, now.getDay())} />}
          {tab === 'semana' && <WeekView settings={settings} selectedDay={selectedWeekDay} todayDay={now.getDay()} onSelectedDay={setSelectedWeekDay} onOpen={openActivity} completed={todayCompleted} onToggle={toggleCompletion} />}
          {tab === 'treinos' && <TrainingHubView trainingWeek={clampTrainingWeek(settings.trainingWeek)} mode={mode} onTrainingWeek={changeTrainingWeek} onOpenTraining={openWorkout} />}
          {tab === 'nutricao' && <NutritionView today={dateKey} measurements={bodyMeasurements} mealLogs={mealLogs} snapshots={dailySnapshots} completions={completions} shifts={deliveryShifts} expenses={expenses} records={financialRecords} onSaveMeasurement={saveBodyMeasurement} onSaveMeal={saveMealLog} />}
          {tab === 'financeiro' && <FinanceView planning={financePlanning} operations={financeOperations} today={dateKey} shifts={deliveryShifts} expenses={expenses} records={financialRecords} goals={financialGoals} budgets={categoryBudgets} registrationRequest={financeRegistration} onGoal={saveFinancialGoal} onBudget={saveCategoryBudget} onDeleteGoal={(id) => removeFinancialPlan("goal", id)} onDeleteBudget={(id) => removeFinancialPlan("budget", id)} onSave={saveFinancialRecord} onExpense={saveLinkedExpense} onDelivery={(id) => { setDeliverySelection((current) => ({ id, revision: current.revision + 1 })); setRecordKind('delivery'); navigateTab('registros') }} />}
          {tab === 'progresso' && <ProgressView planning={financePlanning} today={dateKey} snapshots={dailySnapshots} completions={completions} studyLogs={studyLogs} deliveryShifts={deliveryShifts} expenses={expenses} financialRecords={financialRecords} financialGoals={financialGoals} categoryBudgets={categoryBudgets} onFinance={() => navigateTab('financeiro')} progress={progress} weeklySummary={weeklySummary} previousWeeklySummary={previousWeeklySummary} onToggle={async (item) => { try { await repository.saveProgress(item); setProgress((v) => [...v.filter((p) => p.id !== item.id), item]) } catch (error) { setMessage(readableError(error, 'Não foi possível salvar o progresso.')) } }} />}
          {tab === 'ajustes' && <SettingsView settings={settings} persistence={storagePersistence} appearanceSaving={appearanceSaving} appearanceFeedback={appearanceFeedback} onAppearance={changeAppearance} onSettings={async (next) => { const synchronizedNext: AppSettings = { ...next, theme: effectiveTheme(settings.theme), appearanceVersion: 2 }; const snapshotPlan = prepareWeekSnapshots(dailySnapshots, dateKey, synchronizedNext.preferredMode, synchronizedNext, dateKey); try { await repository.saveSettingsAndDailySnapshots(synchronizedNext, snapshotPlan.changed); setSettings(synchronizedNext); setMode(synchronizedNext.preferredMode); setDailySnapshots(snapshotPlan.all); setMessage('Ajustes salvos.') } catch (error) { setMessage(readableError(error, 'Não foi possível salvar os ajustes.')) } }} onMessage={setMessage} onImported={() => window.location.reload()} onCleared={() => window.location.reload()} />}
        </>}
        {recordsVisited && <div hidden={tab !== 'registros' || !!trainingSelection}><RecordsView accounts={financePlanning.accounts} deliverySelection={deliverySelection} kind={recordKind} onKind={setRecordKind} onExpenseRegistration={() => { setFinanceRegistration((current) => ({ intent: 'saida', revision: (current?.revision ?? 0) + 1 })); navigateTab('financeiro') }} dateKey={dateKey} shifts={deliveryShifts} expenses={expenses} financialRecords={financialRecords} studyLogs={studyLogs} onShift={saveLinkedShift} onStudy={saveLinkedStudy} /></div>}
        </Suspense>
      </main>

      <MainMenu items={navItems} actions={quickActions} current={trainingSelection ? 'treinos' : tab} onNavigate={navigateTab} onAction={runQuickAction} />
      {message && <div className="toast" role="status">{message}</div>}
      <ActivityDetailsDialog selection={detailActivity} trainingWeek={clampTrainingWeek(settings.trainingWeek)} mode={mode} onClose={() => setDetailActivity(null)} />
    </div>
  )
}












export default App
