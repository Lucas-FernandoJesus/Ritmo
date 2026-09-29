import { formatMoney } from './domain'

export function sumMoney(values: readonly (number | null)[]): number | null {
  let cents = 0
  for (const value of values) {
    if (value === null || !Number.isFinite(value) || !Number.isSafeInteger(Math.round(value * 100))) return null
    cents += Math.round(value * 100)
    if (!Number.isSafeInteger(cents)) return null
  }
  return cents / 100
}

export const subtractMoney = (first: number | null, second: number | null) => first === null || second === null ? null : sumMoney([first, -second])
export const moneyRatio = (value: number | null, divisor: number | null) => value === null || divisor === null || !Number.isFinite(value) || !Number.isFinite(divisor) || divisor <= 0 ? null : Number.isFinite(value / divisor) ? value / divisor : null

// A sequência digitada representa centavos; números permanecem números no banco.
export function moneyFromInput(text: string): number | null {
  const digits = text.replace(/\D/g, '')
  if (!digits) return null
  const cents = Number(digits)
  return Number.isSafeInteger(cents) ? cents / 100 : null
}

export function moneyInputValue(value: number | null): string {
  return value === null ? '' : formatMoney(value)
}
