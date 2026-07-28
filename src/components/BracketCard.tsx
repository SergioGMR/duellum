import { useState } from 'react'
import { getTournamentSnapshot, type DecisionBracket } from '../state/appState'

interface BracketCardProps {
  bracket: DecisionBracket
  onDelete: (bracketId: string) => void
  onEdit: (bracketId: string) => void
  onOpen: (bracketId: string) => void
}

export function BracketCard({ bracket, onDelete, onEdit, onOpen }: BracketCardProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  let primaryLabel = 'Empezar cuadro'
  let status = 'Listo para empezar'
  let statusClass = 'bg-violet/15 text-violet-200'

  try {
    const snapshot = getTournamentSnapshot(bracket)
    if (snapshot?.complete) {
      const winner = bracket.options.find((option) => option.id === snapshot.winnerId)
      primaryLabel = 'Ver resultado'
      status = winner === undefined ? 'Completado' : `Opción ganadora: ${winner.name}`
      statusClass = 'bg-electric/15 text-electric'
    } else if (snapshot !== null) {
      primaryLabel = 'Continuar'
      status = `${snapshot.decisionsMade} de ${snapshot.totalDecisions} elecciones realizadas`
      statusClass = 'bg-signal/15 text-red-200'
    }
  } catch {
    status = 'Hay que reiniciar el progreso'
  }

  return (
    <article className="card-lift flex min-h-72 flex-col rounded-[1.75rem] border border-white/10 bg-panel/85 p-5 shadow-2xl shadow-black/15 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass}`}>
          {status}
        </span>
        <span className="text-xs font-bold tracking-wider text-slate-600 uppercase">
          {bracket.options.length} opciones
        </span>
      </div>
      <div className="flex flex-1 flex-col justify-center py-7">
        <h3 className="display-type text-3xl leading-[0.95] text-white sm:text-4xl">
          {bracket.title}
        </h3>
        <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-400">
          {bracket.options.map((option) => option.name).join(' / ')}
        </p>
      </div>
      {confirmingDelete ? (
        <div className="rounded-2xl border border-signal/30 bg-signal/10 p-3" role="alert">
           <p className="text-sm font-semibold text-red-100">
             ¿Eliminar este cuadro y todo su progreso?
           </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="min-h-11 flex-1 rounded-xl bg-signal px-3 text-sm font-black text-white hover:bg-red-400"
              onClick={() => onDelete(bracket.id)}
            >
              Eliminar
            </button>
            <button
              type="button"
              className="min-h-11 flex-1 rounded-xl border border-white/15 px-3 text-sm font-bold text-white hover:bg-white/10"
              onClick={() => setConfirmingDelete(false)}
            >
              Conservar
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-[1fr_auto_auto] gap-2">
          <button
            type="button"
            className="min-h-12 rounded-xl bg-white px-4 text-sm font-black text-ink hover:bg-electric"
            onClick={() => onOpen(bracket.id)}
          >
            {primaryLabel}
          </button>
          <button
            type="button"
            className="min-h-12 rounded-xl border border-white/15 px-4 text-sm font-bold text-slate-200 hover:bg-white/10"
            onClick={() => onEdit(bracket.id)}
            aria-label={`Editar ${bracket.title}`}
          >
            Editar
          </button>
          <button
            type="button"
            className="min-h-12 rounded-xl border border-white/15 px-4 text-sm font-bold text-slate-400 hover:border-signal/50 hover:text-red-200"
            onClick={() => setConfirmingDelete(true)}
            aria-label={`Eliminar ${bracket.title}`}
          >
            Eliminar
          </button>
        </div>
      )}
    </article>
  )
}
