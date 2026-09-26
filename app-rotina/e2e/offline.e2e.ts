import { expect, openAppOnTuesday, test } from './fixtures'

const strengthActivity = 'Fortalecimento de corpo inteiro'

test('mantém navegação e orientações disponíveis offline', async ({ context, page }) => {
  await openAppOnTuesday(page)

  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope)
  expect(new URL(scope).pathname).toBe('/')

  await page.reload()
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)

  await context.setOffline(true)
  try {
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Offline', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Um dia de cada vez.', exact: true })).toBeVisible()

    await page.getByRole('button', { name: `Concluir ${strengthActivity}`, exact: true }).click()
    const weekly = page.getByRole('region', { name: 'Progresso desta semana' })
    await expect(weekly).toContainText('1 de 84 atividades obrigatórias')
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('button', { name: `Desmarcar ${strengthActivity}`, exact: true })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Progresso desta semana' })).toContainText('1 de 84 atividades obrigatórias')

    const navigation = page.getByRole('navigation', { name: 'Navegação principal' })
    await navigation.getByRole('button', { name: 'Semana', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Sua semana', exact: true })).toBeVisible()

    await page.getByRole('group', { name: 'Escolher dia da semana' })
      .getByRole('button', { name: 'Ter', exact: true }).click()
    await page.getByRole('button', { name: `Abrir treino: ${strengthActivity}` }).click()
    await expect(page.getByRole('heading', { name: 'Treino A', exact: true })).toBeVisible()
    await expect(page.getByText('Você está offline. As instruções continuam disponíveis aqui; os vídeos precisam de internet.')).toBeVisible()
    await page.getByRole('button', { name: '← Voltar à rotina' }).click()

    await navigation.getByRole('button', { name: 'Progresso', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Seu progresso continua', exact: true })).toBeVisible()
  } finally {
    await context.setOffline(false)
  }

  await expect(page.getByText('Local', { exact: true })).toBeVisible()
})
