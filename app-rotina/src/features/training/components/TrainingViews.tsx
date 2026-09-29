import type { RoutineMode } from '../../../core/types'
import { PageTitle } from '../../../components/FormPrimitives'
import { getExerciseDemo } from '../exercise-demos'
import { getMuayPractices } from '../muay-exercises'
import { getMuaySession, getMuayThaiGuide, getStrengthSession, getTrainingPlanWeek, trainingBlocks, type MuayTrainingId, type TrainingDay } from '../training-plan'
import { modeCopy } from '../../routine/view-labels'

export type TrainingSelection = TrainingDay | MuayTrainingId

export function TrainingWorkoutView({ day, trainingWeek, mode, online, onBack }: { day: TrainingDay; trainingWeek: number; mode: RoutineMode; online: boolean; onBack: () => void }) {
  const { block, week, format, exercises } = getStrengthSession(trainingWeek, day, mode)
  return <div className="workout-view">
    <button type="button" className="workout-back text-button" onClick={onBack}>← Voltar à rotina</button>
    <header className="page-title workout-title">
      <p className="eyebrow">Fortalecimento · {day === 'A' ? 'terça-feira' : 'quinta-feira'} · semana {week.week}</p>
      <h1>Treino {day}</h1>
      <p>{block.title} · {modeCopy[mode].label.toLowerCase()}</p>
    </header>
    <section className="workout-summary" aria-label="Como fazer o treino">
      <div className="workout-stats"><div><span>Tempo previsto</span><strong>{format.duration}</strong></div><div><span>Sequência</span><strong>{format.circuits} circuito{format.circuits === 1 ? '' : 's'}</strong></div><div><span>Descanso</span><strong>{format.rest}</strong></div></div>
      <p>{block.objective}</p>
      <ol className="workout-flow"><li><strong>Antes</strong><span>Observe sono, cansaço, pegada, sensibilidade e movimento do braço. Aqueça com marcha e mobilidade confortável por {mode === 'minimo' ? '1 minuto' : '3 minutos'}.</span></li><li><strong>Durante</strong><span>Faça os exercícios abaixo na ordem. Ao terminar a lista, descanse e repita se houver outro circuito. {format.note}</span></li><li><strong>Depois</strong><span>Desacelere, observe como está o braço e confira novamente no dia seguinte.</span></li></ol>
    </section>
    <div className="section-heading workout-section-heading"><div><h2>Exercícios de hoje</h2><p className="section-description">Leia a variação do Ritmo antes de abrir o exemplo em vídeo.</p></div><span className="count-chip">{exercises.length} movimentos</span></div>
    <ol className="workout-exercises">{exercises.map((exercise, index) => {
      const demo = getExerciseDemo(exercise)
      return <li key={exercise.id} className="workout-exercise">
        <div className="workout-exercise-heading"><span className="workout-order" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><div><h3>{exercise.title}</h3><span className="workout-amount">{exercise.amount}</span></div></div>
        <p className="workout-prescription">{exercise.description}</p>
        {demo && <><div className="workout-example"><strong>Exemplo prático</strong><p>{demo.example}</p></div>
          <p className="workout-video-caption">{demo.videoTitle} · {demo.provider}. {demo.note ?? 'Siga a quantidade e a amplitude descritas no Ritmo.'}</p>
          <a className="workout-video-link secondary-button" href={demo.videoUrl} target="_blank" rel="noopener noreferrer" aria-label={`Ver demonstração de ${exercise.title} no YouTube (abre em nova aba)`}>▶ Ver exemplo no YouTube <span aria-hidden="true">↗</span></a></>}
      </li>
    })}</ol>
    {!online && <p className="workout-offline" role="status">Você está offline. As instruções continuam disponíveis aqui; os vídeos precisam de internet.</p>}
    <section className="workout-finish" aria-labelledby="workout-finish-title"><h2 id="workout-finish-title">Quando avançar</h2><p>{week.focus}</p><p>{block.criteria.advance}</p><p>{block.criteria.repeat}</p><p>{block.criteria.regress}</p></section>
    <button type="button" className="secondary-button workout-end-back" onClick={onBack}>Voltar à rotina</button>
  </div>
}

export function MuayWorkoutView({ itemId, trainingWeek, mode, online, onBack }: { itemId: MuayTrainingId; trainingWeek: number; mode: RoutineMode; online: boolean; onBack: () => void }) {
  const { block, week, muay, rounds, duration, mainDescription } = getMuaySession(itemId, trainingWeek, mode)
  const guide = getMuayThaiGuide(itemId, trainingWeek, mode)
  const practices = getMuayPractices(week.week, itemId, mode)
  const friday = itemId === 'muay-fri'
  return <div className="workout-view">
    <button type="button" className="workout-back text-button" onClick={onBack}>← Voltar à rotina</button>
    <header className="page-title workout-title">
      <p className="eyebrow">Muay Thai · {friday ? 'sexta-feira opcional' : 'segunda e quarta'} · semana {week.week}</p>
      <h1>{friday ? 'Muay Thai leve' : 'Muay Thai técnico'}</h1>
      <p>{block.title} · {modeCopy[mode].label.toLowerCase()}</p>
    </header>
    <section className="workout-summary" aria-label="Como fazer o treino">
      <div className="workout-stats"><div><span>Tempo previsto</span><strong>{duration}</strong></div><div><span>Parte principal</span><strong>{rounds ? `${rounds} × ${muay.roundDuration}` : 'Base ou descanso'}</strong></div><div><span>Recuperação</span><strong>{rounds ? muay.recovery : 'livre'}</strong></div></div>
      <p>{mainDescription}</p>
      <ol className="workout-flow"><li><strong>Antes</strong><span>{guide.steps[0].description} {guide.steps[0].amount}.</span></li><li><strong>Durante</strong><span>{guide.steps[1].description} {rounds ? 'As práticas abaixo são opções dentro dos rounds previstos; não são rounds extras.' : 'A prática de base abaixo é opcional; descansar também segue o plano.'}</span></li><li><strong>Depois</strong><span>{guide.steps[2].description} {guide.steps[2].amount}.</span></li></ol>
    </section>
    <div className="section-heading workout-section-heading"><div><h2>{rounds ? 'Práticas para os rounds' : 'Prática opcional'}</h2><p className="section-description">Faça movimentos controlados no ar. As sequências e a seleção por semana são adaptações do Ritmo.</p></div><span className="count-chip">{practices.length} {practices.length === 1 ? 'prática' : 'práticas'}</span></div>
    <ol className="workout-exercises">{practices.map((practice, index) => <li key={practice.id} className="workout-exercise">
      <div className="workout-exercise-heading"><span className="workout-order" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><div><h3>{practice.title}</h3><span className="workout-amount">{rounds ? 'Parte de um round' : 'Se confortável'} · sem contagem fixa</span></div></div>
      <p className="workout-prescription">{practice.objective}</p>
      <div className="workout-example"><strong>Como praticar no Ritmo</strong><p>{practice.instructions}</p></div>
      <p className="workout-video-caption"><strong>Atenção:</strong> {practice.attention}</p>
      <p className="workout-video-caption">{practice.videoTitle} · {practice.provider}. Trecho com conteúdo verbal pesquisado; confira a demonstração visual no YouTube. O vídeo pode ter volume, intensidade ou técnicas além desta adaptação.</p>
      <a className="workout-video-link secondary-button" href={practice.videoUrl} target="_blank" rel="noopener noreferrer" aria-label={`Ver aula sobre ${practice.title} no YouTube (abre em nova aba)`}>▶ Ver aula no YouTube <span aria-hidden="true">↗</span></a>
    </li>)}</ol>
    {!online && <p className="workout-offline" role="status">Você está offline. As instruções continuam disponíveis aqui; os vídeos precisam de internet.</p>}
    <section className="workout-finish" aria-labelledby="muay-finish-title"><h2 id="muay-finish-title">Depois da sessão</h2><p>{week.consolidation ? 'Esta semana reduz um round para revisar técnica e tolerância.' : 'Avance apenas se os movimentos permanecerem confortáveis e controlados.'}</p><p>{guide.closing}</p><p>{friday ? 'Sexta é opcional. Descansar também segue o plano.' : 'Se perder equilíbrio ou controle, retome base e deslocamentos antes de combinar ações.'}</p></section>
    <button type="button" className="secondary-button workout-end-back" onClick={onBack}>Voltar à rotina</button>
  </div>
}

export function TrainingHubView({ trainingWeek, mode, onTrainingWeek, onOpenTraining }: { trainingWeek: number; mode: RoutineMode; onTrainingWeek: (week: number, message: string) => Promise<void>; onOpenTraining: (selection: TrainingSelection) => void }) {
  const { block, week } = getTrainingPlanWeek(trainingWeek)
  const strengthFormat = getStrengthSession(trainingWeek, 'A', mode).format
  const muaySession = getMuaySession('muay-mon', trainingWeek, mode)
  return <>
    <PageTitle eyebrow="Prática da semana" title="Treinos" subtitle="Abra a sessão do dia para ver o que fazer, como praticar e os exemplos em vídeo." />

    <section className="training-plan-card" aria-labelledby="training-plan-title">
      <header className="training-plan-header">
        <div><p className="eyebrow">Semana {week.week} de 24 · {block.range}</p><h2 id="training-plan-title">{block.title}</h2></div>
        <span className="count-chip">{modeCopy[mode].label}</span>
      </header>
      <p className="training-objective">{block.objective}</p>
      <p className="training-objective">Muay Thai: {block.muayThai.objective}</p>
      <div className="training-week-focus"><strong>{week.title}</strong><p>{week.focus}</p><span>Fortalecimento: {strengthFormat.circuits} circuito{strengthFormat.circuits === 1 ? '' : 's'} · descanso {strengthFormat.rest}</span><small>{strengthFormat.note}</small><span>Muay Thai: {muaySession.rounds ? `${muaySession.rounds} × ${muaySession.muay.roundDuration} · recuperação ${muaySession.muay.recovery}` : 'base confortável ou descanso'}</span><small>{mode === 'normal' ? muaySession.muay.progression : getMuayThaiGuide('muay-mon', trainingWeek, mode).steps[1].description}</small></div>
      <div className="training-workout-actions" role="group" aria-label="Treinos da semana"><button type="button" className="secondary-button" onClick={() => onOpenTraining('muay-mon')}>Ver Muay Thai · segunda e quarta</button><button type="button" className="secondary-button" onClick={() => onOpenTraining('A')}>Ver treino A · terça</button><button type="button" className="secondary-button" onClick={() => onOpenTraining('B')}>Ver treino B · quinta</button><button type="button" className="secondary-button" onClick={() => onOpenTraining('muay-fri')}>Ver Muay Thai leve · sexta opcional</button></div>
      <details className="training-criteria"><summary>Critérios para avançar, repetir ou regredir</summary><dl><div><dt>Avançar</dt><dd>{block.criteria.advance}</dd></div><div><dt>Repetir</dt><dd>{block.criteria.repeat}</dd></div><div><dt>Regredir ou interromper</dt><dd>{block.criteria.regress}</dd></div></dl></details>
      <div className="training-week-actions"><button type="button" className="text-button" disabled={week.week === 1} onClick={() => onTrainingWeek(week.week - 1, `Retorno para a semana ${week.week - 1} salvo.`)}>Semana anterior</button><button type="button" className="secondary-button" onClick={() => onTrainingWeek(week.week, `Semana ${week.week} mantida para repetição.`)}>Repetir semana</button><button type="button" className="primary-button" disabled={week.week === 24} onClick={() => onTrainingWeek(week.week + 1, `Semana ${week.week + 1} iniciada.`)}>Avançar semana</button></div>
    </section>

    <details className="training-roadmap"><summary>Ver os seis blocos do plano</summary><ol>{trainingBlocks.map((item) => <li key={item.id} className={item.id === block.id ? 'current' : ''}><span>{item.range}</span><strong>{item.title}</strong><p>{item.objective}</p></li>)}</ol></details>
  </>
}
