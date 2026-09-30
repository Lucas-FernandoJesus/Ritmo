import type { CategoryBudget, DailyCompletion, DailyPlanSnapshot, DeliveryShift, Expense, FinancialGoal, FinancialRecord, FinancePlanningData, StudyLog, ThirtyDayProgress, WeeklyProgressSummary } from '../../../core/types'
import { summarizePlanProgress } from '../../../core/domain'
import { PageTitle } from '../../../components/FormPrimitives'
import { ProgressDashboard } from '../../dashboard/components/ProgressDashboard'
import { WeeklyProgressCard } from '../../../components/WeeklyProgressCard'
import { progressPlan } from '../../routine/data'

export function ProgressView({ planning, today, snapshots, completions, studyLogs, deliveryShifts, expenses, financialRecords, financialGoals, categoryBudgets, onFinance, progress, weeklySummary, previousWeeklySummary, onToggle }: { planning: FinancePlanningData; today: string; snapshots: DailyPlanSnapshot[]; completions: DailyCompletion[]; studyLogs: StudyLog[]; deliveryShifts: DeliveryShift[]; expenses: Expense[]; financialRecords: FinancialRecord[]; financialGoals: FinancialGoal[]; categoryBudgets: CategoryBudget[]; onFinance: () => void; progress: ThirtyDayProgress[]; weeklySummary: WeeklyProgressSummary; previousWeeklySummary: WeeklyProgressSummary; onToggle: (item: ThirtyDayProgress) => Promise<void> }) {
  const { completedIds: completed, total, completedCount, percentage } = summarizePlanProgress(progress, progressPlan)
  return <>
    <PageTitle eyebrow="Evolução" title="Seu progresso continua" subtitle="Acompanhe a rotina e os passos do plano inicial. Os treinos estão na aba Treinos." />

    <ProgressDashboard planning={planning} today={today} snapshots={snapshots} completions={completions} studyLogs={studyLogs} deliveryShifts={deliveryShifts} expenses={expenses} financialRecords={financialRecords} financialGoals={financialGoals} categoryBudgets={categoryBudgets} onFinance={onFinance} />

    <section className="dashboard-existing-progress" aria-labelledby="existing-progress-title">
      <div className="section-heading"><div><p className="eyebrow">Rotina preservada</p><h2 id="existing-progress-title">Progresso semanal e plano de 30 dias</h2><p className="section-description">Estas leituras permanecem separadas do dashboard mensal e anual.</p></div></div>

      <WeeklyProgressCard summary={weeklySummary} previous={previousWeeklySummary} />

      <div className="section-heading progress-plan-heading"><div><h2>Plano inicial de 30 dias</h2><p className="section-description">O checklist original permanece separado e com todos os registros preservados.</p></div></div>
      <section className="progress-summary"><div><strong>{completedCount} de {total} passos registrados</strong><span>Continue de onde fizer sentido.</span></div><div className="progress-track" role="progressbar" aria-label="Passos do plano concluídos" aria-valuenow={completedCount} aria-valuemin={0} aria-valuemax={total}><span style={{ width: `${percentage}%` }} /></div></section>
      <div className="progress-weeks">{progressPlan.map((planWeek) => { const weekDone = planWeek.items.filter((_, index) => completed.has(`week-${planWeek.week}-${index}`)).length; return <section className="progress-card" key={planWeek.week}><header><span>Etapa {planWeek.week}</span><strong>{planWeek.title}</strong><small>{weekDone} de {planWeek.items.length}</small></header>{planWeek.items.map((text, index) => { const id = `week-${planWeek.week}-${index}`; const done = completed.has(id); return <label className="checklist-row" key={id}><input type="checkbox" checked={done} onChange={() => onToggle({ id, week: planWeek.week, item: text, state: done ? 'pending' : 'done', completedAt: done ? undefined : new Date().toISOString() })} /><span>{text}</span></label> })}</section> })}</div>
      <div className="info-card"><strong>Uma leitura honesta</strong><p>Dados incompletos não permitem concluir que uma mudança de saúde ou renda ocorreu. Observe tendências e leve decisões clínicas ou financeiras importantes a profissionais habilitados.</p></div>
    </section>
  </>
}
