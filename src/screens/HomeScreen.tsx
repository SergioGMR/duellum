import { BracketCard } from '../components/BracketCard'
import type { DecisionBracket } from '../state/appState'

interface HomeScreenProps {
  brackets: readonly DecisionBracket[]
  onCreate: () => void
  onDelete: (bracketId: string) => void
  onEdit: (bracketId: string) => void
  onOpen: (bracketId: string) => void
}

export function HomeScreen({
  brackets,
  onCreate,
  onDelete,
  onEdit,
  onOpen,
}: HomeScreenProps) {
  const sortedBrackets = [...brackets].sort((left, right) => right.updatedAt - left.updatedAt)

  return (
    <main className="view-enter mx-auto w-full max-w-7xl px-5 pt-10 pb-16 sm:px-8 sm:pt-16">
      <section className="relative max-w-5xl">
        <p className="mb-5 flex items-center gap-3 text-xs font-black tracking-[0.22em] text-electric uppercase">
          <span className="h-px w-9 bg-electric" />
          Toma una decisión clara cada vez
        </p>
        <h1 className="display-type max-w-4xl text-6xl leading-[0.87] text-white sm:text-8xl lg:text-[7.4rem]">
          Decide. Avanza. <span className="text-signal">Elige.</span>
        </h1>
        <div className="mt-8 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onCreate}
            className="min-h-14 rounded-2xl bg-electric px-7 text-base font-black text-ink shadow-xl shadow-electric/10 transition-transform hover:-rotate-1 hover:scale-[1.02] motion-reduce:transition-none"
          >
            Crear un cuadro
          </button>
          <p className="max-w-md text-sm leading-6 text-slate-400 sm:text-base">
            Compara de 2 a 16 opciones. Duellum gestiona los pases automáticos, el progreso y el
            resultado final.
          </p>
        </div>
      </section>

      <section className="mt-20" aria-labelledby="library-title">
        <div className="flex items-end justify-between gap-5">
          <div>
            <p className="text-xs font-black tracking-[0.2em] text-violet-300 uppercase">
              En este dispositivo
            </p>
            <h2 id="library-title" className="display-type mt-2 text-4xl text-white sm:text-5xl">
              Tus cuadros
            </h2>
          </div>
          {brackets.length > 0 && (
            <span className="rounded-full border border-white/10 px-3 py-1 text-sm text-slate-500">
              {brackets.length} {brackets.length === 1 ? 'cuadro' : 'cuadros'}
            </span>
          )}
        </div>

        {sortedBrackets.length === 0 ? (
          <div className="noise-card mt-7 rounded-[2rem] border border-dashed border-white/15 bg-white/[0.025] px-6 py-16 text-center sm:py-20">
            <span className="display-type mx-auto grid size-16 -rotate-3 place-items-center rounded-2xl bg-violet text-3xl text-white">
              01
            </span>
            <h3 className="display-type mt-6 text-3xl text-white">Aún no hay cuadros</h3>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-400">
              Empieza con cualquier decisión: un viaje, una herramienta, la cena de hoy o tu
              próxima gran idea.
            </p>
          </div>
        ) : (
          <div className="mt-7 grid gap-4 lg:grid-cols-2">
            {sortedBrackets.map((bracket) => (
              <BracketCard
                key={bracket.id}
                bracket={bracket}
                onDelete={onDelete}
                onEdit={onEdit}
                onOpen={onOpen}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
