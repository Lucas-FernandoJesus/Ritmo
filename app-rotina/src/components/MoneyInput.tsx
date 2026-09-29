import type { InputHTMLAttributes } from 'react'
import { moneyFromInput, moneyInputValue } from '../core/money'

type MoneyInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  value: number | null
  onChange: (value: number | null) => void
}

export function MoneyInput({ value, onChange, ...props }: MoneyInputProps) {
  return <input {...props} type="text" inputMode="numeric" autoComplete="off" placeholder="R$ 0,00" value={moneyInputValue(value)} onChange={(event) => {
    const next = moneyFromInput(event.target.value)
    if (next !== null || !event.target.value.replace(/\D/g, '')) onChange(next)
  }} />
}
