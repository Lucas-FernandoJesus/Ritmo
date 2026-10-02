import { expect, goToTab, openAppOnTuesday, test } from './fixtures'
import { readFile } from 'node:fs/promises'

const registration = {
  entrada: ['Entrada', 'Registrar entrada', 'Salvar entrada'],
  saida: ['Saída', 'Registrar saída', 'Salvar saída'],
  credito: ['A receber', 'Registrar valor a receber', 'Salvar valor a receber'],
  pendencia: ['A pagar', 'Registrar conta a pagar', 'Salvar conta a pagar'],
} as const

async function openRegistration(page: import('@playwright/test').Page, type: keyof typeof registration) {
  const [intent, formName] = registration[type]
  await page.getByRole('button', { name: 'Registrar', exact: true }).click()
  await page.getByRole('dialog', { name: 'Registrar' }).getByRole('button', { name: intent, exact: true }).click()
  return page.getByRole('form', { name: formName, exact: true })
}

test('abre e atualiza um turno antigo fora dos oito registros recentes', async ({ page }) => {
  await openAppOnTuesday(page)
  await page.evaluate(async () => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('rotina-local')
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      const tx = db.transaction('deliveryShifts', 'readwrite')
      for (let day = 1; day <= 9; day++) {
        const localDate = `2026-09-${String(day).padStart(2, '0')}`
        tx.objectStore('deliveryShifts').put({ id: `history-${day}`, localDate, startTime: '18:00', endTime: '20:00', hours: 2, kilometers: 20, grossRevenue: 100, fuelCost: 0, maintenanceReserve: 0, otherExpenses: 0, estimatedResult: 100, resultPerHour: 50, resultPerKilometer: 5, fatigueLevel: 1, armCondition: 'habitual', createdAt: `${localDate}T21:00:00.000Z` })
      }
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => reject(tx.error)
    }
  }))
  await page.reload()
  await goToTab(page, 'Financeiro')
  const oldRevenue = page.getByRole('region', { name: 'Histórico financeiro' }).getByRole('article').filter({ hasText: 'Receita do turno' }).filter({ has: page.locator('time[datetime="2026-09-01"]') })
  await oldRevenue.getByRole('button', { name: 'Editar em Registros' }).click()
  await expect(page.getByRole('heading', { name: 'Editar turno', exact: true })).toBeVisible()
  await expect(page.getByRole('form', { name: 'Turno de delivery' }).getByLabel('Data', { exact: true })).toHaveValue('2026-09-01')
  await page.getByLabel('Receita bruta (R$)', { exact: true }).fill('20000')
  await page.getByRole('button', { name: 'Salvar alterações do turno', exact: true }).click()
  await goToTab(page, 'Financeiro')
  await expect(oldRevenue).toContainText('200,00')
  await expect(page.getByRole('region', { name: 'Histórico financeiro' }).getByRole('article').filter({ hasText: 'Receita do turno' })).toHaveCount(9)
  await page.reload()
  await goToTab(page, 'Financeiro')
  await expect(oldRevenue).toContainText('200,00')
})

test('cadastra os quatro tipos, mascara valores, baixa e edita sem duplicar', async ({ page }) => {
  await openAppOnTuesday(page)
  await goToTab(page, 'Financeiro')
  const summary = page.getByRole('region', { name: 'Resumo financeiro' })
  await expect(summary).toContainText('Sem dados')
  for (const [type, description, digits] of [['entrada', 'Salário', '100000'], ['saida', 'Conta de luz', '20000'], ['credito', 'Serviço a receber', '5000'], ['pendencia', 'Internet a pagar', '10000']] as const) {
    const form = await openRegistration(page, type)
    expect(await form.getByLabel('Forma de pagamento', { exact: true }).locator('option:not([hidden])').allTextContents()).toEqual(['Cartão de crédito', 'Débito', 'Alimentação'])
    await form.getByLabel('Descrição', { exact: true }).fill(description)
    await form.getByLabel('Valor (R$)', { exact: true }).fill(digits)
    await form.getByLabel('Forma de pagamento', { exact: true }).selectOption(type === 'entrada' ? 'debito' : 'credito')
    await form.getByRole('button', { name: registration[type][2], exact: true }).click()
    await expect(form).not.toBeVisible()
  }
  await expect(summary.locator('article').filter({ hasText: /^Saldo/ })).toContainText('800,00')
  const history = page.getByRole('region', { name: 'Histórico financeiro' })
  await history.getByRole('article').filter({ hasText: 'Serviço a receber' }).getByRole('button', { name: 'Receber' }).click()
  await expect(summary.locator('article').filter({ hasText: /^Saldo/ })).toContainText('850,00')
  await history.getByRole('article').filter({ hasText: 'Internet a pagar' }).getByRole('button', { name: 'Pagar' }).click()
  await expect(summary.locator('article').filter({ hasText: /^Saldo/ })).toContainText('750,00')
  await history.getByRole('article').filter({ hasText: 'Salário' }).getByRole('button', { name: 'Editar' }).click()
  const form = page.getByRole('form', { name: 'Editar entrada', exact: true })
  await expect(form.getByLabel('Forma de pagamento', { exact: true })).toHaveValue('debito')
  await form.getByLabel('Valor (R$)', { exact: true }).fill('123456')
  await expect(form.getByLabel('Valor (R$)', { exact: true })).toHaveValue(/R\$\s1\.234,56/)
  await form.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(history.getByRole('article')).toHaveCount(4)
  await expect(history.getByRole('article').filter({ hasText: 'Salário' })).toContainText('Débito')
  await expect(summary.locator('article').filter({ hasText: /^Saldo/ })).toContainText('984,56')
  await page.reload()
  await goToTab(page, 'Financeiro')
  await expect(summary).toContainText('984,56')
  const stored = await page.evaluate(async () => new Promise<Array<{ amount: number, paymentMethod?: string }>>((resolve, reject) => {
    const request = indexedDB.open('rotina-local')
    request.onsuccess = () => {
      const db = request.result
      const tx = db.transaction(['financialRecords', 'expenses'], 'readonly')
      const records = tx.objectStore('financialRecords').getAll(), expenses = tx.objectStore('expenses').getAll()
      tx.oncomplete = () => { resolve([...records.result, ...expenses.result]); db.close() }
      tx.onerror = () => reject(tx.error)
    }
    request.onerror = () => reject(request.error)
  }))
  expect(stored).toHaveLength(4)
  expect(stored.every((row) => typeof row.amount === 'number')).toBe(true)
  expect(stored.some((row) => row.amount === 1234.56)).toBe(true)
  expect(stored.some((row) => row.paymentMethod === 'debito')).toBe(true)
  await goToTab(page, 'Progresso')
  await expect(page.getByRole('region', { name: 'Resumo financeiro' })).toContainText('984,56')
})

test('digitação em centavos e restauração do backup financeiro', async ({ page }) => {
  await openAppOnTuesday(page)
  await goToTab(page, 'Financeiro')
  const form = await openRegistration(page, 'credito')
  const value = form.getByLabel('Valor (R$)', { exact: true })
  await expect(form).toBeVisible()
  await value.click()
  await value.pressSequentially('1')
  await expect(value).toHaveValue(/R\$\s0,01/)
  await value.pressSequentially('0')
  await expect(value).toHaveValue(/R\$\s0,10/)
  await value.pressSequentially('0')
  await expect(value).toHaveValue(/R\$\s1,00/)
  await value.press('Backspace')
  await expect(value).toHaveValue(/R\$\s0,10/)
  await value.fill('R$ 1.234,56')
  await form.getByLabel('Descrição', { exact: true }).fill('Crédito para backup')
  await form.getByRole('button', { name: 'Salvar valor a receber', exact: true }).click()
  await expect(form).not.toBeVisible()
  await goToTab(page, 'Ajustes')
  const pendingDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar backup JSON' }).click()
  const download = await pendingDownload
  const backupBuffer = await readFile((await download.path())!)
  const backup = JSON.parse(backupBuffer.toString('utf8'))
  expect(backup.financialRecords).toHaveLength(1)
  expect(backup.financialRecords[0]).toMatchObject({ amount: 1234.56, type: 'credito' })
  await goToTab(page, 'Financeiro')
  await page.getByRole('region', { name: 'Histórico financeiro' }).getByRole('button', { name: 'Receber' }).click()
  await expect(page.getByRole('region', { name: 'Resumo financeiro' }).locator('article').filter({ hasText: /^Saldo/ })).toContainText('1.234,56')
  await goToTab(page, 'Ajustes')
  page.once('dialog', (dialog) => dialog.accept())
  await page.locator('input[type="file"]').setInputFiles({ name: 'financeiro.json', mimeType: 'application/json', buffer: backupBuffer })
  await expect(page.getByRole('heading', { name: 'Um dia de cada vez.', exact: true })).toBeVisible()
  await goToTab(page, 'Financeiro')
  const history = page.getByRole('region', { name: 'Histórico financeiro' })
  await expect(history.getByRole('article')).toHaveCount(1)
  await expect(history).toContainText('A receber')
  await expect(history).toContainText('1.234,56')
  await expect(page.getByRole('region', { name: 'Resumo financeiro' }).locator('article').filter({ hasText: /^Saldo/ })).toContainText('Sem dados')
})

test('integra delivery e despesas vinculadas, calcula madrugada e produtividade', async ({ page }) => {
  await openAppOnTuesday(page)
  await goToTab(page, 'Registros')
  await page.getByLabel('Início', { exact: true }).fill('20:00')
  await page.getByLabel('Fim', { exact: true }).fill('02:00')
  await expect(page.getByLabel('Horas em turno')).toHaveValue('6')
  await expect(page.getByLabel('Horas em turno')).toHaveAttribute('readonly', '')
  await page.getByLabel('Quilômetros', { exact: true }).fill('30')
  for (const [field, value] of [['Receita bruta (R$)', '20000'], ['Combustível (R$)', '2000'], ['Reserva manutenção (R$)', '1000'], ['Outras despesas (R$)', '500']]) await page.getByLabel(field, { exact: true }).fill(value)
  await page.getByRole('form', { name: 'Turno de delivery' }).getByLabel('Forma de pagamento', { exact: true }).selectOption('debito')
  await page.getByLabel('Cansaço', { exact: true }).selectOption('1')
  await page.getByLabel('Braço', { exact: true }).selectOption('habitual')
  page.on('dialog', (dialog) => dialog.dismiss())
  await page.getByRole('button', { name: 'Salvar turno', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Últimos turnos' }).locator('..')).toContainText('165,00')
  await page.getByRole('group', { name: 'Tipo de registro' }).getByRole('button', { name: 'Despesas', exact: true }).click()
  const expenseForm = page.getByRole('form', { name: 'Registrar saída', exact: true })
  await expenseForm.getByLabel('Descrição', { exact: true }).fill('Refeição do turno')
  await expenseForm.getByLabel('Valor (R$)', { exact: true }).fill('1500')
  await expenseForm.getByLabel('Forma de pagamento', { exact: true }).selectOption('alimentacao')
  await expenseForm.getByLabel('Associar ao delivery').selectOption({ index: 1 })
  await expenseForm.getByRole('button', { name: 'Salvar saída', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Resumo financeiro' })).toContainText('160,00')
  await page.getByRole('navigation', { name: 'Áreas do Financeiro' }).getByRole('button', { name: 'Análises', exact: true }).click()
  const delivery = page.getByRole('region', { name: 'Financeiro do delivery' })
  await expect(delivery).toContainText('200,00')
  await expect(delivery).toContainText('40,00')
  await expect(delivery).toContainText('150,00')
  await page.getByRole('button', { name: 'Voltar à visão geral', exact: true }).click()
  const history = page.getByRole('region', { name: 'Histórico financeiro' })
  await expect(history.getByRole('article').filter({ hasText: 'Receita do turno' })).toContainText('Débito')
  await expect(history.getByRole('article').filter({ hasText: 'Refeição do turno' })).toContainText('Alimentação')
  await history.getByRole('article').filter({ hasText: 'Receita do turno' }).getByRole('button', { name: 'Editar em Registros' }).click()
  await expect(page.getByRole('heading', { name: 'Editar turno', exact: true })).toBeVisible()
  await expect(page.getByLabel('Início', { exact: true })).toHaveValue('20:00')
  await expect(page.getByRole('form', { name: 'Turno de delivery' }).getByLabel('Forma de pagamento', { exact: true })).toHaveValue('debito')
  await expect(page.getByRole('heading', { name: 'Últimos turnos' }).locator('..')).toContainText('25,00/h')
  await page.getByLabel('Fim', { exact: true }).fill('00:00')
  await expect(page.getByLabel('Horas em turno', { exact: true })).toHaveValue('4')
  await page.getByRole('button', { name: 'Salvar alterações do turno', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Últimos turnos' }).locator('..')).toContainText('37,50/h')
  await expect(page.getByRole('button', { name: 'Editar turno', exact: true })).toHaveCount(1)
  await goToTab(page, 'Progresso')
  await page.getByRole('group', { name: 'Categorias do dashboard' }).getByRole('button', { name: 'Delivery', exact: true }).click()
  const indicators = page.getByRole('region', { name: 'Indicadores de Delivery' })
  await expect(indicators.locator('article').filter({ hasText: /^Resultado por hora/ })).toContainText('37,50')
})

for (const theme of ['light', 'dark'] as const) {
  test(`revisa Financeiro ${theme}, contraste, filtros e análises em mobile e desktop`, async ({ page }, testInfo) => {
    await openAppOnTuesday(page)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await goToTab(page, 'Ajustes')
    await page.getByRole('group', { name: 'Aparência' }).getByRole('button', { name: theme === 'light' ? 'Claro' : 'Escuro', exact: true }).click()
    await goToTab(page, 'Financeiro')
    for (const [type, description, digits] of [['entrada', 'Pagamento recebido', '123456'], ['saida', 'Alimentação da semana', '23456'], ['credito', 'Serviço a receber', '53056'], ['pendencia', 'Conta de internet', '1056']] as const) {
      const form = await openRegistration(page, type)
      await form.getByLabel('Descrição', { exact: true }).fill(description)
      await form.getByLabel('Valor (R$)', { exact: true }).fill(digits)
      await form.getByRole('button', { name: registration[type][2], exact: true }).click()
      await expect(form).not.toBeVisible()
    }
    const contrasts = await page.locator('.finance-movement-heading, .finance-type, .finance-status, .finance-kpi-grid strong').evaluateAll((elements) => elements.map((element) => {
      const color = getComputedStyle(element).color
      let surface: Element | null = element
      let background = ''
      while (surface) { background = getComputedStyle(surface).backgroundColor; if (background !== 'rgba(0, 0, 0, 0)') break; surface = surface.parentElement }
      const luminance = (text: string) => text.match(/[\d.]+/g)!.slice(0, 3).map(Number).map((channel) => channel / 255).map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4).reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0)
      const a = luminance(color), b = luminance(background)
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
    }))
    expect(contrasts.every((contrast) => contrast >= 4.5)).toBe(true)
    await page.getByRole('navigation', { name: 'Áreas do Financeiro' }).getByRole('button', { name: 'Análises', exact: true }).click()
    await page.clock.runFor(5000)
    await page.locator('.finance-analysis > summary').filter({ hasText: /^Análises do período/ }).click()
    await page.getByLabel('Gráfico financeiro', { exact: true }).selectOption('balance')
    await expect(page.getByRole('region', { name: 'Gráfico temporal de Saldo acumulado no período' })).toBeVisible()
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 844 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      const controls = await page.locator('.finance-filters select').evaluateAll((elements) => elements.map((element) => ({ width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height })))
      expect(controls.every((control) => control.width >= 44 && control.height >= 44)).toBe(true)
      if (width === 390 || width === 1440) {
        await page.evaluate(() => { (document.activeElement as HTMLElement)?.blur(); window.scrollTo(0, 0) })
        await page.screenshot({ path: testInfo.outputPath(`financeiro-${theme}-${width}.png`), fullPage: true })
      }
    }
  })
}

test('filtros, valores previstos e período da Dashboard, mobile e offline', async ({ page }) => {
  await openAppOnTuesday(page)
  await goToTab(page, 'Financeiro')
  const form = await openRegistration(page, 'entrada')
  await form.getByLabel('Descrição', { exact: true }).fill('Pagamento futuro')
  await form.getByLabel('Data', { exact: true }).fill('2026-09-30')
  await form.getByLabel('Valor (R$)', { exact: true }).fill('10000')
  await form.getByRole('button', { name: 'Salvar entrada', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Resumo financeiro' })).toContainText('Sem dados')
  await page.getByLabel('Status do histórico').selectOption('previsto')
  await expect(page.getByRole('region', { name: 'Histórico financeiro' }).getByRole('article')).toHaveCount(1)
  await page.getByLabel('Buscar descrição').fill('inexistente')
  await expect(page.getByRole('region', { name: 'Histórico financeiro' })).toContainText('Nenhuma movimentação')
  await page.getByLabel('Buscar descrição').fill('')
  await page.getByLabel('Status do histórico').selectOption('')
  await page.getByRole('group', { name: 'Período financeiro' }).getByRole('button', { name: 'Hoje', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Resumo financeiro' })).toContainText('Sem dados')
  await page.getByRole('group', { name: 'Período financeiro' }).getByRole('button', { name: 'Personalizado' }).click()
  await page.getByLabel('De', { exact: true }).fill('2026-09-30')
  await page.getByLabel('Até', { exact: true }).fill('2026-09-30')
  await expect(page.getByRole('region', { name: 'Histórico financeiro' })).toContainText('Pagamento futuro')
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 844 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.evaluate(async () => navigator.serviceWorker.ready)
  await page.reload()
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)
  await page.context().setOffline(true)
  await page.reload()
  await goToTab(page, 'Financeiro')
  await expect(page.getByRole('region', { name: 'Histórico financeiro' })).toContainText('Pagamento futuro')
  await goToTab(page, 'Progresso')
  await page.getByRole('button', { name: 'Período anterior', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Resumo financeiro' })).toContainText('Sem dados')
})
