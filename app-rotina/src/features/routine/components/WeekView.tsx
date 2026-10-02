import { useState } from 'react'
import type { AppSettings, RoutineItem } from '../../../core/types'
import { Field, PageTitle } from '../../../components/FormPrimitives'
import { dayNames, routineItems } from '../data'
import { areaLabels } from '../view-labels'
import { WeekendChecklists } from './WeekendChecklists'

export function WeekView({ settings, selectedDay, todayDay, onSelectedDay, onOpen, completed, onToggle }: { settings: AppSettings; selectedDay: number; todayDay: number; onSelectedDay: (day: number) => void; onOpen: (item: RoutineItem, day: number) => void; completed: ReadonlySet<string>; onToggle: (id: string) => void }) {
  const [search, setSearch] = useState('')
  const days = [1, 2, 3, 4, 5, 6, 0] as const
  const items = routineItems.filter((item) => item.days.includes(selectedDay as 0 | 1 | 2 | 3 | 4 | 5 | 6) && item.active && !settings.disabledActivities.includes(item.id)).map((item) => ({ ...item, ...settings.scheduleOverrides[item.id] })).sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''))
  const normalizedSearch = normalizeSearch(search)
  const visibleItems = normalizedSearch ? items.filter((item) => normalizeSearch(`${item.title} ${areaLabels[item.area]}`).includes(normalizedSearch)) : items
  return <>
    <PageTitle eyebrow="Visão geral" title="Sua semana" subtitle="Veja como os compromissos se distribuem. Ajuste os horários em Ajustes." />
    <div className="week-selector" role="group" aria-label="Escolher dia da semana">{days.map((day) => <button key={day} type="button" className={selectedDay === day ? 'selected' : ''} aria-pressed={selectedDay === day} onClick={() => onSelectedDay(day)}><span>{dayNames[day].slice(0, 3)}</span><i aria-hidden="true" /></button>)}</div>
    <div className="week-search"><Field label="Buscar atividade"><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Título ou categoria" /></Field></div>
    <section className="week-panel" aria-live="polite"><div className="section-heading"><div><h2>{dayNames[selectedDay]}</h2><p className="section-description">{normalizedSearch ? `${visibleItems.length} de ${items.length} atividades` : `${items.length} atividades previstas`}</p></div></div>{visibleItems.length ? <div className="week-list">{visibleItems.map((item) => { const openLabel = item.area === 'treino' ? 'Abrir treino' : 'Ver orientações'; return <button type="button" className={`week-item nature-${item.nature}`} key={item.id} onClick={() => onOpen(item, selectedDay)} aria-label={`${openLabel}: ${item.title}`}><time>{item.startTime ?? 'Livre'}</time><span className="week-copy"><strong>{item.title}</strong><span className="week-meta">{areaLabels[item.area]} · {item.nature === 'fixa' ? 'Fixa' : item.nature === 'flexivel' ? 'Flexível' : 'Opcional'}</span><span className="week-hint">{openLabel}</span></span></button> })}</div> : <div className="empty-state"><strong>{normalizedSearch && items.length ? 'Nenhuma atividade encontrada.' : 'Dia sem atividades.'}</strong><p>{normalizedSearch && items.length ? 'Tente outro título ou categoria.' : 'Aproveite o espaço livre.'}</p></div>}</section>
    {(selectedDay === 0 || selectedDay === 6) && <WeekendChecklists day={selectedDay} isToday={selectedDay === todayDay} completed={completed} onToggle={onToggle} />}
    <p className="week-footnote">Os turnos opcionais dependem da checagem de segurança no dia.</p>
  </>
}

function normalizeSearch(value: string) { return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('pt-BR').trim() }
