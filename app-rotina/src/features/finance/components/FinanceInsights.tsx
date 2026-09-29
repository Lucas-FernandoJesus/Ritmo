import { useState } from 'react'
import { formatMoney } from '../../../core/domain'
import { dateLabel, numberLabel, percentLabel, type FinanceAnalysis, type FinancialAlert, type PeriodComparison } from '../finance-analysis'
import type { DashboardSeries, DashboardValue } from '../../dashboard/dashboard'
import { ProgressChart } from '../../../components/ProgressChart'
import { Field } from '../../../components/FormPrimitives'

const formatFinanceValue = (value: DashboardValue) => value.value === null ? value.status === 'unavailable' ? 'Dados incompletos' : value.status === 'future' ? 'Período futuro' : 'Sem dados' : value.unit === 'hours' ? `${numberLabel(value.value)} h` : value.unit === 'BRL/hour' ? `${formatMoney(value.value)}/h` : formatMoney(value.value)
const statusLabel = (value: DashboardValue['status']) => value === 'available' ? 'Disponível' : value === 'future' ? 'Período futuro' : value === 'unavailable' ? 'Dados incompletos' : 'Sem dados'
const valueLabel = (value: number | null) => value === null ? 'Sem dados ou dados incompletos' : formatMoney(value)
const hourlyLabel = (value: number | null) => value === null ? 'Indisponível' : `${formatMoney(value)}/h`
const ratioLabel = (value: number | null) => value === null ? 'Sem base' : `${numberLabel(value)}%`
const severityLabel: Record<FinancialAlert['severity'], string> = { critical: 'Atenção prioritária', attention: 'Atenção', info: 'Progresso' }

export function FinanceAlerts({ alerts, compact = false }: { alerts: readonly FinancialAlert[]; compact?: boolean }) {
  if (!alerts.length) return compact ? null : <p className="fine-print finance-no-alerts">Nenhum alerta identificado nos dados cadastrados.</p>
  const render = (items: readonly FinancialAlert[]) => <ul className="financial-alert-list">{items.map((alert) => <li key={alert.code} className={`financial-alert ${alert.severity}`}><strong>{severityLabel[alert.severity]}</strong><p>{alert.message}</p></li>)}</ul>
  const limit = compact ? 2 : 3
  return <section className="form-card financial-alerts" aria-label="Alertas financeiros"><h3>{compact ? 'Para acompanhar' : 'Atenção aos próximos passos'}</h3>{render(alerts.slice(0, limit))}{alerts.length > limit && <details><summary>{alerts.length - limit} outros alertas</summary>{render(alerts.slice(limit))}</details>}</section>
}

export function FinanceComparison({ comparison }: { comparison: PeriodComparison }) {
  const balance = comparison.metrics.find((item) => item.id === 'balance')!
  return <details className="finance-analysis settings-disclosure"><summary>Comparação com o período anterior <span>{percentLabel(balance.percentage)} no saldo</span></summary><div className="finance-analysis-content">
    <p className="fine-print">Anterior: {dateLabel(comparison.previousInterval.start)} a {dateLabel(comparison.previousInterval.end)}.{comparison.partial && ' Período atual em andamento; comparação com o período anterior completo, sem inferir queda ou crescimento definitivo.'}</p>
    <div className="dashboard-table-scroll" tabIndex={0} role="region" aria-label="Tabela financeira com rolagem horizontal"><table className="financial-table"><caption>Valores realizados e variações por indicador</caption><thead><tr><th scope="col">Indicador</th><th scope="col">Atual</th><th scope="col">Anterior</th><th scope="col">Variação</th></tr></thead><tbody>{comparison.metrics.map((item) => <tr key={item.id}><th scope="row">{item.label}</th><td>{formatFinanceValue({ value: item.current, unit: item.unit, status: item.current === null ? 'no-data' : 'available' })}</td><td>{formatFinanceValue({ value: item.previous, unit: item.unit, status: item.previous === null ? 'no-data' : 'available' })}</td><td>{percentLabel(item.percentage)}{item.difference !== null && <small>Diferença: {formatFinanceValue({ value: item.difference, unit: item.unit, status: 'available' })}</small>}</td></tr>)}</tbody></table></div>
    <p className="fine-print">O saldo é a renda líquida dos registros pessoais. Os indicadores operacionais de delivery seguem a data do turno e incluem seus custos vinculados pagos até hoje.</p>
  </div></details>
}

export function FinanceProjection({ analysis, today }: { analysis: FinanceAnalysis; today: string }) {
  const thirty = analysis.projections[2]
  return <details className="finance-analysis settings-disclosure"><summary>Saldo projetado e fluxo futuro <span>30 dias: {valueLabel(thirty.projected)}</span></summary><div className="finance-analysis-content">
    <p className="section-description">A partir de {dateLabel(today)}, independentemente do filtro de histórico. Estimativa somente dos valores cadastrados, sem prever receitas ou gastos não informados.</p>
    <div className="result-strip"><div><span>Saldo atual dos registros</span><strong>{valueLabel(thirty.current)}</strong></div><div><span>Impacto previsto em 30 dias</span><strong>{valueLabel(thirty.impact)}</strong></div><div><span>Saldo projetado em 30 dias</span><strong>{valueLabel(thirty.projected)}</strong></div></div>
    <p className="fine-print">Saldo atual usa todo o realizado disponível até hoje. Esta projeção dos registros permanece separada dos saldos iniciais e contas do Patrimônio. Recorrências e parcelas não confirmadas entram somente no impacto previsto; confirmação evita contá-las novamente. Sem base, mostramos o impacto e não inventamos saldo. Reserva de manutenção permanece fora desta projeção.</p>
    <div className="dashboard-table-scroll" tabIndex={0} role="region" aria-label="Tabela financeira com rolagem horizontal"><table className="financial-table"><caption>Fluxo futuro por horizonte cumulativo; não some as linhas</caption><thead><tr><th scope="col">Horizonte</th><th scope="col">Entradas previstas</th><th scope="col">Créditos</th><th scope="col">Despesas previstas</th><th scope="col">Pendências</th><th scope="col">Impacto</th><th scope="col">Saldo projetado</th></tr></thead><tbody>{analysis.projections.map((item) => <tr key={item.days}><th scope="row">Próximos {item.days} dias</th><td>{valueLabel(item.futureEntries)}</td><td>{valueLabel(item.credits)}</td><td>{valueLabel(item.futureExits)}</td><td>{valueLabel(item.pending)}</td><td>{valueLabel(item.impact)}</td><td>{valueLabel(item.projected)}{item.riskDate && <small className="warning-text">Risco de saldo negativo até {dateLabel(item.riskDate)}</small>}</td></tr>)}</tbody></table></div>
    <p className="fine-print">Pendências e créditos vencidos continuam em aberto e entram em todos os horizontes. A data dos valores em aberto é o vencimento previsto; confira-a para uma projeção útil. Valores do mesmo dia são compensados sem presumir horário de recebimento.</p>
    <details className="dashboard-data-details"><summary>Ver sequência dos próximos 30 dias</summary>{thirty.schedule.length ? <div className="dashboard-table-scroll" tabIndex={0} role="region" aria-label="Tabela financeira com rolagem horizontal"><table className="financial-table"><caption>Saldo após compromissos de cada data</caption><thead><tr><th scope="col">Data</th><th scope="col">Impacto</th><th scope="col">Saldo previsto</th></tr></thead><tbody>{thirty.schedule.map((item) => <tr key={item.date}><th scope="row">{dateLabel(item.date)}</th><td>{valueLabel(item.impact)}</td><td>{valueLabel(item.balance)}</td></tr>)}</tbody></table></div> : <p className="section-description">Nenhum compromisso cadastrado para os próximos 30 dias.</p>}</details>
  </div></details>
}

export function FinanceDeliveryInsights({ analysis, onDelivery }: { analysis: FinanceAnalysis; onDelivery: () => void }) {
  const delivery = analysis.delivery
  const [groupBy, setGroupBy] = useState<'weekdays' | 'durations' | 'startTimes'>('weekdays')
  const [metric, setMetric] = useState('net')
  const groups = delivery[groupBy]
  const metrics = [
    { id: 'gross', label: 'Renda bruta mensal', unit: 'BRL' as const }, { id: 'expenses', label: 'Despesas mensais', unit: 'BRL' as const },
    { id: 'net', label: 'Renda líquida operacional mensal', unit: 'BRL' as const }, { id: 'perHour', label: 'Renda líquida operacional / hora', unit: 'BRL/hour' as const },
  ]
  const selection = metrics.find((item) => item.id === metric)!
  const series: DashboardSeries = { id: `delivery-${selection.id}`, label: selection.label, unit: selection.unit, points: delivery.months.map((month) => {
    const value = month[selection.id as 'gross' | 'expenses' | 'net' | 'perHour']
    return { key: month.label, label: month.label.split('-').reverse().join('/'), value, unit: selection.unit, status: value === null ? 'unavailable' : 'available' }
  }) }
  return <section className="form-card finance-delivery" aria-label="Financeiro do delivery">
    <div className="section-heading"><h2>Delivery no período</h2><button className="text-button" type="button" onClick={onDelivery}>Ver turnos</button></div>
    <div className="result-strip"><div><span>Renda bruta</span><strong>{valueLabel(delivery.gross)}</strong></div><div><span>Despesas pagas</span><strong>{valueLabel(delivery.expenses)}</strong></div><div><span>Renda líquida operacional</span><strong>{valueLabel(delivery.net)}</strong></div><div><span>Reserva do período</span><strong>{valueLabel(delivery.reserve)}</strong></div><div><span>Renda líquida estimada após reserva</span><strong>{valueLabel(delivery.afterReserve)}</strong></div></div>
    <p className="fine-print">Custos do turno e despesas vinculadas pagas entram uma vez. A reserva reduz o resultado estimado e não é pagamento no saldo realizado.</p>
    <p className="fine-print">Reserva estimada acumulada até hoje: {valueLabel(delivery.accumulatedReserve)}. Representa a soma das estimativas registradas, sem controle de depósitos ou retiradas.</p>
    <details className="dashboard-data-details"><summary>Desempenho e custos do delivery</summary><div className="delivery-insights">
      {!delivery.count ? <p className="section-description">Nenhum turno realizado neste período.</p> : <>
        <p className="section-description">{delivery.count} turno(s) · {delivery.sufficient ? 'Médias descritivas dos turnos registrados; não garantem desempenho futuro.' : 'Poucos turnos: estes valores não indicam uma tendência permanente.'}</p>
        <dl className="financial-metrics">{[['Bruto / hora', delivery.grossPerHour], ['Despesas / hora', delivery.expensesPerHour], ['Líquido operacional / hora', delivery.netPerHour], ['Resultado após reserva / hora', delivery.afterReservePerHour]].map(([label, value]) => <div key={label as string}><dt>{label}</dt><dd>{hourlyLabel(value as number | null)}</dd></div>)}</dl>
        <dl className="financial-metrics"><div><dt>Bruto médio / turno</dt><dd>{valueLabel(delivery.averageGross)}</dd></div><div><dt>Líquido médio / turno</dt><dd>{valueLabel(delivery.averageNet)}</dd></div><div><dt>Horas médias / turno</dt><dd>{numberLabel(delivery.averageHours)} h</dd></div><div><dt>Despesas médias / turno</dt><dd>{valueLabel(delivery.averageExpenses)}</dd></div><div><dt>Melhor líquido / hora</dt><dd>{hourlyLabel(delivery.bestPerHour)}</dd></div><div><dt>Reserva estimada acumulada</dt><dd>{valueLabel(delivery.accumulatedReserve)}</dd></div></dl>
        <p className="fine-print">Taxas agregadas = soma dos valores ÷ soma das horas, sem média simples das taxas de cada turno. A reserva acumulada é a soma das reservas registradas até hoje, não um saldo de conta nem uma obrigação vencida.</p>
        <div className="dashboard-table-scroll" tabIndex={0} role="region" aria-label="Tabela financeira com rolagem horizontal"><table className="financial-table"><caption>Custos pagos associados ao delivery</caption><thead><tr><th scope="col">Custo</th><th scope="col">Total</th><th scope="col">% das despesas</th><th scope="col">% da receita bruta</th><th scope="col">Custo / hora</th><th scope="col">Variação anterior</th></tr></thead><tbody>{delivery.costs.map((cost) => <tr key={cost.key}><th scope="row">{cost.label}</th><td>{valueLabel(cost.amount)}</td><td>{ratioLabel(cost.percentage)}</td><td>{ratioLabel(cost.revenuePercentage)}</td><td>{hourlyLabel(cost.perHour)}</td><td>{percentLabel(cost.changePercentage)}</td></tr>)}</tbody></table></div>
        <p className="fine-print">Classifique custos adicionais ao associá-los ao turno. Registros antigos sem classificação mantêm sua categoria; nenhuma descrição é usada para adivinhar o tipo de custo.</p>
        <Field label="Comparar turnos por"><select value={groupBy} onChange={(event) => setGroupBy(event.target.value as typeof groupBy)}><option value="weekdays">Dia da semana</option><option value="durations">Duração</option><option value="startTimes">Horário de início</option></select></Field>
        <div className="dashboard-table-scroll" tabIndex={0} role="region" aria-label="Tabela financeira com rolagem horizontal"><table className="financial-table"><caption>Comparação descritiva dos turnos; mínimo de três turnos por grupo para uma base inicial</caption><thead><tr><th scope="col">Grupo</th><th scope="col">Turnos / horas</th><th scope="col">Bruto</th><th scope="col">Despesas</th><th scope="col">Líquido</th><th scope="col">Líquido / hora</th></tr></thead><tbody>{groups.map((group) => <tr key={group.label}><th scope="row">{group.label}{!group.sufficient && <small>Amostra pequena</small>}</th><td>{group.count} / {numberLabel(group.hours)} h</td><td>{valueLabel(group.gross)}</td><td>{valueLabel(group.expenses)}</td><td>{valueLabel(group.net)}</td><td>{hourlyLabel(group.perHour)}</td></tr>)}</tbody></table></div>
        <Field label="Indicador da evolução mensal"><select value={metric} onChange={(event) => setMetric(event.target.value)}>{metrics.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></Field>
        <ProgressChart series={series} formatValue={formatFinanceValue} statusLabel={statusLabel} unitLabel={(unit) => unit === 'BRL/hour' ? 'Reais por hora' : 'Reais'} />
        <p className="fine-print">Meses mostrados somente quando há turnos no período selecionado. Um turno excepcional não representa tendência.</p>
      </>}
    </div></details>
  </section>
}

function FlowChart({ series }: { series: readonly DashboardSeries[] }) {
  const entries = series[0], exits = series[1]
  const available = [...entries.points, ...exits.points].filter((point) => point.value !== null)
  const maximum = Math.max(1, ...available.map((point) => point.value!))
  const width = 720, height = 240, left = 100, bottom = 200, top = 24
  const slot = (width - left - 16) / Math.max(1, entries.points.length)
  const bar = Math.min(16, slot / 3)
  return <section className="dashboard-chart-card" aria-label="Fluxo de entradas e saídas">
    <h3>Entradas × saídas no tempo</h3>
    {!available.length ? <p className="section-description">Sem valores realizados para o gráfico.</p> : <div className="dashboard-chart-frame"><svg viewBox={`0 0 ${width} ${height}`} className="dashboard-chart" aria-hidden="true"><line className="dashboard-chart-axis" x1={left} x2={width - 16} y1={bottom} y2={bottom} /><text x={left - 8} y={top + 4} textAnchor="end" className="dashboard-chart-axis-label">{formatMoney(maximum)}</text>{entries.points.map((point, index) => {
      const x = left + slot * (index + .5)
      return <g key={point.key}>{[point, exits.points[index]].map((item, position) => item.value !== null && <rect key={position} className={position ? 'finance-flow-exit' : 'finance-flow-entry'} x={x + (position ? 2 : -bar - 2)} y={bottom - item.value / maximum * (bottom - top)} width={bar} height={Math.max(2, item.value / maximum * (bottom - top))} rx="1" />)}{(index === 0 || index === entries.points.length - 1 || index % Math.max(1, Math.ceil(entries.points.length / 7)) === 0) && <text x={x} y={225} textAnchor="middle" className="dashboard-chart-label">{point.label}</text>}</g>
    })}</svg></div>}
    <p className="fine-print">Entradas: barra cheia à esquerda. Saídas: barra contornada à direita. Dias sem registros não são gastos zero comprovados.</p>
    <details className="dashboard-data-details"><summary>Ver tabela do fluxo</summary><div className="dashboard-table-scroll" tabIndex={0} role="region" aria-label="Tabela financeira com rolagem horizontal"><table className="financial-table"><caption>Entradas e saídas realizadas por data</caption><thead><tr><th scope="col">Data</th><th scope="col">Entradas</th><th scope="col">Saídas</th></tr></thead><tbody>{entries.points.map((point, index) => <tr key={point.key}><th scope="row">{point.label}</th><td>{formatFinanceValue(point)}</td><td>{formatFinanceValue(exits.points[index])}</td></tr>)}</tbody></table></div></details>
  </section>
}

export function FinancePeriodAnalysis({ analysis }: { analysis: FinanceAnalysis }) {
  const [scale, setScale] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [chart, setChart] = useState('flow')
  const trend = analysis.trends.find((item) => item.scale === scale)!
  const direction = { insufficient: 'Histórico insuficiente para avaliar tendência', increasing: 'Gastos aumentando nos registros', decreasing: 'Gastos diminuindo nos registros', stable: 'Gastos estáveis nos registros' }[trend.direction]
  return <details className="finance-analysis settings-disclosure"><summary>Análises do período <span>Fluxo, saldo e tendências</span></summary><div className="finance-analysis-content">
    <div className="finance-distributions">{[['Entradas × saídas', analysis.distributions.types], ['Despesas por categoria', analysis.distributions.expenses], ['Receitas por origem', analysis.distributions.origins]].map(([title, items]) => <section className="form-card finance-distribution" key={title as string}><h3>{title as string}</h3>{(items as typeof analysis.distributions.types).length ? <dl>{(items as typeof analysis.distributions.types).map((item) => <div key={item.key}><dt>{item.key}</dt><dd>{valueLabel(item.amount)}<small className="section-description"> · {ratioLabel(item.percentage)}</small></dd><div className="finance-bar" aria-hidden="true"><span style={{ width: `${item.relative}%` }} /></div></div>)}</dl> : <p className="section-description">Sem registros realizados neste período.</p>}</section>)}</div>
    <Field label="Gráfico financeiro"><select value={chart} onChange={(event) => setChart(event.target.value)}><option value="flow">Entradas × saídas</option><option value="balance">Saldo acumulado</option></select></Field>
    {chart === 'flow' ? <FlowChart series={analysis.series} /> : <ProgressChart series={analysis.series[2]} formatValue={formatFinanceValue} statusLabel={statusLabel} unitLabel={() => 'Reais'} />}
    <p className="fine-print">Saldo acumulado começa em zero no início do período, sem saldo bancário inicial. Datas sem registros mantêm o estado sem dados.</p>
    <section className="finance-trend" aria-label="Tendência de despesas"><h3>Tendência de gastos</h3><Field label="Agrupamento da tendência"><select value={scale} onChange={(event) => setScale(event.target.value as typeof scale)}><option value="daily">Diário</option><option value="weekly">Semanal</option><option value="monthly">Mensal</option></select></Field><strong>{direction}</strong>{trend.direction !== 'insufficient' && <p>{percentLabel(trend.percentage)} · três períodos recentes comparados com os três anteriores.</p>}<p className="fine-print">{trend.direction !== 'insufficient' && `Base observada: ${trend.groups[0].key} a ${trend.groups.at(-1)!.key}. `}Exige seis períodos consecutivos encerrados com registros de despesas. Lacunas e o período em andamento não são tratados como zero. O resultado descreve os registros disponíveis, sem previsão estatística.</p>{trend.categories.length > 0 && <ul>{trend.categories.map((item) => <li key={item.category}>{item.category}: {percentLabel(item.percentage)}</li>)}</ul>}</section>
  </div></details>
}
