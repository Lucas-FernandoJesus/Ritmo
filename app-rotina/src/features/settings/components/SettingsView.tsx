import { useEffect, useRef, useState } from 'react'
import { defaultSettings, localDateKey, MAX_BACKUP_BYTES, validateBackup, withScheduleStart } from '../../../core/domain'
import { createRestorableBackupBlob } from '../backup-file'
import type { AppSettings, BackupData, RoutineItem, StoragePersistence } from '../../../core/types'
import { PageTitle } from '../../../components/FormPrimitives'
import { repository } from '../../../infrastructure/repository'
import { routineItems } from '../../routine/data'
import { areaLabels } from '../../routine/view-labels'
import { backupReminder, LAST_BACKUP_EXPORT_KEY, readLastBackupAt, writeLastBackupAt } from '../backup-reminder'
import { REMINDER_STORAGE_KEY } from '../reminder'
import { effectiveTheme, type AppearanceFeedback, type EffectiveTheme } from '../theme'
import { ReminderSettings } from './ReminderSettings'

const readableError = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback
type BackupPreview = { data: BackupData; fileName: string }

function backupItemCounts(data: BackupData) {
  return [
    ['Atividades concluídas', data.completions.length],
    ['Snapshots da rotina', data.dailySnapshots?.length ?? 0],
    ['Check-ins', data.checkIns.length],
    ['Turnos de delivery', data.deliveryShifts.length],
    ['Despesas', data.expenses.length],
    ['Movimentações financeiras', data.financialRecords?.length ?? 0],
    ['Estudos', data.studyLogs.length],
    ['Etapas do plano de 30 dias', data.progress.length],
    ['Medidas corporais', data.bodyMeasurements?.length ?? 0],
    ['Refeições', data.mealLogs?.length ?? 0],
    ['Metas financeiras', data.financialGoals?.length ?? 0],
    ['Orçamentos', data.categoryBudgets?.length ?? 0],
    ['Planejamentos recorrentes', data.recurringPlans?.length ?? 0],
    ['Parcelamentos', data.installmentPlans?.length ?? 0],
    ['Contas patrimoniais', data.assetAccounts?.length ?? 0],
    ['Transferências entre contas', data.accountTransfers?.length ?? 0],
  ] as const
}

function countLabel(count: number) { return `${count} ${count === 1 ? 'registro' : 'registros'}` }

export function SettingsView({ settings, persistence, appearanceSaving, appearanceFeedback, onAppearance, onSettings, onMessage, onImported, onCleared }: { settings: AppSettings; persistence: StoragePersistence; appearanceSaving: boolean; appearanceFeedback: AppearanceFeedback; onAppearance: (theme: EffectiveTheme) => Promise<boolean>; onSettings: (settings: AppSettings) => Promise<void>; onMessage: (message: string) => void; onImported: () => void; onCleared: () => void }) {
  const [draft, setDraft] = useState(settings)
  const [lastBackupAt, setLastBackupAt] = useState(() => readLastBackupAt(window.localStorage))
  const [importPreview, setImportPreview] = useState<BackupPreview | null>(null)
  const [importing, setImporting] = useState(false)
  const previewRef = useRef<HTMLElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { if (importPreview) previewRef.current?.focus() }, [importPreview])
  const selectedTheme = effectiveTheme(settings.theme)
  const backupStatus = backupReminder(new Date(), lastBackupAt)
  const backupText = backupStatus.lastExportAt
    ? `Última exportação neste aparelho: ${new Intl.DateTimeFormat('pt-BR').format(new Date(backupStatus.lastExportAt))}.${backupStatus.due ? ' Faça um novo backup.' : ''}`
    : 'Nenhuma exportação registrada neste aparelho. Faça um backup.'
  async function updateAppearance(nextTheme: EffectiveTheme) {
    const previousTheme = selectedTheme
    setDraft((current) => ({ ...current, theme: nextTheme, appearanceVersion: 2 }))
    if (!await onAppearance(nextTheme)) setDraft((current) => ({ ...current, theme: previousTheme, appearanceVersion: 2 }))
  }
  function updateTime(item: RoutineItem, startTime: string) { setDraft((current) => withScheduleStart(current, item.id, startTime)) }
  function toggleActive(id: string) { setDraft((current) => ({ ...current, disabledActivities: current.disabledActivities.includes(id) ? current.disabledActivities.filter((item) => item !== id) : [...current.disabledActivities, id] })) }
  async function exportData() {
    try {
      const data = await repository.exportAll()
      const blob = createRestorableBackupBlob(data)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `ritmo-backup-${localDateKey()}.json`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      try {
        const exportedAt = new Date().toISOString()
        writeLastBackupAt(window.localStorage, exportedAt)
        setLastBackupAt(exportedAt)
        onMessage('Backup JSON exportado.')
      } catch {
        onMessage('Backup JSON exportado, mas não foi possível registrar a data neste aparelho.')
      }
    } catch (error) {
      onMessage(readableError(error, 'Não foi possível exportar o backup.'))
    }
  }
  async function inspectBackup(file: File) {
    setImportPreview(null)
    if (file.size > MAX_BACKUP_BYTES) {
      onMessage('O backup excede o limite de 10 MB. Nenhum dado foi alterado.')
      return
    }
    try {
      const parsed: unknown = JSON.parse(await file.text())
      if (!validateBackup(parsed)) {
        onMessage('Backup inválido ou de versão incompatível. Nenhum dado foi alterado.')
        return
      }
      setImportPreview({ data: parsed, fileName: file.name })
    } catch {
      onMessage('Não foi possível ler o arquivo. Nenhum dado foi alterado.')
    }
  }
  async function importData() {
    if (!importPreview || importing) return
    setImporting(true)
    try {
      await repository.importAll(importPreview.data)
      onImported()
    } catch (error) {
      onMessage(readableError(error, 'Não foi possível importar o backup. Nenhum dado foi alterado.'))
    } finally {
      setImporting(false)
    }
  }
  async function clearData() {
    if (!window.confirm('Esta ação apagará permanentemente os registros, o progresso e os ajustes deste aparelho, incluindo o lembrete. Continuar?')) return
    try {
      await repository.clearAll()
    } catch (error) {
      onMessage(readableError(error, 'Não foi possível apagar os dados.'))
      return
    }
    try {
      window.localStorage.removeItem(REMINDER_STORAGE_KEY)
      window.localStorage.removeItem(LAST_BACKUP_EXPORT_KEY)
    } catch {
      window.alert('Os registros foram apagados, mas não foi possível remover a preferência do lembrete. Apague os dados do site no navegador para removê-la.')
    }
    onCleared()
  }
  const storageText = persistence === 'granted' ? 'Proteção persistente concedida' : persistence === 'checking' ? 'Verificando…' : persistence === 'unsupported' ? 'O navegador não informa proteção persistente' : 'Sujeito a limpeza pelo navegador — faça backups periódicos'
  return <><PageTitle eyebrow="Preferências e dados" title="Ajustes" subtitle="Sua rotina pode mudar junto com você." />
    <section className="settings-section"><h2>Aparência</h2><p className="section-description">Escolha como o Ritmo aparece neste aparelho. A mudança é salva imediatamente.</p><div className="appearance-options" role="group" aria-label="Aparência">{([['light', 'Claro'], ['dark', 'Escuro']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={selectedTheme === value} className={selectedTheme === value ? 'selected' : ''} disabled={appearanceSaving} onClick={() => updateAppearance(value)}>{label}</button>)}</div><p className={`appearance-status ${appearanceFeedback.kind}`} role={appearanceFeedback.kind === 'error' ? 'alert' : 'status'} aria-live={appearanceFeedback.kind === 'error' ? 'assertive' : 'polite'} aria-atomic="true" aria-label="Status da aparência">{appearanceFeedback.message}</p></section>
    <section className="settings-section"><div className="section-heading"><div><h2>Atividades e horários</h2><p className="section-description">Mostre o que importa e ajuste o início de cada atividade.</p></div></div><details className="settings-disclosure"><summary>Personalizar rotina <span>{routineItems.length} atividades</span></summary><div className="settings-list">{routineItems.map((item) => { const enabled = !draft.disabledActivities.includes(item.id); return <div className="setting-row" key={item.id}><button className={`toggle ${enabled ? 'on' : ''}`} role="switch" aria-checked={enabled} aria-label={`${enabled ? 'Desativar' : 'Ativar'} ${item.title}`} onClick={() => toggleActive(item.id)}><span /></button><div><strong>{item.title}</strong><small>{areaLabels[item.area]}</small></div><input aria-label={`Horário inicial de ${item.title}`} type="time" value={draft.scheduleOverrides[item.id]?.startTime ?? item.startTime ?? ''} onChange={(e) => updateTime(item, e.target.value)} /></div> })}</div></details><div className="settings-actions"><button className="primary-button" disabled={appearanceSaving} onClick={() => onSettings({ ...draft, theme: selectedTheme, appearanceVersion: 2 })}>Salvar ajustes</button><button className="text-button" onClick={() => { if (window.confirm('Restaurar atividades, horários, ritmo e semana do treino para os padrões? Salve para confirmar a mudança.')) setDraft({ ...defaultSettings(), theme: selectedTheme }) }}>Restaurar padrões</button></div></section>
    <ReminderSettings />
    <section className="settings-section"><h2>Dados neste aparelho</h2><div className="storage-status"><span className={persistence === 'granted' ? 'status-good' : 'status-warn'} aria-hidden="true" /><div><strong>Armazenamento local</strong><p>{storageText}</p></div></div><p className={backupStatus.due ? 'backup-reminder-due' : 'backup-reminder-current'} role="status">{backupText}</p><div className="action-grid"><button className="secondary-button" onClick={exportData}>Exportar backup JSON</button><label className="secondary-button file-button">Importar backup JSON<input ref={fileInputRef} type="file" accept="application/json,.json" onChange={(e) => { const file = e.currentTarget.files?.[0]; e.currentTarget.value = ''; if (file) void inspectBackup(file) }} /></label></div><p className="fine-print">O app funciona sem conta e sem servidor. Guarde uma cópia do backup fora do celular periodicamente.</p>
      {importPreview && <section ref={previewRef} className="backup-preview" role="region" aria-labelledby="backup-preview-title" tabIndex={-1}>
        <h3 id="backup-preview-title">Prévia do backup</h3>
        <p><strong>Arquivo:</strong> {importPreview.fileName}</p>
        <p><strong>Exportado em:</strong> {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(importPreview.data.exportedAt))}</p>
        <p>Confira os volumes. Os dados atuais só serão substituídos se você confirmar.</p>
        <ul>{backupItemCounts(importPreview.data).map(([label, count]) => <li key={label}><span>{label}</span><strong>{countLabel(count)}</strong></li>)}</ul>
        <p className="backup-preview-warning">Ao importar, todos os dados atuais deste aparelho serão substituídos. Coleções que não existirem neste arquivo ficarão vazias.</p>
        <div className="finance-row-actions"><button type="button" className="danger-button" disabled={importing} onClick={() => void importData()}>{importing ? 'Importando backup…' : 'Substituir dados por este backup'}</button><button type="button" className="text-button" disabled={importing} onClick={() => { setImportPreview(null); fileInputRef.current?.focus() }}>Cancelar importação</button></div>
      </section>}
    </section>
    <section className="danger-section"><h2>Apagar todos os dados</h2><p>Remove registros, progresso, ajustes e lembrete somente deste aparelho.</p><button className="danger-button" onClick={clearData}>Apagar todos os dados</button></section></>
}
