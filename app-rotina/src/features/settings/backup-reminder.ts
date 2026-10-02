export const LAST_BACKUP_EXPORT_KEY = 'ritmo:last-backup-export:v1'

const BACKUP_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000

export function readLastBackupAt(storage: Pick<Storage, 'getItem'>): string | null {
  try {
    const value = storage.getItem(LAST_BACKUP_EXPORT_KEY)
    return value && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString() === value ? value : null
  } catch {
    return null
  }
}

export function writeLastBackupAt(storage: Pick<Storage, 'setItem'>, value: string) {
  storage.setItem(LAST_BACKUP_EXPORT_KEY, value)
}

export function backupReminder(now: Date, lastExportAt: string | null): { due: boolean; lastExportAt: string | null } {
  if (!lastExportAt) return { due: true, lastExportAt: null }
  const elapsed = now.getTime() - Date.parse(lastExportAt)
  if (!Number.isFinite(elapsed) || elapsed < 0) return { due: true, lastExportAt: null }
  return { due: elapsed >= BACKUP_INTERVAL_MS, lastExportAt }
}
