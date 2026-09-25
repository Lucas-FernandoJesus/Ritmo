import { expect, goToTab, openAppAt, openAppOnTuesday, test } from './fixtures'

const fridayRequired = [
  'Acordar, banheiro e água',
  'Arrumar a cama e vestir roupa de exercício',
  'Banho e higiene',
  'Café da manhã',
  'Pegar marmita e itens de trabalho',
  'Trabalho presencial',
  'Lavar louça e deixar a cozinha funcional',
  'Preparar o essencial para amanhã',
  'Comer e descansar após o trabalho',
]

test('fecha o dia com todas as obrigatórias, ignora opcionais e reage a uma atividade pulada', async ({ page }) => {
  await openAppAt(page, '2026-09-25T10:00:00-03:00')

  const skippedTitle = 'Comer e descansar após o trabalho'
  const skippedCard = page.getByRole('article').filter({ hasText: skippedTitle })
  await skippedCard.getByRole('button', { name: 'Pular', exact: true }).click()

  for (const title of fridayRequired.filter((item) => item !== skippedTitle)) {
    await page.getByRole('button', { name: `Concluir ${title}`, exact: true }).click()
  }

  const weekly = page.getByRole('region', { name: 'Progresso desta semana' })
  await expect(weekly).toContainText('0 de 7 dias concluídos')
  await expect(weekly).toContainText('8 de 84 atividades obrigatórias · 10%')
  await expect(weekly).toContainText('8 de 9 obrigatórias concluídas hoje')
  await expect(page.getByRole('button', { name: 'Concluir Muay Thai leve ou descanso', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Concluir Delivery de sexta', exact: true })).toBeVisible()

  await page.getByRole('button', { name: `Concluir ${skippedTitle}`, exact: true }).click()

  await expect(weekly).toContainText('1 de 7 dias concluídos')
  await expect(weekly).toContainText('9 de 84 atividades obrigatórias · 11%')
  await expect(weekly).toContainText('Dia concluído')

  await goToTab(page, 'Progresso')
  await expect(page.getByText('Semana 1 de 24', { exact: false })).toBeVisible()
  await expect(page.getByText('0 de 19 passos registrados', { exact: true })).toBeVisible()
})

test('preserva snapshots passados quando o modo atual muda', async ({ page }) => {
  await openAppOnTuesday(page)

  const reducedMode = page.getByRole('group', { name: 'Intensidade da rotina' })
    .getByRole('button', { name: /^Reduzido/ })
  await reducedMode.click()
  await expect(reducedMode).toHaveAttribute('aria-pressed', 'true')
  await page.reload()

  const snapshots = await page.evaluate(async () => new Promise<Array<{
    localDate?: string
    mode?: string
    activities?: Array<{ routineItemId?: string }>
  }>>((resolve, reject) => {
    const request = indexedDB.open('rotina-local')
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const database = request.result
      const transaction = database.transaction('dailySnapshots', 'readonly')
      const snapshotsRequest = transaction.objectStore('dailySnapshots').getAll()
      transaction.onerror = () => reject(transaction.error)
      transaction.oncomplete = () => {
        resolve(snapshotsRequest.result)
        database.close()
      }
    }
  }))

  expect(snapshots).toHaveLength(7)
  expect(snapshots).toContainEqual(expect.objectContaining({ localDate: '2026-09-21', mode: 'normal' }))
  expect(snapshots).toContainEqual(expect.objectContaining({
    localDate: '2026-09-22',
    mode: 'reduzido',
    activities: expect.arrayContaining([expect.objectContaining({ routineItemId: 'strength' })]),
  }))
  expect(snapshots.find((item) => item.localDate === '2026-09-22')?.activities)
    .not.toContainEqual(expect.objectContaining({ routineItemId: 'programming' }))
})

test('oferece a conclusão do estudo, respeita cancelamento e não duplica conclusão', async ({ page }) => {
  await openAppOnTuesday(page)
  await goToTab(page, 'Registros')
  await page.getByRole('group', { name: 'Tipo de registro' }).getByRole('button', { name: 'Estudos', exact: true }).click()

  const area = page.getByRole('combobox')
  const minutes = page.getByLabel('Minutos')
  const content = page.getByLabel('Conteúdo')
  await area.selectOption('Programação')
  await minutes.fill('30')
  await content.fill('Exercícios de TypeScript')

  const canceledOffer = page.waitForEvent('dialog')
  const canceledSave = page.getByRole('button', { name: 'Salvar registro', exact: true }).click()
  const canceledDialog = await canceledOffer
  expect(canceledDialog.type()).toBe('confirm')
  expect(canceledDialog.message()).toContain('Programação — prática e exercícios')
  await canceledDialog.dismiss()
  await canceledSave
  await expect(page.getByText('Programação: Exercícios de TypeScript', { exact: true })).toBeVisible()

  await goToTab(page, 'Hoje')
  await expect(page.getByRole('button', { name: 'Concluir Programação — prática e exercícios', exact: true })).toBeVisible()

  await goToTab(page, 'Registros')
  await minutes.fill('20')
  await content.fill('Testes automatizados')
  const acceptedOffer = page.waitForEvent('dialog')
  const acceptedSave = page.getByRole('button', { name: 'Salvar registro', exact: true }).click()
  const acceptedDialog = await acceptedOffer
  expect(acceptedDialog.message()).toContain('Programação — prática e exercícios')
  await acceptedDialog.accept()
  await acceptedSave

  await goToTab(page, 'Hoje')
  await expect(page.getByRole('button', { name: 'Desmarcar Programação — prática e exercícios', exact: true })).toBeVisible()

  await goToTab(page, 'Registros')
  await minutes.fill('10')
  await content.fill('Revisão final')
  const unexpectedDialogs: string[] = []
  const captureUnexpectedDialog = async (dialog: { message: () => string, dismiss: () => Promise<void> }) => {
    unexpectedDialogs.push(dialog.message())
    await dialog.dismiss()
  }
  page.on('dialog', captureUnexpectedDialog)
  await page.getByRole('button', { name: 'Salvar registro', exact: true }).click()
  await expect(page.getByText('Programação: Revisão final', { exact: true })).toBeVisible()
  page.off('dialog', captureUnexpectedDialog)
  expect(unexpectedDialogs).toEqual([])
})

test('oferece a conclusão da atividade financeira aplicável', async ({ page }) => {
  await openAppAt(page, '2026-09-23T10:00:00-03:00')
  await goToTab(page, 'Registros')
  await page.getByRole('group', { name: 'Tipo de registro' }).getByRole('button', { name: 'Despesas', exact: true }).click()
  await page.getByLabel('Descrição').fill('Mercado')
  await page.getByLabel('Valor (R$)').fill('42.50')

  const offer = page.waitForEvent('dialog')
  const save = page.getByRole('button', { name: 'Salvar despesa', exact: true }).click()
  const dialog = await offer
  expect(dialog.message()).toContain('Revisão semanal de finanças')
  await dialog.accept()
  await save

  await goToTab(page, 'Hoje')
  await expect(page.getByRole('button', { name: 'Desmarcar Revisão semanal de finanças', exact: true })).toBeVisible()
})

test('usa o horário para oferecer o turno de delivery inequívoco', async ({ page }) => {
  await openAppAt(page, '2026-09-26T10:00:00-03:00')
  await goToTab(page, 'Registros')

  await page.getByLabel('Início').fill('18:30')
  await page.getByLabel('Fim').fill('20:00')
  await page.getByLabel('Horas em turno').fill('1.5')
  await page.getByLabel('Quilômetros').fill('30')
  await page.getByLabel('Receita bruta (R$)').fill('100')
  await page.getByLabel('Combustível (R$)').fill('15')
  await page.getByLabel('Reserva manutenção (R$)').fill('5')
  await page.getByLabel('Outras despesas (R$)').fill('0')
  await page.getByLabel('Cansaço').selectOption('1')
  await page.getByLabel('Braço').selectOption('habitual')

  const offer = page.waitForEvent('dialog')
  const save = page.getByRole('button', { name: 'Salvar turno', exact: true }).click()
  const dialog = await offer
  expect(dialog.message()).toContain('Delivery — turno da noite')
  await dialog.accept()
  await save

  await goToTab(page, 'Hoje')
  await expect(page.getByRole('button', { name: 'Desmarcar Delivery — turno da noite', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Concluir Delivery — turno do almoço', exact: true })).toBeVisible()
})
