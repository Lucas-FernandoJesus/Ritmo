import { describe, expect, it } from 'vitest'
import { defaultSettings, MAX_BACKUP_BYTES } from '../../core/domain'
import type { BackupData } from '../../core/types'
import { createRestorableBackupBlob } from './backup-file'

function emptyBackup(): BackupData {
  return {
    schemaVersion: 7,
    exportedAt: '2026-09-22T13:00:00.000Z',
    completions: [],
    checkIns: [],
    deliveryShifts: [],
    expenses: [],
    studyLogs: [],
    progress: [],
    settings: defaultSettings(),
  }
}

describe('arquivo de backup exportado', () => {
  it('produz JSON legível que pode ser restaurado pelo importador', async () => {
    const backup = emptyBackup()
    const blob = createRestorableBackupBlob(backup)

    expect(blob.type).toBe('application/json')
    expect(JSON.parse(await blob.text())).toEqual(backup)
  })

  it('interrompe exportação acima do mesmo limite aceito na importação', () => {
    const oversized = { ...emptyBackup(), exportedAt: 'x'.repeat(MAX_BACKUP_BYTES) }

    expect(() => createRestorableBackupBlob(oversized)).toThrow('excede o limite de 10 MB aceito para restauração')
  })
})
