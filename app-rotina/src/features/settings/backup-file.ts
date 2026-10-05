import { MAX_BACKUP_BYTES } from '../../core/domain'
import type { BackupData } from '../../core/types'

export function createRestorableBackupBlob(data: BackupData): Blob {
  const contents = JSON.stringify(data, null, 2)
  const blob = new Blob([contents], { type: 'application/json' })

  if (blob.size > MAX_BACKUP_BYTES) {
    throw new Error('O backup excede o limite de 10 MB aceito para restauração.')
  }

  return blob
}
