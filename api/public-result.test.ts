import { describe, expect, it } from 'vitest'
import { issueToken, type Keyring } from './_lib/codec'
import { createPublicResultHandler, extractPublicResultToken } from './public-result'

const keyring: Keyring = { active: { kid: 'active', key: new Uint8Array(32).fill(3) } }
const input = { title: '<script>&" tournament', winner: 'Ada & <Bob>', optionCount: 4, decisionCount: 3 }
const mint = (seconds: number) => issueToken(input, keyring, { now: () => seconds * 1_000, randomBytes: (length) => new Uint8Array(length).fill(4) })

describe('/r/:token reader', () => {
  it('extracts only its path token and keeps malformed or tampered reads generic and uncacheable', async () => {
    const issued = await mint(1_000)
    const handler = createPublicResultHandler({ keyring, origin: 'https://trusted.example', now: () => 1_000_000 })
    const tampered = `${issued.token.slice(0, -1)}${issued.token.endsWith('a') ? 'b' : 'a'}`
    const [malformed, corrupted] = await Promise.all([
      handler(new Request('https://attacker.example/r/not-a-token')),
      handler(new Request(`https://attacker.example/r/${tampered}`)),
    ])

    expect(extractPublicResultToken(new Request(`https://attacker.example/r/${issued.token}?ignored=yes`))).toBe(issued.token)
    expect([malformed.status, corrupted.status, malformed.headers.get('cache-control'), corrupted.headers.get('cache-control'), await corrupted.text()]).toEqual([404, 404, 'no-store', 'no-store', 'Not found'])
  })

  it('returns authenticated expiry as 410 with no-store', async () => {
    const issued = await mint(1_000)
    const handler = createPublicResultHandler({ keyring, origin: 'https://trusted.example', now: () => issued.payload.exp * 1_000 })
    const expired = await handler(new Request(`https://attacker.example/r/${issued.token}`))

    expect([expired.status, expired.headers.get('cache-control'), await expired.text()]).toEqual([410, 'no-store', 'Gone'])
  })

  it('keeps the token valid 1ms before expiry without caching beyond expiry', async () => {
    const issued = await mint(1_000)
    const handler = createPublicResultHandler({ keyring, origin: 'https://trusted.example', now: () => issued.payload.exp * 1_000 - 1 })
    const response = await handler(new Request(`https://attacker.example/r/${issued.token}`))

    expect([response.status, response.headers.get('cache-control')]).toEqual([200, 'public, max-age=0, s-maxage=0, must-revalidate'])
  })

  it('renders escaped complete canonical, Open Graph, and Twitter metadata with the remaining cache lifetime', async () => {
    const issued = await mint(1_000)
    const remainingSeconds = 123
    const handler = createPublicResultHandler({ keyring, origin: 'https://trusted.example', now: () => (issued.payload.exp - remainingSeconds) * 1_000 })
    const response = await handler(new Request(`https://attacker.example/r/${issued.token}`))
    const html = await response.text()
    const url = `https://trusted.example/r/${issued.token}`
    const title = 'Ada &amp; &lt;Bob&gt; won “&lt;script&gt;&amp;&quot; tournament” | Duellum'
    const description = 'Ada &amp; &lt;Bob&gt; won “&lt;script&gt;&amp;&quot; tournament” after 3 decisions.'

    expect([response.status, response.headers.get('content-type'), response.headers.get('cache-control')]).toEqual([200, 'text/html; charset=utf-8', `public, max-age=0, s-maxage=${remainingSeconds}, must-revalidate`])
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('Ada & <Bob>')
    expect([
      `<title>${title}</title>`,
      `<meta name="description" content="${description}">`,
      `<link rel="canonical" href="${url}">`,
      `<meta property="og:type" content="website">`,
      `<meta property="og:title" content="${title}">`,
      `<meta property="og:description" content="${description}">`,
      `<meta property="og:url" content="${url}">`,
      `<meta property="og:image" content="${url}/og.png">`,
      '<meta property="og:image:width" content="1200">',
      '<meta property="og:image:height" content="630">',
      '<meta name="twitter:card" content="summary_large_image">',
      `<meta name="twitter:title" content="${title}">`,
      `<meta name="twitter:description" content="${description}">`,
      `<meta name="twitter:image" content="${url}/og.png">`,
    ].every((field) => html.includes(field))).toBe(true)
    expect(html.startsWith('<!doctype html>') && html.endsWith('</html>')).toBe(true)
  })
})
