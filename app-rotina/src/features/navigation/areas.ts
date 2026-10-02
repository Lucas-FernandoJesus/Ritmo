export type Destination = 'hoje' | 'semana' | 'estudos' | 'progresso' | 'treinos' | 'nutricao' | 'registros' | 'financeiro' | 'ajustes'

export const areas = [
  {
    id: 'rotina',
    label: 'Rotina',
    destinations: [
      { id: 'hoje', label: 'Hoje' },
      { id: 'semana', label: 'Semana' },
      { id: 'estudos', label: 'Estudos' },
      { id: 'progresso', label: 'Progresso' },
    ],
  },
  {
    id: 'saude',
    label: 'Saúde',
    destinations: [
      { id: 'treinos', label: 'Treinos' },
      { id: 'nutricao', label: 'Nutrição' },
    ],
  },
  {
    id: 'trabalho',
    label: 'Trabalho e dinheiro',
    destinations: [
      { id: 'registros', label: 'Delivery' },
      { id: 'financeiro', label: 'Financeiro' },
    ],
  },
] as const satisfies readonly { id: string; label: string; destinations: readonly { id: Destination; label: string }[] }[]

export const settingsDestination = { id: 'ajustes', label: 'Ajustes' } as const

export function areaFor(destination: Destination) {
  return areas.find((area) => area.destinations.some((item) => item.id === destination))
}
