import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { BracketHistory } from '../components/BracketHistory'
import type { TournamentSnapshot } from '../domain/tournament'
import {
  buildResultShareText,
  buildTelegramShareUrl,
  buildWhatsAppShareUrl,
  downloadPreparedResultCard,
  prepareResultCard,
  type PreparedResultCard,
} from '../share/resultImage'
import {
  ensurePublicResult,
  isUnsupportedPublicationGlyphsError,
  publicResultFingerprint,
  type PublicResult,
} from '../share/publicResult'
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

type PublicSharingState =
  | { key: string; status: 'idle' | 'preparing' | 'failed' }
  | { key: string; status: 'ready'; result: PublicResult }

export function ResultScreen({
  bracket,
  snapshot,
  onBack,
  onReplay,
  onUndo,
}: ResultScreenProps) {
  const [preparation, setPreparation] = useState<PreparationState | null>(null)
  const [feedback, setFeedback] = useState<{ key: string; message: string } | null>(null)
  const [publicSharing, setPublicSharing] = useState<PublicSharingState | null>(null)
  const winner = bracket.options.find((option) => option.id === snapshot.winnerId)
  const winnerId = winner?.id ?? null
  const winnerName = winner?.name ?? ''
  const imageKey = JSON.stringify([
    bracket.id,
    bracket.updatedAt,
    bracket.title,
    winnerId,
    bracket.options.length,
    snapshot.totalDecisions,
  ])
  const resultData = {
    bracketTitle: bracket.title,
    winnerName,
    optionCount: bracket.options.length,
    decisionCount: snapshot.totalDecisions,
  }
  const publicInput = {
    title: resultData.bracketTitle,
    winner: resultData.winnerName,
    optionCount: resultData.optionCount,
    decisionCount: resultData.decisionCount,
  }
  const resultKey = publicResultFingerprint(publicInput)
  const currentResultKey = useRef(resultKey)
  useLayoutEffect(() => {
    currentResultKey.current = resultKey
  }, [resultKey])
  const currentPreparation = preparation?.key === imageKey ? preparation : null
  const preparedResult =
    currentPreparation?.status === 'ready' ? currentPreparation.card : null
  const currentPublicSharing = publicSharing?.key === resultKey ? publicSharing : undefined

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
          setPreparation({ key: imageKey, status: 'ready', card })
        }
      })
      .catch(() => {
        if (active) {
          setPreparation({ key: imageKey, status: 'failed' })
          setFeedback((current) => (current?.key === resultKey ? null : current))
        }
      })

    return () => {
      active = false
    }
  }, [
    bracket.options.length,
    bracket.title,
    imageKey,
    resultKey,
    snapshot.totalDecisions,
    winnerId,
    winnerName,
  ])

  if (winner === undefined) {
    return null
  }

  function preparePublicResult({
    onReady,
    onFailure,
    onStale,
  }: {
    onReady?: (result: PublicResult) => void
    onFailure?: () => void
    onStale?: () => void
  } = {}): void {
    const capturedKey = resultKey
    setPublicSharing({ key: capturedKey, status: 'preparing' })
    setFeedback(null)
    void ensurePublicResult(publicInput).then(
      (result) => {
        if (currentResultKey.current !== capturedKey) {
          onStale?.()
          return
        }
        setPublicSharing({ key: capturedKey, status: 'ready', result })
        if (onReady === undefined) {
          setFeedback({ key: capturedKey, message: 'El enlace está listo para compartir.' })
        } else {
          onReady(result)
        }
      },
      (error: unknown) => {
        if (currentResultKey.current !== capturedKey) {
          onStale?.()
          return
        }
        setPublicSharing({ key: capturedKey, status: 'failed' })
        setFeedback({ key: capturedKey, message: isUnsupportedPublicationGlyphsError(error) ? 'Este resultado incluye caracteres que no se pueden publicar como imagen. Puedes seguir viéndolo y descargar la imagen local.' : 'No se pudo preparar el enlace. Inténtalo de nuevo.' })
        onFailure?.()
      },
    )
  }

  function shareResult(): void {
    if (currentPublicSharing?.status !== 'ready') {
      if (currentPublicSharing?.status !== 'preparing') preparePublicResult()
      return
    }

    const capturedKey = resultKey
    if (typeof navigator.share !== 'function') {
      setFeedback({
        key: capturedKey,
        message: 'El menú para compartir no está disponible en este navegador o contexto.',
      })
      return
    }

    try {
      const share = navigator.share({
        title: `Resultado de ${resultData.bracketTitle}: ${resultData.winnerName}`,
        text: buildResultShareText(resultData),
        url: currentPublicSharing.result.url,
      })
      void share.then(
        () => {
          if (currentResultKey.current === capturedKey) {
            setFeedback({ key: capturedKey, message: 'Resultado compartido.' })
          }
        },
        () => {
          if (currentResultKey.current === capturedKey) {
            setFeedback({ key: capturedKey, message: 'Se canceló el proceso de compartir. Puedes intentarlo de nuevo.' })
          }
        },
      )
    } catch {
      setFeedback({ key: capturedKey, message: 'No se pudo compartir el resultado. Puedes intentarlo de nuevo.' })
    }
  }

  function shareDirect(serviceUrl: (url: string) => string): void {
    const target = window.open('', '_blank')
    if (target === null) {
      setFeedback({ key: resultKey, message: 'No se pudo abrir el servicio para compartir. Inténtalo de nuevo.' })
      return
    }

    preparePublicResult({
      onReady: (result) => {
        try {
          target.location.assign(serviceUrl(result.url))
        } catch {
          target.close()
          setFeedback({ key: resultKey, message: 'No se pudo abrir el servicio para compartir. Inténtalo de nuevo.' })
        }
      },
      onFailure: () => target.close(),
      onStale: () => target.close(),
    })
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
      ? 'Preparando la imagen para descargarla. Puedes compartir el texto y el enlace mientras tanto.'
      : currentPreparation.status === 'failed'
        ? 'No se pudo preparar la imagen. Aún puedes compartir el texto y el enlace; actualiza la página para intentar prepararla de nuevo.'
        : null
  const publicPreparationStatus =
    currentPublicSharing?.status === 'preparing' ? 'Preparando enlace…' : null
  const statusMessage =
    feedback?.key === resultKey ? feedback.message : publicPreparationStatus ?? preparationStatus
  const nativeLabel =
    currentPublicSharing?.status === 'ready' ? 'Compartir resultado' : 'Preparar enlace'
  const publicSharingInProgress = currentPublicSharing?.status === 'preparing'

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
          onClick={shareResult}
          disabled={publicSharingInProgress}
          aria-busy={publicSharingInProgress}
          className="min-h-13 rounded-2xl bg-white px-6 font-black text-ink hover:bg-electric disabled:cursor-wait disabled:opacity-60"
        >
          {nativeLabel}
        </button>
        <button
          type="button"
          onClick={() => shareDirect((url) => buildWhatsAppShareUrl(resultData, url))}
          className="grid min-h-13 place-items-center rounded-2xl border border-white/15 px-6 font-black text-white hover:bg-white/10"
        >
          WhatsApp
        </button>
        <button
          type="button"
          onClick={() => shareDirect((url) => buildTelegramShareUrl(resultData, url))}
          className="grid min-h-13 place-items-center rounded-2xl border border-white/15 px-6 font-black text-white hover:bg-white/10"
        >
          Telegram
        </button>
        <button
          type="button"
          onClick={downloadResult}
          disabled={preparedResult === null}
          className="min-h-13 rounded-2xl border border-white/15 px-6 font-black text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
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
        Comparte el resultado como texto y enlace mediante el menú del navegador, WhatsApp o
        Telegram. La imagen no se adjunta: descárgala por separado.
      </p>
      <p className="mt-3 min-h-6 text-sm text-slate-400" role="status" aria-live="polite">
        {statusMessage}
      </p>

      <BracketHistory options={bracket.options} snapshot={snapshot} />
    </main>
  )
}
