import type { TournamentSnapshot } from '../domain/tournament'
import type { DecisionBracket } from '../state/appState'

interface TournamentScreenProps {
  bracket: DecisionBracket
  snapshot: TournamentSnapshot | null
  hasInvalidRun: boolean
  onBack: () => void
  onChoose: (winnerId: string) => void
  onRestart: () => void
  onStart: () => void
  onUndo: () => void
}

export function TournamentScreen({
  bracket,
  snapshot,
  hasInvalidRun,
  onBack,
  onChoose,
  onRestart,
  onStart,
  onUndo,
}: TournamentScreenProps) {
  if (bracket.run === null) {
    return (
      <main className="view-enter mx-auto w-full max-w-5xl px-5 pt-12 pb-20 sm:px-8 sm:pt-20">
        <button
          type="button"
          onClick={onBack}
          className="min-h-11 rounded-xl px-1 text-sm font-bold text-slate-400 hover:text-white"
        >
          Volver a la biblioteca
        </button>
        <section className="noise-card mt-8 rounded-[2.25rem] border border-white/10 bg-panel/90 p-6 sm:p-10 lg:p-14">
          <p className="text-xs font-black tracking-[0.2em] text-electric uppercase">
            Todo listo para decidir
          </p>
          <h1 className="display-type mt-4 max-w-3xl text-5xl leading-[0.9] text-white sm:text-7xl">
            {bracket.title}
          </h1>
          <div className="relative z-10 mt-8 flex flex-wrap gap-2">
            {bracket.options.map((option) => (
              <span
                key={option.id}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300"
              >
                {option.name}
              </span>
            ))}
          </div>
          <div className="relative z-10 mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={onStart}
              className="min-h-14 rounded-2xl bg-electric px-7 font-black text-ink hover:bg-white"
            >
              Mezclar y empezar
            </button>
            <p className="max-w-sm text-sm leading-6 text-slate-400">
              Los enfrentamientos se mezclan una sola vez y después se mantienen. Los pases
              automáticos no requieren elección.
            </p>
          </div>
        </section>
      </main>
    )
  }

  if (hasInvalidRun || snapshot?.currentMatch === null || snapshot === null) {
    return (
      <main className="view-enter mx-auto w-full max-w-2xl px-5 py-20 text-center sm:px-8">
        <p className="text-xs font-black tracking-[0.2em] text-signal uppercase">
          Reinicio seguro
        </p>
        <h1 className="display-type mt-4 text-5xl text-white">
          Hay que reiniciar el progreso.
        </h1>
        <p className="mt-5 text-sm leading-6 text-slate-400">
          Tu cuadro y sus opciones siguen intactos. Reinícialo para crear enfrentamientos
          compatibles.
        </p>
        <button
          type="button"
          onClick={onRestart}
          className="mt-8 min-h-14 rounded-2xl bg-electric px-7 font-black text-ink"
        >
          Reiniciar cuadro
        </button>
      </main>
    )
  }

  const [leftId, rightId] = snapshot.currentMatch.entrantIds
  const leftOption = bracket.options.find((option) => option.id === leftId)
  const rightOption = bracket.options.find((option) => option.id === rightId)
  if (leftOption === undefined || rightOption === undefined) {
    return null
  }

  const progress = (snapshot.decisionsMade / snapshot.totalDecisions) * 100
  const totalRounds = Math.log2(snapshot.bracketSize)

  return (
    <main className="view-enter mx-auto w-full max-w-6xl px-5 pt-8 pb-20 sm:px-8 sm:pt-12">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="min-h-11 rounded-xl px-1 text-sm font-bold text-slate-400 hover:text-white"
        >
          Guardar y salir
        </button>
        <button
          type="button"
          onClick={onUndo}
          disabled={snapshot.decisionsMade === 0}
          className="min-h-11 rounded-xl border border-white/10 px-4 text-sm font-bold text-slate-300 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
        >
          Deshacer la última elección
        </button>
      </div>

      <section className="mt-8 text-center" aria-labelledby="matchup-title">
        <p className="text-xs font-black tracking-[0.2em] text-violet-300 uppercase" aria-live="polite">
          {roundName(snapshot.currentMatch.roundNumber, totalRounds)} / Enfrentamiento{' '}
          {snapshot.currentMatch.matchNumber}
        </p>
        <h1 id="matchup-title" className="display-type mt-3 text-4xl text-white sm:text-6xl">
          ¿Cuál avanza?
        </h1>
        <p className="mt-3 text-sm text-slate-500">Elige la opción que quieres conservar.</p>
      </section>

      <div className="mt-8" aria-label="Progreso del cuadro">
        <div className="mb-2 flex justify-between text-xs font-bold text-slate-500">
          <span>
            Elección {snapshot.decisionsMade + 1} de {snapshot.totalDecisions}
          </span>
          <span>{Math.round(progress)}% completado</span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-white/10"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={snapshot.totalDecisions}
          aria-valuenow={snapshot.decisionsMade}
          aria-label={`${snapshot.decisionsMade} de ${snapshot.totalDecisions} elecciones completadas`}
        >
          <div
            className="h-full rounded-full bg-linear-to-r from-violet via-signal to-electric transition-[width] duration-300 motion-reduce:transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-9 grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
        <OptionButton
          label={leftOption.name}
          side="left"
          onChoose={() => onChoose(leftOption.id)}
        />
        <div className="display-type grid place-items-center text-lg text-slate-600 md:w-12" aria-hidden="true">
          O
        </div>
        <OptionButton
          label={rightOption.name}
          side="right"
          onChoose={() => onChoose(rightOption.id)}
        />
      </div>
    </main>
  )
}

interface OptionButtonProps {
  label: string
  side: 'left' | 'right'
  onChoose: () => void
}

function OptionButton({ label, side, onChoose }: OptionButtonProps) {
  const colors =
    side === 'left'
      ? 'hover:border-violet/70 hover:bg-violet/15 before:bg-violet'
      : 'hover:border-signal/70 hover:bg-signal/15 before:bg-signal'

  return (
    <button
      type="button"
      onClick={onChoose}
      className={`card-lift group relative min-h-56 overflow-hidden rounded-[2rem] border border-white/12 bg-panel p-6 text-left shadow-2xl shadow-black/20 before:absolute before:inset-x-0 before:bottom-0 before:h-2 sm:min-h-72 sm:p-9 ${colors}`}
    >
      <span className="relative z-10 flex h-full flex-col justify-between gap-12">
        <span className="text-xs font-black tracking-[0.2em] text-slate-500 uppercase">
          Seleccionar opción
        </span>
        <span className="display-type block text-4xl leading-[0.92] text-white sm:text-5xl lg:text-6xl">
          {label}
        </span>
        <span className="text-sm font-black text-slate-400 transition-colors group-hover:text-white">
          Hacer avanzar esta opción
        </span>
      </span>
    </button>
  )
}

function roundName(roundNumber: number, totalRounds: number): string {
  if (roundNumber === totalRounds) return 'Final'
  if (roundNumber === totalRounds - 1) return 'Semifinal'
  return `Ronda ${roundNumber}`
}
