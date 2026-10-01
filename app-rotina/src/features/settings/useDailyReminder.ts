import { useEffect } from 'react'
import { millisecondsUntilNextReminder, readReminderSettings, REMINDER_STORAGE_KEY } from './reminder'

export const REMINDER_CHANGE_EVENT = 'ritmo:daily-reminder-change'

const body = 'Abra o Ritmo e confira a próxima atividade do seu dia.'

export function useDailyReminder() {
  useEffect(() => {
    let timer = 0
    const schedule = () => {
      window.clearTimeout(timer)
      const settings = readReminderSettings(window.localStorage)
      if (!settings.enabled || !('Notification' in window) || Notification.permission !== 'granted') return
      timer = window.setTimeout(() => {
        new Notification('Hora de retomar o seu ritmo', { body, tag: 'ritmo-daily-reminder' })
        schedule()
      }, millisecondsUntilNextReminder(new Date(), settings.time))
    }
    schedule()
    const onStorage = (event: StorageEvent) => {
      if (event.storageArea === window.localStorage && (event.key === REMINDER_STORAGE_KEY || event.key === null)) schedule()
    }
    window.addEventListener(REMINDER_CHANGE_EVENT, schedule)
    window.addEventListener('storage', onStorage)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener(REMINDER_CHANGE_EVENT, schedule)
      window.removeEventListener('storage', onStorage)
    }
  }, [])
}
