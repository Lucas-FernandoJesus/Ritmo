import { expect, goToTab, openStoragePage, test } from './fixtures'
import type { Page } from '@playwright/test'

const DASHBOARD_NOW = '2026-09-22T10:00:00-03:00'

const dashboardSeed = {
  dailySnapshots: [
    {
      id: 'snapshot-2026-09-10',
      localDate: '2026-09-10',
      mode: 'normal',
      capturedAt: '2026-09-10T10:00:00.000Z',
      activities: [
        { routineItemId: 'task-required', title: 'Tarefa obrigatória', area: 'casa', nature: 'fixa' },
        { routineItemId: 'task-optional', title: 'Tarefa opcional', area: 'lazer', nature: 'opcional' },
        { routineItemId: 'training-required', title: 'Treino planejado', area: 'treino', nature: 'fixa' },
      ],
    },
  ],
  completions: [
    {
      id: '2026-09-10:task-required',
      localDate: '2026-09-10',
      routineItemId: 'task-required',
      state: 'done',
      changedAt: '2026-09-10T11:00:00.000Z',
    },
    {
      id: '2026-09-10:training-required',
      localDate: '2026-09-10',
      routineItemId: 'training-required',
      state: 'skipped',
      changedAt: '2026-09-10T11:05:00.000Z',
    },
  ],
  studyLogs: [
    {
      id: 'study-2026-09-12',
      localDate: '2026-09-12',
      area: 'Programação',
      minutes: 45,
      content: 'TypeScript',
      createdAt: '2026-09-12T18:00:00.000Z',
    },
  ],
  deliveryShifts: [
    {
      id: 'shift-2026-09-12',
      localDate: '2026-09-12',
      startTime: '18:00',
      endTime: '21:00',
      hours: 3,
      kilometers: 60,
      grossRevenue: 150,
      fuelCost: 20,
      maintenanceReserve: 5,
      otherExpenses: 0,
      estimatedResult: 125,
      resultPerHour: 41.666667,
      resultPerKilometer: 2.083333,
      fatigueLevel: 1,
      armCondition: 'habitual',
      createdAt: '2026-09-12T21:10:00.000Z',
    },
    {
      id: 'shift-2026-08-10-zero',
      localDate: '2026-08-10',
      startTime: '18:00',
      endTime: '20:00',
      hours: 2,
      kilometers: 10,
      grossRevenue: 0,
      fuelCost: 0,
      maintenanceReserve: 0,
      otherExpenses: 0,
      estimatedResult: 0,
      resultPerHour: 0,
      resultPerKilometer: 0,
      fatigueLevel: 0,
      armCondition: 'habitual',
      createdAt: '2026-08-10T20:10:00.000Z',
    },
  ],
  expenses: [
    {
      id: 'general-expense-2026-09',
      localDate: '2026-09-12',
      description: 'Despesa geral fora do turno',
      category: 'Moradia',
      amount: 1000,
      createdAt: '2026-09-12T08:00:00.000Z',
    },
  ],
}

async function seedDashboard(page: Page, theme: 'light' | 'dark' = 'dark') {
  await openStoragePage(page)
  await page.evaluate(async ({ seed, storedTheme }) => {
    await new Promise<void>((resolve, reject) => {
      const deletion = indexedDB.deleteDatabase('rotina-local')
      deletion.onsuccess = () => resolve()
      deletion.onerror = () => reject(deletion.error)
      deletion.onblocked = () => reject(new Error('Exclusão do banco de teste bloqueada.'))
    })

    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('rotina-local', 2)
      request.onupgradeneeded = () => {
        const database = request.result
        for (const name of ['completions', 'dailySnapshots', 'checkIns', 'deliveryShifts', 'expenses', 'studyLogs', 'progress', 'settings']) {
          database.createObjectStore(name, { keyPath: 'id' })
        }
      }
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const database = request.result
        const transaction = database.transaction(['settings', 'completions', 'dailySnapshots', 'deliveryShifts', 'expenses', 'studyLogs'], 'readwrite')
        transaction.objectStore('settings').put({
          id: 'settings',
          scheduleOverrides: {},
          disabledActivities: [],
          preferredMode: 'normal',
          trainingWeek: 1,
          theme: storedTheme,
          appearanceVersion: 2,
          schemaVersion: 1,
        })
        for (const snapshot of seed.dailySnapshots) transaction.objectStore('dailySnapshots').put(snapshot)
        for (const completion of seed.completions) transaction.objectStore('completions').put(completion)
        for (const shift of seed.deliveryShifts) transaction.objectStore('deliveryShifts').put(shift)
        for (const expense of seed.expenses) transaction.objectStore('expenses').put(expense)
        for (const log of seed.studyLogs) transaction.objectStore('studyLogs').put(log)
        transaction.onerror = () => reject(transaction.error)
        transaction.oncomplete = () => {
          database.close()
          resolve()
        }
      }
    })
  }, { seed: dashboardSeed, storedTheme: theme })
}

async function openSeededDashboard(page: Page, theme: 'light' | 'dark' = 'dark') {
  await seedDashboard(page, theme)
  await page.clock.install({ time: new Date(DASHBOARD_NOW) })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Um dia de cada vez.', exact: true })).toBeVisible()
  await goToTab(page, 'Progresso')
  return page.getByRole('region', { name: 'Painel de progresso' })
}

test('abre em Renda mensal e atualiza título, indicadores, gráfico e tabela ao trocar todas as categorias', async ({ page }) => {
  const dashboard = await openSeededDashboard(page)

  await expect(dashboard.getByRole('heading', { name: 'Renda', exact: true })).toBeVisible()
  await expect(dashboard.getByText('setembro de 2026', { exact: true })).toBeVisible()
  await expect(dashboard.getByRole('group', { name: 'Categorias do dashboard' }).getByRole('button', { name: 'Renda' })).toHaveAttribute('aria-pressed', 'true')
  await expect(dashboard.getByRole('group', { name: 'Período do dashboard' }).getByRole('button', { name: 'Mensal' })).toHaveAttribute('aria-pressed', 'true')

  const incomeIndicators = dashboard.getByRole('region', { name: 'Indicadores de Renda' })
  await expect(incomeIndicators).toContainText('Receita bruta')
  await expect(incomeIndicators).toContainText(/R\$\s*150,00/)
  await expect(dashboard.getByRole('region', { name: 'Gráfico temporal de Resultado estimado' })).toBeVisible()

  const cases = [
    { category: 'Tarefas', metric: 'Taxa principal de conclusão', series: 'Conclusão das tarefas obrigatórias' },
    { category: 'Treinos', metric: 'Taxa principal de conclusão', series: 'Conclusão dos treinos obrigatórios' },
    { category: 'Delivery', metric: 'Turnos', series: 'Resultado por hora' },
    { category: 'Estudos', metric: 'Sessões', series: 'Minutos de estudo' },
    { category: 'Renda', metric: 'Receita bruta', series: 'Resultado estimado' },
  ] as const

  for (const item of cases) {
    await dashboard.getByRole('group', { name: 'Categorias do dashboard' }).getByRole('button', { name: item.category }).click()
    await expect(dashboard.getByRole('heading', { name: item.category, exact: true })).toBeVisible()
    await expect(dashboard.getByRole('region', { name: `Indicadores de ${item.category}` })).toContainText(item.metric)
    await expect(dashboard.getByRole('region', { name: `Gráfico temporal de ${item.series}` })).toBeVisible()

    const disclosure = dashboard.getByText('Ver tabela de dados', { exact: true })
    if (await disclosure.getAttribute('aria-expanded') !== 'true') await disclosure.click()
    await expect(dashboard.getByRole('table', { name: `Dados da série ${item.series}` })).toBeVisible()
  }
})

test('alterna Mensal e Anual e navega sem converter zero ou ausência em outro estado', async ({ page }) => {
  const dashboard = await openSeededDashboard(page)
  const periodGroup = dashboard.getByRole('group', { name: 'Período do dashboard' })

  await periodGroup.getByRole('button', { name: 'Anual' }).click()
  await expect(periodGroup.getByRole('button', { name: 'Anual' })).toHaveAttribute('aria-pressed', 'true')
  await expect(dashboard.getByText('2026', { exact: true })).toBeVisible()
  await dashboard.getByText('Ver tabela de dados', { exact: true }).click()
  await expect(dashboard.getByRole('table', { name: 'Dados da série Resultado estimado' }).getByRole('row')).toHaveCount(13)

  await periodGroup.getByRole('button', { name: 'Mensal' }).click()
  await dashboard.getByRole('button', { name: 'Período anterior' }).click()
  await expect(dashboard.getByText('agosto de 2026', { exact: true })).toBeVisible()
  await expect(dashboard.getByRole('region', { name: 'Indicadores de Renda' })).toContainText(/R\$\s*0,00/)
  await expect(dashboard.getByRole('region', { name: 'Comparação com julho de 2026' })).toContainText('Indisponível')

  await dashboard.getByRole('button', { name: 'Período anterior' }).click()
  await expect(dashboard.getByText('julho de 2026', { exact: true })).toBeVisible()
  await expect(dashboard.getByRole('region', { name: 'Indicadores de Renda' })).toContainText('Sem dados')
  await expect(dashboard.getByRole('region', { name: 'Indicadores de Renda' })).not.toContainText(/R\$\s*0,00/)

  await dashboard.getByRole('button', { name: 'Voltar ao período atual' }).click()
  await expect(dashboard.getByText('setembro de 2026', { exact: true })).toBeVisible()
  await expect(dashboard.getByRole('button', { name: 'Próximo período' })).toBeDisabled()
})

test('permite operar os controles pelo teclado e mantém o progresso semanal e o checklist separados', async ({ page }) => {
  const dashboard = await openSeededDashboard(page)
  const categoryGroup = dashboard.getByRole('group', { name: 'Categorias do dashboard' })
  const incomeButton = categoryGroup.getByRole('button', { name: 'Renda' })
  const tasksButton = categoryGroup.getByRole('button', { name: 'Tarefas' })
  const trainingButton = categoryGroup.getByRole('button', { name: 'Treinos' })

  await incomeButton.focus()
  await page.keyboard.press('Tab')
  await expect(tasksButton).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(trainingButton).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(trainingButton).toHaveAttribute('aria-pressed', 'true')
  await expect(dashboard.getByRole('heading', { name: 'Treinos', exact: true })).toBeVisible()

  const annualButton = dashboard.getByRole('group', { name: 'Período do dashboard' }).getByRole('button', { name: 'Anual' })
  await annualButton.focus()
  await page.keyboard.press('Space')
  await expect(annualButton).toHaveAttribute('aria-pressed', 'true')

  await expect(page.getByRole('region', { name: 'Progresso desta semana' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Plano inicial de 30 dias', exact: true })).toBeVisible()
})

for (const theme of ['light', 'dark'] as const) {
  for (const width of [320, 390, 768, 1024, 1440]) {
    test(`mantém o dashboard ${theme} acionável e sem rolagem horizontal em ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
      const dashboard = await openSeededDashboard(page, theme)

      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
      const incomeButton = dashboard.getByRole('button', { name: 'Renda', exact: true })
      await expect(incomeButton).toBeVisible()
      for (const control of await dashboard.getByRole('button').all()) {
        const box = await control.boundingBox()
        expect(box?.width).toBeGreaterThanOrEqual(44)
        expect(box?.height).toBeGreaterThanOrEqual(44)
      }
      const tasksButton = dashboard.getByRole('button', { name: 'Tarefas', exact: true })
      await tasksButton.focus()
      await page.keyboard.press('Shift+Tab')
      await expect(incomeButton).toBeFocused()
      const focusedStyle = await incomeButton.evaluate((button) => {
        const style = getComputedStyle(button)
        return { outlineStyle: style.outlineStyle, outlineWidth: Number.parseFloat(style.outlineWidth) }
      })
      expect(focusedStyle.outlineStyle).not.toBe('none')
      expect(focusedStyle.outlineWidth).toBeGreaterThanOrEqual(2)
      const transitionDuration = await incomeButton.evaluate((button) => getComputedStyle(button).transitionDuration)
      expect(transitionDuration.split(',').every((duration) => Number.parseFloat(duration) <= 0.01)).toBe(true)
      const dimensions = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }))
      expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport)
    })
  }
}
