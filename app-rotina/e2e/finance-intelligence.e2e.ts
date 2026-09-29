import { readFile } from 'node:fs/promises'
import { expect, goToTab, openAppOnTuesday, openStoragePage, test } from './fixtures'

for (const theme of ['light', 'dark'] as const) {
  test(`planejamento financeiro completo, backup e offline no tema ${theme}`, async ({ page }, testInfo) => {
    await openAppOnTuesday(page)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await goToTab(page, 'Ajustes')
    await page.getByRole('group', { name: 'Aparência' }).getByRole('button', { name: theme === 'light' ? 'Claro' : 'Escuro', exact: true }).click()
    await goToTab(page, 'Financeiro')
    await page.getByRole('button', { name: 'Criar meta', exact: true }).click()
    const goal = page.getByRole('form', { name: 'Meta financeira', exact: true })
    await goal.getByLabel('Nome da meta', { exact: true }).fill('Renda mensal planejada')
    await goal.getByLabel('Valor alvo (R$)', { exact: true }).fill('100000')
    await expect(goal.getByLabel('Valor alvo (R$)', { exact: true })).toHaveValue(/R\$\s1\.000,00/)
    await goal.getByRole('button', { name: 'Salvar meta', exact: true }).click()
    const planning = page.getByRole('region', { name: 'Metas e orçamentos', exact: true })
    await expect(planning).toContainText('Renda mensal planejada')
    await page.getByRole('button', { name: 'Definir orçamento', exact: true }).click()
    const budget = page.getByRole('form', { name: 'Orçamento mensal', exact: true })
    await budget.getByLabel('Categoria do orçamento', { exact: true }).selectOption('Alimentação')
    await budget.getByLabel('Limite mensal (R$)', { exact: true }).fill('10000')
    await budget.getByRole('button', { name: 'Salvar orçamento', exact: true }).click()
    const transaction = page.getByRole('form', { name: 'Movimentação financeira', exact: true })
    for (const [type, name, amount, date, category] of [
      ['entrada', 'Pagamento recebido', '80000', '2026-09-22', 'Outros'],
      ['saida', 'Alimentação paga', '12000', '2026-09-22', 'Alimentação'],
      ['pendencia', 'Conta a vencer', '200000', '2026-09-25', 'Moradia'],
      ['credito', 'Crédito futuro', '50000', '2026-09-26', 'Outros'],
    ]) {
      await transaction.getByLabel('Tipo', { exact: true }).selectOption(type)
      await transaction.getByLabel('Descrição', { exact: true }).fill(name)
      await transaction.getByLabel('Categoria', { exact: true }).selectOption(category)
      await transaction.getByLabel('Data', { exact: true }).fill(date)
      await transaction.getByLabel('Valor (R$)', { exact: true }).fill(amount)
      await transaction.getByRole('button', { name: 'Salvar movimentação', exact: true }).click()
      await expect(transaction.getByLabel('Descrição', { exact: true })).toHaveValue('')
    }
    await expect(planning.getByRole('progressbar', { name: 'Progresso de Renda mensal planejada' })).toHaveAttribute('aria-valuenow', '80')
    await expect(planning).toContainText('120% utilizado')
    await expect(page.getByRole('region', { name: 'Alertas financeiros', exact: true })).toContainText('orçamento(s) ultrapassado(s)')
    await page.locator('summary').filter({ hasText: /^Saldo projetado e fluxo futuro/ }).click()
    await expect(page.getByRole('table').filter({ has: page.locator('caption', { hasText: 'Fluxo futuro por horizonte' }) })).toContainText('Próximos 7 dias')
    await goToTab(page, 'Registros')
    const delivery = page.getByRole('form', { name: 'Turno de delivery', exact: true })
    await delivery.getByLabel('Início', { exact: true }).fill('20:00')
    await delivery.getByLabel('Fim', { exact: true }).fill('02:00')
    await expect(delivery.getByLabel('Horas em turno', { exact: true })).toHaveValue('6')
    await delivery.getByLabel('Quilômetros', { exact: true }).fill('30')
    for (const [label, value] of [['Receita bruta (R$)', '20000'], ['Combustível (R$)', '2000'], ['Reserva manutenção (R$)', '1000'], ['Outras despesas (R$)', '500']]) await delivery.getByLabel(label, { exact: true }).fill(value)
    await delivery.getByLabel('Cansaço', { exact: true }).selectOption('1')
    await delivery.getByLabel('Braço', { exact: true }).selectOption('habitual')
    page.once('dialog', (dialog) => dialog.dismiss())
    await delivery.getByRole('button', { name: 'Salvar turno', exact: true }).click()
    await goToTab(page, 'Financeiro')
    await expect(planning.getByRole('progressbar', { name: 'Progresso de Renda mensal planejada' })).toHaveAttribute('aria-valuenow', '100')
    const deliveryInsight = page.getByRole('region', { name: 'Financeiro do delivery', exact: true })
    await deliveryInsight.locator('summary').filter({ hasText: 'Desempenho e custos do delivery' }).click()
    await expect(deliveryInsight.locator('dl').first()).toContainText('33,33')
    await expect(deliveryInsight.locator('dl').first()).toContainText('4,17')
    await expect(deliveryInsight.locator('dl').first()).toContainText('29,17')
    await expect(deliveryInsight.locator('dl').first()).toContainText('27,50')
    await goToTab(page, 'Progresso')
    const dashboard = page.getByRole('region', { name: 'Planejamento financeiro na Dashboard', exact: true })
    await expect(dashboard).toContainText('Renda mensal planejada')
    await expect(dashboard).toContainText('pendência(s) vence(m)')
    await expect(page.getByRole('region', { name: 'Resumo financeiro', exact: true }).locator('article').filter({ hasText: /^Saldo/ })).toContainText('855,00')
    await goToTab(page, 'Ajustes')
    const downloading = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Exportar backup JSON', exact: true }).click()
    const buffer = await readFile((await (await downloading).path())!)
    const saved = JSON.parse(buffer.toString('utf8'))
    expect(saved.financialGoals).toHaveLength(1)
    expect(saved.categoryBudgets).toHaveLength(1)
    expect(saved.financialGoals[0]).toMatchObject({ target: 1000 })
    expect(saved.financialGoals[0]).not.toHaveProperty('percentage')
    expect(saved.categoryBudgets[0]).not.toHaveProperty('spent')
    await goToTab(page, 'Financeiro')
    await planning.getByRole('button', { name: 'Editar meta', exact: true }).click()
    await goal.getByLabel('Valor alvo (R$)', { exact: true }).fill('200000')
    await goal.getByRole('button', { name: 'Salvar meta', exact: true }).click()
    await expect(planning.getByRole('progressbar', { name: 'Progresso de Renda mensal planejada' })).toHaveAttribute('aria-valuenow', '50')
    await planning.getByRole('button', { name: 'Editar orçamento', exact: true }).click()
    await budget.getByLabel('Limite mensal (R$)', { exact: true }).fill('20000')
    await budget.getByRole('button', { name: 'Salvar orçamento', exact: true }).click()
    await expect(planning).toContainText('60% utilizado')
    await goToTab(page, 'Ajustes')
    page.removeAllListeners('dialog')
    page.once('dialog', (dialog) => dialog.accept())
    await page.locator('input[type="file"]').setInputFiles({ name: 'planejamento.json', mimeType: 'application/json', buffer })
    await expect(page.getByRole('heading', { name: 'Um dia de cada vez.', exact: true })).toBeVisible()
    await goToTab(page, 'Financeiro')
    await expect(planning).toContainText('120% utilizado')
    await page.evaluate(async () => navigator.serviceWorker.ready)
    await page.reload()
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)
    await page.context().setOffline(true)
    await page.reload()
    await goToTab(page, 'Financeiro')
    await expect(planning).toContainText('Meta atingida')
    await expect(planning).toContainText('Orçamento ultrapassado')
    await page.clock.runFor(5000)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.evaluate(() => { (document.activeElement as HTMLElement)?.blur(); scrollTo(0, 0) })
    await page.screenshot({ path: testInfo.outputPath(`resumo-${theme}-390.png`) })
    for (const summary of await page.locator('.finance-analysis > summary, .finance-delivery > details > summary').all()) await summary.click()
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      if (width === 390 || width === 1440) {
        await page.clock.runFor(5000)
        await page.evaluate(() => { (document.activeElement as HTMLElement)?.blur(); scrollTo(0, 0) })
        await page.screenshot({ path: testInfo.outputPath(`inteligencia-${theme}-${width}.png`), fullPage: true })
      }
    }
    const unnamed = await page.locator('main input:not([type="file"]), main select, main textarea').evaluateAll((elements) => elements.filter((element) => {
      if (!(element as HTMLElement).offsetParent) return false
      const ids = element.getAttribute('aria-labelledby')?.split(' ') ?? []
      return !element.getAttribute('aria-label') && !ids.some((id) => document.getElementById(id)?.textContent?.trim()) && !(element as HTMLInputElement).labels?.length
    }).length)
    expect(unnamed).toBe(0)
    const contrast = await page.locator('.planning-progress small, .planning-values strong, .financial-alert strong, .financial-metrics dt, .financial-table td, .finance-trend strong').evaluateAll((elements) => elements.map((element) => {
      const foreground = getComputedStyle(element).color
      let parent: Element | null = element
      let background = ''
      while (parent) { background = getComputedStyle(parent).backgroundColor; if (background !== 'rgba(0, 0, 0, 0)') break; parent = parent.parentElement }
      const luminance = (color: string) => color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map((value) => value / 255).map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0)
      const a = luminance(foreground), b = luminance(background)
      return (Math.max(a, b) + .05) / (Math.min(a, b) + .05)
    }))
    expect(contrast.every((value) => value >= 4.5)).toBe(true)
    const create = page.getByRole('button', { name: 'Criar meta', exact: true })
    await create.focus()
    await page.keyboard.press('Enter')
    await expect(goal.getByLabel('Nome da meta', { exact: true })).toBeFocused()
    await page.context().setOffline(false)
  })
}

test('classifica custo vinculado, limita orçamento específico e não duplica pagamento', async ({ page }) => {
  await openAppOnTuesday(page)
  await page.evaluate(async () => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('rotina-local')
    request.onsuccess = () => {
      const db = request.result, tx = db.transaction('deliveryShifts', 'readwrite')
      tx.objectStore('deliveryShifts').put({ id: 'turn', localDate: '2026-09-22', startTime: '20:00', endTime: '02:00', hours: 6, kilometers: 30, grossRevenue: 200, fuelCost: 20, maintenanceReserve: 10, otherExpenses: 5, estimatedResult: 165, resultPerHour: 27.5, resultPerKilometer: 5.5, fatigueLevel: 1, armCondition: 'habitual', createdAt: '2026-09-22T12:00:00.000Z' })
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => reject(tx.error)
    }
  }))
  await page.reload()
  await goToTab(page, 'Financeiro')
  const form = page.getByRole('form', { name: 'Movimentação financeira', exact: true })
  await form.getByLabel('Tipo', { exact: true }).selectOption('pendencia')
  await form.getByLabel('Descrição', { exact: true }).fill('Taxa vinculada')
  await form.getByLabel('Valor (R$)', { exact: true }).fill('500')
  await form.getByLabel('Associar ao delivery', { exact: true }).selectOption('turn')
  await form.getByLabel('Tipo de custo do delivery', { exact: true }).selectOption('taxas')
  await form.getByRole('button', { name: 'Salvar movimentação', exact: true }).click()
  await page.getByRole('button', { name: 'Definir orçamento', exact: true }).click()
  await page.getByLabel('Escopo do orçamento', { exact: true }).selectOption('taxas')
  await page.getByLabel('Limite mensal (R$)', { exact: true }).fill('400')
  await page.getByRole('button', { name: 'Salvar orçamento', exact: true }).click()
  const planning = page.getByRole('region', { name: 'Metas e orçamentos', exact: true })
  await expect(planning).toContainText('Sem gastos registrados nesta categoria')
  const history = page.getByRole('region', { name: 'Histórico financeiro', exact: true })
  await history.getByRole('article').filter({ hasText: 'Taxa vinculada' }).getByRole('button', { name: 'Pagar', exact: true }).click()
  await expect(planning).toContainText('125% utilizado')
  await expect(history.getByRole('article').filter({ hasText: 'Taxa vinculada' })).toHaveCount(1)
  const insight = page.getByRole('region', { name: 'Financeiro do delivery', exact: true })
  await expect(insight).toContainText('170,00')
  await insight.locator('summary').filter({ hasText: 'Desempenho e custos do delivery' }).click()
  await expect(insight.getByRole('table').filter({ has: page.locator('caption', { hasText: 'Custos pagos associados' }) }).getByRole('row').filter({ hasText: 'Taxas' })).toContainText('5,00')
  await page.reload()
  await goToTab(page, 'Financeiro')
  await expect(planning).toContainText('125% utilizado')
  await expect(history.getByRole('article').filter({ hasText: 'Taxa vinculada' })).toHaveCount(1)
})

test('migra IndexedDB 3 para 5 preservando fontes e importa backup sem planejamento', async ({ page }) => {
  await openStoragePage(page)
  await page.evaluate(async () => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('rotina-local', 3)
    request.onupgradeneeded = () => {
      for (const store of ['completions', 'dailySnapshots', 'checkIns', 'deliveryShifts', 'expenses', 'financialRecords', 'studyLogs', 'progress', 'settings']) request.result.createObjectStore(store, { keyPath: 'id' })
    }
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      const tx = db.transaction(['financialRecords', 'expenses'], 'readwrite')
      tx.objectStore('financialRecords').put({ id: 'old-income', type: 'entrada', amount: 100, description: 'Renda anterior', category: 'Outros', localDate: '2026-09-22', createdAt: '2026-09-22T12:00:00.000Z' })
      tx.objectStore('expenses').put({ id: 'old-expense', amount: 10, description: 'Despesa anterior', category: 'Alimentação', localDate: '2026-09-22', createdAt: '2026-09-22T12:00:00.000Z' })
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => reject(tx.error)
    }
  }))
  await openAppOnTuesday(page)
  const state = await page.evaluate(async () => new Promise<{ version: number; goals: number; budgets: number }>((resolve, reject) => {
    const request = indexedDB.open('rotina-local')
    request.onsuccess = () => {
      const db = request.result, tx = db.transaction(['financialGoals', 'categoryBudgets'], 'readonly')
      const goals = tx.objectStore('financialGoals').count(), budgets = tx.objectStore('categoryBudgets').count()
      tx.oncomplete = () => { resolve({ version: db.version, goals: goals.result, budgets: budgets.result }); db.close() }
      tx.onerror = () => reject(tx.error)
    }
  }))
  expect(state).toEqual({ version: 5, goals: 0, budgets: 0 })
  await goToTab(page, 'Financeiro')
  await expect(page.getByRole('region', { name: 'Resumo financeiro', exact: true })).toContainText('90,00')
  await page.getByRole('button', { name: 'Criar meta', exact: true }).click()
  await page.getByLabel('Nome da meta', { exact: true }).fill('Temporária')
  await page.getByLabel('Valor alvo (R$)', { exact: true }).fill('10000')
  await page.getByRole('button', { name: 'Salvar meta', exact: true }).click()
  await goToTab(page, 'Ajustes')
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exportar backup JSON', exact: true }).click()
  const saved = JSON.parse((await readFile((await (await downloading).path())!)).toString('utf8'))
  delete saved.financialGoals; delete saved.categoryBudgets
  page.once('dialog', (dialog) => dialog.accept())
  await page.locator('input[type="file"]').setInputFiles({ name: 'antigo.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(saved)) })
  await expect(page.getByRole('heading', { name: 'Um dia de cada vez.', exact: true })).toBeVisible()
  await goToTab(page, 'Financeiro')
  await expect(page.getByRole('region', { name: 'Resumo financeiro', exact: true })).toContainText('90,00')
  await expect(page.getByRole('region', { name: 'Metas do período', exact: true })).toContainText('Nenhuma meta')
})
