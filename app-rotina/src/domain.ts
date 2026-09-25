import type { AppSettings, BackupData, DailyCheckIn, DailyCompletion, DeliveryShift, Expense, RoutineItem, RoutineMode, StudyLog, ThirtyDayProgress } from './types'

export const SCHEMA_VERSION = 1
export const MAX_BACKUP_BYTES = 10 * 1024 * 1024
const MAX_RECORDS_PER_STORE = 50_000

const routineModes: RoutineMode[] = ['normal', 'reduzido', 'minimo']
const expenseCategories = ['Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Lazer', 'Desenvolvimento', 'Outros'] as const
const studyAreas = ['Inglês', 'Programação', 'Leitura', 'Outro'] as const
const armConditions = ['habitual', 'alterado', 'dor'] as const
const completionStates = ['done', 'skipped'] as const
const progressStates = ['pending', 'done'] as const

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

function isLocalDate(value: unknown): value is string {
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
  return { id: 'settings', scheduleOverrides: {}, disabledActivities: [], preferredMode: 'normal', theme: 'dark', appearanceVersion: 2, schemaVersion: SCHEMA_VERSION }
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
    || !isDateTime(value.createdAt)) return false

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
    || !isValidSettings(value.settings)) return false

  const groups = [value.completions, value.checkIns, value.deliveryShifts, value.expenses, value.studyLogs, value.progress]
  if (groups.some((items) => items.length > MAX_RECORDS_PER_STORE)) return false
  if (!value.completions.every(isValidCompletion)
    || !value.checkIns.every(isValidCheckIn)
    || !value.deliveryShifts.every(isValidDeliveryShift)
    || !value.expenses.every(isValidExpense)
    || !value.studyLogs.every(isValidStudyLog)
    || !value.progress.every(isValidProgress)) return false

  return hasUnique(value.completions, (item) => item.id)
    && hasUnique(value.checkIns, (item) => item.localDate)
    && hasUnique(value.deliveryShifts, (item) => item.id)
    && hasUnique(value.expenses, (item) => item.id)
    && hasUnique(value.studyLogs, (item) => item.id)
    && hasUnique(value.progress, (item) => item.id)
}

export function formatMoney(value: number | null): string {
  return value == null || !Number.isFinite(value) ? '—' : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
