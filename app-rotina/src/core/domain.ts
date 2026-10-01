import type { AccountTransfer, AppSettings, AssetAccount, BackupData, CategoryBudget, DailyCheckIn, DailyCompletion, DailyPlanSnapshot, DailyProgressSummary, DeliveryShift, Expense, FinancialGoal, FinancialRecord, InstallmentPlan, PaymentMethod, RecurringPlan, RoutineItem, RoutineMode, StudyLog, ThirtyDayProgress, WeeklyProgressSummary } from './types'
import { anchoredMonth, occurrenceId, recurringDate } from './finance-schedule'

export const SCHEMA_VERSION = 1
export const MAX_BACKUP_BYTES = 10 * 1024 * 1024
const MAX_RECORDS_PER_STORE = 50_000

const routineModes: RoutineMode[] = ['normal', 'reduzido', 'minimo']
const expenseCategories = ['Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Lazer', 'Desenvolvimento', 'Outros'] as const
const deliveryCostKinds = ['combustivel', 'manutencao', 'alimentacao', 'taxas', 'outros'] as const
export const paymentMethods = ['credito', 'debito', 'alimentacao'] as const satisfies readonly PaymentMethod[]
export const paymentMethodLabels: Record<PaymentMethod, string> = { credito: 'Cartão de crédito', debito: 'Débito', alimentacao: 'Alimentação' }
const financialGoalTypes = ['income', 'net-income', 'delivery-income', 'delivery-net', 'savings', 'expense-limit'] as const
const studyAreas = ['Inglês', 'Programação', 'Leitura', 'Outro'] as const
const armConditions = ['habitual', 'alterado', 'dor'] as const
const completionStates = ['done', 'skipped'] as const
const progressStates = ['pending', 'done'] as const
const routineAreas = ['sono', 'saude', 'trabalho', 'treino', 'alimentacao', 'casa', 'estudos', 'financas', 'delivery', 'lazer'] as const
const routineNatures = ['fixa', 'flexivel', 'opcional'] as const

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isString(value: unknown, maxLength = 5_000): value is string {
  return typeof value === 'string' && value.length <= maxLength
}

function isNonEmptyString(value: unknown, maxLength = 1_000): value is string {
  return isString(value, maxLength) && value.trim().length > 0
}

function isOptionalString(value: unknown, maxLength = 5_000): value is string | undefined {
  return value === undefined || isString(value, maxLength)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isNonNegativeNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0
}

function isNullableNonNegative(value: unknown): value is number | null {
  return value === null || isNonNegativeNumber(value)
}

function isNullableFinite(value: unknown): value is number | null {
  return value === null || isFiniteNumber(value)
}

function isOneOf<T extends readonly unknown[]>(value: unknown, allowed: T): value is T[number] {
  return allowed.includes(value)
}

function isSafeId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/.test(value)
}

export function isLocalDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(year, month - 1, day)
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day
}

function isDateTime(value: unknown): value is string {
  return typeof value === 'string'
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
    && isLocalDate(value.slice(0, 10))
    && Number.isFinite(Date.parse(value))
}

function isTime(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

function hasUnique<T>(items: T[], key: (item: T) => string): boolean {
  const keys = items.map(key)
  return new Set(keys).size === keys.length
}

function sameCalculatedValue(actual: number | null, expected: number | null): boolean {
  if (actual === null || expected === null) return actual === expected
  return Math.abs(actual - expected) < 0.000_001
}

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function filterRoutineForDay(items: RoutineItem[], day: number, mode: RoutineMode, settings: AppSettings): RoutineItem[] {
  return items
    .filter((item) => item.active && item.days.includes(day as 0 | 1 | 2 | 3 | 4 | 5 | 6))
    .filter((item) => item.modes.includes(mode))
    .filter((item) => !settings.disabledActivities.includes(item.id))
    .map((item) => ({ ...item, ...settings.scheduleOverrides[item.id] }))
    .sort((a, b) => (a.startTime ?? '99:99').localeCompare(b.startTime ?? '99:99'))
}

function parseLocalDate(localDate: string): Date {
  const [year, month, day] = localDate.split('-').map(Number)
  return new Date(year, month - 1, day, 12)
}

function addLocalDays(localDate: string, amount: number): string {
  const date = parseLocalDate(localDate)
  date.setDate(date.getDate() + amount)
  return localDateKey(date)
}

export function weekBounds(localDate: string): { weekStart: string, weekEnd: string } {
  const day = parseLocalDate(localDate).getDay()
  const daysSinceMonday = (day + 6) % 7
  const weekStart = addLocalDays(localDate, -daysSinceMonday)
  return { weekStart, weekEnd: addLocalDays(weekStart, 6) }
}

export function createDailyPlanSnapshot(localDate: string, mode: RoutineMode, items: RoutineItem[], settings: AppSettings, capturedAt = new Date().toISOString()): DailyPlanSnapshot {
  const day = parseLocalDate(localDate).getDay()
  const activities = filterRoutineForDay(items, day, mode, settings).map((item) => ({
    routineItemId: item.id,
    title: item.title,
    area: item.area,
    nature: item.nature,
    ...(item.startTime ? { startTime: item.startTime } : {}),
    ...(item.endTime ? { endTime: item.endTime } : {}),
  }))
  return { id: localDate, localDate, mode, activities, capturedAt }
}

export function summarizeDailyProgress(snapshot: DailyPlanSnapshot, completions: DailyCompletion[]): DailyProgressSummary {
  const requiredIds = new Set(snapshot.activities.filter((activity) => activity.nature !== 'opcional').map((activity) => activity.routineItemId))
  const completedIds = new Set(completions
    .filter((completion) => completion.localDate === snapshot.localDate && completion.state === 'done' && requiredIds.has(completion.routineItemId))
    .map((completion) => completion.routineItemId))
  const requiredCount = requiredIds.size
  const completedRequiredCount = completedIds.size
  return {
    planned: requiredCount > 0,
    completed: requiredCount > 0 && completedRequiredCount === requiredCount,
    requiredCount,
    completedRequiredCount,
  }
}

export function summarizeWeeklyProgress(localDate: string, snapshots: DailyPlanSnapshot[], completions: DailyCompletion[]): WeeklyProgressSummary {
  const { weekStart, weekEnd } = weekBounds(localDate)
  const daily = snapshots
    .filter((snapshot) => snapshot.localDate >= weekStart && snapshot.localDate <= localDate)
    .map((snapshot) => summarizeDailyProgress(snapshot, completions))
    .filter((summary) => summary.planned)
  const requiredActivities = daily.reduce((total, summary) => total + summary.requiredCount, 0)
  const completedRequiredActivities = daily.reduce((total, summary) => total + summary.completedRequiredCount, 0)
  return {
    weekStart,
    weekEnd,
    plannedDays: daily.length,
    completedDays: daily.filter((summary) => summary.completed).length,
    requiredActivities,
    completedRequiredActivities,
    activityPercentage: requiredActivities ? Math.round(completedRequiredActivities / requiredActivities * 100) : 0,
  }
}

type LinkableRecord =
  | { kind: 'study', area: StudyLog['area'] }
  | { kind: 'delivery', startTime: string, endTime: string }
  | { kind: 'expense' }

const studyActivityIds: Partial<Record<StudyLog['area'], string>> = {
  'Inglês': 'english',
  'Programação': 'programming',
  'Leitura': 'short-study',
}

function timeRangesOverlap(firstStart: string, firstEnd: string, secondStart: string, secondEnd: string): boolean {
  return firstStart < secondEnd && firstEnd > secondStart
}

export function findLinkedActivityId(snapshot: DailyPlanSnapshot, record: LinkableRecord): string | null {
  if (record.kind === 'study') {
    const expectedId = studyActivityIds[record.area]
    if (!expectedId) return null
    const candidates = snapshot.activities.filter((activity) => activity.routineItemId === expectedId)
    return candidates.length === 1 ? candidates[0].routineItemId : null
  }

  if (record.kind === 'expense') {
    const candidates = snapshot.activities.filter((activity) => activity.area === 'financas')
    return candidates.length === 1 ? candidates[0].routineItemId : null
  }

  const candidates = snapshot.activities.filter((activity) => activity.area === 'delivery')
  if (candidates.length === 1) return candidates[0].routineItemId
  const matching = candidates.filter((activity) => activity.startTime && activity.endTime
    && timeRangesOverlap(record.startTime, record.endTime, activity.startTime, activity.endTime))
  return matching.length === 1 ? matching[0].routineItemId : null
}

export function rideSafety(checkIn: DailyCheckIn | null): { allowed: boolean; reason: string } {
  if (!checkIn || [checkIn.enoughSleep, checkIn.fatigueLevel, checkIn.armCondition, checkIn.safeToRide].some((value) => value === null)) {
    return { allowed: false, reason: 'Complete a checagem antes de decidir pilotar.' }
  }
  if (!checkIn.enoughSleep) return { allowed: false, reason: 'Sono insuficiente: não inicie o delivery.' }
  if ((checkIn.fatigueLevel ?? 0) >= 2) return { allowed: false, reason: 'Cansaço relevante: descanse e não pilote.' }
  if (checkIn.armCondition !== 'habitual') return { allowed: false, reason: 'Braço com alteração ou dor: não pilote e procure orientação adequada.' }
  if (!checkIn.safeToRide) return { allowed: false, reason: 'Sem controle seguro da moto: não pilote.' }
  return { allowed: true, reason: 'Checagem compatível com pilotagem; reavalie se algo mudar.' }
}

export function rideSafetyForDate(checkIn: DailyCheckIn | null, localDate: string) {
  return rideSafety(checkIn?.localDate === localDate ? checkIn : null)
}

const nonNegativeOrNull = (value: number | null | undefined) => value == null || !Number.isFinite(value) || value < 0 ? null : value

export function shiftDuration(startTime: string, endTime: string): number | null {
  if (!isTime(startTime) || !isTime(endTime)) return null
  const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3))
  const difference = minutes(endTime) - minutes(startTime)
  return (difference < 0 ? difference + 24 * 60 : difference) / 60
}

export function calculateDelivery(input: Pick<DeliveryShift, 'grossRevenue' | 'fuelCost' | 'maintenanceReserve' | 'otherExpenses' | 'hours' | 'kilometers'>) {
  const revenue = nonNegativeOrNull(input.grossRevenue)
  const costs = [input.fuelCost, input.maintenanceReserve, input.otherExpenses].map(nonNegativeOrNull)
  if (revenue === null || costs.some((value) => value === null)) {
    return { estimatedResult: null, resultPerHour: null, resultPerKilometer: null }
  }
  const estimatedResult = revenue - (costs as number[]).reduce((sum, value) => sum + value, 0)
  if (!Number.isFinite(estimatedResult)) return { estimatedResult: null, resultPerHour: null, resultPerKilometer: null }
  const hours = nonNegativeOrNull(input.hours)
  const kilometers = nonNegativeOrNull(input.kilometers)
  const resultPerHour = hours && hours > 0 ? estimatedResult / hours : null
  const resultPerKilometer = kilometers && kilometers > 0 ? estimatedResult / kilometers : null
  return { estimatedResult, resultPerHour, resultPerKilometer }
}

export function defaultSettings(): AppSettings {
  return { id: 'settings', scheduleOverrides: {}, disabledActivities: [], preferredMode: 'normal', trainingWeek: 1, theme: 'dark', appearanceVersion: 2, schemaVersion: SCHEMA_VERSION }
}

export function upgradeAppearance(settings: AppSettings): AppSettings {
  if (settings.appearanceVersion === 2) return settings
  return { ...settings, theme: settings.theme === 'light' || settings.theme === 'dark' ? settings.theme : 'dark', appearanceVersion: 2 }
}

export function withScheduleStart(settings: AppSettings, itemId: string, startTime: string): AppSettings {
  const overrides = { ...settings.scheduleOverrides }
  const next = { ...overrides[itemId] }
  delete next.startTime
  if (startTime) next.startTime = startTime
  if (Object.keys(next).length) overrides[itemId] = next
  else delete overrides[itemId]
  return { ...settings, scheduleOverrides: overrides }
}

export function summarizePlanProgress(progress: ThirtyDayProgress[], plan: readonly { week: number; items: readonly string[] }[]) {
  const validIds = new Set(plan.flatMap((stage) => stage.items.map((_, index) => `week-${stage.week}-${index}`)))
  const completedIds = new Set(progress.filter((item) => item.state === 'done' && validIds.has(item.id)).map((item) => item.id))
  const total = validIds.size
  return { completedIds, total, completedCount: completedIds.size, percentage: total ? Math.round(completedIds.size / total * 100) : 0 }
}

export function recentRecords<T extends { createdAt: string }>(records: readonly T[], limit: number): T[] {
  return [...records].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, limit)
}

export function isValidSettings(value: unknown): value is AppSettings {
  if (!isObject(value)
    || value.id !== 'settings'
    || value.schemaVersion !== SCHEMA_VERSION
    || !isOneOf(value.preferredMode, routineModes)
    || (value.trainingWeek !== undefined && (!Number.isInteger(value.trainingWeek) || !isFiniteNumber(value.trainingWeek) || value.trainingWeek < 1 || value.trainingWeek > 24))
    || (value.theme !== undefined && !isOneOf(value.theme, ['system', 'light', 'dark'] as const))
    || (value.appearanceVersion !== undefined && value.appearanceVersion !== 2)
    || !Array.isArray(value.disabledActivities)
    || !value.disabledActivities.every(isSafeId)
    || !hasUnique(value.disabledActivities, (item) => item)
    || !isObject(value.scheduleOverrides)) return false

  return Object.entries(value.scheduleOverrides).every(([id, override]) => {
    if (!isSafeId(id) || !isObject(override)) return false
    return (override.startTime === undefined || isTime(override.startTime))
      && (override.endTime === undefined || isTime(override.endTime))
  })
}

export function isValidCompletion(value: unknown): value is DailyCompletion {
  if (!isObject(value)
    || !isSafeId(value.id)
    || !isLocalDate(value.localDate)
    || !isSafeId(value.routineItemId)
    || !isOneOf(value.state, completionStates)
    || !isDateTime(value.changedAt)
    || !isOptionalString(value.note)) return false
  return value.id === `${value.localDate}:${value.routineItemId}`
}

export function isValidDailyPlanSnapshot(value: unknown): value is DailyPlanSnapshot {
  if (!isObject(value)
    || !isSafeId(value.id)
    || !isLocalDate(value.localDate)
    || value.id !== value.localDate
    || !isOneOf(value.mode, routineModes)
    || !isDateTime(value.capturedAt)
    || !Array.isArray(value.activities)
    || value.activities.length > 1_000) return false

  const activities = value.activities
  if (!activities.every((activity) => isObject(activity)
    && isSafeId(activity.routineItemId)
    && isNonEmptyString(activity.title)
    && isOneOf(activity.area, routineAreas)
    && isOneOf(activity.nature, routineNatures)
    && (activity.startTime === undefined || isTime(activity.startTime))
    && (activity.endTime === undefined || isTime(activity.endTime)))) return false

  return hasUnique(activities, (activity) => activity.routineItemId as string)
}

export function isValidCheckIn(value: unknown): value is DailyCheckIn {
  return isObject(value)
    && isLocalDate(value.localDate)
    && (value.enoughSleep === null || typeof value.enoughSleep === 'boolean')
    && (value.fatigueLevel === null || isOneOf(value.fatigueLevel, [0, 1, 2, 3] as const))
    && (value.armCondition === null || isOneOf(value.armCondition, armConditions))
    && (value.safeToRide === null || typeof value.safeToRide === 'boolean')
    && isOptionalString(value.note)
}

export function isValidDeliveryShift(value: unknown): value is DeliveryShift {
  if (!isObject(value)
    || !isSafeId(value.id)
    || !isLocalDate(value.localDate)
    || !isTime(value.startTime)
    || !isTime(value.endTime)
    || !isNullableNonNegative(value.hours)
    || !isNullableNonNegative(value.kilometers)
    || !isNullableNonNegative(value.grossRevenue)
    || !isNullableNonNegative(value.fuelCost)
    || !isNullableNonNegative(value.maintenanceReserve)
    || !isNullableNonNegative(value.otherExpenses)
    || !isNullableFinite(value.estimatedResult)
    || !isNullableFinite(value.resultPerHour)
    || !isNullableFinite(value.resultPerKilometer)
    || (value.fatigueLevel !== null && !isOneOf(value.fatigueLevel, [0, 1, 2, 3] as const))
    || (value.armCondition !== null && !isOneOf(value.armCondition, armConditions))
    || !isOptionalString(value.note)
    || !isDateTime(value.createdAt)
    || (value.accountId !== undefined && !isSafeId(value.accountId))
    || (value.paymentMethod !== undefined && !isOneOf(value.paymentMethod, paymentMethods))) return false

  const calculated = calculateDelivery(value as unknown as DeliveryShift)
  return sameCalculatedValue(value.estimatedResult as number | null, calculated.estimatedResult)
    && sameCalculatedValue(value.resultPerHour as number | null, calculated.resultPerHour)
    && sameCalculatedValue(value.resultPerKilometer as number | null, calculated.resultPerKilometer)
}

export function isValidExpense(value: unknown): value is Expense {
  return isObject(value)
    && isSafeId(value.id)
    && isLocalDate(value.localDate)
    && isNonEmptyString(value.description)
    && isOneOf(value.category, expenseCategories)
    && isNonNegativeNumber(value.amount)
    && Number.isSafeInteger(Math.round(value.amount * 100))
    && isDateTime(value.createdAt)
    && (value.deliveryShiftId === undefined || isSafeId(value.deliveryShiftId))
    && (value.deliveryCostKind === undefined || (isSafeId(value.deliveryShiftId) && isOneOf(value.deliveryCostKind, deliveryCostKinds)))
    && isOptionalString(value.note)
    && (value.accountId === undefined || isSafeId(value.accountId))
    && (value.paymentMethod === undefined || isOneOf(value.paymentMethod, paymentMethods))
}

export function isValidFinancialRecord(value: unknown): value is FinancialRecord {
  return isObject(value)
    && isSafeId(value.id)
    && isLocalDate(value.localDate)
    && isNonEmptyString(value.description)
    && isOneOf(value.category, expenseCategories)
    && isOneOf(value.type, ['entrada', 'saida', 'credito', 'pendencia'] as const)
    && isNonNegativeNumber(value.amount)
    && Number.isSafeInteger(Math.round(value.amount * 100))
    && (value.deliveryShiftId === undefined || (isSafeId(value.deliveryShiftId) && (value.type === 'saida' || value.type === 'pendencia')))
    && (value.deliveryCostKind === undefined || (isSafeId(value.deliveryShiftId) && isOneOf(value.deliveryCostKind, deliveryCostKinds) && (value.type === 'saida' || value.type === 'pendencia')))
    && isOptionalString(value.note)
    && isDateTime(value.createdAt)
    && (value.updatedAt === undefined || isDateTime(value.updatedAt))
    && (value.accountId === undefined || isSafeId(value.accountId))
    && (value.paymentMethod === undefined || isOneOf(value.paymentMethod, paymentMethods))
    && (value.liabilityAccountId === undefined || (isSafeId(value.liabilityAccountId) && (value.type === 'saida' || value.type === 'pendencia')))
    && (value.planningRef === undefined || (isObject(value.planningRef)
      && isOneOf(value.planningRef.kind, ['recurring', 'installment'] as const)
      && isSafeId(value.planningRef.planId) && isSafeId(value.planningRef.key)
      && isLocalDate(value.planningRef.dueDate)
      && value.id === occurrenceId(value.planningRef as unknown as FinancialRecord['planningRef'] & object)))
}

function isMoneyAmount(value: unknown, positive = false): value is number {
  return isNonNegativeNumber(value) && Number.isSafeInteger(Math.round(value * 100))
    && Math.abs(value * 100 - Math.round(value * 100)) < .000001 && (!positive || value >= .01)
}
function isFinancialEntity(value: Record<string, unknown>): boolean {
  return isSafeId(value.id) && value.id.length <= 100 && isDateTime(value.createdAt) && isDateTime(value.updatedAt) && Date.parse(value.updatedAt) >= Date.parse(value.createdAt)
}
function validPlanAccounts(value: Record<string, unknown>): boolean {
  return (value.accountId === undefined || isSafeId(value.accountId))
    && (value.liabilityAccountId === undefined || (isSafeId(value.liabilityAccountId) && (value.type === undefined || value.type === 'saida' || value.type === 'pendencia')))
}
export function isValidRecurringPlan(value: unknown): value is RecurringPlan {
  return isObject(value) && isFinancialEntity(value) && isNonEmptyString(value.name, 200)
    && isOneOf(value.type, ['entrada', 'saida', 'credito', 'pendencia'] as const) && isOneOf(value.category, expenseCategories)
    && isMoneyAmount(value.amount, true) && isOneOf(value.frequency, ['weekly', 'monthly', 'yearly'] as const)
    && isLocalDate(value.startDate) && (value.endDate === undefined || (isLocalDate(value.endDate) && value.endDate >= value.startDate))
    && typeof value.active === 'boolean' && validPlanAccounts(value)
    && (value.paymentMethod === undefined || ((value.type === 'saida' || value.type === 'pendencia') && isOneOf(value.paymentMethod, paymentMethods)))
}
export function isValidInstallmentPlan(value: unknown): value is InstallmentPlan {
  return isObject(value) && isFinancialEntity(value) && isNonEmptyString(value.name, 200) && isOneOf(value.category, expenseCategories)
    && isMoneyAmount(value.total, true) && isFiniteNumber(value.count) && Number.isInteger(value.count) && value.count >= 1 && value.count <= 600
    && Math.round(value.total * 100) >= value.count && isLocalDate(value.firstDueDate) && typeof value.active === 'boolean' && validPlanAccounts(value)
}
export function isValidAssetAccount(value: unknown): value is AssetAccount {
  return isObject(value) && isFinancialEntity(value) && isNonEmptyString(value.name, 200)
    && isOneOf(value.kind, ['cash', 'bank', 'savings', 'reserve', 'investment', 'liability'] as const)
    && isMoneyAmount(value.openingBalance) && isLocalDate(value.openingDate)
}
export function isValidAccountTransfer(value: unknown): value is AccountTransfer {
  return isObject(value) && isFinancialEntity(value) && isSafeId(value.fromAccountId) && isSafeId(value.toAccountId)
    && value.fromAccountId !== value.toAccountId && isMoneyAmount(value.amount, true) && isLocalDate(value.localDate)
    && (value.voidedAt === undefined || isDateTime(value.voidedAt))
}

// Usada antes de restore e em transações de gravação. Não altera os objetos.
export function validFinanceReferences(data: Pick<BackupData, 'financialRecords' | 'expenses' | 'recurringPlans' | 'installmentPlans' | 'assetAccounts' | 'accountTransfers'> & { deliveryShifts?: DeliveryShift[] }): boolean {
  const accounts = new Map((data.assetAccounts ?? []).map(a => [a.id, a]))
  const recurrences = new Map((data.recurringPlans ?? []).map(p => [p.id, p]))
  const installments = new Map((data.installmentPlans ?? []).map(p => [p.id, p]))
  const linked = [...data.expenses, ...data.financialRecords ?? [], ...data.recurringPlans ?? [], ...data.installmentPlans ?? [], ...data.deliveryShifts ?? []]
  if (linked.some(item => item.accountId && (!accounts.has(item.accountId) || accounts.get(item.accountId)?.kind === 'liability'))) return false
  if ([...data.financialRecords ?? [], ...data.recurringPlans ?? [], ...data.installmentPlans ?? []].some(item => item.liabilityAccountId && accounts.get(item.liabilityAccountId)?.kind !== 'liability')) return false
  if ((data.accountTransfers ?? []).some(t => {
    const from = accounts.get(t.fromAccountId), to = accounts.get(t.toAccountId)
    return !from || !to || from.kind === 'liability' || to.kind === 'liability' || t.localDate < from.openingDate || t.localDate < to.openingDate
  })) return false
  return (data.financialRecords ?? []).every(record => {
    const ref = record.planningRef
    if (!ref) return true
    if (ref.kind === 'installment') {
      const plan = installments.get(ref.planId), index = Number(ref.key)
      if (!plan || !Number.isInteger(index) || index < 1 || index > plan.count || String(index) !== ref.key) return false
      const totalCents = Math.round(plan.total * 100), expectedCents = Math.floor(totalCents / plan.count) + (index <= totalCents % plan.count ? 1 : 0)
      return (record.type === 'saida' || record.type === 'pendencia') && Math.round(record.amount * 100) === expectedCents && ref.dueDate === anchoredMonth(plan.firstDueDate, index - 1)
    }
    const plan = recurrences.get(ref.planId)
    if (!plan || ref.key !== ref.dueDate || ref.dueDate < plan.startDate || (plan.endDate && ref.dueDate > plan.endDate)) return false
    if (record.type !== plan.type && !(plan.type === 'credito' && record.type === 'entrada') && !(plan.type === 'pendencia' && record.type === 'saida')) return false
    const start = plan.startDate.split('-').map(Number), due = ref.dueDate.split('-').map(Number)
    const index = plan.frequency === 'weekly' ? Math.round((Date.parse(`${ref.dueDate}T12:00:00Z`) - Date.parse(`${plan.startDate}T12:00:00Z`)) / 604800000)
      : plan.frequency === 'yearly' ? due[0] - start[0] : (due[0] - start[0]) * 12 + due[1] - start[1]
    return recurringDate(plan, index) === ref.dueDate
  })
}

export function categoryBudgetId(month: string, category: CategoryBudget['category'], costKind?: CategoryBudget['deliveryCostKind']): string {
  return `budget:${month}:${costKind ? `delivery-${costKind}` : `category-${expenseCategories.indexOf(category)}`}`
}

export function isValidFinancialGoal(value: unknown): value is FinancialGoal {
  return isObject(value) && isSafeId(value.id) && isNonEmptyString(value.name, 200)
    && isOneOf(value.type, financialGoalTypes) && isNonNegativeNumber(value.target) && value.target > 0
    && Number.isSafeInteger(Math.round(value.target * 100)) && Math.round(value.target * 100) > 0
    && isLocalDate(value.startDate) && isLocalDate(value.endDate) && value.startDate <= value.endDate
    && isDateTime(value.createdAt)
}

export function isValidCategoryBudget(value: unknown): value is CategoryBudget {
  return isObject(value) && typeof value.month === 'string' && isLocalDate(`${value.month}-01`)
    && isOneOf(value.category, expenseCategories)
    && (value.deliveryCostKind === undefined || isOneOf(value.deliveryCostKind, deliveryCostKinds))
    && value.id === categoryBudgetId(value.month, value.category, value.deliveryCostKind as CategoryBudget['deliveryCostKind'])
    && isNonNegativeNumber(value.limit) && value.limit > 0
    && Number.isSafeInteger(Math.round(value.limit * 100)) && Math.round(value.limit * 100) > 0
    && isDateTime(value.createdAt)
}

export function isValidStudyLog(value: unknown): value is StudyLog {
  return isObject(value)
    && isSafeId(value.id)
    && isLocalDate(value.localDate)
    && isOneOf(value.area, studyAreas)
    && Number.isInteger(value.minutes)
    && isFiniteNumber(value.minutes)
    && value.minutes > 0
    && isNonEmptyString(value.content)
    && isOptionalString(value.note)
    && isDateTime(value.createdAt)
}

export function isValidProgress(value: unknown): value is ThirtyDayProgress {
  if (!isObject(value)
    || !isSafeId(value.id)
    || !isOneOf(value.week, [1, 2, 3, 4] as const)
    || !isNonEmptyString(value.item)
    || !isOneOf(value.state, progressStates)
    || (value.completedAt !== undefined && !isDateTime(value.completedAt))) return false
  return value.state === 'done' ? isDateTime(value.completedAt) : value.completedAt === undefined
}

export function validateBackup(value: unknown): value is BackupData {
  if (!isObject(value)
    || value.schemaVersion !== SCHEMA_VERSION
    || !isDateTime(value.exportedAt)
    || !Array.isArray(value.completions)
    || !Array.isArray(value.checkIns)
    || !Array.isArray(value.deliveryShifts)
    || !Array.isArray(value.expenses)
    || !Array.isArray(value.studyLogs)
    || !Array.isArray(value.progress)
    || (value.financialRecords !== undefined && !Array.isArray(value.financialRecords))
    || (value.financialGoals !== undefined && !Array.isArray(value.financialGoals))
    || (value.categoryBudgets !== undefined && !Array.isArray(value.categoryBudgets))
    || (value.recurringPlans !== undefined && !Array.isArray(value.recurringPlans))
    || (value.installmentPlans !== undefined && !Array.isArray(value.installmentPlans))
    || (value.assetAccounts !== undefined && !Array.isArray(value.assetAccounts))
    || (value.accountTransfers !== undefined && !Array.isArray(value.accountTransfers))
    || (value.dailySnapshots !== undefined && !Array.isArray(value.dailySnapshots))
    || !isValidSettings(value.settings)) return false

  const dailySnapshots = value.dailySnapshots ?? []
  const financialRecords = value.financialRecords ?? []
  const financialGoals = value.financialGoals ?? []
  const categoryBudgets = value.categoryBudgets ?? []
  const recurringPlans = value.recurringPlans ?? [], installmentPlans = value.installmentPlans ?? [], assetAccounts = value.assetAccounts ?? [], accountTransfers = value.accountTransfers ?? []
  const groups = [value.completions, dailySnapshots, value.checkIns, value.deliveryShifts, value.expenses, financialRecords, financialGoals, categoryBudgets, recurringPlans, installmentPlans, assetAccounts, accountTransfers, value.studyLogs, value.progress]
  if (groups.some((items) => items.length > MAX_RECORDS_PER_STORE)) return false
  if (!value.completions.every(isValidCompletion)
    || !dailySnapshots.every(isValidDailyPlanSnapshot)
    || !value.checkIns.every(isValidCheckIn)
    || !value.deliveryShifts.every(isValidDeliveryShift)
    || !value.expenses.every(isValidExpense)
    || !financialRecords.every(isValidFinancialRecord)
    || !financialGoals.every(isValidFinancialGoal)
    || !categoryBudgets.every(isValidCategoryBudget)
    || !recurringPlans.every(isValidRecurringPlan) || !installmentPlans.every(isValidInstallmentPlan)
    || !assetAccounts.every(isValidAssetAccount) || !accountTransfers.every(isValidAccountTransfer)
    || !value.studyLogs.every(isValidStudyLog)
    || !value.progress.every(isValidProgress)) return false

  const shiftIds = new Set(value.deliveryShifts.map((item) => item.id))
  if ([...value.expenses, ...financialRecords].some((item) => item.deliveryShiftId !== undefined && !shiftIds.has(item.deliveryShiftId))) return false
  if (!validFinanceReferences({ expenses: value.expenses, financialRecords, recurringPlans, installmentPlans, assetAccounts, accountTransfers, deliveryShifts: value.deliveryShifts })) return false
  return hasUnique(value.completions, (item) => item.id)
    && hasUnique(dailySnapshots, (item) => item.id)
    && hasUnique(value.checkIns, (item) => item.localDate)
    && hasUnique(value.deliveryShifts, (item) => item.id)
    && hasUnique(value.expenses, (item) => item.id)
    && hasUnique(financialRecords, (item) => item.id)
    && hasUnique(financialGoals, (item) => item.id)
    && hasUnique(categoryBudgets, (item) => item.id)
    && hasUnique(recurringPlans, (item) => item.id) && hasUnique(installmentPlans, (item) => item.id)
    && hasUnique(assetAccounts, (item) => item.id) && hasUnique(accountTransfers, (item) => item.id)
    && hasUnique(value.studyLogs, (item) => item.id)
    && hasUnique(value.progress, (item) => item.id)
}

export function formatMoney(value: number | null): string {
  return value == null || !Number.isFinite(value) ? '—' : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function paymentMethodLabel(value?: PaymentMethod): string {
  return value ? paymentMethodLabels[value] : 'Sem informação'
}
