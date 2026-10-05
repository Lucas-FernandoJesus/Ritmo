import { expect, goToTab, openAppOnTuesday, test } from './fixtures'

test('exporta um relatório financeiro PDF válido pela interface', async ({ page }, testInfo) => {
  await openAppOnTuesday(page)
  await goToTab(page, 'Financeiro')
  await page.getByRole('navigation', { name: 'Áreas do Financeiro' }).getByRole('button', { name: 'Ferramentas', exact: true }).click()
  await page.getByRole('group', { name: 'Ferramentas financeiras' }).getByRole('button', { name: 'Exportações', exact: true }).click()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar PDF', exact: true }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('rotina-financeiro-2026-09-01-2026-09-30.pdf')

  const path = await download.path()
  expect(path).not.toBeNull()
  const { readFile } = await import('node:fs/promises')
  const bytes = await readFile(path!)
  expect(bytes.toString('latin1')).toMatch(/^%PDF-1\.4/)
  expect(bytes.toString('latin1')).toContain('%%EOF')
  await testInfo.attach('pdf-financeiro', { body: bytes, contentType: 'application/pdf' })
})
