import type { DashboardSeries, DashboardUnit, DashboardValue } from '../dashboard'

const numberFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })
const moneyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function formatAxisValue(value: number, unit: DashboardUnit): string {
  if (unit === 'BRL' || unit === 'BRL/hour' || unit === 'BRL/kilometer') return moneyFormatter.format(value)
  return numberFormatter.format(value)
}

function markerForStatus(status: DashboardValue['status'], x: number, y: number, key: string) {
  if (status === 'no-data') return <line key={key} className="dashboard-chart-no-data" x1={x - 5} x2={x + 5} y1={y} y2={y} />
  if (status === 'future') return <circle key={key} className="dashboard-chart-future" cx={x} cy={y} r="4" />
  if (status === 'unavailable') return <path key={key} className="dashboard-chart-unavailable" d={`M ${x - 4} ${y - 4} L ${x + 4} ${y + 4} M ${x + 4} ${y - 4} L ${x - 4} ${y + 4}`} />
  return null
}

interface ProgressChartProps {
  series: DashboardSeries
  formatValue: (value: DashboardValue) => string
  statusLabel: (status: DashboardValue['status']) => string
  unitLabel: (unit: DashboardUnit) => string
}

export function ProgressChart({ series, formatValue, statusLabel, unitLabel }: ProgressChartProps) {
  const availablePoints = series.points.filter((point) => point.status === 'available' && point.value !== null && Number.isFinite(point.value))
  const availableValues = availablePoints.map((point) => point.value as number)
  const width = 720
  const height = 240
  const padding = { top: 24, right: 16, bottom: 38, left: 52 }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom
  const rawMinimum = availableValues.length ? Math.min(0, ...availableValues) : 0
  const rawMaximum = availableValues.length ? Math.max(0, ...availableValues) : 0
  const minimum = rawMinimum === rawMaximum ? 0 : rawMinimum
  const maximum = rawMinimum === rawMaximum ? 1 : rawMaximum
  const range = maximum - minimum
  const yFor = (value: number) => padding.top + (maximum - value) / range * plotHeight
  const zeroY = yFor(0)
  const slotWidth = plotWidth / Math.max(series.points.length, 1)
  const barWidth = Math.max(4, Math.min(18, slotWidth * .58))
  const labelStep = series.points.length > 12 ? Math.ceil(series.points.length / 7) : 1

  return <section className="dashboard-chart-card" role="region" aria-label={`Gráfico temporal de ${series.label}`}>
    <div className="dashboard-section-heading">
      <div><p className="eyebrow">Evolução no período</p><h3>{series.label}</h3></div>
      <span>{unitLabel(series.unit)}</span>
    </div>

    {availablePoints.length === 0
      ? <div className="dashboard-chart-empty"><strong>Sem valores disponíveis para o gráfico.</strong><p>Consulte a tabela para distinguir ausência, futuro e indisponibilidade.</p></div>
      : <div className="dashboard-chart-frame">
        <svg className="dashboard-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <line className="dashboard-chart-axis" x1={padding.left} x2={width - padding.right} y1={zeroY} y2={zeroY} />
          <text className="dashboard-chart-axis-label" x={padding.left - 8} y={padding.top + 4} textAnchor="end">{formatAxisValue(maximum, series.unit)}</text>
          <text className="dashboard-chart-axis-label" x={padding.left - 8} y={height - padding.bottom} textAnchor="end">{formatAxisValue(minimum, series.unit)}</text>
          {series.points.map((point, index) => {
            const x = padding.left + slotWidth * index + slotWidth / 2
            const showLabel = index === 0 || index === series.points.length - 1 || index % labelStep === 0
            if (point.status !== 'available' || point.value === null || !Number.isFinite(point.value)) {
              return <g key={point.key}>
                {markerForStatus(point.status, x, height - padding.bottom - 4, `${point.key}-marker`)}
                {showLabel && <text className="dashboard-chart-label" x={x} y={height - 14} textAnchor="middle">{point.label}</text>}
              </g>
            }
            const valueY = yFor(point.value)
            const barY = point.value >= 0 ? Math.min(valueY, zeroY - 2) : zeroY
            const barHeight = Math.max(2, Math.abs(zeroY - valueY))
            return <g key={point.key}>
              <rect className="dashboard-chart-bar" x={x - barWidth / 2} y={barY} width={barWidth} height={barHeight} rx="2" />
              {showLabel && <text className="dashboard-chart-label" x={x} y={height - 14} textAnchor="middle">{point.label}</text>}
            </g>
          })}
        </svg>
      </div>}

    <ul className="dashboard-chart-legend" aria-label="Legenda do gráfico">
      <li><span className="dashboard-legend-marker available" aria-hidden="true" />Disponível</li>
      <li><span className="dashboard-legend-marker no-data" aria-hidden="true" />Sem dados</li>
      <li><span className="dashboard-legend-marker future" aria-hidden="true" />Futuro</li>
      <li><span className="dashboard-legend-marker unavailable" aria-hidden="true">×</span>Indisponível</li>
    </ul>

    <details className="dashboard-data-details" key={series.id}>
      <summary>Ver tabela de dados</summary>
      <div className="dashboard-table-scroll">
        <table>
          <caption>Dados da série {series.label}</caption>
          <thead><tr><th scope="col">Período</th><th scope="col">Valor</th><th scope="col">Unidade</th><th scope="col">Status</th></tr></thead>
          <tbody>{series.points.map((point) => <tr key={point.key}>
            <th scope="row">{point.label}</th>
            <td>{formatValue(point)}</td>
            <td>{unitLabel(point.unit)}</td>
            <td><span className={`dashboard-status-symbol ${point.status}`} aria-hidden="true">{point.status === 'unavailable' ? '×' : ''}</span>{statusLabel(point.status)}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </details>
  </section>
}
