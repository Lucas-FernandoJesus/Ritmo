import { useState } from 'react'
import {
  readReminderSettings,
  writeReminderSettings,
  type ReminderSettings as ReminderSettingsValue,
} from '../reminder'
import { REMINDER_CHANGE_EVENT } from '../useDailyReminder'

type Feedback = { kind: 'idle' | 'saved' | 'error'; message: string }

const reminderBody = 'Abra o Ritmo e confira a próxima atividade do seu dia.'

export function ReminderSettings() {
  const [draft, setDraft] = useState<ReminderSettingsValue>(() => readReminderSettings(window.localStorage))
  const [feedback, setFeedback] = useState<Feedback>({ kind: 'idle', message: draft.enabled ? `Lembrete diário ativo às ${draft.time}.` : 'Lembrete desativado neste aparelho.' })
  const supported = 'Notification' in window

  async function ensurePermission() {
    if (!supported) return false
    const permission = Notification.permission === 'default'
      ? await Notification.requestPermission()
      : Notification.permission
    return permission === 'granted'
  }

  async function save() {
    if (draft.enabled && !await ensurePermission()) {
      setFeedback({ kind: 'error', message: supported ? 'As notificações estão bloqueadas neste navegador.' : 'Este navegador não oferece notificações.' })
      return
    }
    try {
      writeReminderSettings(window.localStorage, draft)
      window.dispatchEvent(new Event(REMINDER_CHANGE_EVENT))
      setFeedback({ kind: 'saved', message: draft.enabled ? `Lembrete diário salvo para ${draft.time}.` : 'Lembrete desativado neste aparelho.' })
    } catch {
      setFeedback({ kind: 'error', message: 'Não foi possível salvar o lembrete neste aparelho.' })
    }
  }

  async function testReminder() {
    if (!await ensurePermission()) {
      setFeedback({ kind: 'error', message: supported ? 'As notificações estão bloqueadas neste navegador.' : 'Este navegador não oferece notificações.' })
      return
    }
    new Notification('Hora de retomar o seu ritmo', { body: reminderBody, tag: 'ritmo-daily-reminder-test' })
    setFeedback({ kind: 'saved', message: 'Notificação de teste enviada.' })
  }

  return <section className="settings-section reminder-settings" aria-labelledby="reminder-heading">
    <div className="section-heading">
      <div>
        <h2 id="reminder-heading">Lembrete diário</h2>
        <p className="section-description">Receba um aviso no horário escolhido enquanto o Ritmo estiver aberto.</p>
      </div>
      <button className={`toggle ${draft.enabled ? 'on' : ''}`} type="button" role="switch" aria-checked={draft.enabled} aria-label="Ativar lembrete diário" onClick={() => setDraft((current) => ({ ...current, enabled: !current.enabled }))}><span /></button>
    </div>
    <label className="reminder-time">Horário do lembrete<input type="time" aria-label="Horário do lembrete" value={draft.time} disabled={!draft.enabled} onChange={(event) => setDraft((current) => ({ ...current, time: event.target.value }))} /></label>
    <div className="settings-actions">
      <button className="primary-button" type="button" onClick={save}>Salvar lembrete</button>
      <button className="secondary-button" type="button" disabled={!draft.enabled || !supported} onClick={testReminder}>Testar lembrete</button>
    </div>
    <p className={`appearance-status ${feedback.kind}`} role={feedback.kind === 'error' ? 'alert' : 'status'} aria-live="polite">{feedback.message}</p>
    <p className="fine-print">A preferência fica somente neste dispositivo. Navegadores não permitem que esta versão avise com o app fechado.</p>
  </section>
}
