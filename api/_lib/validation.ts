const decoder = new TextDecoder('utf-8', { fatal: true })
const encoder = new TextEncoder()
const EDGE_WHITESPACE = /^[\u0020\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+|[\u0020\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+$/g

export const MAX_MINT_BODY_BYTES = 4_096
export const MAX_TOKEN_LENGTH = 2_048

export interface MintInput {
  title: string
  winner: string
  optionCount: number
  decisionCount: number
}

export function parseMintBody(body: Uint8Array): MintInput | undefined {
  if (body.byteLength > MAX_MINT_BODY_BYTES) return undefined
  try {
    return validateMintInput(JSON.parse(decoder.decode(body)))
  } catch {
    return undefined
  }
}

export function validateMintInput(value: unknown): MintInput | undefined {
  if (!isRecord(value) || !hasExactKeys(value, ['title', 'winner', 'optionCount', 'decisionCount'])) return undefined
  const { title, winner, optionCount, decisionCount } = value
  if (typeof title !== 'string' || typeof winner !== 'string') return undefined
  const normalizedTitle = normalizeText(title, 256)
  const normalizedWinner = normalizeText(winner, 128)
  if (normalizedTitle === undefined || normalizedWinner === undefined) return undefined
  if (typeof optionCount !== 'number' || !Number.isInteger(optionCount) || optionCount < 2 || optionCount > 16) return undefined
  if (typeof decisionCount !== 'number' || !Number.isInteger(decisionCount) || decisionCount !== optionCount - 1) return undefined
  return { title: normalizedTitle, winner: normalizedWinner, optionCount, decisionCount }
}

export function isReadableToken(token: string): boolean {
  return token.length <= MAX_TOKEN_LENGTH && /^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)
}

function normalizeText(value: string, maximumBytes: number): string | undefined {
  if (hasControl(value) || hasLoneSurrogate(value)) return undefined
  const normalized = value.replace(EDGE_WHITESPACE, '').normalize('NFC')
  const bytes = encoder.encode(normalized).byteLength
  return bytes >= 1 && bytes <= maximumBytes ? normalized : undefined
}

function hasLoneSurrogate(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    if (code >= 0xd800 && code <= 0xdbff && (index + 1 === value.length || value.charCodeAt(index + 1) < 0xdc00 || value.charCodeAt(index + 1) > 0xdfff)) return true
    if (code >= 0xdc00 && code <= 0xdfff && (index === 0 || value.charCodeAt(index - 1) < 0xd800 || value.charCodeAt(index - 1) > 0xdbff)) return true
  }
  return false
}

function hasControl(value: string): boolean { return [...value].some((char) => { const code = char.charCodeAt(0); return code <= 31 || (code >= 127 && code <= 159) }) }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key))
}
