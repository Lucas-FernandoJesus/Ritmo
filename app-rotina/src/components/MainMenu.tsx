import { useId, useLayoutEffect, useRef, useState } from 'react'

export function MainMenu<T extends string>({ areas, settings, actions = [], current, onNavigate, onAction }: { areas: readonly { id: string; label: string; destinations: readonly { id: T; label: string }[] }[]; settings: { id: T; label: string }; actions?: readonly { id: string; label: string }[]; current: T; onNavigate: (id: T) => void; onAction?: (id: string) => void }) {
  const [open, setOpen] = useState(false), dialog = useRef<HTMLDialogElement>(null), trigger = useRef<HTMLButtonElement>(null), navigating = useRef(false)
  const id = useId()
  useLayoutEffect(() => {
    if (!open) return
    const element = dialog.current
    if (!element) return
    const htmlOverflow = document.documentElement.style.overflow, bodyOverflow = document.body.style.overflow
    document.documentElement.style.overflow = 'hidden'; document.body.style.overflow = 'hidden'
    element.showModal()
    element.querySelector<HTMLButtonElement>('[aria-current="page"]')?.focus()
    return () => { document.documentElement.style.overflow = htmlOverflow; document.body.style.overflow = bodyOverflow; if (element.open) element.close() }
  }, [open])
  function close() { dialog.current?.close() }
  function afterClose() { setOpen(false); if (!navigating.current) trigger.current?.focus(); navigating.current = false }
  function select(id: T) { navigating.current = true; close(); onNavigate(id) }
  function selectAction(id: string) { navigating.current = true; close(); onAction?.(id) }
  return <>
    <nav className="bottom-nav" aria-label="Acesso à navegação"><button ref={trigger} type="button" aria-label="Abrir menu principal" aria-haspopup="dialog" aria-controls={id} aria-expanded={open} onClick={() => setOpen(true)}><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg></button></nav>
    <dialog ref={dialog} id={id} className="main-menu" aria-label="Menu principal" onClose={afterClose} onClick={(event) => { if (event.target === event.currentTarget) close() }}>
      <div className="main-menu-content"><nav aria-label="Navegação principal">{areas.map((area) => <section className="main-menu-area" role="group" aria-label={area.label} key={area.id}><h2>{area.label}</h2><div className="main-menu-area-items">{area.destinations.map(item => <button type="button" key={item.id} aria-current={current === item.id ? 'page' : undefined} onClick={() => select(item.id)}>{item.label}</button>)}</div></section>)}<div className="main-menu-utility"><button type="button" aria-current={current === settings.id ? 'page' : undefined} onClick={() => select(settings.id)}>{settings.label}</button></div></nav>{actions.length > 0 && <div className="main-menu-actions" role="group" aria-label="Ações rápidas"><span>Ações rápidas em Trabalho e dinheiro</span><div>{actions.map((item) => <button type="button" key={item.id} onClick={() => selectAction(item.id)}>{item.label}</button>)}</div></div>}<button type="button" className="main-menu-close" aria-label="Fechar menu principal" onClick={close}><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" /></svg></button></div>
    </dialog>
  </>
}
