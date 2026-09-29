import { expect, goToTab, openAppOnTuesday, test } from './fixtures'

test('mantém os checklists na Semana e os registros de delivery e estudo em Registros', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openAppOnTuesday(page)
  await goToTab(page, 'Semana')
  await page.getByRole('group', { name: 'Escolher dia da semana' }).getByRole('button', { name: 'Dom', exact: true }).click()

  const preparation = page.getByRole('region', { name: 'Preparação do fim de semana' })
  await expect(preparation).toBeVisible()
  await expect(preparation.getByRole('heading', { name: 'Preparo de marmitas' })).toBeVisible()
  await expect(preparation.getByRole('heading', { name: 'Manutenção da casa' })).toHaveCount(0)
  const firstItem = preparation.getByRole('checkbox', { name: 'Decidir refeições de segunda a quarta' })
  await firstItem.click()
  await expect(firstItem).toBeChecked()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await page.screenshot({ path: test.info().outputPath('semana-checklists-390.png') })
  await page.getByRole('group', { name: 'Escolher dia da semana' }).getByRole('button', { name: 'Sáb', exact: true }).click()
  await expect(preparation.getByRole('heading', { name: 'Manutenção da casa' })).toBeVisible()
  await expect(preparation.getByRole('heading', { name: 'Preparo de marmitas' })).toHaveCount(0)

  await goToTab(page, 'Registros')
  const kinds = page.getByRole('group', { name: 'Tipo de registro' })
  await expect(kinds.getByRole('button', { name: 'Delivery', exact: true })).toBeVisible()
  await expect(kinds.getByRole('button', { name: 'Estudos', exact: true })).toBeVisible()
  await expect(page.getByRole('form', { name: 'Turno de delivery' })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Decidir refeições de segunda a quarta' })).toHaveCount(0)

  await goToTab(page, 'Semana')
  await page.getByRole('group', { name: 'Escolher dia da semana' }).getByRole('button', { name: 'Dom', exact: true }).click()
  await expect(preparation.getByRole('checkbox', { name: 'Decidir refeições de segunda a quarta' })).toBeChecked()
})
