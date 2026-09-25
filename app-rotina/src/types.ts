export type RoutineMode = 'normal' | 'reduzido' | 'minimo'
export type RoutineNature = 'fixa' | 'flexivel' | 'opcional'
export type RoutineArea =
  | 'sono'
  | 'saude'
  | 'trabalho'
  | 'treino'
  | 'alimentacao'
  | 'casa'
  | 'estudos'
  | 'financas'
  | 'delivery'
  | 'lazer'

export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface RoutineItem {
  id: string
  title: string
  area: RoutineArea
  days: WeekDay[]
  startTime?: string
  endTime?: string
  nature: RoutineNature
  modes: RoutineMode[]
  conditions?: string[]
  sourceFile: string
  active: boolean
}

export interface DailyCompletion {
  id: string
  localDate: string
  routineItemId: string
  state: 'done' | 'skipped'
  changedAt: string
  note?: string
}

export interface DailyCheckIn {
  localDate: string
  enoughSleep: boolean | null
  fatigueLevel: 0 | 1 | 2 | 3 | null
  armCondition: 'habitual' | 'alterado' | 'dor' | null
  safeToRide: boolean | null
  note?: string
}

export interface DeliveryShift {
  id: string
  localDate: string
  startTime: string
  endTime: string
  hours: number | null
  kilometers: number | null
  grossRevenue: number | null
  fuelCost: number | null
  maintenanceReserve: number | null
  otherExpenses: number | null
  estimatedResult: number | null
  resultPerHour: number | null
  resultPerKilometer: number | null
  fatigueLevel: 0 | 1 | 2 | 3 | null
  armCondition: 'habitual' | 'alterado' | 'dor' | null
  note?: string
  createdAt: string
}

export interface Expense {
  id: string
  localDate: string
  description: string
  category: ExpenseCategory
  amount: number
  createdAt: string
}

export type ExpenseCategory =
  | 'Moradia'
  | 'Alimentação'
  | 'Transporte'
  | 'Saúde'
  | 'Lazer'
  | 'Desenvolvimento'
  | 'Outros'

export interface StudyLog {
  id: string
  localDate: string
  area: 'Inglês' | 'Programação' | 'Leitura' | 'Outro'
  minutes: number
  content: string
  note?: string
  createdAt: string
}

export interface ThirtyDayProgress {
  id: string
  week: 1 | 2 | 3 | 4
  item: string
  state: 'pending' | 'done'
  completedAt?: string
}

export interface AppSettings {
  id: 'settings'
  scheduleOverrides: Record<string, { startTime?: string; endTime?: string }>
  disabledActivities: string[]
  preferredMode: RoutineMode
  theme?: 'system' | 'light' | 'dark'
  appearanceVersion?: 2
  schemaVersion: number
}

export interface BackupData {
  schemaVersion: number
  exportedAt: string
  completions: DailyCompletion[]
  checkIns: DailyCheckIn[]
  deliveryShifts: DeliveryShift[]
  expenses: Expense[]
  studyLogs: StudyLog[]
  progress: ThirtyDayProgress[]
  settings: AppSettings
}

export type StoragePersistence = 'checking' | 'granted' | 'not-granted' | 'unsupported'
