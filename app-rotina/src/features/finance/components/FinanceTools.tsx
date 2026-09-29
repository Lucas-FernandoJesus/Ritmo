import { useMemo, useState } from 'react'
import { formatMoney } from '../../../core/domain'
import { buildMonthlyClosing } from '../finance-closing'
import { calculateScenario } from '../finance-plans'
import { dateLabel, numberLabel, percentLabel, type FinanceAnalysis } from '../finance-analysis'
import { downloadFinanceReport } from '../finance-export'
import { summarizeFinance, type FinanceSources } from '../finance'
import type { CategoryBudget, FinancialGoal, FinancePlanningData } from '../../../core/types'
import { Field } from '../../../components/FormPrimitives'
import { MoneyInput } from '../../../components/MoneyInput'

const money = (value: number | null) => value === null ? 'Sem dados' : formatMoney(value)
export function FinanceExports({ analysis, interval, today }: { analysis: FinanceAnalysis; interval: { start: string; end: string }; today: string }) {
  const [error, setError] = useState('')
  async function download(format: 'csv' | 'xlsx' | 'pdf') {
    setError('')
    try { downloadFinanceReport(format, { rows: analysis.periodRows, ...interval, today }) } catch { setError('Não foi possível exportar. Tente um período menor.') }
  }
  return <section className="finance-exports" aria-label="Exportações financeiras"><h3>Exportar período</h3><p className="fine-print">{dateLabel(interval.start)} a {dateLabel(interval.end)}. Inclui resumo e todas as movimentações do período, com status explícito; filtros do histórico não reduzem o relatório. O backup completo continua em Ajustes.</p><div className="finance-row-actions">{(['csv', 'xlsx', 'pdf'] as const).map(format => <button type="button" className="secondary-button" key={format} onClick={() => download(format)}>Exportar {format === 'xlsx' ? 'Excel' : format.toUpperCase()}</button>)}</div>{error && <p className="warning-text" role="alert">{error}</p>}</section>
}

export function FinanceClosing({ sources, planning, goals, budgets }: { sources: FinanceSources; planning: FinancePlanningData; goals: readonly FinancialGoal[]; budgets: readonly CategoryBudget[] }) {
  const [month, setMonth] = useState(sources.today.slice(0, 7))
  const closing = useMemo(() => month ? buildMonthlyClosing({ ...sources, ...planning, goals, budgets }, month) : null, [sources, planning, goals, budgets, month])
  if (!closing) return <Field label="Mês do fechamento"><input type="month" value={month} onChange={e => setMonth(e.target.value)} /></Field>
  const { summary, analysis } = closing
  return <section aria-label="Fechamento mensal"><h3>Fechamento mensal</h3><Field label="Mês do fechamento"><input type="month" required max={sources.today.slice(0, 7)} value={month} onChange={e => setMonth(e.target.value)} /></Field><p className="fine-print">{closing.partial ? 'Mês em andamento' : 'Mês encerrado'} · realizado até {dateLabel(closing.asOf)}. Esta visão é recalculada a partir dos registros e não cria lançamentos nem congela o histórico.</p>
    <dl className="financial-metrics">{[['Entradas recebidas', summary.entries], ['Saídas pagas', summary.exits], ['Saldo do mês', summary.balance], ['Créditos em aberto do mês', summary.credits], ['Pendências em aberto do mês', summary.payablePending], ['Renda bruta do delivery', analysis.delivery.gross], ['Despesas operacionais do delivery', analysis.delivery.expenses], ['Renda líquida operacional do delivery', analysis.delivery.net], ['Reserva de manutenção estimada', analysis.delivery.reserve], ['Resultado após reserva', analysis.delivery.afterReserve], ['Ativos no corte', closing.wealth.assets], ['Passivos no corte', closing.wealth.liabilities], ['Patrimônio líquido no corte', closing.wealth.netWorth]].map(([label, value]) => <div key={label as string}><dt>{label}</dt><dd>{money(value as number | null)}</dd></div>)}</dl>
    <p className="fine-print">Créditos e pendências refletem o status atual dos valores com vencimento no mês. O patrimônio é a posição calculada no corte com saldos iniciais e vínculos disponíveis; não é um saldo bancário auditado.</p>
    <div className="dashboard-table-scroll" tabIndex={0} role="region" aria-label="Comparação do fechamento"><table className="financial-table"><caption>Comparação com mês anterior{closing.partial && ' · atual parcial, anterior completo'}</caption><thead><tr><th scope="col">Indicador</th><th scope="col">Atual</th><th scope="col">Anterior</th><th scope="col">Variação</th></tr></thead><tbody>{closing.comparison.metrics.slice(0, 7).map(m => <tr key={m.id}><th scope="row">{m.label}</th><td>{money(m.current)}</td><td>{money(m.previous)}</td><td>{percentLabel(m.percentage)}</td></tr>)}</tbody></table></div>
    <div className="planning-columns"><section><h4>Metas do mês</h4>{!analysis.goals.length && <p className="fine-print">Nenhuma meta neste mês.</p>}{analysis.goals.map(g => <p key={g.goal.id}>{g.goal.name}: {money(g.current)} / {formatMoney(g.goal.target)} · {numberLabel(g.percentage)}%</p>)}</section><section><h4>Orçamentos do mês</h4>{!analysis.budgets.length && <p className="fine-print">Nenhum orçamento neste mês.</p>}{analysis.budgets.map(b => <p key={b.budget.id}>{b.budget.category}: {money(b.spent)} / {formatMoney(b.budget.limit)} · {numberLabel(b.percentage)}%</p>)}</section></div>
    <h4>Principais categorias de despesas</h4>{!analysis.distributions.expenses.length ? <p className="fine-print">Sem despesas realizadas no mês.</p> : analysis.distributions.expenses.slice(0, 5).map(c => <p key={c.key}>{c.key}: {money(c.amount)} · {numberLabel(c.percentage)}%</p>)}
    <p className="fine-print">Planejamentos não confirmados e lançamentos futuros estão separados no relatório pelos seus status.</p><FinanceExports analysis={analysis} interval={closing.comparison.currentInterval} today={sources.today} />
  </section>
}

export function FinanceSimulator({ analysis }: { analysis: FinanceAnalysis }) {
  const summary = summarizeFinance(analysis.periodRows)
  const [input, setInput] = useState({ extraIncome: 0, expenseReduction: 0, extraExpense: 0, purchase: 0, target: 0 }), [goalId, setGoalId] = useState('')
  const goal = analysis.goals.find(g => g.goal.id === goalId)
  const [mode, setMode] = useState<'balance' | 'goal'>('balance')
  const grossGoal = mode === 'goal' && (goal?.goal.type === 'income' || goal?.goal.type === 'delivery-income')
  const scenario = calculateScenario({ balance: mode === 'goal' && goal ? goal.current : summary.balance, entries: summary.entries, exits: mode === 'goal' && goal?.goal.type === 'delivery-net' ? analysis.delivery.expenses : summary.exits, deliveryNetPerHour: analysis.delivery.netPerHour, deliveryGrossPerHour: analysis.delivery.grossPerHour, deliveryGross: analysis.delivery.gross, deliveryNet: analysis.delivery.net, objective: grossGoal ? 'gross' : 'net' }, { ...input, target: mode === 'goal' && goal ? goal.goal.target : input.target })
  const setters: Array<[keyof typeof input, string]> = [['extraIncome', 'Aumento de renda (R$)'], ['expenseReduction', 'Redução de gastos (R$)'], ['extraExpense', 'Nova despesa (R$)'], ['purchase', 'Compra simulada (R$)'], ['target', 'Alvo do cenário (R$)']]
  const expenseLimit = goal?.goal.type === 'expense-limit'
  return <section aria-label="Simulador financeiro"><h3>Simulador financeiro</h3><p className="fine-print">Hipóteses sobre os registros do período selecionado. Nenhum valor desta área é salvo ou altera saldo, contas, metas ou projeções reais.</p><Field label="Base da simulação"><select value={mode} onChange={e => { setMode(e.target.value as typeof mode); setGoalId(analysis.goals.find(g => g.goal.type !== 'expense-limit')?.goal.id ?? '') }}><option value="balance">Saldo realizado do período</option><option value="goal">Progresso de uma meta</option></select></Field>{mode === 'goal' && <Field label="Meta para simular"><select value={goalId} onChange={e => setGoalId(e.target.value)}><option value="">Escolha uma meta</option>{analysis.goals.filter(g => g.goal.type !== 'expense-limit').map(g => <option key={g.goal.id} value={g.goal.id}>{g.goal.name}</option>)}</select></Field>}
    <div className="form-grid">{setters.filter(([key]) => (key !== 'target' || mode === 'balance') && (!grossGoal || key === 'extraIncome')).map(([key, label]) => <Field key={key} label={label}><MoneyInput value={input[key]} onChange={value => setInput({ ...input, [key]: value ?? 0 })} /></Field>)}</div>
    {mode === 'goal' && (!goal || expenseLimit) ? <p className="empty-state">Selecione uma meta de renda ou economia. Limites de despesas não são metas de faturamento.</p> : <><dl className="financial-metrics"><div><dt>Base realizada</dt><dd>{money(mode === 'goal' && goal ? goal.current : summary.balance)}</dd></div><div><dt>{mode === 'goal' ? 'Progresso no cenário' : 'Saldo no cenário'}</dt><dd>{money(scenario.balance)}</dd></div><div><dt>Falta para o alvo</dt><dd>{money(scenario.shortfall)}</dd></div><div><dt>Horas de delivery estimadas</dt><dd>{scenario.deliveryHours === null ? 'Sem base válida' : `${numberLabel(scenario.deliveryHours)} h`}</dd></div><div><dt>Faturamento bruto estimado necessário</dt><dd>{money(scenario.requiredGross)}</dd></div></dl><p className="fine-print">{analysis.delivery.count} turno(s) na base. {grossGoal ? 'Meta bruta: horas = falta ÷ bruto/hora; faturamento necessário = falta. Reduções de gastos não aumentam renda bruta.' : 'Meta líquida: horas = falta ÷ líquido operacional/hora. Bruto necessário = falta ÷ margem operacional registrada (líquido ÷ bruto).'} Reserva de manutenção e custos futuros não são adivinhados. As taxas são médias históricas, não uma promessa de receita.{!analysis.delivery.sufficient && ' Amostra pequena: a estimativa pode variar muito.'}</p><p className="fine-print">Redução aplicada até o gasto realizado do período: {money(scenario.reduction)}. Ao simular uma meta de renda bruta, use aumentos de renda; reduções de gastos não aumentam faturamento.</p></>}
  </section>
}
