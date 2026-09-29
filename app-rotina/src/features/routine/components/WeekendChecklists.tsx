import { homeChecklist, mealPrepChecklist } from '../data'

export function WeekendChecklists({ day, completed, onToggle }: { day: 0 | 6; completed: ReadonlySet<string>; onToggle: (id: string) => void }) {
  const render = (prefix: string, items: string[]) => items.map((item, index) => {
    const id = `${prefix}-${index}`
    return <label className="checklist-row" key={id}><input type="checkbox" checked={completed.has(id)} onChange={() => onToggle(id)} /><span>{item}</span></label>
  })

  return <section className="week-preparation" aria-label="Preparação do fim de semana">
    <div className="section-heading"><div><h2>Preparação do fim de semana</h2><p className="section-description">Marque o que foi feito hoje. As listas acompanham sua rotina sem criar novos registros.</p></div></div>
    {day === 0
      ? <section className="form-card"><p className="eyebrow">Domingo</p><h3>Preparo de marmitas</h3>{render('meal-check', mealPrepChecklist)}</section>
      : <section className="form-card"><p className="eyebrow">Sábado</p><h3>Manutenção da casa</h3>{render('home-check', homeChecklist)}</section>}
  </section>
}
