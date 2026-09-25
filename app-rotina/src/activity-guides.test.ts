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

  it('mantém os quatro movimentos e quantidades do plano de fortalecimento', () => {
    const strength = activityGuides.strength
    expect(strength.steps.map((step) => [step.title, step.amount])).toEqual([
      ['Sentar e levantar de uma cadeira', '8–12 repetições'],
      ['Elevação de panturrilhas', '10–15 repetições'],
      ['Elevação de quadril', '8–12 repetições'],
      ['Elevação alternada de joelhos em pé', '30–45 segundos'],
    ])
    expect(strength.introduction).toContain('Comece com 1 série')
    expect(strength.closing).toContain('sintomas novos ou piores')
  })
})
