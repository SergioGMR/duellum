import { issueToken, validateKeyring, type KeyDefinition, type Keyring } from './_lib/codec'
import { hasOgGlyphCoverage } from './_lib/font'
import { MAX_MINT_BODY_BYTES, parseMintBody } from './_lib/validation'
import { configuredOrigin, serverEnvironment, type ServerEnvironment } from './_lib/origin'
import { jsonNoStoreResponse, noStoreResponse } from './_lib/http'

export const config = { runtime: 'edge' }

export interface PublicResultsOptions {
  keyring?: Keyring
  origin?: string
  now?: () => number
  randomBytes?: (length: number) => Uint8Array
  glyphCoverage?: (title: string, winner: string) => Promise<boolean>
  environment?: ServerEnvironment
}

export function createPublicResultsHandler(options: PublicResultsOptions = {}): (request: Request) => Promise<Response> {
  return async (request) => {
    if (request.method !== 'POST') return error(405, 'Method not allowed', { Allow: 'POST' })
    if (request.headers.get('content-type')?.toLowerCase() !== 'application/json') return error(415, 'Unsupported media type')
    const input = parseMintBody(await boundedBody(request))
    if (input === undefined) return error(400, 'Invalid request')
    try {
      if (!await (options.glyphCoverage ?? hasOgGlyphCoverage)(input.title, input.winner)) return unsupportedGlyphs()
    } catch {
      return error(500, 'Internal server error')
    }
    const environment = options.environment ?? serverEnvironment()
    const keyring = options.keyring ?? configuredKeyring(environment)
    const origin = options.origin ?? configuredOrigin(environment)
    if (keyring === undefined || origin === undefined) return error(500, 'Internal server error')
    try {
      const issued = await issueToken(input, keyring, options)
      return json({ url: `${origin}/r/${issued.token}`, expiresAt: new Date(issued.payload.exp * 1_000).toISOString() }, 201)
    } catch {
      return error(500, 'Internal server error')
    }
  }
}

export default createPublicResultsHandler()

export function configuredKeyring(environment: ServerEnvironment = serverEnvironment()): Keyring | undefined {
  const active = keyDefinition(environment.PUBLIC_RESULT_ACTIVE_KID, environment.PUBLIC_RESULT_ACTIVE_KEY)
  if (active === undefined) return undefined
  try {
    const previous = environment.PUBLIC_RESULT_PREVIOUS_KEYS === undefined ? [] : previousKeys(environment.PUBLIC_RESULT_PREVIOUS_KEYS)
    if (previous === undefined) return undefined
    const keyring = { active, previous }
    validateKeyring(keyring)
    return keyring
  } catch {
    return undefined
  }
}

async function boundedBody(request: Request): Promise<Uint8Array> {
  if (request.body === null) return new Uint8Array()
  const reader = request.body.getReader(), chunks: Uint8Array[] = []
  let length = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > MAX_MINT_BODY_BYTES) {
        await reader.cancel()
        return new Uint8Array(MAX_MINT_BODY_BYTES + 1)
      }
      chunks.push(value)
    }
  } catch {
    return new Uint8Array(MAX_MINT_BODY_BYTES + 1)
  }
  const body = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength }
  return body
}

function previousKeys(value: string): KeyDefinition[] | undefined {
  const parsed: unknown = JSON.parse(value)
  if (!Array.isArray(parsed)) return undefined
  const entries = parsed.map((entry) => typeof entry === 'object' && entry !== null ? entry as Record<string, unknown> : undefined)
  if (entries.some((entry) => entry === undefined)) return undefined
  const keys = entries.map((entry) => keyDefinition(entry?.kid, entry?.key))
  return keys.every((entry) => entry !== undefined) ? keys : undefined
}

function keyDefinition(kid: unknown, value: unknown): KeyDefinition | undefined {
  if (typeof kid !== 'string' || typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) return undefined
  try {
    const base64 = value.replaceAll('-', '+').replaceAll('_', '/')
    const key = Uint8Array.from(atob(`${base64}${'='.repeat((4 - (base64.length % 4)) % 4)}`), (byte) => byte.charCodeAt(0))
    return { kid, key }
  } catch {
    return undefined
  }
}

function error(status: number, message: string, headers: HeadersInit = {}): Response {
  return noStoreResponse(status, message, headers as Record<string, string>)
}

function json(body: unknown, status: number): Response {
  return jsonNoStoreResponse(body, status)
}

function unsupportedGlyphs(): Response {
  return json({ code: 'unsupported_publication_glyphs' }, 422)
}
