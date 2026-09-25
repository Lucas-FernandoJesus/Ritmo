import { defaultSettings, isValidCheckIn, isValidCompletion, isValidDailyPlanSnapshot, isValidDeliveryShift, isValidExpense, isValidProgress, isValidSettings, isValidStudyLog, SCHEMA_VERSION, validateBackup } from './domain'
import type { AppSettings, BackupData, DailyCheckIn, DailyCompletion, DailyPlanSnapshot, DeliveryShift, Expense, StudyLog, ThirtyDayProgress } from './types'

const DB_NAME = 'rotina-local'
const DB_VERSION = 2
const stores = ['completions', 'dailySnapshots', 'checkIns', 'deliveryShifts', 'expenses', 'studyLogs', 'progress', 'settings'] as const
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
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Não foi possível abrir o armazenamento local.'))
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
  saveDeliveryShift: (shift: DeliveryShift) => { assertValid(shift, isValidDeliveryShift, 'Turno de delivery inválido.'); return put('deliveryShifts', shift) },
  getExpenses: () => getAll<Expense>('expenses'),
  saveExpense: (expense: Expense) => { assertValid(expense, isValidExpense, 'Despesa inválida.'); return put('expenses', expense) },
  getStudyLogs: () => getAll<StudyLog>('studyLogs'),
  saveStudyLog: (log: StudyLog) => { assertValid(log, isValidStudyLog, 'Registro de estudo inválido.'); return put('studyLogs', log) },
  getProgress: () => getAll<ThirtyDayProgress>('progress'),
  saveProgress: (progress: ThirtyDayProgress) => { assertValid(progress, isValidProgress, 'Progresso inválido.'); return put('progress', progress) },
  async exportAll(): Promise<BackupData> {
    const backup: BackupData = {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      completions: await getAll('completions'),
      dailySnapshots: await getAll('dailySnapshots'),
      checkIns: (await getAll<{ id: string } & DailyCheckIn>('checkIns')).map(({ id: _id, ...item }) => item),
      deliveryShifts: await getAll('deliveryShifts'),
      expenses: await getAll('expenses'),
      studyLogs: await getAll('studyLogs'),
      progress: await getAll('progress'),
      settings: await repository.getSettings(),
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
    for (const item of data.studyLogs) tx.objectStore('studyLogs').put(item)
    for (const item of data.progress) tx.objectStore('progress').put(item)
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
