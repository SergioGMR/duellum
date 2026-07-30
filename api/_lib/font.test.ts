import packageJson from '../../package.json'
import { ImageResponse } from '@vercel/og'
import blackFontDataUrl from '../_assets/fonts/Inter-Black.ttf?inline'
import regularFontDataUrl from '../_assets/fonts/Inter-Regular.ttf?inline'
import { afterEach, describe, expect, it, vi } from 'vitest'

const regularUrl = new URL('../_assets/fonts/Inter-Regular.ttf', import.meta.url).href
const blackUrl = new URL('../_assets/fonts/Inter-Black.ttf', import.meta.url).href

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('bundled OG fonts', () => {
  it('derives cached exact glyph coverage from the local assets for supported text and rejects an unsupported grapheme code point', async () => {
    const [regular, black] = await Promise.all([globalThis.fetch(regularFontDataUrl).then((response) => response.arrayBuffer()), globalThis.fetch(blackFontDataUrl).then((response) => response.arrayBuffer())])
    const assets = new Map([[regularUrl, regular], [blackUrl, black]])
    const fetch = vi.fn(async (url: URL) => new Response(assets.get(url.href)))
    vi.stubGlobal('fetch', fetch)

    const { hasOgGlyphCoverage, parseTrueTypeCmap } = await import('./font')
    const regularCoverage = parseTrueTypeCmap(regular)
    const blackCoverage = parseTrueTypeCmap(black)

    expect([regularCoverage.hasGlyph('é'.codePointAt(0)!), blackCoverage.hasGlyph('Á'.codePointAt(0)!), regularCoverage.hasGlyph('م'.codePointAt(0)!), blackCoverage.hasGlyph('م'.codePointAt(0)!)]).toEqual([true, true, false, false])
    await expect(hasOgGlyphCoverage('Café', 'Árbol')).resolves.toBe(true)
    await expect(hasOgGlyphCoverage('A\u20e3', 'Árbol')).resolves.toBe(false)
    await expect(hasOgGlyphCoverage('Café', 'مرحبا')).resolves.toBe(false)
    expect(fetch.mock.calls.map(([url]) => String(url))).toEqual([regularUrl, blackUrl])
  })

  it('fails closed when bundled font data has no readable TrueType cmap', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new Uint8Array([0, 1, 2]).buffer })
    vi.stubGlobal('fetch', fetch)

    const { hasOgGlyphCoverage, parseTrueTypeCmap } = await import('./font')

    expect(() => parseTrueTypeCmap(new ArrayBuffer(0))).toThrow('Unable to parse bundled OG font')
    await expect(hasOgGlyphCoverage('Café', 'Árbol')).rejects.toThrow('Unable to parse bundled OG font')
  })

  it('loads the exact bundled Inter assets once and reuses their ArrayBuffers in compatible descriptors', async () => {
    const regular = new Uint8Array([1, 2, 3]).buffer
    const black = new Uint8Array([4, 5, 6]).buffer
    const fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => regular })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => black })
    vi.stubGlobal('fetch', fetch)

    const { loadOgFonts } = await import('./font')
    const [first, second] = await Promise.all([loadOgFonts(), loadOgFonts()])

    expect((packageJson.dependencies as Record<string, string>)['@vercel/og']).toBe('0.11.1')
    expect(typeof ImageResponse).toBe('function')
    expect(first).toEqual([
      { name: 'Inter', data: regular, weight: 400, style: 'normal' },
      { name: 'Inter', data: black, weight: 900, style: 'normal' },
    ])
    expect(second).toBe(first)
    expect(first[0]?.data).toBe(regular)
    expect(first[1]?.data).toBe(black)
    expect(fetch.mock.calls.map(([url]) => String(url))).toEqual([regularUrl, blackUrl])
  })

  it('fails explicitly for unavailable bundled assets without filesystem, remote, or default-font fallback', async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: false, arrayBuffer: async () => new ArrayBuffer(0) })
    vi.stubGlobal('fetch', fetch)

    const { loadOgFonts } = await import('./font')

    await expect(loadOgFonts()).rejects.toThrow('Unable to load bundled OG font')
    expect(fetch.mock.calls.map(([url]) => String(url))).toEqual([regularUrl, blackUrl])
  })

  it('normalizes a transport failure to the same explicit bundled-font error', async () => {
    const fetch = vi.fn().mockRejectedValue(new Error('offline'))
    vi.stubGlobal('fetch', fetch)

    const { loadOgFonts } = await import('./font')

    await expect(loadOgFonts()).rejects.toThrow('Unable to load bundled OG font')
    expect(fetch.mock.calls.map(([url]) => String(url))).toEqual([regularUrl, blackUrl])
  })
})
