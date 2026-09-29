import { exportFinancePdf } from '../src/finance-export'
import { buildFinancialMovements } from '../src/finance'
import { expect, test } from './fixtures'

test('PDF financeiro válido é renderizado pelo leitor nativo do Edge', async ({ page }, testInfo) => {
  const rows = buildFinancialMovements({ today: '2026-09-22', shifts: [], expenses: [], records: [{ id: '1', description: 'Água, alimentação e manutenção', category: 'Alimentação', type: 'saida', amount: 1234.56, localDate: '2026-09-22', createdAt: '2026-09-22T13:00:00.000Z', note: 'Observação com acentuação brasileira.' }] })
  const bytes = exportFinancePdf({ rows, start: '2026-09-01', end: '2026-09-30', today: '2026-09-22' })
  await page.route('**/validacao-financeiro.pdf', route => route.fulfill({ body: Buffer.from(bytes), contentType: 'application/pdf', headers: { 'Content-Disposition': 'inline' } }))
  await page.setViewportSize({ width: 900, height: 1100 })
  await page.goto('/validacao-financeiro.pdf')
  await expect(page.locator('embed[type="application/pdf"]')).toBeVisible()
  // O leitor nativo não expõe um sinal DOM para a rasterização da página.
  await page.waitForTimeout(1000)
  await page.screenshot({ path: testInfo.outputPath('pdf-renderizado.png') })
  await testInfo.attach('pdf-financeiro', { body: Buffer.from(bytes), contentType: 'application/pdf' })
})
