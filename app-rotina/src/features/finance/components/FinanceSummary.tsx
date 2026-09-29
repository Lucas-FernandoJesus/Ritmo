import { formatMoney } from '../../../core/domain'
import { summarizeFinance, type FinancialMovement } from '../finance'

export function FinanceSummary({ rows, compact = false, onOpen }: { rows: readonly FinancialMovement[], compact?: boolean, onOpen?: () => void }) {
  const summary = summarizeFinance(rows)
  const cards: Array<[string, number | null, string]> = [
    ['Entradas', summary.entries, 'Recebidas'], ['Saídas', summary.exits, 'Pagas'], ['Créditos', summary.credits, 'A receber'], ['Pendências', summary.payablePending, 'A pagar; reserva separada'], ['Saldo', summary.balance, 'Entradas − saídas'],
  ]
  if (compact) cards.push(['Renda líquida do delivery', summary.operationalNet, 'Operacional, antes da reserva'])
  return <section className="finance-summary" aria-label="Resumo financeiro">
    {compact && <div className="section-heading"><h3>Financeiro no período</h3>{onOpen && <button className="text-button" type="button" onClick={onOpen}>Ver Financeiro</button>}</div>}
    <div className="finance-kpi-grid">{cards.map(([label, value, hint]) => {
      const observed = ['Entradas', 'Saídas', 'Saldo'].includes(label) ? summary.hasRealizedData : label === 'Renda líquida do delivery' ? summary.hasDeliveryData : summary.hasData
      return <article key={label} className={`dashboard-kpi ${label === 'Saldo' ? 'primary' : ''} ${!observed ? 'status-no-data' : ''}`}><span>{label}</span><strong>{!observed ? 'Sem dados' : value === null ? 'Dados incompletos' : formatMoney(value)}</strong><small>{hint}</small></article>
    })}</div>
    <p className="fine-print">Saldo dos registros realizados no período, sem saldo inicial de conta. Créditos, pendências e datas futuras ficam separados.</p>
  </section>
}
