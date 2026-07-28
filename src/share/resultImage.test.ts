import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  downloadPreparedResultCard,
  sharePreparedResultCard,
  type PreparedResultCard,
  type ResultCardData,
} from './resultImage'

const data: ResultCardData = {
  bracketTitle: 'Plan de fin de semana',
  winnerName: 'Visitar el museo',
  optionCount: 4,
  decisionCount: 3,
}

const prepared: PreparedResultCard = {
  blob: new Blob(['png'], { type: 'image/png' }),
  fileName: 'plan-de-fin-de-semana-resultado.png',
}

describe('result sharing', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shares the generated PNG when file sharing is supported', async () => {
    const share = vi.fn<(shareData: ShareData) => Promise<void>>().mockResolvedValue(undefined)
    const canShare = vi.fn<(shareData: ShareData) => boolean>().mockReturnValue(true)
    installNavigator(share, canShare)

    const result = await sharePreparedResultCard(data, prepared, 'https://duellum.example/')

    expect(result).toBe('shared-image')
    expect(canShare).toHaveBeenCalledOnce()
    const payload = share.mock.calls[0]?.[0]
    expect(payload).toMatchObject({
      title: 'Resultado de Plan de fin de semana: Visitar el museo',
      text: 'Visitar el museo ganó en «Plan de fin de semana» con Duellum.',
    })
    expect(payload?.files).toHaveLength(1)
    expect(payload?.files?.[0]?.name).toBe('plan-de-fin-de-semana-resultado.png')
    expect(payload?.url).toBeUndefined()
  })

  it('shares only Spanish text and the app URL when files are unsupported', async () => {
    const share = vi.fn<(shareData: ShareData) => Promise<void>>().mockResolvedValue(undefined)
    const canShare = vi.fn<(shareData: ShareData) => boolean>().mockReturnValue(false)
    installNavigator(share, canShare)

    const result = await sharePreparedResultCard(data, prepared, 'https://duellum.example/')

    expect(result).toBe('shared-link')
    expect(share).toHaveBeenCalledWith({
      title: 'Resultado de Plan de fin de semana: Visitar el museo',
      text: 'Visitar el museo ganó en «Plan de fin de semana» con Duellum.',
      url: 'https://duellum.example/',
    })
  })

  it('treats AbortError as cancellation', async () => {
    const share = vi
      .fn<(shareData: ShareData) => Promise<void>>()
      .mockRejectedValue(new DOMException('Cancelled', 'AbortError'))
    installNavigator(share, vi.fn<(shareData: ShareData) => boolean>().mockReturnValue(true))

    const result = await sharePreparedResultCard(data, prepared, 'https://duellum.example/')

    expect(result).toBe('cancelled')
  })

  it('returns a failure without starting a download when native sharing fails', async () => {
    const share = vi
      .fn<(shareData: ShareData) => Promise<void>>()
      .mockRejectedValue(new Error('Share failed'))
    installNavigator(share, vi.fn<(shareData: ShareData) => boolean>().mockReturnValue(true))

    const result = await sharePreparedResultCard(data, prepared, 'https://duellum.example/')

    expect(result).toBe('failed')
  })

  it('does not invoke native sharing outside a secure context', async () => {
    const share = vi.fn<(shareData: ShareData) => Promise<void>>().mockResolvedValue(undefined)
    installNavigator(share, vi.fn<(shareData: ShareData) => boolean>().mockReturnValue(true), false)

    const result = await sharePreparedResultCard(data, prepared, 'https://duellum.example/')

    expect(result).toBe('unavailable')
    expect(share).not.toHaveBeenCalled()
  })

  it('downloads the prepared PNG and revokes its object URL', () => {
    const objectUrl = 'blob:duellum-result'
    const createObjectURL = vi.fn<(blob: Blob) => string>().mockReturnValue(objectUrl)
    const revokeObjectURL = vi.fn<(url: string) => void>()
    const click = vi.fn()
    const remove = vi.fn()
    const anchor = { href: '', download: '', style: { display: '' }, click, remove }
    const append = vi.fn()
    const createElement = vi.fn().mockReturnValue(anchor)
    const setTimeout = vi.fn((_callback: () => void, delay: number) => delay)
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    vi.stubGlobal('document', { createElement, body: { append } })
    vi.stubGlobal('window', { setTimeout })

    const result = downloadPreparedResultCard(prepared)

    expect(result).toBe('downloaded')
    expect(createObjectURL).toHaveBeenCalledWith(prepared.blob)
    expect(createElement).toHaveBeenCalledWith('a')
    expect(anchor.href).toBe(objectUrl)
    expect(anchor.download).toBe('plan-de-fin-de-semana-resultado.png')
    expect(anchor.style.display).toBe('none')
    expect(append).toHaveBeenCalledWith(anchor)
    expect(click).toHaveBeenCalledOnce()
    expect(remove).toHaveBeenCalledOnce()
    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 1_000)
    expect(revokeObjectURL).not.toHaveBeenCalled()

    const cleanup = setTimeout.mock.calls[0]?.[0]
    if (cleanup === undefined) {
      throw new Error('Expected object URL cleanup to be scheduled')
    }
    cleanup()
    expect(revokeObjectURL).toHaveBeenCalledWith(objectUrl)
  })
})

function installNavigator(
  share: (shareData: ShareData) => Promise<void>,
  canShare: (shareData: ShareData) => boolean,
  isSecureContext = true,
): void {
  vi.stubGlobal('navigator', { share, canShare })
  vi.stubGlobal('window', { isSecureContext })
}
