import { expect, openAppOnTuesday, test } from './fixtures'

test('organiza os destinos em três áreas e mantém ajustes globais', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openAppOnTuesday(page)
  await page.getByRole('button', { name: 'Abrir menu principal' }).click()

  const menu = page.getByRole('dialog', { name: 'Menu principal' })
  await expect(menu.getByRole('group', { name: 'Rotina' }).getByRole('button')).toHaveText(['Hoje', 'Semana', 'Estudos', 'Progresso'])
  await expect(menu.getByRole('group', { name: 'Saúde' }).getByRole('button')).toHaveText(['Treinos', 'Nutrição'])
  await expect(menu.getByRole('group', { name: 'Trabalho e dinheiro' }).getByRole('button')).toHaveText(['Delivery', 'Financeiro'])
  await expect(menu.getByRole('button', { name: 'Ajustes', exact: true })).toBeVisible()
  await page.screenshot({ path: test.info().outputPath('areas-menu-390.png'), animations: 'disabled' })

  await menu.getByRole('button', { name: 'Estudos', exact: true }).click()
  await expect(page.getByRole('navigation', { name: 'Navegação de Rotina' }).getByRole('button', { name: 'Estudos' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('heading', { name: 'Estudos', exact: true })).toBeVisible()
  await expect(page.getByRole('form', { name: 'Registro de estudo' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Tipo de registro' })).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)

  await page.getByRole('button', { name: 'Abrir menu principal' }).click()
  await menu.getByRole('button', { name: 'Delivery', exact: true }).click()
  await expect(page.getByRole('navigation', { name: 'Navegação de Trabalho e dinheiro' }).getByRole('button', { name: 'Delivery' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('heading', { name: 'Delivery', exact: true })).toBeVisible()
  await expect(page.getByRole('form', { name: 'Turno de delivery' })).toBeVisible()
  await expect(page.getByRole('form', { name: 'Registro de estudo' })).not.toBeVisible()
})
