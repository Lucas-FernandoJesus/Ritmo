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

export interface GuideStep {
  title: string
  amount?: string
  description: string
}

export interface ActivityGuide {
  introduction: string
  steps: readonly GuideStep[]
  closing?: string
}

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

export interface DailyPlanActivity {
  routineItemId: string
  title: string
  area: RoutineArea
  nature: RoutineNature
  startTime?: string
  endTime?: string
}

export interface DailyPlanSnapshot {
  id: string
  localDate: string
  mode: RoutineMode
  activities: DailyPlanActivity[]
  capturedAt: string
}

export interface DailyProgressSummary {
  planned: boolean
  completed: boolean
  requiredCount: number
  completedRequiredCount: number
}

export interface WeeklyProgressSummary {
  weekStart: string
  weekEnd: string
  plannedDays: number
  completedDays: number
  requiredActivities: number
  completedRequiredActivities: number
  activityPercentage: number
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
  accountId?: string
  paymentMethod?: PaymentMethod
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
  deliveryShiftId?: string
  deliveryCostKind?: DeliveryCostKind
  note?: string
  accountId?: string
  paymentMethod?: PaymentMethod
}

export type FinancialType = 'entrada' | 'saida' | 'credito' | 'pendencia'
export type PaymentMethod = 'credito' | 'debito' | 'alimentacao'

export interface FinancialRecord {
  id: string
  localDate: string
  description: string
  category: ExpenseCategory
  type: FinancialType
  amount: number
  deliveryShiftId?: string
  deliveryCostKind?: DeliveryCostKind
  note?: string
  createdAt: string
  updatedAt?: string
  accountId?: string
  paymentMethod?: PaymentMethod
  liabilityAccountId?: string
  planningRef?: PlanningReference
}

export interface PlanningReference {
  kind: 'recurring' | 'installment'
  planId: string
  key: string
  dueDate: string
}

// Definições e fatos com identidade estável; cálculos não são persistidos.
export interface FinancialEntity {
  id: string
  createdAt: string
  updatedAt: string
}
export interface RecurringPlan extends FinancialEntity {
  name: string
  type: FinancialType
  category: ExpenseCategory
  amount: number
  frequency: 'weekly' | 'monthly' | 'yearly'
  startDate: string
  endDate?: string
  active: boolean
  accountId?: string
  paymentMethod?: PaymentMethod
  liabilityAccountId?: string
}
export interface InstallmentPlan extends FinancialEntity {
  name: string
  category: ExpenseCategory
  total: number
  count: number
  firstDueDate: string
  active: boolean
  accountId?: string
  liabilityAccountId?: string
}
export type AssetKind = 'cash' | 'bank' | 'savings' | 'reserve' | 'investment' | 'liability'
export interface AssetAccount extends FinancialEntity {
  name: string
  kind: AssetKind
  openingBalance: number
  openingDate: string
}
export interface AccountTransfer extends FinancialEntity {
  fromAccountId: string
  toAccountId: string
  amount: number
  localDate: string
  voidedAt?: string
}
export interface FinancePlanningData {
  recurringPlans: readonly RecurringPlan[]
  installmentPlans: readonly InstallmentPlan[]
  accounts: readonly AssetAccount[]
  transfers: readonly AccountTransfer[]
}

export type DeliveryCostKind = 'combustivel' | 'manutencao' | 'alimentacao' | 'taxas' | 'outros'
export type FinancialGoalType = 'income' | 'net-income' | 'delivery-income' | 'delivery-net' | 'savings' | 'expense-limit'

export interface FinancialGoal {
  id: string
  name: string
  type: FinancialGoalType
  target: number
  startDate: string
  endDate: string
  createdAt: string
}

export interface CategoryBudget {
  id: string
  month: string
  category: ExpenseCategory
  deliveryCostKind?: DeliveryCostKind
  limit: number
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
  trainingWeek?: number
  theme?: 'system' | 'light' | 'dark'
  appearanceVersion?: 2
  schemaVersion: number
}

export interface BackupData {
  schemaVersion: number
  exportedAt: string
  completions: DailyCompletion[]
  dailySnapshots?: DailyPlanSnapshot[]
  checkIns: DailyCheckIn[]
  deliveryShifts: DeliveryShift[]
  expenses: Expense[]
  financialRecords?: FinancialRecord[]
  financialGoals?: FinancialGoal[]
  categoryBudgets?: CategoryBudget[]
  recurringPlans?: RecurringPlan[]
  installmentPlans?: InstallmentPlan[]
  assetAccounts?: AssetAccount[]
  accountTransfers?: AccountTransfer[]
  studyLogs: StudyLog[]
  progress: ThirtyDayProgress[]
  settings: AppSettings
}

export type StoragePersistence = 'checking' | 'granted' | 'not-granted' | 'unsupported'
