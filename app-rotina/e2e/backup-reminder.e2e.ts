import { expect, goToTab, openAppOnTuesday, test } from './fixtures'

test('mostra a última exportação e lembra quando o backup completa 30 dias', async ({ page }) => {
  await openAppOnTuesday(page)
  await goToTab(page, 'Ajustes')
  await expect(page.getByText('Nenhuma exportação registrada neste aparelho. Faça um backup.')).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar backup JSON' }).click()
  await downloadPromise
  await expect(page.getByText('Última exportação neste aparelho: 22/09/2026.')).toBeVisible()

  await page.reload()
  await goToTab(page, 'Ajustes')
  await expect(page.getByText('Última exportação neste aparelho: 22/09/2026.')).toBeVisible()

  await page.evaluate(() => localStorage.setItem('ritmo:last-backup-export:v1', '2026-08-22T13:00:00.000Z'))
  await page.reload()
  await goToTab(page, 'Ajustes')
  await expect(page.getByText('Última exportação neste aparelho: 22/08/2026. Faça um novo backup.')).toBeVisible()

  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'Apagar todos os dados' }).click()
  await expect(page.getByRole('heading', { name: 'Um dia de cada vez.', exact: true })).toBeVisible()
  await goToTab(page, 'Ajustes')
  await expect(page.getByText('Nenhuma exportação registrada neste aparelho. Faça um backup.')).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('ritmo:last-backup-export:v1'))).toBeNull()
})
