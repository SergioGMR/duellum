import type { DecisionOption, TournamentSnapshot } from '../domain/tournament'

interface BracketHistoryProps {
  options: readonly DecisionOption[]
  snapshot: TournamentSnapshot
}

export function BracketHistory({ options, snapshot }: BracketHistoryProps) {
  const optionById = new Map(options.map((option) => [option.id, option]))

  return (
    <section className="mt-16" aria-labelledby="history-title">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black tracking-[0.2em] text-violet-300 uppercase">
            Cada decisión
          </p>
          <h2 id="history-title" className="display-type mt-2 text-4xl text-white sm:text-5xl">
            Historial del cuadro
          </h2>
        </div>
        <p className="hidden text-sm text-slate-500 sm:block">
          Desplázate horizontalmente para ver todas las rondas.
        </p>
      </div>

      <div
        className="mt-7 overflow-x-auto pb-5"
        tabIndex={0}
        aria-label="Rondas completadas del cuadro"
      >
        <div className="grid min-w-max auto-cols-[minmax(16rem,20rem)] grid-flow-col gap-4">
          {snapshot.rounds.map((round) => (
            <section
              key={round.roundNumber}
              className="rounded-3xl border border-white/10 bg-white/[0.035] p-4"
              aria-labelledby={`round-${round.roundNumber}-title`}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3
                  id={`round-${round.roundNumber}-title`}
                  className="font-black text-white"
                >
                  {roundName(round.roundNumber, snapshot.rounds.length)}
                </h3>
                <span className="text-xs font-bold text-slate-600">
                  {round.matches.length}{' '}
                  {round.matches.length === 1 ? 'enfrentamiento' : 'enfrentamientos'}
                </span>
              </div>
              <div className="flex h-[calc(100%-2.5rem)] flex-col justify-around gap-3">
                {round.matches.map((match) => {
                  const entrants = match.entrantIds
                    .filter((id): id is string => id !== null)
                    .map((id) => optionById.get(id))
                    .filter((option): option is DecisionOption => option !== undefined)

                  return (
                    <article
                      key={match.id}
                      className="rounded-2xl border border-white/10 bg-ink/65 p-3"
                    >
                      {entrants.map((entrant) => {
                        const won = entrant.id === match.winnerId
                        return (
                          <div
                            key={entrant.id}
                            className={`flex min-h-11 items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm ${
                              won ? 'bg-electric text-ink' : 'text-slate-400'
                            }`}
                          >
                            <span className="font-bold">{entrant.name}</span>
                             {won && (
                               <span className="text-[0.65rem] font-black uppercase">Avanzó</span>
                             )}
                          </div>
                        )
                      })}
                      {match.automatic && (
                        <p className="mt-2 px-3 text-[0.7rem] font-bold tracking-wider text-slate-600 uppercase">
                          Pase automático
                        </p>
                      )}
                    </article>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </section>
  )
}

function roundName(roundNumber: number, totalRounds: number): string {
  if (roundNumber === totalRounds) {
    return 'Final'
  }
  if (roundNumber === totalRounds - 1) {
    return 'Semifinal'
  }
  return `Ronda ${roundNumber}`
}
