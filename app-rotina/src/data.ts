import type { ExpenseCategory, RoutineItem, WeekDay } from './types'

const weekdays: WeekDay[] = [1, 2, 3, 4, 5]
const allDays: WeekDay[] = [0, 1, 2, 3, 4, 5, 6]
const daysWithoutStrength: WeekDay[] = [0, 1, 3, 5, 6]

export const routineItems: RoutineItem[] = [
  { id: 'wake-weekday', title: 'Acordar, banheiro e água', area: 'sono', days: weekdays, startTime: '06:10', endTime: '06:15', nature: 'fixa', modes: ['normal', 'reduzido', 'minimo'], sourceFile: '02_rotina_segunda_a_sexta.txt', active: true },
  { id: 'bed-morning', title: 'Arrumar a cama e vestir roupa de exercício', area: 'casa', days: weekdays, startTime: '06:15', endTime: '06:20', nature: 'flexivel', modes: ['normal'], sourceFile: '02_rotina_segunda_a_sexta.txt', active: true },
  { id: 'muay-mon', title: 'Muay Thai técnico sem contato', area: 'treino', days: [1, 3], startTime: '06:20', endTime: '06:40', nature: 'flexivel', modes: ['normal'], conditions: ['Sem dor, formigamento ou mudança de força/sensibilidade', 'Sem impacto no saco até liberação específica'], sourceFile: '03_treino_muay_thai_matinal.txt', active: true },
  { id: 'muay-fri', title: 'Muay Thai leve ou descanso', area: 'treino', days: [5], startTime: '06:20', endTime: '06:40', nature: 'opcional', modes: ['normal'], conditions: ['Somente se estiver recuperado', 'Treino sem impacto'], sourceFile: '03_treino_muay_thai_matinal.txt', active: true },
  { id: 'strength', title: 'Fortalecimento de corpo inteiro', area: 'treino', days: [2, 4], startTime: '06:20', endTime: '06:40', nature: 'flexivel', modes: ['normal', 'reduzido', 'minimo'], conditions: ['Treino A na terça e B na quinta; versão ajustada ao ritmo atual', 'Parar se houver sintomas novos ou piores'], sourceFile: '04_fortalecimento_e_cuidados_com_braco.txt', active: true },
  { id: 'reduced-move', title: 'Movimentação confortável por 5 minutos', area: 'saude', days: daysWithoutStrength, nature: 'opcional', modes: ['reduzido'], conditions: ['Somente se apropriado e confortável'], sourceFile: '12_plano_30_dias_e_checklist.txt', active: true },
  { id: 'morning-hygiene', title: 'Banho e higiene', area: 'saude', days: weekdays, startTime: '06:40', endTime: '06:55', nature: 'fixa', modes: ['normal', 'reduzido', 'minimo'], sourceFile: '02_rotina_segunda_a_sexta.txt', active: true },
  { id: 'breakfast', title: 'Café da manhã', area: 'alimentacao', days: weekdays, startTime: '06:55', endTime: '07:10', nature: 'fixa', modes: ['normal', 'reduzido', 'minimo'], sourceFile: '07_alimentacao_e_marmitas.txt', active: true },
  { id: 'prepare-work', title: 'Pegar marmita e itens de trabalho', area: 'trabalho', days: weekdays, startTime: '07:10', endTime: '07:20', nature: 'fixa', modes: ['normal', 'reduzido', 'minimo'], sourceFile: '02_rotina_segunda_a_sexta.txt', active: true },
  { id: 'work', title: 'Trabalho presencial', area: 'trabalho', days: weekdays, startTime: '08:00', endTime: '18:00', nature: 'fixa', modes: ['normal', 'reduzido', 'minimo'], sourceFile: '01_perfil_e_objetivos.txt', active: true },
  { id: 'transition', title: 'Descanso e transição do trabalho', area: 'saude', days: [1, 2, 3, 4], startTime: '18:20', endTime: '18:40', nature: 'fixa', modes: ['normal', 'reduzido'], sourceFile: '02_rotina_segunda_a_sexta.txt', active: true },
  { id: 'dinner-weekday', title: 'Jantar', area: 'alimentacao', days: [1, 2, 3, 4], startTime: '18:40', endTime: '19:10', nature: 'fixa', modes: ['normal', 'reduzido', 'minimo'], sourceFile: '07_alimentacao_e_marmitas.txt', active: true },
  { id: 'kitchen-daily', title: 'Lavar louça e deixar a cozinha funcional', area: 'casa', days: allDays, startTime: '19:10', endTime: '19:25', nature: 'fixa', modes: ['normal', 'reduzido', 'minimo'], sourceFile: '10_limpeza_e_organizacao_da_casa.txt', active: true },
  { id: 'english', title: 'Inglês — curso Fluency', area: 'estudos', days: [1, 3], startTime: '19:25', endTime: '20:10', nature: 'flexivel', modes: ['normal'], sourceFile: '08_estudos_e_leitura.txt', active: true },
  { id: 'programming', title: 'Programação — prática e exercícios', area: 'estudos', days: [2, 4], startTime: '19:25', endTime: '20:10', nature: 'flexivel', modes: ['normal'], sourceFile: '08_estudos_e_leitura.txt', active: true },
  { id: 'short-study', title: 'Revisão ou leitura curta (10 minutos)', area: 'estudos', days: [1, 2, 3, 4], startTime: '19:25', endTime: '19:35', nature: 'opcional', modes: ['reduzido'], sourceFile: '08_estudos_e_leitura.txt', active: true },
  { id: 'finances', title: 'Revisão semanal de finanças', area: 'financas', days: [3], startTime: '20:10', endTime: '20:25', nature: 'flexivel', modes: ['normal'], sourceFile: '09_financas_e_controle_delivery.txt', active: true },
  { id: 'free-time', title: 'Jogos, leitura ou tempo livre', area: 'lazer', days: [1, 2, 3, 4], startTime: '20:10', endTime: '21:25', nature: 'flexivel', modes: ['normal', 'reduzido'], sourceFile: '11_sono_jogos_e_celular.txt', active: true },
  { id: 'tomorrow-prep', title: 'Preparar o essencial para amanhã', area: 'casa', days: allDays, startTime: '21:25', endTime: '21:45', nature: 'fixa', modes: ['normal', 'reduzido', 'minimo'], sourceFile: '10_limpeza_e_organizacao_da_casa.txt', active: true },
  { id: 'wind-down', title: 'Higiene, leitura leve e desacelerar', area: 'sono', days: [0, 1, 2, 3, 4], startTime: '21:45', endTime: '22:15', nature: 'fixa', modes: ['normal', 'reduzido', 'minimo'], sourceFile: '11_sono_jogos_e_celular.txt', active: true },
  { id: 'sleep', title: 'Apagar as luzes e tentar dormir', area: 'sono', days: [0, 1, 2, 3, 4], startTime: '22:15', nature: 'fixa', modes: ['normal', 'reduzido', 'minimo'], sourceFile: '11_sono_jogos_e_celular.txt', active: true },
  { id: 'friday-reset', title: 'Comer e descansar após o trabalho', area: 'saude', days: [5], startTime: '18:20', endTime: '19:00', nature: 'fixa', modes: ['normal', 'reduzido', 'minimo'], sourceFile: '05_escala_delivery_escolhida.txt', active: true },
  { id: 'friday-delivery', title: 'Delivery de sexta', area: 'delivery', days: [5], startTime: '19:15', endTime: '21:30', nature: 'opcional', modes: ['normal'], conditions: ['Somente com sono suficiente, pouco cansaço, braço habitual e controle seguro da moto'], sourceFile: '05_escala_delivery_escolhida.txt', active: true },
  { id: 'sat-breakfast', title: 'Acordar e tomar café', area: 'alimentacao', days: [6], startTime: '08:00', endTime: '08:30', nature: 'fixa', modes: ['normal', 'reduzido', 'minimo'], sourceFile: '06_rotina_sabado_e_domingo.txt', active: true },
  { id: 'sat-clean', title: 'Limpeza essencial da casa', area: 'casa', days: [6], startTime: '08:30', endTime: '09:30', nature: 'flexivel', modes: ['normal', 'reduzido'], sourceFile: '10_limpeza_e_organizacao_da_casa.txt', active: true },
  { id: 'sat-market', title: 'Mercado ou pendências', area: 'casa', days: [6], startTime: '09:30', endTime: '10:15', nature: 'flexivel', modes: ['normal'], sourceFile: '06_rotina_sabado_e_domingo.txt', active: true },
  { id: 'sat-delivery-lunch', title: 'Delivery — turno do almoço', area: 'delivery', days: [6], startTime: '11:00', endTime: '14:00', nature: 'opcional', modes: ['normal'], conditions: ['Somente em condições seguras para pilotar'], sourceFile: '05_escala_delivery_escolhida.txt', active: true },
  { id: 'sat-rest', title: 'Almoço, descanso e jogos', area: 'lazer', days: [6], startTime: '14:00', endTime: '17:00', nature: 'fixa', modes: ['normal', 'reduzido', 'minimo'], sourceFile: '06_rotina_sabado_e_domingo.txt', active: true },
  { id: 'sat-delivery-night', title: 'Delivery — turno da noite', area: 'delivery', days: [6], startTime: '18:00', endTime: '21:30', nature: 'opcional', modes: ['normal'], conditions: ['Reavaliar sono, cansaço e braço após o primeiro turno'], sourceFile: '05_escala_delivery_escolhida.txt', active: true },
  { id: 'sun-calm', title: 'Acordar, café e começar com calma', area: 'alimentacao', days: [0], startTime: '08:00', endTime: '09:00', nature: 'fixa', modes: ['normal', 'reduzido', 'minimo'], sourceFile: '06_rotina_sabado_e_domingo.txt', active: true },
  { id: 'meal-prep', title: 'Preparar marmitas de segunda a quarta', area: 'alimentacao', days: [0], startTime: '10:00', endTime: '12:00', nature: 'fixa', modes: ['normal', 'reduzido'], sourceFile: '07_alimentacao_e_marmitas.txt', active: true },
  { id: 'sun-delivery', title: 'Delivery opcional de domingo', area: 'delivery', days: [0], startTime: '13:00', endTime: '16:00', nature: 'opcional', modes: ['normal'], conditions: ['Não estender regularmente até 23h', 'Cancelar sem compensação se não estiver seguro'], sourceFile: '05_escala_delivery_escolhida.txt', active: true },
  { id: 'sun-leisure', title: 'Descanso, jogos ou leitura', area: 'lazer', days: [0], startTime: '16:00', endTime: '20:30', nature: 'flexivel', modes: ['normal', 'reduzido', 'minimo'], sourceFile: '06_rotina_sabado_e_domingo.txt', active: true },
  { id: 'weekly-plan', title: 'Planejar a semana e preparar segunda', area: 'casa', days: [0], startTime: '21:00', endTime: '21:30', nature: 'fixa', modes: ['normal', 'reduzido'], sourceFile: '06_rotina_sabado_e_domingo.txt', active: true },
]

export const progressPlan = [
  { week: 1 as const, title: 'Construir a base', items: ['Testar rotina de despertar e sono', 'Fazer Muay Thai técnico sem contato em sessões curtas', 'Aprender os treinos A e B com um circuito', 'Arrumar cama e cozinha diariamente', 'Planejar alimentação simples', 'Registrar a resposta do braço ao treino e à pilotagem'] },
  { week: 2 as const, title: 'Dar continuidade', items: ['Manter até 3 treinos técnicos e fazer 2 circuitos nos treinos A e B se estiver recuperado', 'Fazer marmitas e reposição de alimentos', 'Estudar inglês e programação nos dias previstos', 'Começar registro de despesas', 'Testar apenas turnos de delivery seguros'] },
  { week: 3 as const, title: 'Medir a rotina real', items: ['Registrar ganhos e custos por turno', 'Observar cansaço após sábado em dois turnos', 'Progredir uma variável dos exercícios sem forçar o braço', 'Seguir leitura curta e controle do celular'] },
  { week: 4 as const, title: 'Revisar', items: ['Descobrir quais horários de delivery compensam', 'Verificar consistência de sono e estudos', 'Conferir condição do braço e pilotagem', 'Identificar o que simplificar no próximo mês'] },
]

export const expenseCategories: ExpenseCategory[] = ['Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Lazer', 'Desenvolvimento', 'Outros']

export const mealPrepChecklist = ['Decidir refeições de segunda a quarta', 'Preparar proteína, carboidrato, leguminosa e vegetais', 'Separar em recipientes', 'Refrigerar porções curtas e congelar as demais', 'Preparar itens práticos para segunda']
export const homeChecklist = ['Varrer ou aspirar áreas principais', 'Passar pano onde necessário', 'Limpar vaso, pia e piso do banheiro', 'Conferir roupas limpas e sujas', 'Recolher lixo']

export const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
