import { useLayoutEffect, useRef } from 'react'

export const entityId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
export function useFinanceFormFocus() {
  const ref = useRef<HTMLFormElement>(null)
  useLayoutEffect(() => { ref.current?.scrollIntoView({ block: 'start' }); ref.current?.querySelector<HTMLInputElement>('input:not(:disabled)')?.focus() }, [])
  return ref
}
