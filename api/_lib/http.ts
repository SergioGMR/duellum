export function noStoreHeaders(): Record<'Cache-Control', string> {
  return { 'Cache-Control': 'no-store' }
}

export function cacheHeaders(exp: number, nowMs: number): Record<'Cache-Control', string> {
  return { 'Cache-Control': `public, max-age=0, s-maxage=${Math.max(0, Math.floor((exp * 1_000 - nowMs) / 1_000))}, must-revalidate` }
}

export function noStoreResponse(status: number, body: string, headers: Record<string, string> = {}): Response {
  return new Response(body, { status, headers: { ...noStoreHeaders(), ...headers } })
}

export function jsonNoStoreResponse(body: unknown, status: number): Response {
  return noStoreResponse(status, JSON.stringify(body), { 'Content-Type': 'application/json; charset=utf-8' })
}
