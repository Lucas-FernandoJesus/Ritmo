import { expect, openAppOnTuesday, test } from './fixtures'

const strengthActivity = 'Fortalecimento de corpo inteiro'

test('alterna os ritmos e apresenta a orientação correspondente da atividade', async ({ page }) => {
  await openAppOnTuesday(page)

  const modeGroup = page.getByRole('group', { name: 'Intensidade da rotina' })
  const openGuide = page.getByRole('button', { name: `Ver orientações: ${strengthActivity}` }).first()
  const modes = [
    ['Normal', 'Formato normal', 'aprox. 20 min'],
    ['Reduzido', 'Formato reduzido', '8–12 min'],
    ['Mínimo', 'Formato mínimo', '4–5 min'],
  ] as const

  for (const [mode, format, duration] of modes) {
    await test.step(`validar modo ${mode}`, async () => {
      const modeButton = modeGroup.getByRole('button', { name: new RegExp(`^${mode}`) })
      await modeButton.click()
      await expect(modeButton).toHaveAttribute('aria-pressed', 'true')

      await openGuide.click()
      const dialog = page.getByRole('dialog', { name: strengthActivity })
      await expect(dialog).toBeVisible()
      await expect(dialog.getByText(format, { exact: true })).toBeVisible()
      await expect(dialog.getByText(duration, { exact: true })).toBeVisible()
      await expect(dialog.locator('ol li').first()).toBeVisible()
      await dialog.getByRole('button', { name: 'Fechar orientações', exact: true }).first().click()
      await expect(dialog).toBeHidden()
    })
  }
})
