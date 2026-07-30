import { cacheHeaders, noStoreResponse } from './_lib/http'
import { publicResultHtml } from './_lib/html'
import { readToken, type Keyring } from './_lib/codec'
import { configuredOrigin, serverEnvironment, type ServerEnvironment } from './_lib/origin'
import { configuredKeyring } from './public-results'

export const config = { runtime: 'edge' }

export interface PublicResultOptions {
  keyring?: Keyring
  origin?: string
  now?: () => number
  environment?: ServerEnvironment
}

export function createPublicResultHandler(options: PublicResultOptions = {}): (request: Request) => Promise<Response> {
  return async (request) => {
    const token = extractPublicResultToken(request)
    if (token === undefined) return error(404, 'Not found')
    const environment = options.environment ?? serverEnvironment()
    const keyring = options.keyring ?? configuredKeyring(environment)
    const origin = options.origin ?? configuredOrigin(environment)
    if (keyring === undefined || origin === undefined) return error(500, 'Internal server error')
    try {
      const result = await readToken(token, keyring, options)
      if (result.kind === 'not-found') return error(404, 'Not found')
      if (result.kind === 'expired') return error(410, 'Gone')
      const nowMs = (options.now ?? Date.now)()
      return new Response(publicResultHtml(result.payload, origin, token), { headers: { 'Content-Type': 'text/html; charset=utf-8', ...cacheHeaders(result.payload.exp, nowMs) } })
    } catch {
      return error(500, 'Internal server error')
    }
  }
}

export default createPublicResultHandler()

export function extractPublicResultToken(request: Request): string | undefined {
  const parts = new URL(request.url).pathname.split('/')
  return parts.length === 3 && parts[1] === 'r' && parts[2] !== '' ? parts[2] : undefined
}

function error(status: number, message: string): Response {
  return noStoreResponse(status, message)
}
