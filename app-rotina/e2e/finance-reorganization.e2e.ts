import { expect, goToTab, openAppOnTuesday, test } from './fixtures'

async function chooseRegistration(page: import('@playwright/test').Page, label: 'Entrada' | 'Saída' | 'A receber' | 'A pagar') {
  await page.getByRole('button', { name: 'Registrar', exact: true }).click()
  await page.getByRole('dialog', { name: 'Registrar' }).getByRole('button', { name: label, exact: true }).click()
}

test('mantém somente consulta e cadastro no primeiro nível do Financeiro', async ({ page }) => {
  await openAppOnTuesday(page)
  await goToTab(page, 'Financeiro')

  const overview = page.getByRole('region', { name: 'Visão geral financeira' })
  await expect(overview.getByRole('region', { name: 'Resumo financeiro' })).toBeVisible()
  await expect(overview.getByRole('region', { name: 'Histórico financeiro' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Registrar', exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Metas e orçamentos' })).not.toBeVisible()
  await expect(page.getByRole('region', { name: 'Financeiro do delivery' })).not.toBeVisible()
})

test('mantém o resumo financeiro prioritário na primeira tela móvel', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openAppOnTuesday(page)
  await goToTab(page, 'Financeiro')

  await expect(page.getByRole('region', { name: 'Resumo financeiro' })).toBeInViewport({ ratio: 0.5 })
})

test('orienta o primeiro uso financeiro com caminhos concretos e dispensáveis', async ({ page }) => {
  await openAppOnTuesday(page)
  await goToTab(page, 'Financeiro')

  const guide = page.getByRole('region', { name: 'Comece pelo essencial' })
  await expect(guide).toContainText('Registre o que já aconteceu antes de planejar o restante.')
  await expect(guide.getByRole('button')).toHaveText(['Registrar primeira entrada', 'Cadastrar uma conta', 'Registrar um turno', 'Agora não'])
  await guide.getByRole('button', { name: 'Agora não', exact: true }).click()
  await expect(guide).not.toBeVisible()
})

test('abre as quatro intenções de registro e devolve o foco ao fechar', async ({ page }) => {
  await openAppOnTuesday(page)
  await goToTab(page, 'Financeiro')

  const trigger = page.getByRole('button', { name: 'Registrar', exact: true })
  await trigger.click()
  const menu = page.getByRole('dialog', { name: 'Registrar' })
  await expect(menu.getByRole('button')).toHaveText(['Entrada', 'Saída', 'A receber', 'A pagar', 'Fechar'])
  await expect(menu.getByRole('button', { name: 'Entrada', exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(menu).not.toBeVisible()
  await expect(trigger).toBeFocused()
})

test('separa destinos financeiros e volta à visão geral sem recarregar', async ({ page }) => {
  await openAppOnTuesday(page)
  await goToTab(page, 'Financeiro')

  const navigation = page.getByRole('navigation', { name: 'Áreas do Financeiro' })
  for (const [destination, region] of [
    ['Planejamento', 'Planejamento financeiro'],
    ['Patrimônio', 'Patrimônio financeiro'],
    ['Análises', 'Análises financeiras'],
    ['Ferramentas', 'Ferramentas financeiras'],
  ] as const) {
    await navigation.getByRole('button', { name: destination, exact: true }).click()
    await expect(page.getByRole('region', { name: region, exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Voltar à visão geral', exact: true }).click()
    await expect(page.getByRole('region', { name: 'Visão geral financeira' })).toBeVisible()
  }
})

test('persiste cada intenção na fonte canônica sem criar saída paralela', async ({ page }) => {
  await openAppOnTuesday(page)
  await goToTab(page, 'Financeiro')

  for (const [intent, formName, description, saveName] of [
    ['Entrada', 'Registrar entrada', 'Salário', 'Salvar entrada'],
    ['Saída', 'Registrar saída', 'Mercado', 'Salvar saída'],
    ['A receber', 'Registrar valor a receber', 'Serviço', 'Salvar valor a receber'],
    ['A pagar', 'Registrar conta a pagar', 'Internet', 'Salvar conta a pagar'],
  ] as const) {
    await chooseRegistration(page, intent)
    const form = page.getByRole('form', { name: formName, exact: true })
    await expect(form.getByLabel('Tipo', { exact: true })).toHaveCount(0)
    await form.getByLabel('Descrição', { exact: true }).fill(description)
    await form.getByLabel('Valor (R$)', { exact: true }).fill('1000')
    await form.getByRole('button', { name: saveName, exact: true }).click()
    await expect(form).not.toBeVisible()
  }

  const stored = await page.evaluate(async () => new Promise<{ expenseCount: number; financialTypes: string[] }>((resolve, reject) => {
    const request = indexedDB.open('rotina-local')
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      const tx = db.transaction(['expenses', 'financialRecords'], 'readonly')
      const expenses = tx.objectStore('expenses').getAll()
      const records = tx.objectStore('financialRecords').getAll()
      tx.oncomplete = () => { db.close(); resolve({ expenseCount: expenses.result.length, financialTypes: records.result.map((record) => record.type).sort() }) }
      tx.onerror = () => reject(tx.error)
    }
  }))
  expect(stored).toEqual({ expenseCount: 1, financialTypes: ['credito', 'entrada', 'pendencia'] })
})

test('encaminha a despesa do Delivery para o mesmo cadastro canônico de saída', async ({ page }) => {
  await openAppOnTuesday(page)
  await goToTab(page, 'Delivery')
  await page.getByRole('button', { name: 'Registrar despesa no Financeiro' }).click()

  await expect(page.getByRole('heading', { name: 'Financeiro', exact: true })).toBeVisible()
  const form = page.getByRole('form', { name: 'Registrar saída', exact: true })
  await form.getByLabel('Descrição', { exact: true }).fill('Farmácia')
  await form.getByLabel('Valor (R$)', { exact: true }).fill('2500')
  await form.getByRole('button', { name: 'Salvar saída', exact: true }).click()

  const counts = await page.evaluate(async () => new Promise<{ expenses: number; financialRecords: number }>((resolve, reject) => {
    const request = indexedDB.open('rotina-local')
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      const tx = db.transaction(['expenses', 'financialRecords'], 'readonly')
      const expenses = tx.objectStore('expenses').count()
      const records = tx.objectStore('financialRecords').count()
      tx.oncomplete = () => { db.close(); resolve({ expenses: expenses.result, financialRecords: records.result }) }
      tx.onerror = () => reject(tx.error)
    }
  }))
  expect(counts).toEqual({ expenses: 1, financialRecords: 0 })

  await goToTab(page, 'Delivery')
  await expect(page.locator('form[aria-label="Registrar saída"]')).toHaveCount(0)
  await page.getByRole('button', { name: 'Registrar despesa no Financeiro' }).click()
  await expect(page.getByRole('form', { name: 'Registrar saída', exact: true })).toBeVisible()
})
