import { describe, expect, it, vi } from 'vitest'
import {
  createPublicResultClient,
  UnsupportedPublicationGlyphsError,
  type PublicResultInput,
} from './publicResult'

const input: PublicResultInput = {
  title: 'Plan de fin de semana',
  winner: 'Pizza',
  optionCount: 2,
  decisionCount: 1,
}

describe('public result client', () => {
  it('coalesces pending requests and reuses the matching public URL', async () => {
    const response = deferred<Response>()
    const fetch = vi.fn<typeof globalThis.fetch>().mockReturnValue(response.promise)
    const client = createPublicResultClient({ fetch })

    const first = client.ensure(input)
    const second = client.ensure({ ...input })

    expect(first).toBe(second)
    expect(fetch).toHaveBeenCalledOnce()
    expect(fetch).toHaveBeenCalledWith('/api/public-results', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })

    response.resolve(publicResponse('https://duellum.example/r/first'))

    await expect(first).resolves.toEqual({
      url: 'https://duellum.example/r/first',
      expiresAt: '2030-01-01T00:00:00.000Z',
    })
    await expect(client.ensure(input)).resolves.toMatchObject({ url: 'https://duellum.example/r/first' })
    expect(fetch).toHaveBeenCalledOnce()
  })

  it('invalidates a changed result and rejects malformed mint responses without exposing them', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(publicResponse('https://duellum.example/r/first'))
      .mockResolvedValueOnce(publicResponse('https://duellum.example/r/second'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ url: 'not a URL', expiresAt: 'never' }), { status: 201 }))
    const client = createPublicResultClient({ fetch })

    await expect(client.ensure(input)).resolves.toMatchObject({ url: 'https://duellum.example/r/first' })
    await expect(client.ensure({ ...input, winner: 'Sushi' })).resolves.toMatchObject({
      url: 'https://duellum.example/r/second',
    })
    await expect(client.ensure({ ...input, winner: 'Tacos' })).rejects.toThrow(
      'Unable to prepare public result.',
    )
    expect(fetch).toHaveBeenCalledTimes(3)
  })

  it('remints a matching result after its public URL expires', async () => {
    let now = 1_000
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(publicResponse('https://duellum.example/r/first', 2_000))
      .mockResolvedValueOnce(publicResponse('https://duellum.example/r/second', 3_000))
    const client = createPublicResultClient({ fetch, now: () => now })

    await expect(client.ensure(input)).resolves.toMatchObject({ url: 'https://duellum.example/r/first' })
    now = 2_000
    await expect(client.ensure(input)).resolves.toMatchObject({ url: 'https://duellum.example/r/second' })
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('recognizes only the stable 422 glyph code without exposing a response body', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ code: 'unsupported_publication_glyphs' }), { status: 422 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ code: 'unsupported_publication_glyphs' }), { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ code: 'unknown_error', title: 'private text' }), { status: 422 }))
    const client = createPublicResultClient({ fetch })

    await expect(client.ensure(input)).rejects.toBeInstanceOf(UnsupportedPublicationGlyphsError)
    await expect(client.ensure({ ...input, winner: 'Sushi' })).rejects.toThrow('Unable to prepare public result.')
    await expect(client.ensure({ ...input, winner: 'Tacos' })).rejects.toThrow('Unable to prepare public result.')
  })
})

function publicResponse(url: string, expiresAt = Date.parse('2030-01-01T00:00:00.000Z')): Response {
  return new Response(JSON.stringify({ url, expiresAt: new Date(expiresAt).toISOString() }), { status: 201 })
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void; reject: (reason?: unknown) => void } {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}
