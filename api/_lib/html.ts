import type { TokenPayload } from './codec'

export function publicResultHtml(payload: TokenPayload, origin: string, token: string): string {
  const url = `${origin}/r/${token}`
  const image = `${url}/og.png`
  const title = `${payload.winner} won “${payload.title}” | Duellum`
  const description = `${payload.winner} won “${payload.title}” after ${payload.decisionCount} decisions.`
  const text = (value: string) => escapeHtml(value)
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${text(title)}</title><meta name="description" content="${text(description)}"><link rel="canonical" href="${text(url)}"><meta property="og:type" content="website"><meta property="og:title" content="${text(title)}"><meta property="og:description" content="${text(description)}"><meta property="og:url" content="${text(url)}"><meta property="og:image" content="${text(image)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${text(title)}"><meta name="twitter:description" content="${text(description)}"><meta name="twitter:image" content="${text(image)}"></head><body><main><h1>${text(payload.winner)}</h1><p>${text(payload.title)}</p><p>${payload.optionCount} options · ${payload.decisionCount} decisions</p></main></body></html>`
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character)
}
