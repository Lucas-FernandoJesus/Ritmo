import { useMemo, useState, type FormEvent } from 'react'
import { summarizeBodyTrend, summarizeMealDay } from '../../../core/domain'
import type { BodyMeasurement, DailyCompletion, DailyPlanSnapshot, DeliveryShift, Expense, FinancialRecord, MealLog, MealOutcome, MealSlot } from '../../../core/types'
import { summarizeNutritionWeeks } from '../weekly-summary'
import { NutritionWeeklyOverview } from './NutritionWeeklyOverview'

const meals = [
  { name: 'Café da manhã', purpose: 'Depois do treino matinal', items: ['Ovos ou iogurte natural', 'Pão ou aveia', 'Uma fruta, se disponível'] },
  { name: 'Almoço', purpose: 'Marmita principal', items: ['Frango, ovos, peixe ou outra proteína acessível', 'Arroz; feijão ou lentilha se gostar', 'Legumes ou salada, mesmo separados'] },
  { name: 'Lanche', purpose: 'Conforme fome e intervalo até o jantar', items: ['Leite ou iogurte natural', 'Fruta ou aveia'] },
  { name: 'Jantar', purpose: 'Alternativa pronta para a noite cansativa', items: ['Marmita preparada ou ovos com pão', 'Feijão, lentilha ou outra proteína disponível', 'Legumes, salada ou fruta conforme a refeição'] },
] as const

const shoppingGroups = [
  { title: 'Proteína', items: ['Ovos', 'Frango ou outra opção acessível', 'Leite ou iogurte, se fizer parte da rotina'] },
  { title: 'Base das marmitas', items: ['Arroz', 'Feijão ou lentilha', 'Aveia, se útil para o café ou lanche'] },
  { title: 'Variedade e praticidade', items: ['Frutas pelo preço da semana', 'Legumes da estação', 'Verduras que durem até o preparo'] },
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
  snapshots: readonly DailyPlanSnapshot[]
  completions: readonly DailyCompletion[]
  shifts: readonly DeliveryShift[]
  expenses: readonly Expense[]
  records: readonly FinancialRecord[]
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

export function NutritionView({ today, measurements, mealLogs, snapshots, completions, shifts, expenses, records, onSaveMeasurement, onSaveMeal }: NutritionViewProps) {
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
  const weeklySummary = useMemo(() => summarizeNutritionWeeks(today, { measurements, mealLogs, snapshots, completions, shifts, expenses, records }), [today, measurements, mealLogs, snapshots, completions, shifts, expenses, records])
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
      <p className="eyebrow">Plano de recomposição · em calibração</p>
      <h1>Nutrição</h1>
      <p>Buscar perda de gordura com dois treinos de força, Muay Thai progressivo e refeições simples que apoiem a recuperação.</p>
    </header>

    <section className="nutrition-target" aria-labelledby="nutrition-target-title">
      <div className="nutrition-target-copy">
        <span className="nutrition-marker" aria-hidden="true">Meta escolhida</span>
        <h2 id="nutrition-target-title">Déficit de 20% em calibração</h2>
        <p>A referência é consumir cerca de 80% do gasto de manutenção real. Registre alimentação, bebidas, peso e recuperação por duas semanas para estimar esse gasto antes de definir calorias.</p>
      </div>
      <dl className="nutrition-numbers">
        <div><dt>Meta calórica individual</dt><dd>0,8 × gasto de manutenção</dd></div>
        <div><dt>{orderedMeasurements.length ? 'Último peso registrado' : 'Peso a confirmar na balança'}</dt><dd>{orderedMeasurements.length ? `${orderedMeasurements[0].weightKg.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg` : 'Sem registro'}</dd></div>
      </dl>
      <p className="nutrition-caveat">O percentual é uma intenção, não um déficit já medido. O peso isolado não revela seu gasto diário. Uma estimativa de peso não deve virar registro nem meta alimentar.</p>
    </section>

    <NutritionWeeklyOverview summary={weeklySummary} />

    <section className="nutrition-section" aria-labelledby="measurement-title">
      <div className="nutrition-heading">
        <div>
          <h2 id="measurement-title">Acompanhe o corpo, não um dia isolado</h2>
          <p>Pese de manhã, após ir ao banheiro e antes de comer, sempre em condições parecidas. O Ritmo compara os últimos sete dias com os sete anteriores.</p>
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
          <p>Registre o que aconteceu. Uma refeição isolada não define o seu padrão. O diário de refeições não calcula calorias.</p>
        </div>
        <span>Registro qualitativo</span>
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
          <h2 id="nutrition-plate-title">Refeições simples para começar</h2>
          <p>Combine o que estiver disponível e ajuste as quantidades à fome, saciedade e treino. As porções ainda precisam ser calibradas para testar os 20%.</p>
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
      <p className="nutrition-swap"><strong>Troca simples:</strong> alterne ovos, frango, peixe ou leguminosas conforme preço e preferência. Deixe uma opção de jantar pronta para evitar depender de pedidos por cansaço. Se faltar uma refeição, retome na próxima; não tente compensar ficando sem comer.</p>
      <p className="nutrition-swap"><strong>Doce após o almoço:</strong> você pode planejar uma sobremesa e registrá-la. Fruta, iogurte ou uma porção do doce que deseja são opções; não há necessidade de proibir ou compensar depois.</p>
      <p className="nutrition-swap"><strong>Bebidas:</strong> anote tipo, volume e frequência do refrigerante. Se tiver açúcar, trocar parte por água gradualmente pode ajudar na calibração, sem exigir que você corte o arroz.</p>
    </section>

    <section className="nutrition-section nutrition-shopping" aria-labelledby="nutrition-shopping-title">
      <div className="nutrition-heading">
        <div>
          <h2 id="nutrition-shopping-title">Compras para 7 dias</h2>
          <p>Escolha quantidades para os dias que pretende preparar e confira o custo real antes de comprometer todo o vale.</p>
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
        <h2 id="nutrition-adjustment-title">Como acompanhar e ajustar</h2>
          <p>Compare semanas equivalentes; uma pesagem ou refeição isolada não define a tendência.</p>
        </div>
      </div>
      <ol className="adjustment-steps">
        <li><strong>Confirme o ponto de partida.</strong><span>Registre o peso medido nas mesmas condições e a cintura uma vez por semana. Refeição recente pode alterar temporariamente a medida da barriga.</span></li>
        <li><strong>Observe a ingestão real.</strong><span>Por duas semanas, anote também quantidades aproximadas, bebidas, óleo do preparo e lanches. Este diário não estima calorias a partir das observações.</span></li>
        <li><strong>Calibre os 20%.</strong><span>Estime o gasto de manutenção a partir de atividade, ingestão observada e tendência de peso, depois use 0,8 × esse gasto como ponto de partida revisável; consulte nutricionista para um valor individual.</span></li>
        <li><strong>Proteja os treinos.</strong><span>Faça força terça e quinta e Muay Thai segunda e quarta; os trechos intensos só entram gradualmente dentro dos rounds. Observe fome, energia, sono e resposta do braço.</span></li>
        <li><strong>Revise com cuidado.</strong><span>Compare semanas equivalentes. Queda de desempenho, tontura, fome intensa ou recuperação ruim pedem reduzir a restrição e buscar avaliação profissional.</span></li>
      </ol>
    </section>

    <section className="nutrition-section waist-guide" aria-labelledby="waist-title">
      <div>
        <h2 id="waist-title">Como medir a cintura</h2>
        <p>Passe a fita ao redor da cintura logo acima dos ossos do quadril, paralela ao chão. Fique relaxado, solte o ar normalmente e não aperte a fita. Repita no mesmo local e horário, de preferência antes da refeição, uma vez por semana.</p>
      </div>
      <span aria-hidden="true">↔</span>
    </section>

    <p className="nutrition-safety">Este plano é educativo e não substitui avaliação profissional. Dor, tontura, fraqueza persistente ou queda acentuada de desempenho são sinais para interromper o ajuste e procurar atendimento.</p>
  </div>
}
