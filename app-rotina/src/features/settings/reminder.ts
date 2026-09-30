export const REMINDER_STORAGE_KEY = 'ritmo:daily-reminder:v1'

export type ReminderSettings = {
  enabled: boolean
  time: string
}

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: false,
  time: '08:00',
}

const validTime = (value: unknown): value is string => typeof value === 'string'
  && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)

export function readReminderSettings(storage: Pick<Storage, 'getItem'>): ReminderSettings {
  try {
    const raw = storage.getItem(REMINDER_STORAGE_KEY)
    if (!raw) return DEFAULT_REMINDER_SETTINGS
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_REMINDER_SETTINGS
    const value = parsed as Partial<ReminderSettings>
    if (typeof value.enabled !== 'boolean' || !validTime(value.time)) return DEFAULT_REMINDER_SETTINGS
    return { enabled: value.enabled, time: value.time }
  } catch {
    return DEFAULT_REMINDER_SETTINGS
  }
}

export function writeReminderSettings(storage: Pick<Storage, 'setItem'>, settings: ReminderSettings) {
  storage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(settings))
}

export function millisecondsUntilNextReminder(now: Date, time: string): number {
  if (!validTime(time)) throw new Error('Horário de lembrete inválido.')
  const [hours, minutes] = time.split(':').map(Number)
  const next = new Date(now)
  next.setHours(hours, minutes, 0, 0)
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1)
  return next.getTime() - now.getTime()
}
