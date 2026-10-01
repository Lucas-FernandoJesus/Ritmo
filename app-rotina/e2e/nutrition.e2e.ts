import { expect, goToTab, openAppOnTuesday, test } from './fixtures'

for (const theme of ['light', 'dark'] as const) test(`plano nutricional de consulta no tema ${theme}`, async ({ page }) => {
  await openAppOnTuesday(page)
  await goToTab(page, 'Ajustes')
  await page.getByRole('button', { name: theme === 'light' ? 'Claro' : 'Escuro', exact: true }).click()
  await goToTab(page, 'Nutrição')

  await expect(page.getByRole('heading', { name: 'Nutrição', exact: true })).toBeVisible()
  await expect(page.getByText('2.200 kcal', { exact: true })).toBeVisible()
  await expect(page.getByText('120–140 g', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Seu prato na balança', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Compras para 7 dias', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Como ajustar sem perder músculo', exact: true })).toBeVisible()
  const emptyMealSummary = page.getByRole('region', { name: 'Resumo das refeições do dia' })
  await expect(emptyMealSummary).toContainText('Sem dados registrados para esta data.')
  await expect(emptyMealSummary).not.toContainText('0 realizadas')
  await expect(page.locator('#main-content')).toBeFocused()
  await page.screenshot({ path: test.info().outputPath(`nutrition-${theme}.png`), fullPage: true })

  await page.setViewportSize({ width: 320, height: 568 })
  await expect(page.getByRole('heading', { name: 'Seu prato na balança', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
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

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Um dia de cada vez.', exact: true })).toBeVisible()
  await goToTab(page, 'Nutrição')
  await expect(page.getByRole('row', { name: /22\/09\/2026 100,0 kg 110,5 cm/ })).toBeVisible()
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
