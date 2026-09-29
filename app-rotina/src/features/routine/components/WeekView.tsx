import type { AppSettings, RoutineItem } from '../../../core/types'
import { PageTitle } from '../../../components/FormPrimitives'
import { dayNames, routineItems } from '../data'
import { areaLabels } from '../view-labels'
import { WeekendChecklists } from './WeekendChecklists'

export function WeekView({ settings, selectedDay, onSelectedDay, onOpen, completed, onToggle }: { settings: AppSettings; selectedDay: number; onSelectedDay: (day: number) => void; onOpen: (item: RoutineItem, day: number) => void; completed: ReadonlySet<string>; onToggle: (id: string) => void }) {
  const days = [1, 2, 3, 4, 5, 6, 0] as const
  const items = routineItems.filter((item) => item.days.includes(selectedDay as 0 | 1 | 2 | 3 | 4 | 5 | 6) && item.active && !settings.disabledActivities.includes(item.id)).map((item) => ({ ...item, ...settings.scheduleOverrides[item.id] })).sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''))
  return <>
    <PageTitle eyebrow="Visão geral" title="Sua semana" subtitle="Veja como os compromissos se distribuem. Ajuste os horários em Ajustes." />
    <div className="week-selector" role="group" aria-label="Escolher dia da semana">{days.map((day) => <button key={day} type="button" className={selectedDay === day ? 'selected' : ''} aria-pressed={selectedDay === day} onClick={() => onSelectedDay(day)}><span>{dayNames[day].slice(0, 3)}</span><i aria-hidden="true" /></button>)}</div>
    <section className="week-panel" aria-live="polite"><div className="section-heading"><div><h2>{dayNames[selectedDay]}</h2><p className="section-description">{items.length} atividades previstas</p></div></div>{items.length ? <div className="week-list">{items.map((item) => { const openLabel = item.area === 'treino' ? 'Abrir treino' : 'Ver orientações'; return <button type="button" className={`week-item nature-${item.nature}`} key={item.id} onClick={() => onOpen(item, selectedDay)} aria-label={`${openLabel}: ${item.title}`}><time>{item.startTime ?? 'Livre'}</time><span className="week-copy"><strong>{item.title}</strong><span className="week-meta">{areaLabels[item.area]} · {item.nature === 'fixa' ? 'Fixa' : item.nature === 'flexivel' ? 'Flexível' : 'Opcional'}</span><span className="week-hint">{openLabel}</span></span></button> })}</div> : <div className="empty-state"><strong>Dia sem atividades.</strong><p>Aproveite o espaço livre.</p></div>}</section>
    {(selectedDay === 0 || selectedDay === 6) && <WeekendChecklists day={selectedDay} completed={completed} onToggle={onToggle} />}
    <p className="week-footnote">Os turnos opcionais dependem da checagem de segurança no dia.</p>
  </>
}
