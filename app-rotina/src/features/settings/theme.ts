import type { AppSettings } from '../../core/types'

export type EffectiveTheme = 'light' | 'dark'
export type AppearanceFeedback = { kind: 'idle' | 'saving' | 'saved' | 'error'; message: string }

export const effectiveTheme = (theme: AppSettings['theme']): EffectiveTheme => theme === 'light' ? 'light' : 'dark'
export const deviceTheme = (): EffectiveTheme => window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
export const applyDocumentTheme = (theme: EffectiveTheme) => {
  document.documentElement.dataset.theme = theme
  const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (themeColor) themeColor.content = theme === 'light' ? '#F0F7F6' : '#0F172A'
}
