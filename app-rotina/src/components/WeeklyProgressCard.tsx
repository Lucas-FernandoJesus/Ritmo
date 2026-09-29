import type { DailyProgressSummary, WeeklyProgressSummary } from '../core/types'

export function WeeklyProgressCard({ summary, today }: { summary: WeeklyProgressSummary; today?: DailyProgressSummary }) {
  return <section className="progress-summary" role="region" aria-labelledby="weekly-progress-title" aria-live="polite">
    <div><h2 id="weekly-progress-title">Progresso desta semana</h2><strong>{summary.completedDays} de {summary.plannedDays} dias concluídos</strong><span>{summary.completedRequiredActivities} de {summary.requiredActivities} atividades obrigatórias · {summary.activityPercentage}%</span></div>
    {today && <p>{today.completed ? 'Dia concluído' : `${today.completedRequiredCount} de ${today.requiredCount} obrigatórias concluídas hoje`}</p>}
    <div className="progress-track" role="progressbar" aria-label="Atividades obrigatórias concluídas na semana" aria-valuenow={summary.completedRequiredActivities} aria-valuemin={0} aria-valuemax={summary.requiredActivities}><span style={{ width: `${summary.activityPercentage}%` }} /></div>
  </section>
}
