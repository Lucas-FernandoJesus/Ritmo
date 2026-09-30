import { expect, goToTab, openAppOnTuesday, test } from './fixtures'

test('navega pelas áreas principais sem recarregar a aplicação', async ({ page }) => {
  await openAppOnTuesday(page)

  const destinations = [
    ['Semana', 'Sua semana'],
    ['Treinos', 'Treinos'],
    ['Registros', 'Registros'],
    ['Financeiro', 'Financeiro'],
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

test('carrega o pacote financeiro somente quando a área é aberta', async ({ page }) => {
  const loadedFinanceChunks: string[] = []
  page.on('request', (request) => {
    if (request.resourceType() === 'script' && request.url().includes('/FinanceView-')) loadedFinanceChunks.push(request.url())
  })
  await openAppOnTuesday(page)

  expect(loadedFinanceChunks).toHaveLength(0)

  await goToTab(page, 'Financeiro')
  await expect.poll(() => loadedFinanceChunks.length).toBeGreaterThan(0)
})
