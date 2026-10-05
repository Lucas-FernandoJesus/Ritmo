import { defaultSettings, isValidAccountTransfer, isValidAssetAccount, isValidBodyMeasurement, isValidCategoryBudget, isValidCheckIn, isValidCompletion, isValidDailyPlanSnapshot, isValidDeliveryShift, isValidExpense, isValidFinancialGoal, isValidFinancialRecord, isValidInstallmentPlan, isValidMealLog, isValidRecurringPlan, isValidProgress, isValidSettings, isValidStudyLog, SCHEMA_VERSION, validFinanceReferences, validateBackup } from '../core/domain'
import { createOccurrenceRecord, planOccurrences } from '../features/finance/finance-plans'
import type { AccountTransfer, AppSettings, AssetAccount, BackupData, BodyMeasurement, CategoryBudget, DailyCheckIn, DailyCompletion, DailyPlanSnapshot, DeliveryShift, Expense, FinancialGoal, FinancialRecord, InstallmentPlan, MealLog, PlanningReference, RecurringPlan, StudyLog, ThirtyDayProgress } from '../core/types'

const DB_NAME = 'rotina-local'
const DB_VERSION = 7
const stores = ['completions', 'dailySnapshots', 'checkIns', 'deliveryShifts', 'expenses', 'financialRecords', 'financialGoals', 'categoryBudgets', 'recurringPlans', 'installmentPlans', 'assetAccounts', 'accountTransfers', 'studyLogs', 'progress', 'bodyMeasurements', 'mealLogs', 'settings'] as const
type StoreName = typeof stores[number]

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Falha no armazenamento local.'))
  })
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Falha ao confirmar a gravação.'))
    transaction.onabort = () => reject(transaction.error ?? new Error('Gravação cancelada.'))
  })
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      for (const store of stores) if (!db.objectStoreNames.contains(store)) db.createObjectStore(store, { keyPath: 'id' })
    }
    request.onsuccess = () => { request.result.onversionchange = () => { request.result.close(); dbPromise = null }; resolve(request.result) }
    request.onerror = () => reject(request.error ?? new Error('Não foi possível abrir o armazenamento local.'))
    request.onblocked = () => { dbPromise = null; reject(new Error('Feche outras abas do Rotina para atualizar o banco local.')) }
  })
  return dbPromise
}

async function put<T>(storeName: StoreName, value: T): Promise<void> {
  const db = await openDatabase()
  const tx = db.transaction(storeName, 'readwrite')
  tx.objectStore(storeName).put(value)
  await transactionDone(tx)
}

async function get<T>(storeName: StoreName, key: IDBValidKey): Promise<T | undefined> {
  const db = await openDatabase()
  const tx = db.transaction(storeName, 'readonly')
  return requestResult(tx.objectStore(storeName).get(key)) as Promise<T | undefined>
}

async function getAll<T>(storeName: StoreName): Promise<T[]> {
  const db = await openDatabase()
  const tx = db.transaction(storeName, 'readonly')
  return requestResult(tx.objectStore(storeName).getAll()) as Promise<T[]>
}

async function remove(storeName: StoreName, key: IDBValidKey): Promise<void> {
  const db = await openDatabase()
  const tx = db.transaction(storeName, 'readwrite')
  tx.objectStore(storeName).delete(key)
  await transactionDone(tx)
}

function assertValid(value: unknown, validator: (candidate: unknown) => boolean, message: string): void {
  if (!validator(value)) throw new Error(`${message} Nenhum dado foi gravado.`)
}

const financialStores = ['financialRecords', 'expenses', 'recurringPlans', 'installmentPlans', 'assetAccounts', 'accountTransfers', 'deliveryShifts'] as const
type FinanceState = { financialRecords: FinancialRecord[]; expenses: Expense[]; recurringPlans: RecurringPlan[]; installmentPlans: InstallmentPlan[]; assetAccounts: AssetAccount[]; accountTransfers: AccountTransfer[]; deliveryShifts: DeliveryShift[] }

async function financialTransaction<T>(mutate: (state: FinanceState, tx: IDBTransaction) => T): Promise<T> {
  const db = await openDatabase()
  const tx = db.transaction([...financialStores], 'readwrite')
  const done = transactionDone(tx)
  try {
    const arrays = await Promise.all(financialStores.map(name => requestResult(tx.objectStore(name).getAll())))
    const state = Object.fromEntries(financialStores.map((name, index) => [name, arrays[index]])) as FinanceState
    const result = mutate(state, tx)
    if (!validFinanceReferences(state)) throw new Error('Vínculo financeiro inválido. Confira contas e planejamentos. Nenhum dado foi gravado.')
    await done
    return result
  } catch (error) { try { tx.abort() } catch { /* Já finalizada pelo navegador. */ } await done.catch(() => {}); throw error }
}

async function putFinancialSource(store: 'expenses' | 'financialRecords', value: Expense | FinancialRecord): Promise<void> {
  return financialTransaction((state, tx) => {
    if (value.deliveryShiftId && !state.deliveryShifts.some(s => s.id === value.deliveryShiftId)) throw new Error('O turno associado não existe. Nenhum dado foi gravado.')
    if (store === 'financialRecords') {
      const record = value as FinancialRecord
      const old = state.financialRecords.find(r => r.id === record.id)
      if (record.planningRef && !old || old?.planningRef && (JSON.stringify(old.planningRef) !== JSON.stringify(record.planningRef) || old.amount !== record.amount)) throw new Error('Use a confirmação de ocorrência. O vínculo e o valor confirmado devem ser preservados.')
      state.financialRecords = [...state.financialRecords.filter(r => r.id !== record.id), record]
    } else state.expenses = [...state.expenses.filter(e => e.id !== value.id), value as Expense]
    tx.objectStore(store).put(value)
  })
}

function saveDefinition(store: 'recurringPlans' | 'installmentPlans' | 'assetAccounts' | 'accountTransfers', value: RecurringPlan | InstallmentPlan | AssetAccount | AccountTransfer) {
  return financialTransaction((state, tx) => {
    const previous = state[store].find(item => item.id === value.id)
    if (previous && previous.createdAt !== value.createdAt) throw new Error('A identidade do registro deve ser preservada.')
    const confirmed = state.financialRecords.some(r => r.planningRef?.planId === value.id && r.planningRef.kind === (store === 'recurringPlans' ? 'recurring' : 'installment'))
    if (confirmed && previous && (store === 'recurringPlans' || store === 'installmentPlans')) {
      const fields = store === 'recurringPlans' ? ['startDate', 'frequency', 'type'] : ['firstDueDate', 'count', 'total']
      if (fields.some(key => (previous as unknown as Record<string, unknown>)[key] !== (value as unknown as Record<string, unknown>)[key])) throw new Error('Após confirmar ocorrências, preserve datas, frequência, tipo e parcelamento. Pause e crie outro planejamento.')
    }
    if (store === 'assetAccounts' && previous) {
      const old = previous as AssetAccount, next = value as AssetAccount
      const linked = state.financialRecords.some(r => r.accountId === old.id || r.liabilityAccountId === old.id) || state.deliveryShifts.some(s => s.accountId === old.id) || state.expenses.some(e => e.accountId === old.id) || state.accountTransfers.some(t => t.fromAccountId === old.id || t.toAccountId === old.id) || [...state.recurringPlans, ...state.installmentPlans].some(p => p.accountId === old.id || p.liabilityAccountId === old.id)
      if (linked && (old.kind !== next.kind || old.openingDate !== next.openingDate)) throw new Error('A conta já possui vínculos. Preserve seu tipo e a data do saldo inicial.')
    }
    if (store === 'accountTransfers' && previous) {
      const old = previous as AccountTransfer, next = value as AccountTransfer
      if (['fromAccountId', 'toAccountId', 'amount', 'localDate'].some(key => (old as unknown as Record<string, unknown>)[key] !== (next as unknown as Record<string, unknown>)[key])) throw new Error('Transferências são fatos imutáveis. Cancele e registre outra.')
    }
    ;(state[store] as typeof value[]) = [...state[store].filter(item => item.id !== value.id), value]
    tx.objectStore(store).put(value)
  })
}

export const repository = {
  async initialize() {
    await openDatabase()
    const existing = await get<AppSettings>('settings', 'settings')
    if (!isValidSettings(existing)) await put('settings', defaultSettings())
  },
  getSettings: async () => {
    const settings = await get<AppSettings>('settings', 'settings')
    return isValidSettings(settings) ? settings : defaultSettings()
  },
  saveSettings: (settings: AppSettings) => { assertValid(settings, isValidSettings, 'Ajustes inválidos.'); return put('settings', settings) },
  async saveSettingsAndDailySnapshots(settings: AppSettings, snapshots: DailyPlanSnapshot[]) {
    assertValid(settings, isValidSettings, 'Ajustes inválidos.')
    for (const snapshot of snapshots) assertValid(snapshot, isValidDailyPlanSnapshot, 'Snapshot diário inválido.')
    const db = await openDatabase()
    const tx = db.transaction(['settings', 'dailySnapshots'], 'readwrite')
    tx.objectStore('settings').put(settings)
    for (const snapshot of snapshots) tx.objectStore('dailySnapshots').put(snapshot)
    await transactionDone(tx)
  },
  getCompletions: () => getAll<DailyCompletion>('completions'),
  saveCompletion: (completion: DailyCompletion) => { assertValid(completion, isValidCompletion, 'Conclusão diária inválida.'); return put('completions', completion) },
  deleteCompletion: (id: string) => remove('completions', id),
  getDailySnapshots: () => getAll<DailyPlanSnapshot>('dailySnapshots'),
  saveDailySnapshot: (snapshot: DailyPlanSnapshot) => { assertValid(snapshot, isValidDailyPlanSnapshot, 'Snapshot diário inválido.'); return put('dailySnapshots', snapshot) },
  getCheckIn: (date: string) => get<DailyCheckIn>('checkIns', date),
  saveCheckIn: (checkIn: DailyCheckIn) => { assertValid(checkIn, isValidCheckIn, 'Checagem diária inválida.'); return put('checkIns', { ...checkIn, id: checkIn.localDate }) },
  getDeliveryShifts: () => getAll<DeliveryShift>('deliveryShifts'),
  saveDeliveryShift: (shift: DeliveryShift) => { assertValid(shift, isValidDeliveryShift, 'Turno de delivery inválido.'); return financialTransaction((state, tx) => { state.deliveryShifts = [...state.deliveryShifts.filter(s => s.id !== shift.id), shift]; tx.objectStore('deliveryShifts').put(shift) }) },
  deleteDeliveryShift: (id: string) => financialTransaction((state, tx) => {
    if (state.expenses.some(item => item.deliveryShiftId === id) || state.financialRecords.some(item => item.deliveryShiftId === id)) throw new Error('Há despesas financeiras vinculadas a este turno. Desvincule-as antes de excluir o turno.')
    state.deliveryShifts = state.deliveryShifts.filter(shift => shift.id !== id)
    tx.objectStore('deliveryShifts').delete(id)
  }),
  getExpenses: () => getAll<Expense>('expenses'),
  saveExpense: (expense: Expense) => { assertValid(expense, isValidExpense, 'Despesa inválida.'); return putFinancialSource('expenses', expense) },
  deleteExpense: (id: string) => financialTransaction((state, tx) => {
    state.expenses = state.expenses.filter(expense => expense.id !== id)
    tx.objectStore('expenses').delete(id)
  }),
  getFinancialRecords: () => getAll<FinancialRecord>('financialRecords'),
  saveFinancialRecord: (record: FinancialRecord) => { assertValid(record, isValidFinancialRecord, 'Movimentação financeira inválida.'); return putFinancialSource('financialRecords', record) },
  deleteFinancialRecord: (id: string) => financialTransaction((state, tx) => {
    state.financialRecords = state.financialRecords.filter(record => record.id !== id)
    tx.objectStore('financialRecords').delete(id)
  }),
  getFinancialGoals: () => getAll<FinancialGoal>('financialGoals'),
  saveFinancialGoal: (goal: FinancialGoal) => { assertValid(goal, isValidFinancialGoal, 'Meta financeira inválida.'); return put('financialGoals', goal) },
  deleteFinancialGoal: (id: string) => remove('financialGoals', id),
  getCategoryBudgets: () => getAll<CategoryBudget>('categoryBudgets'),
  saveCategoryBudget: (budget: CategoryBudget) => { assertValid(budget, isValidCategoryBudget, 'Orçamento inválido.'); return put('categoryBudgets', budget) },
  deleteCategoryBudget: (id: string) => remove('categoryBudgets', id),
  getRecurringPlans: () => getAll<RecurringPlan>('recurringPlans'),
  saveRecurringPlan: (plan: RecurringPlan) => { assertValid(plan, isValidRecurringPlan, 'Recorrência inválida.'); return saveDefinition('recurringPlans', plan) },
  deleteRecurringPlan: (id: string) => financialTransaction((state, tx) => {
    if (state.financialRecords.some(record => record.planningRef?.kind === 'recurring' && record.planningRef.planId === id)) throw new Error('Esta recorrência possui lançamentos vinculados. Pause-a para preservar o histórico.')
    state.recurringPlans = state.recurringPlans.filter(plan => plan.id !== id)
    tx.objectStore('recurringPlans').delete(id)
  }),
  getInstallmentPlans: () => getAll<InstallmentPlan>('installmentPlans'),
  saveInstallmentPlan: (plan: InstallmentPlan) => { assertValid(plan, isValidInstallmentPlan, 'Parcelamento inválido.'); return saveDefinition('installmentPlans', plan) },
  deleteInstallmentPlan: (id: string) => financialTransaction((state, tx) => {
    if (state.financialRecords.some(record => record.planningRef?.kind === 'installment' && record.planningRef.planId === id)) throw new Error('Este parcelamento possui lançamentos vinculados. Pause-o para preservar o histórico.')
    state.installmentPlans = state.installmentPlans.filter(plan => plan.id !== id)
    tx.objectStore('installmentPlans').delete(id)
  }),
  getAssetAccounts: () => getAll<AssetAccount>('assetAccounts'),
  saveAssetAccount: (account: AssetAccount) => { assertValid(account, isValidAssetAccount, 'Conta patrimonial inválida.'); return saveDefinition('assetAccounts', account) },
  deleteAssetAccount: (id: string) => financialTransaction((state, tx) => {
    const linked = state.financialRecords.some(record => record.accountId === id || record.liabilityAccountId === id)
      || state.expenses.some(expense => expense.accountId === id)
      || state.deliveryShifts.some(shift => shift.accountId === id)
      || state.accountTransfers.some(transfer => transfer.fromAccountId === id || transfer.toAccountId === id)
      || [...state.recurringPlans, ...state.installmentPlans].some(plan => plan.accountId === id || plan.liabilityAccountId === id)
    if (linked) throw new Error('Esta conta possui lançamentos ou planejamentos vinculados. Remova os vínculos antes de excluí-la.')
    state.assetAccounts = state.assetAccounts.filter(account => account.id !== id)
    tx.objectStore('assetAccounts').delete(id)
  }),
  getAccountTransfers: () => getAll<AccountTransfer>('accountTransfers'),
  saveAccountTransfer: (transfer: AccountTransfer) => { assertValid(transfer, isValidAccountTransfer, 'Transferência inválida.'); return saveDefinition('accountTransfers', transfer) },
  async confirmOccurrence(ref: PlanningReference, date: string): Promise<FinancialRecord> {
    return financialTransaction((state, tx) => {
      const occurrence = planOccurrences(state.recurringPlans, state.installmentPlans, state.financialRecords, { start: ref.dueDate, end: ref.dueDate }).find(o => o.ref.kind === ref.kind && o.ref.planId === ref.planId && o.ref.key === ref.key)
      if (!occurrence) throw new Error('Ocorrência indisponível. Confira se o planejamento está ativo.')
      if (occurrence.record) return occurrence.record
      const today = new Date(), localToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      if (date > localToday) throw new Error('Confirme somente recebimentos/pagamentos já realizados, com data até hoje.')
      const record = createOccurrenceRecord(occurrence, date, today.toISOString())
      assertValid(record, isValidFinancialRecord, 'Confirmação inválida.')
      state.financialRecords.push(record)
      tx.objectStore('financialRecords').put(record)
      return record
    })
  },
  getStudyLogs: () => getAll<StudyLog>('studyLogs'),
  saveStudyLog: (log: StudyLog) => { assertValid(log, isValidStudyLog, 'Registro de estudo inválido.'); return put('studyLogs', log) },
  deleteStudyLog: (id: string) => remove('studyLogs', id),
  getProgress: () => getAll<ThirtyDayProgress>('progress'),
  saveProgress: (progress: ThirtyDayProgress) => { assertValid(progress, isValidProgress, 'Progresso inválido.'); return put('progress', progress) },
  getBodyMeasurements: () => getAll<BodyMeasurement>('bodyMeasurements'),
  saveBodyMeasurement: (measurement: BodyMeasurement) => { assertValid(measurement, isValidBodyMeasurement, 'Medida corporal inválida.'); return put('bodyMeasurements', measurement) },
  deleteBodyMeasurement: (id: string) => remove('bodyMeasurements', id),
  getMealLogs: () => getAll<MealLog>('mealLogs'),
  saveMealLog: (meal: MealLog) => { assertValid(meal, isValidMealLog, 'Registro de refeição inválido.'); return put('mealLogs', meal) },
  deleteMealLog: (id: string) => remove('mealLogs', id),
  async exportAll(): Promise<BackupData> {
    const db = await openDatabase(), tx = db.transaction([...stores], 'readonly')
    const done = transactionDone(tx)
    const arrays = await Promise.all(stores.map(name => requestResult(tx.objectStore(name).getAll())))
    await done
    const snapshot = Object.fromEntries(stores.map((name, index) => [name, arrays[index]]))
    const backup: BackupData = {
      ...snapshot as unknown as BackupData,
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      checkIns: (snapshot.checkIns as ({ id: string } & DailyCheckIn)[]).map(({ id: _id, ...item }) => item),
      settings: (snapshot.settings as AppSettings[]).find(item => item.id === 'settings') ?? defaultSettings(),
    }
    if (!validateBackup(backup)) throw new Error('Os dados locais estão inconsistentes. A exportação foi interrompida para evitar um backup corrompido.')
    return backup
  },
  async importAll(data: BackupData) {
    if (!validateBackup(data)) throw new Error('Backup inválido. Nenhum dado foi alterado.')
    const db = await openDatabase()
    const tx = db.transaction([...stores], 'readwrite')
    for (const name of stores) tx.objectStore(name).clear()
    for (const item of data.completions) tx.objectStore('completions').put(item)
    for (const item of data.dailySnapshots ?? []) tx.objectStore('dailySnapshots').put(item)
    for (const item of data.checkIns) tx.objectStore('checkIns').put({ ...item, id: item.localDate })
    for (const item of data.deliveryShifts) tx.objectStore('deliveryShifts').put(item)
    for (const item of data.expenses) tx.objectStore('expenses').put(item)
    for (const item of data.financialRecords ?? []) tx.objectStore('financialRecords').put(item)
    for (const item of data.financialGoals ?? []) tx.objectStore('financialGoals').put(item)
    for (const item of data.categoryBudgets ?? []) tx.objectStore('categoryBudgets').put(item)
    for (const item of data.recurringPlans ?? []) tx.objectStore('recurringPlans').put(item)
    for (const item of data.installmentPlans ?? []) tx.objectStore('installmentPlans').put(item)
    for (const item of data.assetAccounts ?? []) tx.objectStore('assetAccounts').put(item)
    for (const item of data.accountTransfers ?? []) tx.objectStore('accountTransfers').put(item)
    for (const item of data.studyLogs) tx.objectStore('studyLogs').put(item)
    for (const item of data.progress) tx.objectStore('progress').put(item)
    for (const item of data.bodyMeasurements ?? []) tx.objectStore('bodyMeasurements').put(item)
    for (const item of data.mealLogs ?? []) tx.objectStore('mealLogs').put(item)
    tx.objectStore('settings').put(data.settings)
    await transactionDone(tx)
  },
  async clearAll() {
    const db = await openDatabase()
    const tx = db.transaction([...stores], 'readwrite')
    for (const name of stores) tx.objectStore(name).clear()
    tx.objectStore('settings').put(defaultSettings())
    await transactionDone(tx)
  },
}
