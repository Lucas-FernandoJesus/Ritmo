import { describe, expect, it } from 'vitest'
import { activityGuides } from './activity-guides'
import { routineItems } from './data'

describe('orientações das atividades', () => {
  it('oferece uma orientação utilizável para cada atividade da rotina', () => {
    expect(Object.keys(activityGuides).sort()).toEqual(routineItems.map((item) => item.id).sort())
    for (const item of routineItems) {
      const guide = activityGuides[item.id]
      expect(guide.introduction.trim()).not.toBe('')
      expect(guide.steps.length).toBeGreaterThan(0)
      expect(guide.steps.every((step) => step.title.trim() && step.description.trim())).toBe(true)
    }
  })

  it('mantém a visão geral da fase inicial do fortalecimento', () => {
    const strength = activityGuides.strength
    expect(strength.steps.map((step) => step.title)).toEqual([
      'Treino A — terça',
      'Treino B — quinta',
      'Progressão da semana',
    ])
    expect(strength.introduction).toContain('Semana 1')
    expect(strength.introduction).toContain('Terça é treino A e quinta é treino B')
    expect(strength.steps[0].description).toContain('Sentar e levantar')
    expect(strength.steps[1].description).toContain('Passo para trás assistido')
    expect(strength.closing).toContain('dia seguinte')
  })
})
