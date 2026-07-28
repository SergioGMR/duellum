import { useEffect, useState } from 'react'
import { BracketHistory } from '../components/BracketHistory'
import type { TournamentSnapshot } from '../domain/tournament'
import {
  downloadPreparedResultCard,
  prepareResultCard,
  sharePreparedResultCard,
  type PreparedResultCard,
  type ShareResult,
} from '../share/resultImage'
import type { DecisionBracket } from '../state/appState'

interface ResultScreenProps {
  bracket: DecisionBracket
  snapshot: TournamentSnapshot
  onBack: () => void
  onReplay: () => void
  onUndo: () => void
}

type PreparationState =
  | { key: string; status: 'ready'; card: PreparedResultCard }
  | { key: string; status: 'failed' }

export function ResultScreen({
  bracket,
  snapshot,
  onBack,
  onReplay,
  onUndo,
}: ResultScreenProps) {
  const [preparation, setPreparation] = useState<PreparationState | null>(null)
  const [feedback, setFeedback] = useState<{ key: string; message: string } | null>(null)
  const [sharingKey, setSharingKey] = useState<string | null>(null)
  const winner = bracket.options.find((option) => option.id === snapshot.winnerId)
  const winnerId = winner?.id ?? null
  const winnerName = winner?.name ?? ''
  const resultKey = JSON.stringify([
    bracket.id,
    bracket.updatedAt,
    bracket.title,
    winnerId,
    bracket.options.length,
    snapshot.totalDecisions,
  ])
  const currentPreparation = preparation?.key === resultKey ? preparation : null
  const preparedResult =
    currentPreparation?.status === 'ready' ? currentPreparation.card : null
  const sharing = sharingKey === resultKey

  useEffect(() => {
    if (winnerId === null) {
      return
    }

    let active = true
    void prepareResultCard({
      bracketTitle: bracket.title,
      winnerName,
      optionCount: bracket.options.length,
      decisionCount: snapshot.totalDecisions,
    })
      .then((card) => {
        if (active) {
          setPreparation({ key: resultKey, status: 'ready', card })
        }
      })
      .catch(() => {
        if (active) {
          setPreparation({ key: resultKey, status: 'failed' })
        }
      })

    return () => {
      active = false
    }
  }, [
    bracket.options.length,
    bracket.title,
    resultKey,
    snapshot.totalDecisions,
    winnerId,
    winnerName,
  ])

  if (winner === undefined) {
    return null
  }

  async function shareResult() {
    if (preparedResult === null) {
      return
    }

    setSharingKey(resultKey)
    setFeedback(null)
    try {
      const result = await sharePreparedResultCard(
        {
          bracketTitle: bracket.title,
          winnerName,
          optionCount: bracket.options.length,
          decisionCount: snapshot.totalDecisions,
        },
        preparedResult,
        window.location.href,
      )
      setFeedback({ key: resultKey, message: shareMessage(result) })
    } catch {
      setFeedback({
        key: resultKey,
        message: 'No se pudo compartir el resultado. Descarga la imagen e inténtalo de nuevo.',
      })
    } finally {
      setSharingKey((current) => (current === resultKey ? null : current))
    }
  }

  function downloadResult() {
    if (preparedResult === null) {
      return
    }

    const result = downloadPreparedResultCard(preparedResult)
    setFeedback({
      key: resultKey,
      message:
        result === 'downloaded'
          ? 'Imagen descargada.'
          : 'No se pudo descargar la imagen. Inténtalo de nuevo.',
    })
  }

  const preparationStatus =
    currentPreparation === null
      ? 'Preparando la imagen del resultado...'
      : currentPreparation.status === 'failed'
        ? 'No se pudo preparar la imagen del resultado. Actualiza la página para volver a intentarlo.'
        : null
  const statusMessage = feedback?.key === resultKey ? feedback.message : preparationStatus

  return (
    <main className="view-enter mx-auto w-full max-w-7xl px-5 pt-8 pb-20 sm:px-8 sm:pt-12">
      <button
        type="button"
        onClick={onBack}
        className="min-h-11 rounded-xl px-1 text-sm font-bold text-slate-400 hover:text-white"
      >
        Volver a la biblioteca
      </button>

      <section className="noise-card mt-7 rounded-[2.25rem] border border-electric/25 bg-electric p-6 text-ink shadow-2xl shadow-electric/10 sm:p-10 lg:p-14">
        <div className="relative z-10 grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-xs font-black tracking-[0.24em] uppercase">
              Resultado de Duellum
            </p>
            <p className="mt-4 max-w-xl text-sm font-bold text-ink/65 sm:text-base">
              {bracket.title}
            </p>
            <h1 className="display-type mt-4 max-w-4xl text-6xl leading-[0.85] sm:text-8xl lg:text-[7rem]">
              {winner.name}
            </h1>
            <p className="mt-7 max-w-lg text-sm font-semibold leading-6 text-ink/65">
              Resultado tras {snapshot.totalDecisions}{' '}
              {snapshot.totalDecisions === 1 ? 'decisión' : 'decisiones'} cara a cara.
            </p>
          </div>
          <span className="display-type grid size-28 -rotate-6 place-items-center rounded-[2rem] border-4 border-ink bg-signal text-5xl text-white shadow-[10px_10px_0_#090b12] sm:size-36">
            01
          </span>
        </div>
      </section>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={() => void shareResult()}
          disabled={preparedResult === null || sharing}
          aria-busy={sharing}
          className="min-h-13 rounded-2xl bg-white px-6 font-black text-ink hover:bg-electric disabled:cursor-wait disabled:opacity-60"
        >
          Compartir resultado
        </button>
        <button
          type="button"
          onClick={downloadResult}
          disabled={preparedResult === null || sharing}
          className="min-h-13 rounded-2xl border border-white/15 px-6 font-black text-white hover:bg-white/10 disabled:cursor-wait disabled:opacity-60"
        >
          Descargar imagen
        </button>
        <button
          type="button"
          onClick={onReplay}
          className="min-h-13 rounded-2xl border border-white/15 px-6 font-black text-white hover:bg-white/10"
        >
          Repetir con una mezcla nueva
        </button>
        <button
          type="button"
          onClick={onUndo}
          className="min-h-13 rounded-2xl px-5 font-bold text-slate-400 hover:text-white"
        >
          Deshacer la decisión final
        </button>
      </div>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400">
        En móviles compatibles se abrirán tus aplicaciones instaladas. También puedes descargar la
        imagen en cualquier dispositivo.
      </p>
      <p className="mt-3 min-h-6 text-sm text-slate-400" role="status" aria-live="polite">
        {statusMessage}
      </p>

      <BracketHistory options={bracket.options} snapshot={snapshot} />
    </main>
  )
}

function shareMessage(result: ShareResult): string {
  switch (result) {
    case 'shared-image':
      return 'Resultado compartido con la imagen adjunta.'
    case 'shared-link':
      return 'Se compartieron el mensaje y el enlace. La imagen no se adjuntó; puedes descargarla por separado.'
    case 'cancelled':
      return 'Se canceló el proceso de compartir.'
    case 'unavailable':
      return 'Compartir no está disponible en este navegador o contexto. Descarga la imagen para publicarla manualmente.'
    case 'failed':
      return 'No se pudo compartir el resultado. Descarga la imagen e inténtalo de nuevo.'
  }
}
