import type { PlanningReference, RecurringPlan } from './types'

export function anchoredMonth(date: string, months: number): string {
  const [year, month, day] = date.split('-').map(Number)
  const target = new Date(year, month - 1 + months, 1, 12)
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0, 12).getDate()
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(Math.min(day, last)).padStart(2, '0')}`
}
export function recurringDate(plan: RecurringPlan, index: number): string {
  if (plan.frequency !== 'weekly') return anchoredMonth(plan.startDate, index * (plan.frequency === 'yearly' ? 12 : 1))
  const date = new Date(`${plan.startDate}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + index * 7)
  return date.toISOString().slice(0, 10)
}
export const occurrenceId = (ref: Pick<PlanningReference, 'kind' | 'planId' | 'key'>) => `occurrence:${ref.kind}:${ref.planId}:${ref.key}`
