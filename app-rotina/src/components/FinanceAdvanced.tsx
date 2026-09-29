import { useState } from 'react'
import type { FinanceSources } from '../finance'
import type { FinanceAnalysis } from '../finance-analysis'
import type { CategoryBudget, FinancialGoal, FinancePlanningData } from '../types'
import { FinanceSchedules, type ScheduleCallbacks } from './FinanceSchedules'
import { FinanceWealth, type WealthCallbacks } from './FinanceWealth'
import { FinanceClosing, FinanceExports, FinanceSimulator } from './FinanceTools'

export interface FinanceOperationCallbacks extends ScheduleCallbacks, WealthCallbacks {}
export function FinanceAdvanced({ sources, planning, analysis, interval, goals, budgets, callbacks }: { sources: FinanceSources; planning: FinancePlanningData; analysis: FinanceAnalysis; interval: { start: string; end: string }; goals: readonly FinancialGoal[]; budgets: readonly CategoryBudget[]; callbacks: FinanceOperationCallbacks }) {
  const [tab, setTab] = useState('schedules')
  return <section className="form-card finance-advanced" aria-label="Planejamento e decisões financeiras" id="finance-advanced"><div className="section-heading"><div><h2>Planejar próximos passos</h2><p className="section-description">Compromissos, contas e cenários em uma área separada do realizado.</p></div></div><div className="subnav" role="group" aria-label="Ferramentas financeiras">{[['schedules', 'Recorrências e parcelas'], ['wealth', 'Patrimônio'], ['closing', 'Fechamento mensal'], ['simulator', 'Simulador'], ['exports', 'Exportações']].map(([id, label]) => <button type="button" key={id} className={tab === id ? 'active' : ''} aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>)}</div>
    {tab === 'schedules' && <FinanceSchedules today={sources.today} {...planning} records={sources.records} interval={interval} {...callbacks} />}
    {tab === 'wealth' && <FinanceWealth shifts={sources.shifts} today={sources.today} {...planning} records={sources.records} expenses={sources.expenses} {...callbacks} />}
    {tab === 'closing' && <FinanceClosing sources={sources} planning={planning} goals={goals} budgets={budgets} />}
    {tab === 'simulator' && <FinanceSimulator analysis={analysis} />}
    {tab === 'exports' && <FinanceExports analysis={analysis} interval={interval} today={sources.today} />}
  </section>
}
