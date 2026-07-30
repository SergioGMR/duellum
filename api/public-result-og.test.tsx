import { beforeEach, describe, expect, it, vi } from 'vitest'
import { issueToken, type Keyring } from './_lib/codec'
import vercelConfig from '../vercel.json'

const mocks = vi.hoisted(() => ({ imageResponse: vi.fn(), loadOgFonts: vi.fn(), hasOgGlyphCoverage: vi.fn() }))

vi.mock('@vercel/og', () => ({
  ImageResponse: class {
    constructor(element: unknown, options: { headers?: HeadersInit }) {
      mocks.imageResponse(element, options)
      return new Response('PNG', { headers: { 'content-type': 'image/png', ...options.headers } })
    }
  },
}))

vi.mock('./_lib/font', () => ({ loadOgFonts: mocks.loadOgFonts, hasOgGlyphCoverage: mocks.hasOgGlyphCoverage }))

import { config, createPublicResultOgHandler } from './public-result-og'

const keyring: Keyring = { active: { kid: 'active', key: new Uint8Array(32).fill(7) } }
const now = () => 1_000_000
const fonts = [{ name: 'Inter' as const, data: new Uint8Array([1]).buffer, weight: 400 as const, style: 'normal' as const }]
const handler = createPublicResultOgHandler({ keyring, origin: 'https://results.example', now })

describe('GET /r/:token/og.png', () => {
  beforeEach(() => {
    mocks.imageResponse.mockReset()
    mocks.loadOgFonts.mockReset()
    mocks.hasOgGlyphCoverage.mockReset()
    mocks.hasOgGlyphCoverage.mockResolvedValue(true)
  })

  it('declares the Edge runtime and renders a cached 1200×630 PNG with the exact bundled fonts', async () => {
    mocks.loadOgFonts.mockResolvedValue(fonts)
    const response = await handler(await imageRequest())

    expect(config).toEqual({ runtime: 'edge' })
    expect([response.status, response.headers.get('content-type'), response.headers.get('cache-control')]).toEqual([200, 'image/png', 'public, max-age=0, s-maxage=604800, must-revalidate'])
    expect(mocks.loadOgFonts).toHaveBeenCalledTimes(1)
    expect(mocks.imageResponse).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ width: 1200, height: 630, fonts }))
    expect(visibleText(mocks.imageResponse.mock.calls[0]?.[0])).toContain('Ada & Bob')
  })

  it('accepts only the image token route and returns generic no-store token errors', async () => {
    mocks.loadOgFonts.mockResolvedValue(fonts)
    const [wrongShape, malformed] = await Promise.all([
      handler(new Request('https://results.example/r/not-a-token')),
      handler(new Request('https://results.example/r/not-a-token/og.png')),
    ])

    expect(await Promise.all([wrongShape.status, malformed.status].map(async (status) => status))).toEqual([404, 404])
    expect([wrongShape.headers.get('cache-control'), malformed.headers.get('cache-control'), await wrongShape.text(), await malformed.text()]).toEqual(['no-store', 'no-store', 'Not found', 'Not found'])
  })

  it('returns expiry and rendering failures as generic no-store responses without remote fallbacks', async () => {
    const expired = await imageRequest(1_000_000 - 604_800_000)
    mocks.loadOgFonts.mockRejectedValueOnce(new Error('font unavailable'))
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const [expiredResponse, failedRender] = await Promise.all([handler(expired), handler(await imageRequest())])

    expect([expiredResponse.status, failedRender.status, expiredResponse.headers.get('cache-control'), failedRender.headers.get('cache-control'), await expiredResponse.text(), await failedRender.text()]).toEqual([410, 500, 'no-store', 'no-store', 'Gone', 'Internal server error'])
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it('returns a generic no-store failure for authenticated unsupported glyphs before rendering', async () => {
    mocks.hasOgGlyphCoverage.mockResolvedValue(false)
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    const response = await handler(await imageRequest(1_000_000, { winner: 'مرحبا' }))

    expect([response.status, response.headers.get('cache-control'), await response.text()]).toEqual([500, 'no-store', 'Internal server error'])
    expect(mocks.hasOgGlyphCoverage).toHaveBeenCalledWith('The decisive final', 'مرحبا')
    expect(mocks.imageResponse).not.toHaveBeenCalled()
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it('keeps malformed local font coverage failures generic before rendering', async () => {
    mocks.hasOgGlyphCoverage.mockRejectedValue(new Error('Malformed font'))

    const response = await handler(await imageRequest())

    expect([response.status, response.headers.get('cache-control'), await response.text()]).toEqual([500, 'no-store', 'Internal server error'])
    expect(mocks.imageResponse).not.toHaveBeenCalled()
  })

  it('keeps the image, HTML, and SPA rewrites ordered without broad public-token matching', async () => {
    expect(vercelConfig.rewrites).toEqual([
      { source: '/r/:token/og.png', destination: '/api/public-result-og' },
      { source: '/r/:token', destination: '/api/public-result' },
      { source: '/(.*)', destination: '/index.html' },
    ])
  })
})

async function imageRequest(issuedAt = 1_000_000, result: Partial<{ title: string, winner: string }> = {}): Promise<Request> {
  const { token } = await issueToken(
    { title: 'The decisive final', winner: 'Ada & Bob', optionCount: 4, decisionCount: 3, ...result },
    keyring,
    { now: () => issuedAt, randomBytes: (length) => new Uint8Array(length).fill(9) },
  )
  return new Request(`https://results.example/r/${token}/og.png`)
}

function visibleText(value: unknown): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(visibleText).join('')
  if (typeof value !== 'object' || value === null || !('props' in value)) return ''
  return visibleText((value as { props: { children?: unknown } }).props.children)
}
