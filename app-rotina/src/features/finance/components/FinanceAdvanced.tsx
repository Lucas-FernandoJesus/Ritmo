import { useState } from 'react'
import type { FinanceSources } from '../finance'
import type { FinanceAnalysis } from '../finance-analysis'
import type { CategoryBudget, FinancialGoal, FinancePlanningData } from '../../../core/types'
import { FinanceSchedules, type ScheduleCallbacks } from './FinanceSchedules'
import { FinanceWealth, type WealthCallbacks } from './FinanceWealth'
import { FinanceClosing, FinanceExports, FinanceSimulator } from './FinanceTools'

export interface FinanceOperationCallbacks extends ScheduleCallbacks, WealthCallbacks {}
export function FinanceAdvanced({ area, sources, planning, analysis, interval, goals, budgets, callbacks }: { area: 'planning' | 'wealth' | 'tools'; sources: FinanceSources; planning: FinancePlanningData; analysis: FinanceAnalysis; interval: { start: string; end: string }; goals: readonly FinancialGoal[]; budgets: readonly CategoryBudget[]; callbacks: FinanceOperationCallbacks }) {
  const [tool, setTool] = useState<'closing' | 'simulator' | 'exports'>('closing')
  if (area === 'planning') return <div className="form-card finance-advanced"><FinanceSchedules today={sources.today} {...planning} records={sources.records} interval={interval} {...callbacks} /></div>
  if (area === 'wealth') return <div className="form-card finance-advanced"><FinanceWealth shifts={sources.shifts} today={sources.today} {...planning} records={sources.records} expenses={sources.expenses} {...callbacks} /></div>
  return <div className="form-card finance-advanced"><div className="subnav" role="group" aria-label="Ferramentas financeiras">{([['closing', 'Fechamento mensal'], ['simulator', 'Simulador'], ['exports', 'Exportações']] as const).map(([id, label]) => <button type="button" key={id} className={tool === id ? 'active' : ''} aria-pressed={tool === id} onClick={() => setTool(id)}>{label}</button>)}</div>
    {tool === 'closing' && <FinanceClosing sources={sources} planning={planning} goals={goals} budgets={budgets} />}
    {tool === 'simulator' && <FinanceSimulator analysis={analysis} />}
    {tool === 'exports' && <FinanceExports analysis={analysis} interval={interval} today={sources.today} />}
  </div>
}
