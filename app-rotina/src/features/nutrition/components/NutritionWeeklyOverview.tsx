import { summarizeNutritionWeeks } from '../weekly-summary'

type WeeklySummary = ReturnType<typeof summarizeNutritionWeeks>
type Period = WeeklySummary['current']

const decimal = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const date = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

const cards: readonly { title: string; value: (period: Period) => string; detail: (period: Period) => string }[] = [
  { title: 'Peso médio', value: (period) => period.weight.average === null ? 'Sem dados' : `${decimal(period.weight.average)} kg`, detail: (period) => `${period.weight.days} de 7 dias com peso` },
  { title: 'Cintura', value: (period) => period.waist.latest === null ? 'Sem dados' : `${decimal(period.waist.latest)} cm`, detail: (period) => `${period.waist.days} de 7 dias com cintura` },
  { title: 'Refeições', value: (period) => period.meals.registered === 0 ? 'Sem dados' : `${period.meals.registered} de 28 registros`, detail: (period) => `${period.meals.days} de 7 dias · ${period.meals.protein} com proteína · ${period.meals.skipped} não realizadas` },
  { title: 'Treinos', value: (period) => period.training.coverageDays === 0 ? 'Sem dados' : period.training.planned === 0 ? 'Nenhum planejado' : `${period.training.done} de ${period.training.planned} concluídos`, detail: (period) => `${period.training.coverageDays} de 7 dias com plano registrado` },
  { title: 'Gastos com alimentação', value: (period) => period.spending.total === null ? 'Sem dados' : money(period.spending.total), detail: (period) => `${period.spending.count} lançamentos realizados` },
]

export function NutritionWeeklyOverview({ summary }: { summary: WeeklySummary }) {
  return <section className="nutrition-section nutrition-weekly" aria-labelledby="nutrition-weekly-title">
    <div className="nutrition-heading">
      <div>
        <h2 id="nutrition-weekly-title">Resumo semanal da nutrição</h2>
        <p>Dois períodos completos de sete dias, sem incluir hoje. Os números refletem somente o que foi registrado.</p>
      </div>
    </div>
    <p className="nutrition-weekly-message">{summary.message}</p>
    <div className="nutrition-weekly-grid">
      {cards.map((card) => <article className="nutrition-weekly-card" key={card.title}>
        <h3>{card.title}</h3>
        <div className="nutrition-weekly-periods">
          {([summary.current, summary.previous] as const).map((period, index) => <div key={period.start}>
            <p className="nutrition-weekly-label">{index === 0 ? 'Últimos 7 dias' : '7 dias anteriores'} <span>{date(period.start)}–{date(period.end)}</span></p>
            <strong>{card.value(period)}</strong>
            <p className="nutrition-weekly-detail">{card.detail(period)}</p>
          </div>)}
        </div>
      </article>)}
    </div>
    <p className="nutrition-weekly-note">Peso e cintura são medidas observadas; refeições, treinos e gastos vêm dos registros existentes. A comparação não mostra o que causou uma mudança.</p>
  </section>
}
