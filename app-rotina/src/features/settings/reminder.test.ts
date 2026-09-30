import { describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_REMINDER_SETTINGS,
  millisecondsUntilNextReminder,
  readReminderSettings,
  writeReminderSettings,
} from './reminder'

describe('lembrete diário local', () => {
  it('usa valores seguros quando não há configuração válida', () => {
    expect(readReminderSettings({ getItem: () => null })).toEqual(DEFAULT_REMINDER_SETTINGS)
    expect(readReminderSettings({ getItem: () => '{inválido' })).toEqual(DEFAULT_REMINDER_SETTINGS)
    expect(readReminderSettings({ getItem: () => JSON.stringify({ enabled: true, time: '25:90' }) })).toEqual(DEFAULT_REMINDER_SETTINGS)
  })

  it('lê e grava a preferência sem usar o banco da aplicação', () => {
    const setItem = vi.fn()
    writeReminderSettings({ setItem }, { enabled: true, time: '08:30' })

    expect(setItem).toHaveBeenCalledWith('ritmo:daily-reminder:v1', JSON.stringify({ enabled: true, time: '08:30' }))
    expect(readReminderSettings({ getItem: () => JSON.stringify({ enabled: true, time: '08:30' }) })).toEqual({ enabled: true, time: '08:30' })
  })

  it('agenda para o mesmo dia quando o horário ainda não passou', () => {
    const now = new Date(2026, 8, 30, 7, 45, 0)
    expect(millisecondsUntilNextReminder(now, '08:30')).toBe(45 * 60 * 1000)
  })

  it('agenda para o dia seguinte quando o horário já passou', () => {
    const now = new Date(2026, 8, 30, 9, 0, 0)
    expect(millisecondsUntilNextReminder(now, '08:30')).toBe(23.5 * 60 * 60 * 1000)
  })
})
