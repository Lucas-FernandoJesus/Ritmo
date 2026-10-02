import { expect, goToTab, openAppOnTuesday, test } from './fixtures'

for (const theme of ['light', 'dark'] as const) test(`plano nutricional de consulta no tema ${theme}`, async ({ page }) => {
  await openAppOnTuesday(page)
  await goToTab(page, 'Ajustes')
  await page.getByRole('button', { name: theme === 'light' ? 'Claro' : 'Escuro', exact: true }).click()
  await goToTab(page, 'Nutrição')

  await expect(page.getByRole('heading', { name: 'Nutrição', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Déficit de 20% em calibração' })).toBeVisible()
  await expect(page.getByText('Meta calórica individual', { exact: true })).toBeVisible()
  await expect(page.getByText('0,8 × gasto de manutenção', { exact: true })).toBeVisible()
  await expect(page.getByText(/O diário de refeições não calcula calorias/)).toBeVisible()
  await expect(page.getByText('Peso a confirmar na balança', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Refeições simples para começar', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Compras para 7 dias', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Como acompanhar e ajustar', exact: true })).toBeVisible()
  const weeklyOverview = page.getByRole('region', { name: 'Resumo semanal da nutrição' })
  await expect(weeklyOverview).toBeVisible()
  await expect(weeklyOverview).toContainText('Dados ainda insuficientes')
  await expect(weeklyOverview).toContainText('Sem dados')
  const emptyMealSummary = page.getByRole('region', { name: 'Resumo das refeições do dia' })
  await expect(emptyMealSummary).toContainText('Sem dados registrados para esta data.')
  await expect(emptyMealSummary).not.toContainText('0 realizadas')
  await expect(page.locator('#main-content')).toBeFocused()
  await page.screenshot({ path: test.info().outputPath(`nutrition-${theme}.png`), fullPage: true })

  await page.setViewportSize({ width: 320, height: 568 })
  await expect(page.getByRole('heading', { name: 'Refeições simples para começar', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
  await page.screenshot({ path: test.info().outputPath(`nutrition-${theme}-mobile.png`), fullPage: true })
})

test('salva uma medida corporal no aparelho e a recupera após recarregar', async ({ page }) => {
  await openAppOnTuesday(page)
  await goToTab(page, 'Nutrição')

  const form = page.getByRole('form', { name: 'Registrar medidas' })
  await form.getByLabel('Peso').fill('100')
  await form.getByLabel('Cintura').fill('110.5')
  await form.getByRole('button', { name: 'Salvar medida', exact: true }).click()

  await expect(page.getByRole('status')).toContainText('Medida salva')
  await expect(page.getByRole('row', { name: /22\/09\/2026 100,0 kg 110,5 cm/ })).toBeVisible()
  await expect(page.locator('.nutrition-target')).toContainText('100,0 kg')
  await expect(page.locator('.nutrition-target')).not.toContainText('Sem registro')

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Um dia de cada vez.', exact: true })).toBeVisible()
  await goToTab(page, 'Nutrição')
  await expect(page.getByRole('row', { name: /22\/09\/2026 100,0 kg 110,5 cm/ })).toBeVisible()
  await expect(page.locator('.nutrition-target')).toContainText('100,0 kg')
})

test('registra o resultado de uma refeição e o recupera após recarregar', async ({ page }) => {
  await openAppOnTuesday(page)
  await goToTab(page, 'Nutrição')

  const form = page.getByRole('form', { name: 'Registrar refeição' })
  await form.getByLabel('Refeição').selectOption('lunch')
  await form.getByRole('button', { name: 'Com proteína', exact: true }).click()
  await form.getByLabel('Observação').fill('Frango, arroz e feijão')
  await form.getByRole('button', { name: 'Salvar refeição', exact: true }).click()

  await expect(page.getByRole('status')).toContainText('Refeição salva')
  await expect(page.getByRole('region', { name: 'Resumo das refeições do dia' }).getByText('1 de 4 registradas', { exact: true })).toBeVisible()
  await expect(page.getByRole('row', { name: /22\/09\/2026 Almoço Com proteína Frango, arroz e feijão/ })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Um dia de cada vez.', exact: true })).toBeVisible()
  await goToTab(page, 'Nutrição')
  await expect(page.getByRole('row', { name: /22\/09\/2026 Almoço Com proteína Frango, arroz e feijão/ })).toBeVisible()
})

test('resume duas semanas com registros existentes, sem duplicar gastos, após recarga offline', async ({ page }) => {
  await openAppOnTuesday(page)
  await page.evaluate(async () => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('rotina-local')
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      const tx = db.transaction(['bodyMeasurements', 'mealLogs', 'dailySnapshots', 'completions', 'expenses', 'financialRecords'], 'readwrite')
      const time = '2026-09-22T12:00:00.000Z'
      for (const [date, weight] of [['2026-09-10', 101], ['2026-09-12', 100], ['2026-09-17', 100], ['2026-09-19', 99]] as const) {
        tx.objectStore('bodyMeasurements').put({ id: date, localDate: date, weightKg: weight, createdAt: time, updatedAt: time })
      }
      tx.objectStore('mealLogs').put({ id: '2026-09-17:breakfast', localDate: '2026-09-17', meal: 'breakfast', outcome: 'with-protein', createdAt: time, updatedAt: time })
      tx.objectStore('mealLogs').put({ id: '2026-09-17:lunch', localDate: '2026-09-17', meal: 'lunch', outcome: 'skipped', createdAt: time, updatedAt: time })
      tx.objectStore('dailySnapshots').put({ id: '2026-09-17', localDate: '2026-09-17', mode: 'normal', activities: [{ routineItemId: 'training-test', title: 'Treino', area: 'treino', nature: 'flexivel' }], capturedAt: time })
      tx.objectStore('completions').put({ id: '2026-09-17:training-test', localDate: '2026-09-17', routineItemId: 'training-test', state: 'done', changedAt: time })
      tx.objectStore('expenses').put({ id: 'legacy-food', localDate: '2026-09-17', description: 'Mercado', category: 'Alimentação', amount: 10, createdAt: time })
      tx.objectStore('financialRecords').put({ id: 'food', localDate: '2026-09-18', description: 'Feira', category: 'Alimentação', type: 'saida', amount: 20, createdAt: time })
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    }
  }))

  await page.reload()
  await goToTab(page, 'Nutrição')
  const overview = page.getByRole('region', { name: 'Resumo semanal da nutrição' })
  await expect(overview).toContainText('99,5 kg')
  await expect(overview).toContainText('100,5 kg')
  await expect(overview).toContainText('2 de 28 registros')
  await expect(overview).toContainText('1 de 2 concluídos')
  await expect(overview).toContainText('R$ 30,00')
  await expect(overview).toContainText('As médias de peso diferem.')

  await page.evaluate(async () => navigator.serviceWorker.ready)
  await page.context().setOffline(true)
  await page.reload()
  await goToTab(page, 'Nutrição')
  await expect(page.getByRole('region', { name: 'Resumo semanal da nutrição' })).toContainText('R$ 30,00')
})
