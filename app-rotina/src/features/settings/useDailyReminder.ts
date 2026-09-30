import { useEffect } from 'react'
import { millisecondsUntilNextReminder, readReminderSettings } from './reminder'

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
    window.addEventListener(REMINDER_CHANGE_EVENT, schedule)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener(REMINDER_CHANGE_EVENT, schedule)
    }
  }, [])
}
