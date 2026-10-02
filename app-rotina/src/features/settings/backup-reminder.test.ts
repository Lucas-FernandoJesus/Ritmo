import { describe, expect, it, vi } from 'vitest'
import { backupReminder, readLastBackupAt, writeLastBackupAt } from './backup-reminder'

describe('lembrete de backup local', () => {
  it('ignora datas ausentes ou inválidas', () => {
    expect(readLastBackupAt({ getItem: () => null })).toBeNull()
    expect(readLastBackupAt({ getItem: () => 'ontem' })).toBeNull()
    expect(readLastBackupAt({ getItem: () => '1' })).toBeNull()
    expect(readLastBackupAt({ getItem: () => { throw new Error('bloqueado') } })).toBeNull()
  })

  it('registra a última exportação somente neste aparelho', () => {
    const setItem = vi.fn()
    writeLastBackupAt({ setItem }, '2026-09-22T13:00:00.000Z')
    expect(setItem).toHaveBeenCalledWith('ritmo:last-backup-export:v1', '2026-09-22T13:00:00.000Z')
    expect(readLastBackupAt({ getItem: () => '2026-09-22T13:00:00.000Z' })).toBe('2026-09-22T13:00:00.000Z')
  })

  it('lembra após 30 dias e trata relógio futuro como data desconhecida', () => {
    const now = new Date('2026-10-22T13:00:00.000Z')
    expect(backupReminder(now, null)).toEqual({ due: true, lastExportAt: null })
    expect(backupReminder(now, '2026-09-23T13:00:00.000Z')).toEqual({ due: false, lastExportAt: '2026-09-23T13:00:00.000Z' })
    expect(backupReminder(now, '2026-09-22T13:00:00.000Z')).toEqual({ due: true, lastExportAt: '2026-09-22T13:00:00.000Z' })
    expect(backupReminder(now, '2026-10-23T13:00:00.000Z')).toEqual({ due: true, lastExportAt: null })
  })
})
