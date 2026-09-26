import { expect, goToTab, openAppAt, openAppOnTuesday, test } from './fixtures'

const strengthActivity = 'Fortalecimento de corpo inteiro'

test('abre o treino A de hoje com instruções, exemplos, vídeo e retorno', async ({ page }) => {
  await openAppOnTuesday(page)
  await page.getByRole('button', { name: `Abrir treino: ${strengthActivity}` }).first().click()

  await expect(page).toHaveURL(/treino=A/)
  await expect(page.getByRole('heading', { name: 'Treino A', exact: true })).toBeVisible()
  await expect(page.getByText('aprox. 20 min', { exact: true })).toBeVisible()
  const exercises = page.locator('.workout-exercise')
  await expect(exercises).toHaveCount(5)
  await expect(exercises.first()).toContainText('Sentar e levantar')
  await expect(exercises.first()).toContainText('Exemplo prático')
  const video = exercises.first().getByRole('link', { name: /Ver demonstração/ })
  await expect(video).toHaveAttribute('href', 'https://www.youtube.com/watch?v=gJys6ExNtXA')
  await expect(video).toHaveAttribute('target', '_blank')

  await page.getByRole('button', { name: '← Voltar à rotina' }).click()
  await expect(page.getByRole('heading', { name: 'Um dia de cada vez.' })).toBeVisible()
  await expect(page).not.toHaveURL(/treino=/)
})

test('mostra a seleção correta nos ritmos reduzido e mínimo', async ({ page }) => {
  await openAppOnTuesday(page)
  const modeGroup = page.getByRole('group', { name: 'Intensidade da rotina' })

  await modeGroup.getByRole('button', { name: /^Reduzido/ }).click()
  await page.getByRole('button', { name: `Abrir treino: ${strengthActivity}` }).first().click()
  await expect(page.getByText('8–12 min', { exact: true })).toBeVisible()
  await expect(page.locator('.workout-exercise')).toHaveCount(4)
  await page.getByRole('button', { name: '← Voltar à rotina' }).click()

  await modeGroup.getByRole('button', { name: /^Mínimo/ }).click()
  await page.getByRole('button', { name: `Abrir treino: ${strengthActivity}` }).first().click()
  await expect(page.getByText('4–5 min', { exact: true })).toBeVisible()
  await expect(page.locator('.workout-exercise')).toHaveCount(3)
  await expect(page.locator('.workout-exercise').first()).toContainText('Marcha confortável')
})

test('abre o treino B da quinta e os atalhos A/B do progresso', async ({ page }) => {
  await openAppAt(page, '2026-09-24T10:00:00-03:00')
  await page.getByRole('button', { name: `Abrir treino: ${strengthActivity}` }).first().click()
  await expect(page.getByRole('heading', { name: 'Treino B', exact: true })).toBeVisible()
  await expect(page.locator('.workout-exercise').first()).toContainText('Passo para trás assistido')
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Um dia de cada vez.' })).toBeVisible()

  await goToTab(page, 'Semana')
  await page.getByRole('group', { name: 'Escolher dia da semana' }).getByRole('button', { name: 'Ter', exact: true }).click()
  await page.getByRole('button', { name: `Abrir treino: ${strengthActivity}` }).click()
  await expect(page.getByRole('heading', { name: 'Treino A', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '← Voltar à rotina' }).click()
  await expect(page.getByRole('group', { name: 'Escolher dia da semana' }).getByRole('button', { name: 'Ter', exact: true })).toHaveAttribute('aria-pressed', 'true')

  await goToTab(page, 'Progresso')
  await page.getByRole('button', { name: 'Ver treino A · terça' }).click()
  await expect(page.getByRole('heading', { name: 'Treino A', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '← Voltar à rotina' }).click()
  await expect(page.getByRole('heading', { name: 'Seu progresso continua' })).toBeVisible()
  await page.getByRole('button', { name: 'Ver treino B · quinta' }).click()
  await expect(page.getByRole('heading', { name: 'Treino B', exact: true })).toBeVisible()
})
