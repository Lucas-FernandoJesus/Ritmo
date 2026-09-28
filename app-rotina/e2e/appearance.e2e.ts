import type { Page } from '@playwright/test'
import { expect, goToTab, openAppAt, test } from './fixtures'

const APPEARANCE_NOW = '2026-09-22T10:00:00-03:00'
type StoredTheme = 'system' | 'light' | 'dark'

const expectedTokens = {
  light: {
    background: '#f0f7f6',
    card: '#fff',
    foreground: '#134e4a',
    primary: '#0d9488',
    accent: '#ea580c',
    muted: '#e8f1f4',
    mutedForeground: '#475569',
    destructive: '#dc2626',
    focus: '#0d9488',
    computedFocus: 'rgb(13, 148, 136)',
  },
  dark: {
    background: '#0f172a',
    card: '#192134',
    foreground: '#f8fafc',
    primary: '#14b8a6',
    accent: '#22c55e',
    muted: '#101a34',
    mutedForeground: '#94a3b8',
    destructive: '#ef4444',
    focus: '#fff',
    computedFocus: 'rgb(255, 255, 255)',
  },
} as const

async function seedAppearance(page: Page, theme: StoredTheme) {
  await page.goto('/sw.js')
  await page.evaluate(async (storedTheme) => {
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
        const transaction = database.transaction(['settings', 'dailySnapshots'], 'readwrite')
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
        transaction.objectStore('dailySnapshots').put({
          id: '2026-09-09',
          localDate: '2026-09-09',
          mode: 'normal',
          capturedAt: '2026-09-09T12:00:00.000Z',
          activities: [
            { routineItemId: 'optional-only', title: 'Atividade opcional', area: 'lazer', nature: 'opcional' },
          ],
        })
        transaction.onerror = () => reject(transaction.error)
        transaction.oncomplete = () => {
          database.close()
          resolve()
        }
      }
    })
  }, theme)
}

async function openSeededApp(page: Page, theme: StoredTheme, colorScheme: 'light' | 'dark' = 'dark') {
  await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
  await seedAppearance(page, theme)
  await openAppAt(page, APPEARANCE_NOW)
}

async function storedTheme(page: Page): Promise<StoredTheme> {
  return page.evaluate(() => new Promise<StoredTheme>((resolve, reject) => {
    const request = indexedDB.open('rotina-local', 2)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const database = request.result
      const transaction = database.transaction('settings', 'readonly')
      const getRequest = transaction.objectStore('settings').get('settings')
      getRequest.onerror = () => reject(getRequest.error)
      getRequest.onsuccess = () => {
        const value = getRequest.result as { theme: StoredTheme }
        database.close()
        resolve(value.theme)
      }
    }
  }))
}

function parseRgb(value: string): [number, number, number] {
  const channels = value.match(/[\d.]+/g)?.slice(0, 3).map(Number)
  if (!channels || channels.length !== 3) throw new Error(`Cor CSS inesperada: ${value}`)
  return channels as [number, number, number]
}

function contrastRatio(foreground: string, background: string): number {
  const luminance = (color: string) => parseRgb(color)
    .map((channel) => channel / 255)
    .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0)
  const first = luminance(foreground)
  const second = luminance(background)
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
}

test('exibe somente Claro e Escuro e aplica e persiste cada tema sem Salvar ajustes', async ({ page }) => {
  await openSeededApp(page, 'dark')
  await goToTab(page, 'Ajustes')

  const appearance = page.getByRole('group', { name: 'Aparência' })
  const lightButton = appearance.getByRole('button', { name: 'Claro', exact: true })
  const darkButton = appearance.getByRole('button', { name: 'Escuro', exact: true })
  const status = page.getByRole('status', { name: 'Status da aparência' })

  await expect(appearance.getByRole('button')).toHaveCount(2)
  await expect(appearance.getByRole('button', { name: /Sistema|aparelho/i })).toHaveCount(0)
  await expect(darkButton).toHaveAttribute('aria-pressed', 'true')

  expect(await lightButton.evaluate((button) => {
    ;(button as HTMLButtonElement).click()
    return document.documentElement.dataset.theme
  })).toBe('light')
  await expect(lightButton).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#F0F7F6')
  await expect(status).toHaveText('Aparência clara salva neste aparelho.')
  expect(await storedTheme(page)).toBe('light')

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await goToTab(page, 'Ajustes')
  await expect(page.getByRole('group', { name: 'Aparência' }).getByRole('button', { name: 'Claro' })).toHaveAttribute('aria-pressed', 'true')

  const reloadedDark = page.getByRole('group', { name: 'Aparência' }).getByRole('button', { name: 'Escuro' })
  expect(await reloadedDark.evaluate((button) => {
    ;(button as HTMLButtonElement).click()
    return document.documentElement.dataset.theme
  })).toBe('dark')
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#0F172A')
  await expect(page.getByRole('status', { name: 'Status da aparência' })).toHaveText('Aparência escura salva neste aparelho.')
  expect(await storedTheme(page)).toBe('dark')
})

test('salvar atividades e horários não restaura a aparência anterior', async ({ page }) => {
  await openSeededApp(page, 'dark')
  await goToTab(page, 'Ajustes')

  await page.getByRole('button', { name: 'Claro', exact: true }).click()
  await expect(page.getByRole('status', { name: 'Status da aparência' })).toHaveText('Aparência clara salva neste aparelho.')
  await page.locator('summary').filter({ hasText: 'Personalizar rotina' }).click()
  await page.getByLabel(/Horário inicial de/).first().fill('07:15')
  await page.getByRole('button', { name: 'Salvar ajustes' }).click()

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  expect(await storedTheme(page)).toBe('light')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})

test('restaura tema anterior e anuncia erro quando a persistência falha', async ({ page }) => {
  await openSeededApp(page, 'dark')
  await goToTab(page, 'Ajustes')
  await page.evaluate(() => {
    const originalPut = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function put(value: unknown, key?: IDBValidKey) {
      if (this.name === 'settings' && (value as { theme?: string }).theme === 'light') {
        throw new DOMException('Falha simulada ao persistir aparência.', 'QuotaExceededError')
      }
      return key === undefined ? originalPut.call(this, value) : originalPut.call(this, value, key)
    }
  })

  const lightButton = page.getByRole('button', { name: 'Claro', exact: true })
  expect(await lightButton.evaluate((button) => {
    ;(button as HTMLButtonElement).click()
    return document.documentElement.dataset.theme
  })).toBe('light')

  const error = page.getByRole('alert', { name: 'Status da aparência' })
  await expect(error).toContainText('Não foi possível salvar a aparência')
  await expect(error).toContainText('modo escuro foi restaurado')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.getByRole('button', { name: 'Escuro' })).toHaveAttribute('aria-pressed', 'true')
  expect(await storedTheme(page)).toBe('dark')
})

for (const colorScheme of ['light', 'dark'] as const) {
  test(`normaliza o valor legado system para ${colorScheme} conforme o dispositivo`, async ({ page }) => {
    await openSeededApp(page, 'system', colorScheme)

    await expect(page.locator('html')).toHaveAttribute('data-theme', colorScheme)
    await expect.poll(() => storedTheme(page)).toBe(colorScheme)
    await goToTab(page, 'Ajustes')
    const label = colorScheme === 'light' ? 'Claro' : 'Escuro'
    await expect(page.getByRole('button', { name: label, exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('button', { name: /Sistema|aparelho/i })).toHaveCount(0)
  })
}

for (const { theme, width } of [
  { theme: 'light', width: 390 },
  { theme: 'dark', width: 390 },
  { theme: 'light', width: 1440 },
  { theme: 'dark', width: 1440 },
] as const) {
  test(`mantém a interface ${theme} legível e responsiva em ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    await openSeededApp(page, theme)

    const visualState = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement)
      const body = getComputedStyle(document.body)
      const header = getComputedStyle(document.querySelector('.page-title') ?? document.body)
      return {
        theme: document.documentElement.dataset.theme,
        background: root.getPropertyValue('--background').trim(),
        card: root.getPropertyValue('--surface').trim(),
        foreground: root.getPropertyValue('--ink').trim(),
        primary: root.getPropertyValue('--primary').trim(),
        accent: root.getPropertyValue('--accent').trim(),
        muted: root.getPropertyValue('--surface-soft').trim(),
        mutedForeground: root.getPropertyValue('--muted').trim(),
        destructive: root.getPropertyValue('--destructive').trim(),
        focus: root.getPropertyValue('--focus-ring').trim(),
        bodyBackground: body.backgroundImage,
        headerBackground: header.backgroundImage,
      }
    })
    const { computedFocus: _computedFocus, ...tokens } = expectedTokens[theme]
    expect(visualState).toMatchObject({ theme, ...tokens })
    expect(visualState.bodyBackground).toContain('radial-gradient')
    expect(visualState.bodyBackground).not.toContain('url(')
    expect(visualState.headerBackground).not.toContain('url(')

    await goToTab(page, 'Ajustes')
    const selectedAppearance = page.getByRole('group', { name: 'Aparência' }).getByRole('button', { name: theme === 'light' ? 'Claro' : 'Escuro' })
    await selectedAppearance.focus()
    await expect(selectedAppearance).toBeFocused()
    await page.keyboard.press('Space')
    await expect(selectedAppearance).toHaveAttribute('aria-pressed', 'true')
    const control = await selectedAppearance.evaluate((button) => {
      const style = getComputedStyle(button)
      const box = button.getBoundingClientRect()
      return { width: box.width, height: box.height, outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth, outlineColor: style.outlineColor }
    })
    expect(control.width).toBeGreaterThanOrEqual(44)
    expect(control.height).toBeGreaterThanOrEqual(44)
    expect(control.outlineStyle).not.toBe('none')
    expect(Number.parseFloat(control.outlineWidth)).toBeGreaterThanOrEqual(2)
    expect(control.outlineColor).toBe(expectedTokens[theme].computedFocus)

    await goToTab(page, 'Progresso')
    const dashboard = page.getByRole('region', { name: 'Painel de progresso' })
    await dashboard.getByRole('button', { name: 'Tarefas', exact: true }).click()
    await expect(dashboard.getByRole('region', { name: 'Gráfico temporal de Conclusão das tarefas obrigatórias' })).toBeVisible()
    await dashboard.getByText('Ver tabela de dados', { exact: true }).click()
    const table = dashboard.getByRole('table', { name: 'Dados da série Conclusão das tarefas obrigatórias' })
    await expect(table).toBeVisible()
    await expect(table).toContainText('Disponível')
    await expect(table).toContainText('Sem dados')
    await expect(table).toContainText('Período futuro')
    await expect(table).toContainText('Indisponível')

    const actualColors = await page.evaluate(() => {
      const card = document.querySelector<HTMLElement>('.dashboard-kpi')
      const selected = document.querySelector<HTMLElement>('.dashboard-category-switch button[aria-pressed="true"]')
      const axis = document.querySelector<SVGTextElement>('.dashboard-chart-axis-label')
      const frame = document.querySelector<HTMLElement>('.dashboard-chart-frame')
      if (!card || !selected || !axis || !frame) throw new Error('Elementos do dashboard não encontrados.')
      const cardStyle = getComputedStyle(card)
      const selectedStyle = getComputedStyle(selected)
      return {
        cardText: cardStyle.color,
        cardBackground: cardStyle.backgroundColor,
        selectedText: selectedStyle.color,
        selectedBackground: selectedStyle.backgroundColor,
        axisText: getComputedStyle(axis).fill,
        chartBackground: getComputedStyle(frame).backgroundColor,
      }
    })
    expect(contrastRatio(actualColors.cardText, actualColors.cardBackground)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(actualColors.selectedText, actualColors.selectedBackground)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(actualColors.axisText, actualColors.chartBackground)).toBeGreaterThanOrEqual(4.5)

    const dimensions = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }))
    expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport)

    const screenshotPath = testInfo.outputPath(`appearance-${theme}-${width}.png`)
    await page.screenshot({ path: screenshotPath, fullPage: true, animations: 'disabled' })
    await testInfo.attach(`appearance-${theme}-${width}`, { path: screenshotPath, contentType: 'image/png' })
  })
}
