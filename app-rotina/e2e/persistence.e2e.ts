import { expect, openAppOnTuesday, test } from './fixtures'

const strengthActivity = 'Fortalecimento de corpo inteiro'

test('mantém modo e conclusão no IndexedDB após recarregar', async ({ page }) => {
  await openAppOnTuesday(page)

  const reducedMode = page.getByRole('group', { name: 'Intensidade da rotina' })
    .getByRole('button', { name: /^Reduzido/ })
  await reducedMode.click()
  await expect(reducedMode).toHaveAttribute('aria-pressed', 'true')

  await page.getByRole('button', { name: `Concluir ${strengthActivity}` }).click()
  await expect(page.getByRole('button', { name: `Desmarcar ${strengthActivity}` })).toHaveAttribute('aria-pressed', 'true')

  await page.reload()

  await expect(page.getByRole('group', { name: 'Intensidade da rotina' })
    .getByRole('button', { name: /^Reduzido/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: `Desmarcar ${strengthActivity}` })).toHaveAttribute('aria-pressed', 'true')

  const snapshot = await page.evaluate(async () => new Promise<{
    stores: string[]
    preferredMode?: string
    completions: Array<{ routineItemId?: string, state?: string }>
    dailySnapshots: Array<{ localDate?: string, mode?: string }>
  }>((resolve, reject) => {
    const request = indexedDB.open('rotina-local')
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const database = request.result
      const stores = Array.from(database.objectStoreNames)
      const transaction = database.transaction(['settings', 'completions', 'dailySnapshots'], 'readonly')
      const settingsRequest = transaction.objectStore('settings').get('settings')
      const completionsRequest = transaction.objectStore('completions').getAll()
      const snapshotsRequest = transaction.objectStore('dailySnapshots').getAll()

      transaction.onerror = () => reject(transaction.error)
      transaction.oncomplete = () => {
        const settings = settingsRequest.result as { preferredMode?: string } | undefined
        resolve({
          stores,
          preferredMode: settings?.preferredMode,
          completions: completionsRequest.result as Array<{ routineItemId?: string, state?: string }>,
          dailySnapshots: snapshotsRequest.result as Array<{ localDate?: string, mode?: string }>,
        })
        database.close()
      }
    }
  }))

  expect(snapshot.stores).toEqual(expect.arrayContaining(['settings', 'completions', 'dailySnapshots']))
  expect(snapshot.preferredMode).toBe('reduzido')
  expect(snapshot.completions).toContainEqual(expect.objectContaining({
    routineItemId: 'strength',
    state: 'done',
  }))
  expect(snapshot.dailySnapshots).toHaveLength(7)
  expect(snapshot.dailySnapshots).toContainEqual(expect.objectContaining({ localDate: '2026-09-21', mode: 'normal' }))
  expect(snapshot.dailySnapshots).toContainEqual(expect.objectContaining({ localDate: '2026-09-22', mode: 'reduzido' }))
})
