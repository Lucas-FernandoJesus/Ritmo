import { describe, expect, it } from 'vitest'
import { defaultSettings, filterRoutineForDay } from './domain'
import { progressPlan, routineItems } from './data'

const expectedSources = new Set([
  '01_perfil_e_objetivos.txt',
  '02_rotina_segunda_a_sexta.txt',
  '03_treino_muay_thai_matinal.txt',
  '04_fortalecimento_e_cuidados_com_braco.txt',
  '05_escala_delivery_escolhida.txt',
  '06_rotina_sabado_e_domingo.txt',
  '07_alimentacao_e_marmitas.txt',
  '08_estudos_e_leitura.txt',
  '09_financas_e_controle_delivery.txt',
  '10_limpeza_e_organizacao_da_casa.txt',
  '11_sono_jogos_e_celular.txt',
  '12_plano_30_dias_e_checklist.txt',
])

describe('integridade dos dados iniciais', () => {
  it('mantém IDs únicos e referências de origem conhecidas', () => {
    const ids = routineItems.map((item) => item.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(routineItems.every((item) => expectedSources.has(item.sourceFile))).toBe(true)
  })

  it('mantém dias, modos e horários dentro dos domínios aceitos', () => {
    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/
    for (const item of routineItems) {
      expect(item.days.length).toBeGreaterThan(0)
      expect(item.days.every((day) => Number.isInteger(day) && day >= 0 && day <= 6)).toBe(true)
      expect(item.modes.length).toBeGreaterThan(0)
      if (item.startTime) expect(item.startTime).toMatch(timePattern)
      if (item.endTime) expect(item.endTime).toMatch(timePattern)
    }
  })

  it('produz três rotinas distintas em todos os dias da semana', () => {
    const settings = defaultSettings()
    for (let day = 0; day <= 6; day += 1) {
      const lists = ['normal', 'reduzido', 'minimo'].map((mode) => filterRoutineForDay(routineItems, day, mode as 'normal' | 'reduzido' | 'minimo', settings).map((item) => item.id))
      expect(new Set(lists.map((items) => items.join('|'))).size).toBe(3)
      expect(lists[2].length).toBeLessThan(lists[0].length)
      expect(lists[2].length).toBeLessThan(lists[1].length)
    }
  })

  it('oferece o fortalecimento nos três ritmos sem duplicar a movimentação reduzida', () => {
    const strength = routineItems.find((item) => item.id === 'strength')
    const reducedMove = routineItems.find((item) => item.id === 'reduced-move')
    expect(strength?.modes).toEqual(['normal', 'reduzido', 'minimo'])
    expect(reducedMove?.days).not.toContain(2)
    expect(reducedMove?.days).not.toContain(4)
  })

  it('mantém o plano de 30 dias completo e sem itens duplicados', () => {
    expect(progressPlan.map((week) => week.week)).toEqual([1, 2, 3, 4])
    const items = progressPlan.flatMap((week) => week.items)
    expect(items).toHaveLength(19)
    expect(new Set(items).size).toBe(items.length)
  })
})
