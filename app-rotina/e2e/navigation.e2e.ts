import { expect, goToTab, openAppOnTuesday, test } from './fixtures'

test('navega pelas áreas principais sem recarregar a aplicação', async ({ page }) => {
  await openAppOnTuesday(page)

  const destinations = [
    ['Semana', 'Sua semana'],
    ['Registros', 'Registros'],
    ['Progresso', 'Seu progresso continua'],
    ['Ajustes', 'Ajustes'],
    ['Hoje', 'Um dia de cada vez.'],
  ] as const

  for (const [tab, heading] of destinations) {
    await test.step(`abrir ${tab}`, async () => {
      await goToTab(page, tab)
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
    })
  }
})
