import { expect, test as base, type Page } from '@playwright/test'

const TUESDAY_MORNING = new Date('2026-09-22T10:00:00-03:00')

type BrowserDiagnostics = {
  browserErrors: string[]
}

export const test = base.extend<BrowserDiagnostics>({
  browserErrors: [async ({ page }, use, testInfo) => {
    const errors: string[] = []

    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning' && /React|Invalid hook|Each child/i.test(message.text())) errors.push(`[console] ${message.text()}`)
    })
    page.on('pageerror', (error) => errors.push(`[pageerror] ${error.message}`))

    await use(errors)

    if (errors.length > 0) {
      await testInfo.attach('browser-errors', {
        body: errors.join('\n'),
        contentType: 'text/plain',
      })
    }
    expect(errors, `Erros inesperados no navegador:\n${errors.join('\n')}`).toEqual([])
  }, { auto: true }],
})

export { expect }

// Documento neutro na mesma origem para preparar bancos legados, sem inicializar o app.
export async function openStoragePage(page: Page) {
  await page.route('**/__storage_seed__', (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><link rel="icon" href="data:,"></head><body>Dados de teste</body></html>' }))
  await page.goto('/__storage_seed__')
}

export async function openAppOnTuesday(page: Page) {
  await openAppAt(page, TUESDAY_MORNING)
}

export async function openAppAt(page: Page, time: Date | string) {
  await page.clock.install({ time: typeof time === 'string' ? new Date(time) : time })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Um dia de cada vez.', exact: true })).toBeVisible()
}

export async function goToTab(page: Page, name: 'Hoje' | 'Semana' | 'Treinos' | 'Nutrição' | 'Registros' | 'Financeiro' | 'Progresso' | 'Ajustes') {
  await page.getByRole('button', { name: 'Abrir menu principal', exact: true }).click()
  const navigation = page.getByRole('navigation', { name: 'Navegação principal', includeHidden: true })
  const button = navigation.getByRole('button', { name, exact: true, includeHidden: true })
  await button.click()
  await expect(page.getByRole('dialog', { name: 'Menu principal' })).not.toBeVisible()
  await expect(button).toHaveAttribute('aria-current', 'page')
  await expect(page.locator('#main-content')).toBeFocused()
}
