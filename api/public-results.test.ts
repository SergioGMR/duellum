import { describe, expect, it, vi } from 'vitest'
import { config as readerConfig } from './public-result'
import { config as mintConfig, createPublicResultsHandler } from './public-results'
import { configuredOrigin } from './_lib/origin'
import type { Keyring } from './_lib/codec'

const input = { title: 'Final <private>', winner: 'Ada & Bob', optionCount: 4, decisionCount: 3 }
const keyring: Keyring = { active: { kid: 'active', key: new Uint8Array(32).fill(7) } }
const now = () => 1_000_000
const handler = createPublicResultsHandler({ keyring, origin: 'https://results.example', now, randomBytes: (length) => new Uint8Array(length).fill(9), glyphCoverage: async () => true })

describe('POST /api/public-results', () => {
  it('requires exact POST application/json, applies the 4,096-byte boundary, and returns the authoritative opaque URL', async () => {
    const exact = paddedBody(4_096)
    const [method, mediaType, oversized, invalid, accepted] = await Promise.all([
      handler(request(exact, 'GET')),
      handler(request(exact, 'POST', 'application/json; charset=utf-8')),
      handler(request(paddedBody(4_097))),
      handler(request(JSON.stringify({ ...input, decisionCount: 2 }))),
      handler(request(exact)),
    ])

    expect([method.status, mediaType.status, oversized.status, invalid.status, accepted.status, accepted.headers.get('content-type')]).toEqual([405, 415, 400, 400, 201, 'application/json; charset=utf-8'])
    expect([method.headers.get('allow'), ...[method, mediaType, oversized, invalid].map((response) => response.headers.get('cache-control'))]).toEqual(['POST', 'no-store', 'no-store', 'no-store', 'no-store'])
    const responseBody = await accepted.text()
    const minted = JSON.parse(responseBody) as { url: string, expiresAt: string }
    expect(minted).toEqual({
      url: expect.stringMatching(/^https:\/\/results\.example\/r\/v1\.active\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/),
      expiresAt: new Date((1_000 + 604_800) * 1_000).toISOString(),
    })
    const token = minted.url.slice('https://results.example/r/'.length)
    expect([responseBody.includes(input.title), responseBody.includes(input.winner), responseBody.split(token).length]).toEqual([false, false, 2])
  })

  it('cancels the reader exactly when byte 4,097 exceeds the request limit', async () => {
    let cancellations = 0
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(paddedBody(4_096))
        controller.enqueue(new Uint8Array([0x20]))
      },
      cancel() { cancellations += 1 },
    })

    const response = await handler(streamRequest(stream))

    expect([response.status, response.headers.get('cache-control'), cancellations]).toEqual([400, 'no-store', 1])
  })

  it('declares both Vercel handlers as Edge functions', () => {
    expect([mintConfig, readerConfig]).toEqual([{ runtime: 'edge' }, { runtime: 'edge' }])
  })

  it('uses only validated server origins', () => {
    expect(configuredOrigin({ PUBLIC_RESULT_ORIGIN: 'https://trusted.example', VERCEL_URL: 'attacker.example', VITE_PUBLIC_RESULT_ORIGIN: 'https://also-attacker.example' })).toBe('https://trusted.example')
    expect(configuredOrigin({ VERCEL_ENV: 'preview', VERCEL_URL: 'preview.example', VITE_PUBLIC_RESULT_ORIGIN: 'https://also-attacker.example' })).toBe('https://preview.example')
    expect(configuredOrigin({ VERCEL_ENV: 'production', VERCEL_URL: 'preview.example' })).toBeUndefined()
    expect(configuredOrigin({ VERCEL_ENV: 'development', VERCEL_URL: 'attacker.example', VITE_PUBLIC_RESULT_ORIGIN: 'https://also-attacker.example' })).toBeUndefined()
    expect(configuredOrigin({ PUBLIC_RESULT_ORIGIN: 'https://trusted.example/path' })).toBeUndefined()
  })

  it('returns only the stable no-store glyph rejection before token creation or remote work', async () => {
    const glyphCoverage = vi.fn().mockResolvedValue(false)
    const randomBytes = vi.fn(() => { throw new Error('Token creation must not run') })
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const rejected = createPublicResultsHandler({ keyring, origin: 'https://results.example', now, randomBytes, glyphCoverage })
    const unsupported = { ...input, title: 'مرحبا' }

    const response = await rejected(request(JSON.stringify(unsupported)))
    const body = await response.text()

    expect([response.status, response.headers.get('cache-control'), response.headers.get('content-type'), body]).toEqual([422, 'no-store', 'application/json; charset=utf-8', '{"code":"unsupported_publication_glyphs"}'])
    expect(glyphCoverage).toHaveBeenCalledWith(unsupported.title, unsupported.winner)
    expect(randomBytes).not.toHaveBeenCalled()
    expect(fetchSpy).not.toHaveBeenCalled()
    expect([body.includes(unsupported.title), body.includes(unsupported.winner), body.includes('0645')]).toEqual([false, false, false])
    fetchSpy.mockRestore()
  })

  it('keeps font coverage failures generic and no-store', async () => {
    const failedCoverage = createPublicResultsHandler({ keyring, origin: 'https://results.example', now, glyphCoverage: async () => { throw new Error('Malformed font') } })

    const response = await failedCoverage(request(JSON.stringify(input)))

    expect([response.status, response.headers.get('cache-control'), await response.text()]).toEqual([500, 'no-store', 'Internal server error'])
  })
})

function request(body: string | Uint8Array, method = 'POST', contentType = 'application/json'): Request {
  return new Request('https://attacker.example/api/public-results', { method, headers: { 'content-type': contentType }, body: method === 'GET' ? undefined : typeof body === 'string' ? body : bufferOf(body) })
}

function paddedBody(length: number): Uint8Array {
  const encoded = new TextEncoder().encode(JSON.stringify(input))
  const body = new Uint8Array(length)
  body.set(encoded)
  body.fill(0x20, encoded.byteLength)
  return body
}

function bufferOf(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

function streamRequest(body: ReadableStream<Uint8Array>): Request {
  return new Request('https://attacker.example/api/public-results', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    duplex: 'half',
  } as RequestInit)
}
