import { useMemo, useState, type FormEvent } from 'react'
import { summarizeBodyTrend, summarizeMealDay } from '../../../core/domain'
import type { BodyMeasurement, MealLog, MealOutcome, MealSlot } from '../../../core/types'

const meals = [
  { name: 'Café da manhã', purpose: 'Começar com proteína', items: ['3 ovos mexidos', '50 g de pão', '1 fruta'] },
  { name: 'Almoço', purpose: 'Marmita principal', items: ['150 g de carne ou frango', '150 g de arroz', '150 g de feijão', 'Legumes ou salada à vontade'] },
  { name: 'Lanche', purpose: 'Evitar chegar vazio à noite', items: ['250 ml de leite', '30 g de aveia', '1 fruta'] },
  { name: 'Jantar', purpose: 'Recuperar sem improviso', items: ['120 g de carne ou frango', '120 g de arroz', '150 g de feijão', 'Legumes ou salada à vontade'] },
] as const

const shoppingGroups = [
  { title: 'Proteína', items: ['30 ovos', '2,5–3 kg de coxa e sobrecoxa', 'Leite para 7 porções'] },
  { title: 'Base das marmitas', items: ['1 kg de arroz', '1 kg de feijão', '500 g de aveia'] },
  { title: 'Volume e praticidade', items: ['14 frutas econômicas', 'Legumes da estação', 'Verduras que durem a semana'] },
] as const

const mealSlots: readonly { value: MealSlot; label: string; reference: string }[] = [
  { value: 'breakfast', label: 'Café da manhã', reference: 'Ovos, pão e fruta' },
  { value: 'lunch', label: 'Almoço', reference: 'Carne ou frango, arroz, feijão e vegetais' },
  { value: 'snack', label: 'Lanche', reference: 'Leite, aveia e fruta' },
  { value: 'dinner', label: 'Jantar', reference: 'Carne ou frango, arroz, feijão e vegetais' },
]

const mealOutcomeLabels: Record<MealOutcome, string> = {
  'with-protein': 'Com proteína',
  'without-protein': 'Sem proteína',
  skipped: 'Não comi',
}

type NutritionViewProps = {
  today: string
  measurements: readonly BodyMeasurement[]
  mealLogs: readonly MealLog[]
  onSaveMeasurement: (measurement: BodyMeasurement) => Promise<boolean>
  onSaveMeal: (meal: MealLog) => Promise<boolean>
}

const formatDecimal = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const formatDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR')

function WeightLine({ measurements }: { measurements: readonly BodyMeasurement[] }) {
  const points = [...measurements].sort((a, b) => a.localDate.localeCompare(b.localDate)).slice(-14)
  if (points.length < 2) return <div className="measurement-chart-empty">Registre pelo menos duas datas para formar a linha.</div>
  const values = points.map((item) => item.weightKg), min = Math.min(...values), max = Math.max(...values), range = Math.max(max - min, 1)
  const coordinates = points.map((item, index) => `${index / (points.length - 1) * 100},${42 - (item.weightKg - min) / range * 36}`).join(' ')
  return <svg className="measurement-chart" viewBox="0 0 100 48" preserveAspectRatio="none" role="img" aria-label={`Evolução do peso de ${formatDecimal(points[0].weightKg)} para ${formatDecimal(points.at(-1)!.weightKg)} quilogramas`}>
    <path d="M0 42H100" />
    <polyline points={coordinates} />
    {points.map((item, index) => <circle key={item.id} cx={index / (points.length - 1) * 100} cy={42 - (item.weightKg - min) / range * 36} r="1.5" />)}
  </svg>
}

export function NutritionView({ today, measurements, mealLogs, onSaveMeasurement, onSaveMeal }: NutritionViewProps) {
  const todayMeasurement = measurements.find((item) => item.localDate === today)
  const [localDate, setLocalDate] = useState(today)
  const [weight, setWeight] = useState(todayMeasurement ? String(todayMeasurement.weightKg) : '')
  const [waist, setWaist] = useState(todayMeasurement?.waistCm === undefined ? '' : String(todayMeasurement.waistCm))
  const [saving, setSaving] = useState(false)
  const initialMeal = mealLogs.find((item) => item.localDate === today && item.meal === 'breakfast')
  const [mealDate, setMealDate] = useState(today)
  const [mealSlot, setMealSlot] = useState<MealSlot>('breakfast')
  const [mealOutcome, setMealOutcome] = useState<MealOutcome>(initialMeal?.outcome ?? 'with-protein')
  const [mealNote, setMealNote] = useState(initialMeal?.note ?? '')
  const [savingMeal, setSavingMeal] = useState(false)
  const existing = measurements.find((item) => item.localDate === localDate)
  const orderedMeasurements = useMemo(() => [...measurements].sort((a, b) => b.localDate.localeCompare(a.localDate)), [measurements])
  const trend = useMemo(() => summarizeBodyTrend(measurements, today), [measurements, today])
  const existingMeal = mealLogs.find((item) => item.localDate === mealDate && item.meal === mealSlot)
  const mealSummary = useMemo(() => summarizeMealDay(mealLogs, mealDate), [mealLogs, mealDate])
  const orderedMealLogs = useMemo(() => [...mealLogs].sort((a, b) => b.localDate.localeCompare(a.localDate) || mealSlots.findIndex((slot) => slot.value === a.meal) - mealSlots.findIndex((slot) => slot.value === b.meal)), [mealLogs])

  function changeDate(nextDate: string) {
    const saved = measurements.find((item) => item.localDate === nextDate)
    setLocalDate(nextDate)
    setWeight(saved ? String(saved.weightKg) : '')
    setWaist(saved?.waistCm === undefined ? '' : String(saved.waistCm))
  }

  async function submitMeasurement(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    const weightKg = Number(weight.replace(',', '.')), waistCm = waist ? Number(waist.replace(',', '.')) : undefined
    const now = new Date().toISOString()
    const measurement: BodyMeasurement = {
      id: localDate,
      localDate,
      weightKg,
      ...(waistCm === undefined ? {} : { waistCm }),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    setSaving(true)
    await onSaveMeasurement(measurement)
    setSaving(false)
  }

  function loadMeal(nextDate: string, nextSlot: MealSlot) {
    const saved = mealLogs.find((item) => item.localDate === nextDate && item.meal === nextSlot)
    setMealDate(nextDate)
    setMealSlot(nextSlot)
    setMealOutcome(saved?.outcome ?? 'with-protein')
    setMealNote(saved?.note ?? '')
  }

  async function submitMeal(event: FormEvent) {
    event.preventDefault()
    if (savingMeal) return
    const now = new Date().toISOString(), note = mealNote.trim()
    const meal: MealLog = {
      id: `${mealDate}:${mealSlot}`,
      localDate: mealDate,
      meal: mealSlot,
      outcome: mealOutcome,
      ...(note ? { note } : {}),
      createdAt: existingMeal?.createdAt ?? now,
      updatedAt: now,
    }
    setSavingMeal(true)
    await onSaveMeal(meal)
    setSavingMeal(false)
  }

  return <div className="nutrition-view">
    <header className="page-title nutrition-title">
      <p className="eyebrow">Plano inicial de consulta</p>
      <h1>Nutrição</h1>
      <p>Emagrecer preservando força e massa muscular, com comida simples, marmitas e um orçamento ainda em calibração.</p>
    </header>

    <section className="nutrition-target" aria-labelledby="nutrition-target-title">
      <div className="nutrition-target-copy">
        <span className="nutrition-marker" aria-hidden="true">Ponto de partida</span>
        <h2 id="nutrition-target-title">Uma referência para testar, não uma regra fixa</h2>
        <p>Use por duas semanas completas e ajuste pela média do peso, pela fome e pelo desempenho nos treinos.</p>
      </div>
      <dl className="nutrition-numbers">
        <div><dt>Energia diária</dt><dd>2.200 kcal</dd></div>
        <div><dt>Proteína diária</dt><dd>120–140 g</dd></div>
      </dl>
      <p className="nutrition-caveat">Meta provisória enquanto altura, volume de treino e gasto real com alimentação ainda não foram calibrados.</p>
    </section>

    <section className="nutrition-section" aria-labelledby="measurement-title">
      <div className="nutrition-heading">
        <div>
          <h2 id="measurement-title">Acompanhe o corpo, não um dia isolado</h2>
          <p>Registre nas mesmas condições. O Ritmo compara a média dos últimos sete dias com os sete anteriores.</p>
        </div>
      </div>
      <div className="measurement-workspace">
        <form className="measurement-form" aria-label="Registrar medidas" onSubmit={submitMeasurement}>
          <div className="measurement-form-heading">
            <h3>{existing ? 'Atualizar medida' : 'Nova medida'}</h3>
            <span>Salvo somente neste aparelho</span>
          </div>
          <label className="field"><span>Data</span><input type="date" value={localDate} max={today} required onChange={(event) => changeDate(event.target.value)} /></label>
          <div className="measurement-fields">
            <label className="field"><span>Peso</span><div className="measurement-input"><input type="number" inputMode="decimal" min="30" max="400" step="0.1" value={weight} required onChange={(event) => setWeight(event.target.value)} /><span>kg</span></div></label>
            <label className="field"><span>Cintura</span><div className="measurement-input"><input type="number" inputMode="decimal" min="30" max="300" step="0.1" value={waist} onChange={(event) => setWaist(event.target.value)} /><span>cm</span></div></label>
          </div>
          <button className="primary-button" type="submit" disabled={saving}>{saving ? 'Salvando…' : existing ? 'Atualizar medida' : 'Salvar medida'}</button>
        </form>

        <div className="measurement-trend" aria-label="Tendência corporal">
          <dl className="measurement-summary">
            <div><dt>Último peso</dt><dd>{trend.latestWeightKg === null ? '—' : `${formatDecimal(trend.latestWeightKg)} kg`}</dd></div>
            <div><dt>Média de 7 dias</dt><dd>{trend.currentAverageKg === null ? '—' : `${formatDecimal(trend.currentAverageKg)} kg`}</dd></div>
            <div><dt>Mudança semanal</dt><dd className={trend.weeklyChangeKg !== null && trend.weeklyChangeKg < 0 ? 'measurement-down' : ''}>{trend.weeklyChangeKg === null ? 'Aguardando dados' : `${trend.weeklyChangeKg > 0 ? '+' : ''}${formatDecimal(trend.weeklyChangeKg)} kg`}</dd></div>
          </dl>
          <WeightLine measurements={orderedMeasurements} />
        </div>
      </div>

      <div className="measurement-history">
        <h3>Histórico recente</h3>
        {orderedMeasurements.length === 0
          ? <p className="measurement-empty">Seu primeiro registro aparecerá aqui.</p>
          : <div className="measurement-table-scroll" tabIndex={0} role="region" aria-label="Histórico de medidas">
            <table className="measurement-table">
              <thead><tr><th>Data</th><th>Peso</th><th>Cintura</th></tr></thead>
              <tbody>{orderedMeasurements.slice(0, 8).map((item) => <tr key={item.id}><td>{formatDate(item.localDate)}</td><td>{formatDecimal(item.weightKg)} kg</td><td>{item.waistCm === undefined ? '—' : `${formatDecimal(item.waistCm)} cm`}</td></tr>)}</tbody>
            </table>
          </div>}
      </div>
    </section>

    <section className="nutrition-section meal-journal" aria-labelledby="meal-journal-title">
      <div className="nutrition-heading">
        <div>
          <h2 id="meal-journal-title">Diário de refeições</h2>
          <p>Registre o que aconteceu. Uma refeição isolada não define o seu padrão.</p>
        </div>
        <span>Sem contar calorias</span>
      </div>

      <div className="meal-journal-workspace">
        <form className="meal-log-form" aria-label="Registrar refeição" onSubmit={submitMeal}>
          <div className="meal-log-form-heading">
            <h3>{existingMeal ? 'Atualizar refeição' : 'Registrar refeição'}</h3>
            <span>Uma por horário e dia</span>
          </div>
          <div className="meal-log-fields">
            <label className="field"><span>Data</span><input type="date" value={mealDate} max={today} required onChange={(event) => loadMeal(event.target.value, mealSlot)} /></label>
            <label className="field"><span>Refeição</span><select value={mealSlot} onChange={(event) => loadMeal(mealDate, event.target.value as MealSlot)}>{mealSlots.map((slot) => <option key={slot.value} value={slot.value}>{slot.label}</option>)}</select></label>
          </div>
          <fieldset className="meal-outcome-fieldset">
            <legend>Como foi?</legend>
            <div role="group" aria-label="Resultado observado">
              {(Object.entries(mealOutcomeLabels) as [MealOutcome, string][]).map(([value, label]) => <button type="button" key={value} className={mealOutcome === value ? 'selected' : ''} aria-pressed={mealOutcome === value} onClick={() => setMealOutcome(value)}>{label}</button>)}
            </div>
          </fieldset>
          <label className="field"><span>Observação</span><textarea value={mealNote} maxLength={500} placeholder="Ex.: frango, arroz e feijão; lanche comprado no trabalho…" onChange={(event) => setMealNote(event.target.value)} /></label>
          <button className="primary-button" type="submit" disabled={savingMeal}>{savingMeal ? 'Salvando…' : existingMeal ? 'Atualizar refeição' : 'Salvar refeição'}</button>
        </form>

        <aside className="meal-day-summary" role="region" aria-label="Resumo das refeições do dia">
          <div className="meal-day-count">
            <strong>{mealSummary.registered} de 4 registradas</strong>
            <span>{mealSummary.registered === 0 ? 'Sem dados registrados para esta data.' : `${mealSummary.proteinMeals} com proteína · ${mealSummary.mealsEaten} realizadas · ${mealSummary.skipped} não realizadas`}</span>
          </div>
          <ol>
            {mealSlots.map((slot) => {
              const log = mealLogs.find((item) => item.localDate === mealDate && item.meal === slot.value)
              return <li key={slot.value}>
                <div><strong>{slot.label}</strong><span>{slot.reference}</span></div>
                <span className={`meal-day-status ${log ? `status-${log.outcome}` : ''}`}>{log ? mealOutcomeLabels[log.outcome] : 'Não registrado'}</span>
              </li>
            })}
          </ol>
        </aside>
      </div>

      <div className="meal-log-history">
        <h3>Registros recentes</h3>
        {orderedMealLogs.length === 0
          ? <p className="measurement-empty">As refeições registradas aparecerão aqui.</p>
          : <div className="measurement-table-scroll" tabIndex={0} role="region" aria-label="Histórico de refeições">
            <table className="measurement-table meal-log-table">
              <thead><tr><th>Data</th><th>Refeição</th><th>Resultado</th><th>Observação</th></tr></thead>
              <tbody>{orderedMealLogs.slice(0, 12).map((item) => <tr key={item.id}><td>{formatDate(item.localDate)}</td><td>{mealSlots.find((slot) => slot.value === item.meal)?.label}</td><td>{mealOutcomeLabels[item.outcome]}</td><td>{item.note ?? '—'}</td></tr>)}</tbody>
            </table>
          </div>}
      </div>
    </section>

    <section className="nutrition-section" aria-labelledby="nutrition-plate-title">
      <div className="nutrition-heading">
        <div>
          <h2 id="nutrition-plate-title">Seu prato na balança</h2>
          <p>Os pesos de arroz, feijão e carnes são do alimento já pronto para comer.</p>
        </div>
        <span>4 refeições</span>
      </div>
      <div className="meal-plan-grid">
        {meals.map((meal, index) => <article className="meal-plan" key={meal.name}>
          <div className="meal-order" aria-hidden="true">{index + 1}</div>
          <div>
            <h3>{meal.name}</h3>
            <p>{meal.purpose}</p>
            <ul>{meal.items.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
        </article>)}
      </div>
      <p className="nutrition-swap"><strong>Troca simples:</strong> prefira frango sem pele ou carne bovina sem gordura aparente. Se faltar uma refeição, retome na próxima; não tente compensar ficando sem comer.</p>
    </section>

    <section className="nutrition-section nutrition-shopping" aria-labelledby="nutrition-shopping-title">
      <div className="nutrition-heading">
        <div>
          <h2 id="nutrition-shopping-title">Compras para 7 dias</h2>
          <p>Primeiro lote para descobrir o custo real antes de comprometer todo o vale.</p>
        </div>
        <span>Lista piloto</span>
      </div>
      <div className="shopping-ledger">
        {shoppingGroups.map((group) => <div key={group.title}>
          <h3>{group.title}</h3>
          <ul>{group.items.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>)}
      </div>
      <aside className="budget-note" aria-label="Regra para o vale-refeição">
        <strong>Proteja o essencial primeiro.</strong>
        <p>Separe o valor da higiene antes da compra. Com o restante, priorize ovos, frango, arroz, feijão e aveia; compre frutas e legumes pelo melhor preço da semana.</p>
      </aside>
    </section>

    <section className="nutrition-section nutrition-adjustment" aria-labelledby="nutrition-adjustment-title">
      <div className="nutrition-heading">
        <div>
          <h2 id="nutrition-adjustment-title">Como ajustar sem perder músculo</h2>
          <p>Decida pela tendência de duas semanas, não por um único dia na balança.</p>
        </div>
      </div>
      <ol className="adjustment-steps">
        <li><strong>Pese nas mesmas condições.</strong><span>De manhã, após ir ao banheiro e antes de comer. Faça 3 a 7 medições por semana e use a média.</span></li>
        <li><strong>Mantenha treino e proteína.</strong><span>Treino de força, proteína distribuída nas refeições e sono são as principais proteções para a massa muscular.</span></li>
        <li><strong>Mantenha se estiver funcionando.</strong><span>Queda média de cerca de 0,25 a 0,75 kg por semana, força estável e fome controlável indicam que não é hora de cortar mais.</span></li>
        <li><strong>Ajuste pouco e espere.</strong><span>Sem queda por duas semanas completas, retire cerca de 100–150 kcal. Se cair rápido demais ou o treino piorar, devolva 100–150 kcal.</span></li>
      </ol>
    </section>

    <section className="nutrition-section waist-guide" aria-labelledby="waist-title">
      <div>
        <h2 id="waist-title">Como medir a cintura</h2>
        <p>Passe uma fita ao redor do abdômen na altura do umbigo, paralela ao chão. Fique relaxado, solte o ar normalmente e não aperte a fita. Repita sempre no mesmo horário, uma vez por semana.</p>
      </div>
      <span aria-hidden="true">↔</span>
    </section>

    <p className="nutrition-safety">Este plano é educativo e não substitui avaliação profissional. Dor, tontura, fraqueza persistente ou queda acentuada de desempenho são sinais para interromper o ajuste e procurar atendimento.</p>
  </div>
}
