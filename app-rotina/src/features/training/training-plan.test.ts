import { describe, expect, it } from 'vitest'
import { getExerciseDemo } from './exercise-demos'
import { getMuayPractices } from './muay-exercises'
import { clampTrainingWeek, getMuayThaiGuide, getStrengthGuide, getTrainingPlanWeek, trainingBlocks, trainingPlanWeeks } from './training-plan'

describe('plano de evolução dos treinos', () => {
  it('cobre exatamente 24 semanas em seis blocos contínuos', () => {
    expect(trainingBlocks).toHaveLength(6)
    expect(trainingBlocks.every((block) => block.weeks.length === 4)).toBe(true)
    expect(trainingPlanWeeks.map(({ week }) => week.week)).toEqual(Array.from({ length: 24 }, (_, index) => index + 1))
  })

  it('preserva os movimentos-base da adaptação sem criar um treino concorrente', () => {
    const first = getTrainingPlanWeek(1).block
    expect(first.workouts.A.map((exercise) => exercise.title)).toEqual([
      'Sentar e levantar', 'Flexão inclinada', 'Elevação de quadril', 'Remada isométrica com toalha', 'Dead bug',
    ])
    expect(first.workouts.B.map((exercise) => exercise.title)).toEqual([
      'Passo para trás assistido', 'Flexão inclinada', 'Bom-dia sem peso', 'Remada isométrica com toalha', 'Elevação de panturrilhas', 'Dead bug',
    ])
  })

  it('fecha cada bloco com uma quarta semana mais leve de consolidação', () => {
    for (const block of trainingBlocks) {
      const finalWeek = block.weeks[3]
      expect(finalWeek.consolidation).toBe(true)
      expect(finalWeek.circuits).toBe(1)
      expect(finalWeek.progression.toLowerCase()).toContain('nenhuma progressão')
    }
  })

  it('gera treino A na terça e treino B na quinta conforme a semana', () => {
    const tuesday = getStrengthGuide(9, 'A', 'normal')
    const thursday = getStrengthGuide(9, 'B', 'normal')
    expect(tuesday.introduction).toContain('Semana 9')
    expect(tuesday.steps.some((step) => step.title === 'Agachamento com a cadeira como alvo')).toBe(true)
    expect(tuesday.steps.some((step) => step.title === 'Agachamento dividido assistido')).toBe(false)
    expect(thursday.steps.some((step) => step.title === 'Agachamento dividido assistido')).toBe(true)
  })

  it('oferece versões normal, reduzida e mínima sem ultrapassar o escopo', () => {
    const normal = getStrengthGuide(17, 'A', 'normal')
    const reduced = getStrengthGuide(17, 'A', 'reduzido')
    const minimum = getStrengthGuide(17, 'A', 'minimo')
    expect(normal.steps[1].amount).toBe('aprox. 20 min')
    expect(reduced.steps[1].amount).toBe('8–12 min')
    expect(minimum.steps[1].amount).toBe('4–5 min')
    expect(normal.steps.length).toBeGreaterThan(reduced.steps.length)
    expect(reduced.steps.length).toBeGreaterThan(minimum.steps.length)
    expect(minimum.steps.some((step) => step.title === 'Marcha confortável')).toBe(true)
  })

  it('mantém o Muay Thai técnico sem contato e sem progressão automática de impacto', () => {
    for (const week of [1, 8, 12, 16, 20, 24]) {
      const text = JSON.stringify(getMuayThaiGuide('muay-mon', week, 'normal')).toLowerCase()
      expect(text).toContain('sem contato')
      expect(text).toContain('sem saco')
      expect(text).toContain('sem movimentos explosivos')
      expect(text).not.toContain('golpes fortes no saco')
    }
  })

  it('limita a semana persistida aos limites do plano', () => {
    expect(clampTrainingWeek(undefined)).toBe(1)
    expect(clampTrainingWeek(-5)).toBe(1)
    expect(clampTrainingWeek(12)).toBe(12)
    expect(clampTrainingWeek(99)).toBe(24)
  })

  it('mantém critérios de avanço, repetição e regressão em todos os blocos', () => {
    for (const block of trainingBlocks) {
      expect(block.criteria.advance.length).toBeGreaterThan(20)
      expect(block.criteria.repeat).toContain('Repita a semana')
      expect(block.criteria.regress).toContain('dia seguinte')
    }
  })

  it('mantém todos os sinais obrigatórios do braço no guia exibido', () => {
    const guide = getStrengthGuide(24, 'B', 'normal')
    const text = `${guide.steps.map((step) => step.description).join(' ')} ${guide.closing}`.toLowerCase()
    for (const warning of ['dor maior que a habitual', 'dormência', 'formigamento', 'força', 'pegada', 'inchaço', 'limitação de movimento', 'dia seguinte', 'ausência de dor']) {
      expect(text).toContain(warning)
    }
  })

  it('mostra práticas progressivas e oferece revisão simples para a sexta ou o modo mínimo', () => {
    expect(getMuayPractices(1, 'muay-mon', 'normal').map((item) => item.id)).toEqual(['base', 'directions', 'return', 'knee'])
    expect(getMuayPractices(12, 'muay-mon', 'normal').map((item) => item.id)).toContain('check')
    expect(getMuayPractices(24, 'muay-mon', 'normal').map((item) => item.id)).toContain('shadow')
    expect(getMuayPractices(24, 'muay-fri', 'normal').map((item) => item.id)).toEqual(['base', 'directions'])
    expect(getMuayPractices(24, 'muay-mon', 'minimo').map((item) => item.id)).toEqual(['base'])
    for (const week of [1, 5, 9, 13, 17, 21]) {
      for (const practice of getMuayPractices(week, 'muay-mon', 'normal')) {
        expect(practice.videoUrl).toMatch(/^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}/)
      }
    }
  })

  it('oferece demonstração individual para todos os exercícios das 24 semanas e da versão mínima', () => {
    for (const block of trainingBlocks) {
      for (const exercise of [...block.workouts.A, ...block.workouts.B, ...block.minimum]) {
        const demo = getExerciseDemo(exercise)
        expect(demo, `Sem exemplo para ${exercise.id}`).not.toBeNull()
        expect(demo?.videoUrl).toMatch(/^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/)
        expect(demo?.example.length).toBeGreaterThan(30)
      }
    }
  })
})
