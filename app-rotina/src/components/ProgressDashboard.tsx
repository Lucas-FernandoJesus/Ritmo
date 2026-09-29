import { useMemo, useState } from 'react'
import { buildDashboard, type DashboardCategory, type DashboardComparisonMetric, type DashboardPeriod, type DashboardUnit, type DashboardValue } from '../dashboard'
import type { CategoryBudget, DailyCompletion, DailyPlanSnapshot, DeliveryShift, Expense, FinancialGoal, FinancialRecord, StudyLog } from '../types'
import { buildFinanceAnalysis, numberLabel, percentLabel } from '../finance-analysis'
import { FinanceSummary } from './FinanceSummary'
import { FinanceAlerts } from './FinanceInsights'
import { PlanningProgress } from './FinancePlanning'
import { ProgressChart } from './ProgressChart'

interface ProgressDashboardProps {
  today: string
  snapshots: readonly DailyPlanSnapshot[]
  completions: readonly DailyCompletion[]
  studyLogs: readonly StudyLog[]
  deliveryShifts: readonly DeliveryShift[]
  expenses: readonly Expense[]
  financialRecords: readonly FinancialRecord[]
  financialGoals: readonly FinancialGoal[]
  categoryBudgets: readonly CategoryBudget[]
  onFinance: () => void
}

const categories: Array<{ id: DashboardCategory, label: string }> = [
  { id: 'renda', label: 'Renda' },
  { id: 'tarefas', label: 'Tarefas' },
  { id: 'treinos', label: 'Treinos' },
  { id: 'delivery', label: 'Delivery' },
  { id: 'estudos', label: 'Estudos' },
]

const categoryLabels: Record<DashboardCategory, string> = {
  renda: 'Renda',
  tarefas: 'Tarefas',
  treinos: 'Treinos',
  delivery: 'Delivery',
  estudos: 'Estudos',
}

const preferredSeries: Record<DashboardCategory, string> = {
  renda: 'income-estimated-result',
  tarefas: 'tasks-completion-rate',
  treinos: 'training-completion-rate',
  delivery: 'delivery-result-per-hour',
  estudos: 'study-minutes',
}

const preferredComparison: Record<DashboardCategory, string> = {
  renda: 'estimated-result',
  tarefas: 'completion-rate',
  treinos: 'completion-rate',
  delivery: 'result-per-hour',
  estudos: 'minutes-total',
}

const numberFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })
const integerFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })
const moneyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

const statusLabels = {
  available: 'Disponível',
  'no-data': 'Sem dados',
  future: 'Período futuro',
  unavailable: 'Indisponível',
} as const

const unitLabels: Record<DashboardUnit, string> = {
  count: 'Contagem',
  percent: 'Percentual',
  minutes: 'Minutos',
  hours: 'Horas',
  kilometers: 'Quilômetros',
  BRL: 'Reais',
  'BRL/hour': 'Reais por hora',
  'BRL/kilometer': 'Reais por quilômetro',
}

function dashboardStatusLabel(status: DashboardValue['status']): string {
  return statusLabels[status]
}

function dashboardUnitLabel(unit: DashboardUnit): string {
  return unitLabels[unit]
}

function formatDashboardValue(value: DashboardValue): string {
  if (value.status !== 'available') return statusLabels[value.status]
  if (value.value === null || !Number.isFinite(value.value)) return statusLabels.unavailable

  switch (value.unit) {
    case 'count': return integerFormatter.format(value.value)
    case 'percent': return `${numberFormatter.format(value.value)}%`
    case 'minutes': return `${numberFormatter.format(value.value)} min`
    case 'hours': return `${numberFormatter.format(value.value)} h`
    case 'kilometers': return `${numberFormatter.format(value.value)} km`
    case 'BRL': return moneyFormatter.format(value.value)
    case 'BRL/hour': return `${moneyFormatter.format(value.value)}/h`
    case 'BRL/kilometer': return `${moneyFormatter.format(value.value)}/km`
  }
}

function moveReference(referenceDate: string, period: DashboardPeriod, amount: number): string {
  const [year, month] = referenceDate.split('-').map(Number)
  if (period === 'year') return `${year + amount}-01-01`
  const absoluteMonth = year * 12 + month - 1 + amount
  const nextYear = Math.floor(absoluteMonth / 12)
  const nextMonth = ((absoluteMonth % 12) + 12) % 12 + 1
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`
}

function isCurrentPeriod(referenceDate: string, today: string, period: DashboardPeriod): boolean {
  return period === 'year' ? referenceDate.slice(0, 4) === today.slice(0, 4) : referenceDate.slice(0, 7) === today.slice(0, 7)
}

function canAdvance(referenceDate: string, today: string, period: DashboardPeriod): boolean {
  return period === 'year' ? referenceDate.slice(0, 4) < today.slice(0, 4) : referenceDate.slice(0, 7) < today.slice(0, 7)
}

function signedValue(value: DashboardValue): string {
  const formatted = formatDashboardValue(value)
  return value.status === 'available' && value.value !== null && value.value > 0 ? `+${formatted}` : formatted
}

function Comparison({ metric, previousLabel, status }: { metric: DashboardComparisonMetric | undefined, previousLabel: string, status: DashboardValue['status'] }) {
  const unavailable = status !== 'available' || !metric
  return <section className="dashboard-comparison" role="region" aria-label={`Comparação com ${previousLabel}`}>
    <div className="dashboard-section-heading">
      <div><p className="eyebrow">Período anterior</p><h3>Comparação com {previousLabel}</h3></div>
      <span>{metric ? dashboardUnitLabel(metric.unit) : 'Comparação'}</span>
    </div>
    {unavailable
      ? <div className="dashboard-comparison-empty"><strong>Indisponível</strong><p>O período anterior não possui dados comparáveis.</p></div>
      : <dl>
        <div><dt>Atual</dt><dd>{formatDashboardValue(metric.current)}</dd></div>
        <div><dt>Anterior</dt><dd>{formatDashboardValue(metric.previous)}</dd></div>
        <div><dt>Variação</dt><dd>{metric.changePercentage.status === 'available' ? signedValue(metric.changePercentage) : signedValue(metric.change)}</dd></div>
      </dl>}
  </section>
}

export function ProgressDashboard({ today, snapshots, completions, studyLogs, deliveryShifts, expenses, financialRecords, financialGoals, categoryBudgets, onFinance }: ProgressDashboardProps) {
  const [category, setCategory] = useState<DashboardCategory>('renda')
  const [period, setPeriod] = useState<DashboardPeriod>('month')
  const [referenceDate, setReferenceDate] = useState(today)

  const dashboard = useMemo(() => buildDashboard({
    category,
    period,
    referenceDate,
    today,
    snapshots,
    completions,
    studyLogs,
    deliveryShifts,
    expenses,
    financialRecords,
  }), [category, period, referenceDate, today, snapshots, completions, studyLogs, deliveryShifts, expenses, financialRecords])
  const finance = useMemo(() => buildFinanceAnalysis({ shifts: deliveryShifts, expenses, records: financialRecords, today, goals: financialGoals, budgets: categoryBudgets, interval: { start: dashboard.interval.start, end: dashboard.interval.end }, period }), [deliveryShifts, expenses, financialRecords, today, financialGoals, categoryBudgets, dashboard.interval.start, dashboard.interval.end, period])
  const balanceComparison = finance.comparison.metrics.find((metric) => metric.id === 'balance')!
  const highlightedGoal = [...finance.goals].filter((goal) => goal.status === 'active' || goal.status === 'near' || goal.status === 'achieved').sort((a, b) => a.goal.endDate.localeCompare(b.goal.endDate) || a.goal.createdAt.localeCompare(b.goal.createdAt))[0]

  const label = categoryLabels[dashboard.category]
  const series = dashboard.series.find((item) => item.id === preferredSeries[dashboard.category]) ?? dashboard.series[0]
  const comparisonMetric = dashboard.comparison.metrics.find((item) => item.id === preferredComparison[dashboard.category])
  const nextDisabled = !canAdvance(referenceDate, today, period)
  const currentDisabled = isCurrentPeriod(referenceDate, today, period)

  return <section className={`progress-dashboard ${dashboard.category === 'renda' ? 'dashboard-income' : ''}`} role="region" aria-label="Painel de progresso">
    <header className="dashboard-header" aria-live="polite">
      <div><p className="eyebrow">{dashboard.period === 'month' ? 'Visão mensal' : 'Visão anual'}</p><h2>{label}</h2></div>
      <div className="dashboard-period-copy"><strong>{dashboard.interval.label}</strong><span>{dashboard.hasData ? 'Dados realizados no período civil' : 'Nenhum dado realizado no período civil'}</span></div>
    </header>

    <div className="dashboard-category-switch" role="group" aria-label="Categorias do dashboard">
      {categories.map((item) => <button key={item.id} type="button" aria-pressed={dashboard.category === item.id} className={dashboard.category === item.id ? 'selected' : ''} onClick={() => setCategory(item.id)}>{item.label}</button>)}
    </div>

    <div className="dashboard-toolbar">
      <div className="dashboard-period-switch" role="group" aria-label="Período do dashboard">
        <button type="button" aria-pressed={dashboard.period === 'month'} className={dashboard.period === 'month' ? 'selected' : ''} onClick={() => setPeriod('month')}>Mensal</button>
        <button type="button" aria-pressed={dashboard.period === 'year'} className={dashboard.period === 'year' ? 'selected' : ''} onClick={() => setPeriod('year')}>Anual</button>
      </div>
      <div className="dashboard-period-navigation" role="group" aria-label="Navegação do período">
        <button type="button" aria-label="Período anterior" onClick={() => setReferenceDate((current) => moveReference(current, period, -1))}><span aria-hidden="true">←</span><span>Anterior</span></button>
        <button type="button" aria-label="Voltar ao período atual" disabled={currentDisabled} onClick={() => setReferenceDate(today)}>Atual</button>
        <button type="button" aria-label="Próximo período" disabled={nextDisabled} onClick={() => setReferenceDate((current) => moveReference(current, period, 1))}><span>Próximo</span><span aria-hidden="true">→</span></button>
      </div>
    </div>

    <FinanceSummary rows={finance.periodRows} compact onOpen={onFinance} />
    <section className="form-card dashboard-finance-insight" aria-label="Planejamento financeiro na Dashboard"><p>Saldo versus período anterior: <strong>{percentLabel(balanceComparison.percentage)}</strong>{finance.comparison.partial && <small>Período atual em andamento; anterior completo.</small>}</p>{highlightedGoal && <div><h3>Meta em destaque: {highlightedGoal.goal.name}</h3><PlanningProgress name={`Meta em destaque ${highlightedGoal.goal.name}`} percentage={highlightedGoal.percentage} detail={`${numberLabel(highlightedGoal.percentage)}% do alvo; realizado atualizado automaticamente`} /></div>}<p className="fine-print">Pendências e projeções abaixo consideram hoje, mesmo ao consultar um período histórico.</p><FinanceAlerts alerts={finance.alerts} compact /><button className="text-button" type="button" onClick={onFinance}>Acompanhar no Financeiro</button></section>
    <div key={`${dashboard.category}-${dashboard.period}-${dashboard.interval.start}`} className="dashboard-selection-content">
      <section className="dashboard-kpis" role="region" aria-label={`Indicadores de ${label}`}>
        <div className="dashboard-section-heading"><div><p className="eyebrow">Resumo</p><h3>Indicadores de {label}</h3></div><span>{dashboard.kpis.length} indicadores</span></div>
        <div className="dashboard-kpi-grid">{dashboard.kpis.map((item) => <article className={`dashboard-kpi status-${item.status} ${item.id === preferredComparison[dashboard.category] ? 'primary' : ''}`} key={item.id}>
          <span>{item.label}</span>
          <strong>{formatDashboardValue(item)}</strong>
          <small>{item.status === 'available' ? dashboardUnitLabel(item.unit) : dashboardStatusLabel(item.status)}</small>
        </article>)}</div>
      </section>

      <Comparison metric={comparisonMetric} previousLabel={dashboard.comparison.previousInterval.label} status={dashboard.comparison.status} />

      {series && <ProgressChart series={series} formatValue={formatDashboardValue} statusLabel={dashboardStatusLabel} unitLabel={dashboardUnitLabel} />}

      {dashboard.breakdown.length > 0 && <section className="dashboard-breakdown" aria-labelledby="dashboard-breakdown-title">
        <div className="dashboard-section-heading"><div><p className="eyebrow">Detalhamento</p><h3 id="dashboard-breakdown-title">Detalhamento de {label}</h3></div></div>
        <div className="dashboard-breakdown-grid">{dashboard.breakdown.map((item) => <article key={item.id}><h4>{item.label}</h4><dl>{item.metrics.map((detail) => <div key={detail.id}><dt>{detail.label}</dt><dd>{formatDashboardValue(detail)}</dd></div>)}</dl></article>)}</div>
      </section>}

      {dashboard.warnings.length > 0 && <section className="dashboard-warnings" aria-labelledby="dashboard-warnings-title">
        <h3 id="dashboard-warnings-title">Avisos sobre os dados</h3>
        <ul>{dashboard.warnings.map((item) => <li key={item.code}>{item.message}</li>)}</ul>
      </section>}
    </div>
  </section>
}
