import { Children, cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react'

export function PageTitle({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return <header className="page-title"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{subtitle}</p></header>
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  const labelId = useId()
  return <label className="field"><span id={labelId}>{label}</span>{Children.map(children, (child) => isValidElement(child) && child.type !== 'small'
    ? cloneElement(child as ReactElement<{ 'aria-labelledby'?: string }>, { 'aria-labelledby': labelId })
    : child)}</label>
}
