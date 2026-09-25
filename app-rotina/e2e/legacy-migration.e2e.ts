import { expect, test } from './fixtures'

test('adiciona snapshots sem apagar conclusões de um IndexedDB legado', async ({ page }) => {
  await page.goto('/sw.js')
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const deletion = indexedDB.deleteDatabase('rotina-local')
      deletion.onsuccess = () => resolve()
      deletion.onerror = () => reject(deletion.error)
      deletion.onblocked = () => reject(new Error('Exclusão do banco legado bloqueada.'))
    })

    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('rotina-local', 1)
      request.onupgradeneeded = () => {
        const database = request.result
        for (const name of ['completions', 'checkIns', 'deliveryShifts', 'expenses', 'studyLogs', 'progress', 'settings']) {
          database.createObjectStore(name, { keyPath: 'id' })
        }
      }
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const database = request.result
        const transaction = database.transaction(['settings', 'completions'], 'readwrite')
        transaction.objectStore('settings').put({
          id: 'settings',
          scheduleOverrides: {},
          disabledActivities: [],
          preferredMode: 'normal',
          schemaVersion: 1,
        })
        transaction.objectStore('completions').put({
          id: '2026-09-22:strength',
          localDate: '2026-09-22',
          routineItemId: 'strength',
          state: 'done',
          changedAt: '2026-09-22T10:00:00.000Z',
        })
        transaction.onerror = () => reject(transaction.error)
        transaction.oncomplete = () => {
          database.close()
          resolve()
        }
      }
    })
  })

  await page.clock.install({ time: new Date('2026-09-22T10:00:00-03:00') })
  await page.goto('/')

  await expect(page.getByRole('button', { name: 'Desmarcar Fortalecimento de corpo inteiro', exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Progresso desta semana' })).toContainText('1 de 84 atividades obrigatórias')

  const databaseState = await page.evaluate(async () => new Promise<{ stores: string[], snapshots: number }>((resolve, reject) => {
    const request = indexedDB.open('rotina-local')
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const database = request.result
      const transaction = database.transaction('dailySnapshots', 'readonly')
      const snapshotsRequest = transaction.objectStore('dailySnapshots').count()
      transaction.onerror = () => reject(transaction.error)
      transaction.oncomplete = () => {
        resolve({ stores: Array.from(database.objectStoreNames), snapshots: snapshotsRequest.result })
        database.close()
      }
    }
  }))
  expect(databaseState.stores).toContain('dailySnapshots')
  expect(databaseState.snapshots).toBe(7)
})
