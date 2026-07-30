export interface PublicResultInput {
  title: string
  winner: string
  optionCount: number
  decisionCount: number
}

export interface PublicResult {
  url: string
  expiresAt: string
}

export interface PublicResultClientOptions {
  fetch?: typeof globalThis.fetch
  endpoint?: string
  now?: () => number
}

interface PendingPublicResult {
  fingerprint: string
  request: Promise<PublicResult>
}

const PUBLIC_RESULT_ERROR = 'Unable to prepare public result.'
export const UNSUPPORTED_PUBLICATION_GLYPHS = 'unsupported_publication_glyphs'

export class UnsupportedPublicationGlyphsError extends Error {
  readonly code = UNSUPPORTED_PUBLICATION_GLYPHS

  constructor() {
    super(PUBLIC_RESULT_ERROR)
    this.name = 'UnsupportedPublicationGlyphsError'
  }
}

export function isUnsupportedPublicationGlyphsError(error: unknown): error is UnsupportedPublicationGlyphsError {
  return error instanceof UnsupportedPublicationGlyphsError
}

export class PublicResultClient {
  private current: PendingPublicResult | { fingerprint: string; result: PublicResult } | undefined
  private readonly fetch: typeof globalThis.fetch
  private readonly endpoint: string
  private readonly now: () => number

  constructor({ fetch = globalThis.fetch, endpoint = '/api/public-results', now = Date.now }: PublicResultClientOptions = {}) {
    this.fetch = fetch
    this.endpoint = endpoint
    this.now = now
  }

  ensure(input: PublicResultInput): Promise<PublicResult> {
    const fingerprint = publicResultFingerprint(input)
    if (this.current?.fingerprint === fingerprint) {
      if ('result' in this.current) {
        if (Date.parse(this.current.result.expiresAt) <= this.now()) {
          this.current = undefined
        } else {
          return Promise.resolve(this.current.result)
        }
      } else {
        return this.current.request
      }
    }

    const pending = {} as PendingPublicResult
    const request = this.mint(input).then(
      (result) => {
        if (this.current === pending) this.current = { fingerprint, result }
        return result
      },
      (error: unknown) => {
        if (this.current === pending) this.current = undefined
        if (isUnsupportedPublicationGlyphsError(error)) throw error
        throw new Error(PUBLIC_RESULT_ERROR)
      },
    )
    pending.fingerprint = fingerprint
    pending.request = request
    this.current = pending
    return request
  }

  invalidate(input?: PublicResultInput): void {
    if (input === undefined || this.current?.fingerprint !== publicResultFingerprint(input)) {
      this.current = undefined
    }
  }

  private async mint(input: PublicResultInput): Promise<PublicResult> {
    try {
      const response = await this.fetch(this.endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (response.status === 422 && isUnsupportedGlyphResponse(await response.json().catch(() => undefined))) {
        throw new UnsupportedPublicationGlyphsError()
      }
      if (response.status !== 201) throw new Error(PUBLIC_RESULT_ERROR)
      return parsePublicResult(await response.json())
    } catch (error) {
      if (isUnsupportedPublicationGlyphsError(error)) throw error
      throw new Error(PUBLIC_RESULT_ERROR, { cause: error })
    }
  }
}

function isUnsupportedGlyphResponse(value: unknown): boolean {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length === 1 && (value as Record<string, unknown>).code === UNSUPPORTED_PUBLICATION_GLYPHS
}

export function createPublicResultClient(options?: PublicResultClientOptions): PublicResultClient {
  return new PublicResultClient(options)
}

export function publicResultFingerprint(input: PublicResultInput): string {
  return JSON.stringify([input.title, input.winner, input.optionCount, input.decisionCount])
}

const defaultClient = createPublicResultClient()

export function ensurePublicResult(input: PublicResultInput): Promise<PublicResult> {
  return defaultClient.ensure(input)
}

function parsePublicResult(value: unknown): PublicResult {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(PUBLIC_RESULT_ERROR)
  const { url, expiresAt } = value as Record<string, unknown>
  if (typeof url !== 'string' || typeof expiresAt !== 'string' || !isPublicUrl(url) || !isExpiry(expiresAt)) {
    throw new Error(PUBLIC_RESULT_ERROR)
  }
  return { url, expiresAt }
}

function isPublicUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

function isExpiry(value: string): boolean {
  return Number.isFinite(Date.parse(value))
}
