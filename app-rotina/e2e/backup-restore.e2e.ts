import { readFile } from 'node:fs/promises'
import { expect, goToTab, openAppOnTuesday, test } from './fixtures'

const strengthActivity = 'Fortalecimento de corpo inteiro'

test('exporta um backup JSON válido e restaura os dados pela interface', async ({ page }, testInfo) => {
  await openAppOnTuesday(page)

  const reducedMode = page.getByRole('group', { name: 'Intensidade da rotina' })
    .getByRole('button', { name: /^Reduzido/ })
  await reducedMode.click()
  await expect(reducedMode).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: `Concluir ${strengthActivity}` }).click()
  await expect(page.getByRole('button', { name: `Desmarcar ${strengthActivity}` })).toBeVisible()

  await goToTab(page, 'Ajustes')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar backup JSON', exact: true }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('ritmo-backup-2026-09-22.json')

  const backupPath = testInfo.outputPath(download.suggestedFilename())
  await download.saveAs(backupPath)
  const backupBuffer = await readFile(backupPath)
  const backup = JSON.parse(backupBuffer.toString('utf8')) as {
    schemaVersion?: number
    exportedAt?: string
    settings?: { preferredMode?: string }
    completions?: Array<{ routineItemId?: string, state?: string }>
    dailySnapshots?: Array<{ localDate?: string, mode?: string }>
  }

  expect(backup.schemaVersion).toBeGreaterThan(0)
  expect(backup.exportedAt).toBeTruthy()
  expect(backup.settings?.preferredMode).toBe('reduzido')
  expect(backup.completions).toContainEqual(expect.objectContaining({
    routineItemId: 'strength',
    state: 'done',
  }))
  expect(backup.dailySnapshots).toHaveLength(7)
  expect(backup.dailySnapshots).toContainEqual(expect.objectContaining({ localDate: '2026-09-21', mode: 'normal' }))
  expect(backup.dailySnapshots).toContainEqual(expect.objectContaining({ localDate: '2026-09-22', mode: 'reduzido' }))

  await goToTab(page, 'Hoje')
  const normalMode = page.getByRole('group', { name: 'Intensidade da rotina' })
    .getByRole('button', { name: /^Normal/ })
  await normalMode.click()
  await expect(normalMode).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: `Desmarcar ${strengthActivity}` }).click()
  await expect(page.getByRole('button', { name: `Concluir ${strengthActivity}` })).toBeVisible()

  await goToTab(page, 'Ajustes')
  page.once('dialog', async (dialog) => {
    expect(dialog.type()).toBe('confirm')
    await dialog.accept()
  })
  const reloaded = page.waitForEvent('load')
  await page.locator('input[type="file"][accept*="json"]').setInputFiles({
    name: download.suggestedFilename(),
    mimeType: 'application/json',
    buffer: backupBuffer,
  })
  await reloaded

  await expect(page.getByRole('heading', { name: 'Um dia de cada vez.', exact: true })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Intensidade da rotina' })
    .getByRole('button', { name: /^Reduzido/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: `Desmarcar ${strengthActivity}` })).toHaveAttribute('aria-pressed', 'true')

  const restoredSnapshots = await page.evaluate(async () => new Promise<Array<{ localDate?: string, mode?: string }>>((resolve, reject) => {
    const request = indexedDB.open('rotina-local')
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const database = request.result
      const transaction = database.transaction('dailySnapshots', 'readonly')
      const snapshotsRequest = transaction.objectStore('dailySnapshots').getAll()
      transaction.onerror = () => reject(transaction.error)
      transaction.oncomplete = () => {
        resolve(snapshotsRequest.result)
        database.close()
      }
    }
  }))
  expect(restoredSnapshots).toHaveLength(7)
  expect(restoredSnapshots).toContainEqual(expect.objectContaining({ localDate: '2026-09-21', mode: 'normal' }))
  expect(restoredSnapshots).toContainEqual(expect.objectContaining({ localDate: '2026-09-22', mode: 'reduzido' }))
})
