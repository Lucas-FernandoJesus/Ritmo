import { useEffect, useRef } from 'react'
import type { RoutineItem, RoutineMode } from '../../../core/types'
import { getTrainingActivityGuide } from '../../training/training-plan'
import { activityGuides } from '../activity-guides'
import { areaLabels } from '../view-labels'

export type ActivitySelection = { item: RoutineItem; day: number }

export function ActivityDetailsDialog({ selection, trainingWeek, mode, onClose }: { selection: ActivitySelection | null; trainingWeek: number; mode: RoutineMode; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const item = selection?.item ?? null
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (item && !dialog.open) dialog.showModal()
    if (!item && dialog.open) dialog.close()
  }, [item])
  const guide = item ? getTrainingActivityGuide(item.id, trainingWeek, selection?.day ?? new Date().getDay(), mode) ?? activityGuides[item.id] : null
  return <dialog ref={dialogRef} className="activity-dialog" aria-labelledby="activity-dialog-title" aria-describedby="activity-dialog-intro" onClose={onClose} onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close() }}>
    {item && guide && <>
      <div className="activity-dialog-main">
        <header className="activity-dialog-header"><div><span className="activity-dialog-area">{areaLabels[item.area]} · {item.startTime ? `${item.startTime}${item.endTime ? `–${item.endTime}` : ''}` : 'Horário livre'}</span><h2 id="activity-dialog-title">{item.title}</h2></div><button type="button" className="activity-dialog-close" aria-label="Fechar orientações" onClick={() => dialogRef.current?.close()}><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" /></svg></button></header>
        <p className="activity-dialog-intro" id="activity-dialog-intro">{guide.introduction}</p>
        <section className="activity-dialog-section" aria-labelledby="activity-dialog-steps"><h3 id="activity-dialog-steps">O que fazer</h3><ol className="guide-steps">{guide.steps.map((step) => <li key={step.title}><div className="guide-step-heading"><strong>{step.title}</strong>{step.amount && <span>{step.amount}</span>}</div><p>{step.description}</p></li>)}</ol></section>
        {!!item.conditions?.length && <section className="activity-dialog-section guide-conditions" aria-labelledby="activity-dialog-conditions"><h3 id="activity-dialog-conditions">Cuidados do plano</h3><ul>{item.conditions.map((condition) => <li key={condition}>{condition}</li>)}</ul></section>}
        {guide.closing && <p className="guide-closing">{guide.closing}</p>}
      </div>
      <footer className="activity-dialog-footer"><button type="button" className="secondary-button" onClick={() => dialogRef.current?.close()}>Fechar orientações</button></footer>
    </>}
  </dialog>
}
