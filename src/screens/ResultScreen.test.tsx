// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TournamentSnapshot } from '../domain/tournament'
import {
  downloadPreparedResultCard,
  prepareResultCard,
  type PreparedResultCard,
} from '../share/resultImage'
import {
  ensurePublicResult,
  isUnsupportedPublicationGlyphsError,
  type PublicResult,
  type PublicResultInput,
} from '../share/publicResult'
import type { DecisionBracket } from '../state/appState'
import { ResultScreen } from './ResultScreen'

vi.mock('../share/resultImage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../share/resultImage')>()
  return {
    ...actual,
    downloadPreparedResultCard: vi.fn(),
    prepareResultCard: vi.fn(),
  }
})

vi.mock('../share/publicResult', () => ({
  ensurePublicResult: vi.fn(),
  isUnsupportedPublicationGlyphsError: vi.fn(),
  publicResultFingerprint: (input: PublicResultInput) =>
    JSON.stringify([input.title, input.winner, input.optionCount, input.decisionCount]),
}))

const preparedResult: PreparedResultCard = {
  blob: new Blob(['png'], { type: 'image/png' }),
  fileName: 'weekend-result.png',
}

const bracket: DecisionBracket = {
  id: 'weekend',
  title: 'Plan de fin de semana',
  options: [
    { id: 'pizza', name: 'Pizza' },
    { id: 'sushi', name: 'Sushi' },
  ],
  createdAt: 1,
  updatedAt: 2,
  run: null,
}

const snapshot: TournamentSnapshot = {
  bracketSize: 2,
  rounds: [
    {
      roundNumber: 1,
      matches: [
        {
          id: 'final',
          roundNumber: 1,
          matchNumber: 1,
          entrantIds: ['pizza', 'sushi'],
          winnerId: 'pizza',
          status: 'complete',
          automatic: false,
        },
      ],
    },
  ],
  currentMatch: null,
  winnerId: 'pizza',
  decisionsMade: 1,
  totalDecisions: 1,
  complete: true,
}

const resultData = {
  bracketTitle: bracket.title,
  winnerName: 'Pizza',
  optionCount: 2,
  decisionCount: 1,
}

const prepareResultCardMock = vi.mocked(prepareResultCard)
const downloadPreparedResultCardMock = vi.mocked(downloadPreparedResultCard)
const ensurePublicResultMock = vi.mocked(ensurePublicResult)
const isUnsupportedPublicationGlyphsErrorMock = vi.mocked(isUnsupportedPublicationGlyphsError)
const mintedResult: PublicResult = {
  url: 'https://duellum.example/r/public-result',
  expiresAt: '2030-01-01T00:00:00.000Z',
}
let nativeShare: ReturnType<typeof vi.fn>

beforeEach(() => {
  prepareResultCardMock.mockResolvedValue(preparedResult)
  downloadPreparedResultCardMock.mockReturnValue('downloaded')
  ensurePublicResultMock.mockResolvedValue(mintedResult)
  isUnsupportedPublicationGlyphsErrorMock.mockReturnValue(false)
  nativeShare = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'share', { configurable: true, value: nativeShare })
})

afterEach(() => {
  cleanup()
  vi.resetAllMocks()
  vi.restoreAllMocks()
})

describe('ResultScreen sharing controls', () => {
  it('keeps safe share controls available while image preparation is pending or fails', async () => {
    const preparation = deferred<PreparedResultCard>()
    prepareResultCardMock.mockReturnValue(preparation.promise)
    renderResult()

      const shareButton = screen.getByRole('button', {
        name: 'Preparar enlace',
    }) as HTMLButtonElement
    const downloadButton = screen.getByRole('button', {
      name: 'Descargar imagen',
    }) as HTMLButtonElement

    expect(shareButton.disabled).toBe(false)
    expect(downloadButton.disabled).toBe(true)
    expect(screen.getByRole('status').textContent).toContain('Preparando la imagen')

    preparation.reject(new Error('Image preparation failed.'))

    await waitFor(() => {
      expect(screen.getByRole('status').textContent).toContain('No se pudo preparar la imagen')
    })
    expect(shareButton.disabled).toBe(false)
    expect(downloadButton.disabled).toBe(true)
  })

  it('does not mint on render, image preparation, or local download', async () => {
    renderResult()
    const downloadButton = screen.getByRole('button', {
      name: 'Descargar imagen',
    }) as HTMLButtonElement
    await waitFor(() => {
      expect(downloadButton.disabled).toBe(false)
    })

    expect(ensurePublicResultMock).not.toHaveBeenCalled()
    fireEvent.click(downloadButton)
    expect(downloadPreparedResultCardMock).toHaveBeenCalledWith(preparedResult)
    expect(screen.getByRole('status').textContent).toBe('Imagen descargada.')
    expect(ensurePublicResultMock).not.toHaveBeenCalled()
  })

  it('prepares on the first native gesture, then shares synchronously on the second', async () => {
    const mint = deferred<PublicResult>()
    ensurePublicResultMock.mockReturnValue(mint.promise)
    renderResult()

    fireEvent.click(screen.getByRole('button', { name: 'Preparar enlace' }))
    expect(ensurePublicResultMock).toHaveBeenCalledWith({
      title: resultData.bracketTitle,
      winner: resultData.winnerName,
      optionCount: resultData.optionCount,
      decisionCount: resultData.decisionCount,
    })
    expect(nativeShare).not.toHaveBeenCalled()
    expect(screen.getByRole('status').textContent).toContain('Preparando enlace')

    mint.resolve(mintedResult)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Compartir resultado' })).toBeTruthy()
    })

    let handlingGesture = true
    nativeShare.mockImplementation(() => {
      expect(handlingGesture).toBe(true)
      return Promise.resolve()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Compartir resultado' }))
    handlingGesture = false

    expect(nativeShare).toHaveBeenCalledWith({
      title: 'Resultado de Plan de fin de semana: Pizza',
      text: 'Pizza ganó en «Plan de fin de semana» con Duellum.',
      url: mintedResult.url,
    })
  })

  it('keeps a ready URL after a cancelled native share so a new gesture retries without minting', async () => {
    nativeShare.mockRejectedValueOnce(new DOMException('Cancelled', 'AbortError')).mockResolvedValueOnce(undefined)
    renderResult()

    fireEvent.click(screen.getByRole('button', { name: 'Preparar enlace' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Compartir resultado' })).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Compartir resultado' }))
    await waitFor(() => {
      expect(screen.getByRole('status').textContent).toContain('Se canceló')
    })
    fireEvent.click(screen.getByRole('button', { name: 'Compartir resultado' }))

    expect(nativeShare).toHaveBeenCalledTimes(2)
    expect(ensurePublicResultMock).toHaveBeenCalledOnce()
  })

  it('ignores a stale mint success after the result fingerprint changes', async () => {
    const mint = deferred<PublicResult>()
    ensurePublicResultMock.mockReturnValueOnce(mint.promise)
    const view = renderResult()

    fireEvent.click(screen.getByRole('button', { name: 'Preparar enlace' }))
    view.rerender(resultView(changedBracket, changedSnapshot))
    mint.resolve(mintedResult)

    await Promise.resolve()
    expect(screen.getByRole('button', { name: 'Preparar enlace' })).toBeTruthy()
    expect(screen.getByRole('status').textContent).not.toContain('enlace listo')
  })

  it('ignores a stale mint failure and its feedback after the result fingerprint changes', async () => {
    const mint = deferred<PublicResult>()
    ensurePublicResultMock.mockReturnValueOnce(mint.promise)
    const view = renderResult()

    fireEvent.click(screen.getByRole('button', { name: 'Preparar enlace' }))
    view.rerender(resultView(changedBracket, changedSnapshot))
    mint.reject(new Error('Mint failed'))

    await Promise.resolve()
    expect(screen.getByRole('button', { name: 'Preparar enlace' })).toBeTruthy()
    expect(screen.getByRole('status').textContent).not.toContain('No se pudo preparar el enlace')
  })

  it('opens WhatsApp and Telegram only with the minted public URL, never native share', async () => {
    const whatsAppTarget = popup()
    const telegramTarget = popup()
    vi.spyOn(window, 'open').mockReturnValueOnce(whatsAppTarget).mockReturnValueOnce(telegramTarget)
    renderResult()

    fireEvent.click(screen.getByRole('button', { name: 'WhatsApp' }))
    await waitFor(() => {
      expect(whatsAppTarget.location.assign).toHaveBeenCalledWith(
        `https://wa.me/?text=${encodeURIComponent(`Pizza ganó en «Plan de fin de semana» con Duellum. ${mintedResult.url}`)}`,
      )
    })
    fireEvent.click(screen.getByRole('button', { name: 'Telegram' }))
    await waitFor(() => {
      expect(telegramTarget.location.assign).toHaveBeenCalledWith(
        `https://t.me/share/url?url=${encodeURIComponent(mintedResult.url)}&text=${encodeURIComponent('Pizza ganó en «Plan de fin de semana» con Duellum.')}`,
      )
    })

    expect(nativeShare).not.toHaveBeenCalled()
    expect(whatsAppTarget.location.assign).not.toHaveBeenCalledWith(expect.stringContaining(window.location.href))
  })

  it('closes a reserved direct-service popup when minting fails', async () => {
    const target = popup()
    ensurePublicResultMock.mockRejectedValueOnce(new Error('Mint failed'))
    vi.spyOn(window, 'open').mockReturnValue(target)
    renderResult()

    fireEvent.click(screen.getByRole('button', { name: 'WhatsApp' }))

    await waitFor(() => {
      expect(target.close).toHaveBeenCalledOnce()
      expect(screen.getByRole('status').textContent).toContain('No se pudo preparar el enlace')
    })
    expect(nativeShare).not.toHaveBeenCalled()
  })

  it('shows the bounded local-font publication error and closes a reserved direct-service popup', async () => {
    const target = popup()
    const rejection = new Error('Unsupported glyphs')
    ensurePublicResultMock.mockRejectedValueOnce(rejection)
    isUnsupportedPublicationGlyphsErrorMock.mockReturnValueOnce(true)
    vi.spyOn(window, 'open').mockReturnValue(target)
    renderResult()

    fireEvent.click(screen.getByRole('button', { name: 'WhatsApp' }))

    await waitFor(() => {
      expect(target.close).toHaveBeenCalledOnce()
      expect(screen.getByRole('status').textContent).toBe('Este resultado incluye caracteres que no se pueden publicar como imagen. Puedes seguir viéndolo y descargar la imagen local.')
    })
    expect(nativeShare).not.toHaveBeenCalled()
  })
})

function renderResult() {
  return render(resultView(bracket, snapshot))
}

function resultView(selectedBracket: DecisionBracket, selectedSnapshot: TournamentSnapshot) {
  return (
    <ResultScreen
      bracket={selectedBracket}
      snapshot={selectedSnapshot}
      onBack={vi.fn()}
      onReplay={vi.fn()}
      onUndo={vi.fn()}
    />
  )
}

const changedBracket: DecisionBracket = {
  ...bracket,
  title: 'Cena del viernes',
  updatedAt: 3,
}

const changedSnapshot: TournamentSnapshot = {
  ...snapshot,
  winnerId: 'sushi',
}

function popup() {
  return {
    close: vi.fn(),
    location: { assign: vi.fn() },
  } as unknown as Window
}

function deferred<T>(): {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason?: unknown) => void
} {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}
