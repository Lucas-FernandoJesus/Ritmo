import { expect, goToTab, openAppOnTuesday, test } from './fixtures'

test('controles das áreas têm nomes acessíveis e o conteúdo principal é alcançável por teclado', async ({ page }) => {
  await openAppOnTuesday(page)

  const skipLink = page.getByRole('link', { name: 'Ir para o conteúdo', exact: true })
  await page.keyboard.press('Tab')
  await expect(skipLink).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('#main-content')).toBeFocused()

  for (const tab of ['Hoje', 'Semana', 'Estudos', 'Treinos', 'Nutrição', 'Delivery', 'Financeiro', 'Progresso', 'Ajustes'] as const) {
    if (tab !== 'Hoje') await goToTab(page, tab)

    const unnamedControls = await page.locator('button:visible, a[href]:visible').evaluateAll((elements) => elements.flatMap((element) => {
      const control = element as HTMLElement
      const labelledBy = control.getAttribute('aria-labelledby')?.split(/\s+/).map((id) => document.getElementById(id)?.textContent?.trim() ?? '').join(' ')
      const name = control.getAttribute('aria-label')?.trim()
        || labelledBy?.trim()
        || control.innerText.trim()
        || control.querySelector('img[alt]')?.getAttribute('alt')?.trim()
        || ''
      return name ? [] : [`${control.tagName.toLowerCase()}.${control.className || '(sem classe)'}`]
    }))

    expect(unnamedControls, `Controles sem nome acessível em ${tab}`).toEqual([])

    const unnamedFields = await page.locator('input:not([type="hidden"]):visible, select:visible, textarea:visible').evaluateAll((elements) => elements.flatMap((element) => {
      const field = element as HTMLInputElement
      const labelledBy = field.getAttribute('aria-labelledby')?.split(/\s+/).map((id) => document.getElementById(id)?.textContent?.trim() ?? '').join(' ')
      return field.labels?.length || field.getAttribute('aria-label')?.trim() || labelledBy?.trim()
        ? []
        : [`${field.tagName.toLowerCase()}[type="${field.type || ''}"]`]
    }))

    expect(unnamedFields, `Campos sem rótulo acessível em ${tab}`).toEqual([])
  }
})
