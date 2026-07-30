import { ImageResponse } from '@vercel/og'
import { readToken, type Keyring, type TokenPayload } from './_lib/codec'
import { hasOgGlyphCoverage, loadOgFonts } from './_lib/font'
import { cacheHeaders, noStoreResponse } from './_lib/http'
import { OG_CARD, layoutText } from './_lib/layout'
import { configuredOrigin, serverEnvironment, type ServerEnvironment } from './_lib/origin'
import { configuredKeyring } from './public-results'

export const config = { runtime: 'edge' }

export interface PublicResultOgOptions {
  keyring?: Keyring
  origin?: string
  now?: () => number
  environment?: ServerEnvironment
}

export function createPublicResultOgHandler(options: PublicResultOgOptions = {}): (request: Request) => Promise<Response> {
  return async (request) => {
    const token = extractPublicResultOgToken(request)
    if (token === undefined) return error(404, 'Not found')
    const environment = options.environment ?? serverEnvironment()
    const keyring = options.keyring ?? configuredKeyring(environment)
    const origin = options.origin ?? configuredOrigin(environment)
    if (keyring === undefined || origin === undefined) return error(500, 'Internal server error')

    try {
      const result = await readToken(token, keyring, options)
      if (result.kind === 'not-found') return error(404, 'Not found')
      if (result.kind === 'expired') return error(410, 'Gone')
      if (!await hasOgGlyphCoverage(result.payload.title, result.payload.winner)) return error(500, 'Internal server error')
      return new ImageResponse(card(result.payload), {
        width: OG_CARD.width,
        height: OG_CARD.height,
        fonts: [...await loadOgFonts()],
        headers: cacheHeaders(result.payload.exp, (options.now ?? Date.now)()),
      })
    } catch {
      return error(500, 'Internal server error')
    }
  }
}

export default createPublicResultOgHandler()

export function extractPublicResultOgToken(request: Request): string | undefined {
  const parts = new URL(request.url).pathname.split('/')
  return parts.length === 4 && parts[1] === 'r' && parts[2] !== '' && parts[3] === 'og.png' ? parts[2] : undefined
}

function card(payload: TokenPayload) {
  const title = layoutText(payload.title, OG_CARD.titleColumns)
  const winner = layoutText(payload.winner, OG_CARD.winnerColumns)
  const decisionLabel = payload.decisionCount === 1 ? 'DECISION' : 'DECISIONS'
  return <div style={{ width: OG_CARD.width, height: OG_CARD.height, display: 'flex', flexDirection: 'column', padding: OG_CARD.margin, boxSizing: 'border-box', backgroundColor: OG_CARD.colors.surface, color: OG_CARD.colors.ink, fontFamily: 'Inter' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 22, fontWeight: 900, letterSpacing: 4 }}>
      <div>DUELLUM / RESULT</div><div style={{ padding: '10px 16px', backgroundColor: OG_CARD.colors.accent }}>WINNER</div>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', marginTop: 28, color: OG_CARD.colors.muted, fontSize: OG_CARD.type.title, lineHeight: 1.15, fontWeight: 400 }}>
      {title.lines.map((line, index) => <div key={`${line}-${index}`}>{line}</div>)}
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', marginTop: 26, fontSize: OG_CARD.type.winner, lineHeight: 0.96, fontWeight: 900, letterSpacing: -2 }}>
      {winner.lines.map((line, index) => <div key={`${line}-${index}`}>{line}</div>)}
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 20, borderTop: `2px solid ${OG_CARD.colors.ink}`, fontSize: 20, fontWeight: 900, letterSpacing: 1 }}>
      <div>{payload.optionCount} OPTIONS / {payload.decisionCount} {decisionLabel}</div><div>DECIDED LOCALLY</div>
    </div>
  </div>
}

function error(status: number, message: string): Response {
  return noStoreResponse(status, message)
}
