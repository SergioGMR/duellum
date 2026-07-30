import { isReadableToken, validateMintInput, type MintInput } from './validation'

const VERSION = 'v1'
const TTL_SECONDS = 604_800
const encoder = new TextEncoder()
const decoder = new TextDecoder('utf-8', { fatal: true })

export interface KeyDefinition { kid: string; key: Uint8Array }
export interface Keyring { active: KeyDefinition; previous?: readonly KeyDefinition[] }
export interface CodecOptions { now?: () => number; randomBytes?: (length: number) => Uint8Array }
export interface TokenPayload extends MintInput { iat: number; exp: number }
export type TokenRead = { kind: 'valid'; payload: TokenPayload } | { kind: 'not-found' } | { kind: 'expired' }

export class CodecConfigurationError extends Error {}

export function tokenAad(version: string, kid: string): string {
  return `public-result:${version}:${kid}`
}

export function validateKeyring(keyring: Keyring): void {
  const kids = new Set<string>(), keys = new Set<string>()
  for (const entry of [keyring.active, ...(keyring.previous ?? [])]) {
    if (!/^[A-Za-z0-9_-]+$/.test(entry.kid) || entry.key.byteLength !== 32) throw new CodecConfigurationError('Invalid keyring entry')
    if (kids.has(entry.kid) || keys.has(base64Url(entry.key))) throw new CodecConfigurationError('Duplicate keyring entry')
    kids.add(entry.kid)
    keys.add(base64Url(entry.key))
  }
}

export async function issueToken(input: MintInput, keyring: Keyring, options: CodecOptions = {}): Promise<{ token: string; payload: TokenPayload }> {
  validateKeyring(keyring)
  const iat = currentSeconds(options.now)
  const payload = { ...input, iat, exp: iat + TTL_SECONDS }
  const serialized = JSON.stringify({ v: VERSION, iat, exp: payload.exp, ...input })
  const iv = (options.randomBytes ?? secureRandomBytes)(12)
  if (iv.byteLength !== 12) throw new CodecConfigurationError('Invalid nonce length')
  const key = await crypto.subtle.importKey('raw', bufferOf(keyring.active.key), 'AES-GCM', false, ['encrypt'])
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: bufferOf(iv), additionalData: bufferOf(encoder.encode(tokenAad(VERSION, keyring.active.kid)),), tagLength: 128 },
    key,
    bufferOf(encoder.encode(serialized)),
  )
  return { token: [VERSION, keyring.active.kid, base64Url(iv), base64Url(new Uint8Array(encrypted))].join('.'), payload }
}

export async function readToken(token: string, keyring: Keyring, options: CodecOptions = {}): Promise<TokenRead> {
  validateKeyring(keyring)
  try {
    const parts = parseToken(token)
    if (parts === undefined) return { kind: 'not-found' }
    const key = [keyring.active, ...(keyring.previous ?? [])].find((entry) => entry.kid === parts.kid)
    if (key === undefined) return { kind: 'not-found' }
    const cryptoKey = await crypto.subtle.importKey('raw', bufferOf(key.key), 'AES-GCM', false, ['decrypt'])
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: bufferOf(parts.iv), additionalData: bufferOf(encoder.encode(tokenAad(VERSION, parts.kid))), tagLength: 128 },
      cryptoKey,
      bufferOf(parts.encrypted),
    )
    const payload = parsePayload(decoder.decode(decrypted))
    if (payload === undefined) return { kind: 'not-found' }
    const now = currentSeconds(options.now)
    if (payload.iat > now) return { kind: 'not-found' }
    return now >= payload.exp ? { kind: 'expired' } : { kind: 'valid', payload }
  } catch {
    return { kind: 'not-found' }
  }
}

function parseToken(token: string): { kid: string; iv: Uint8Array; encrypted: Uint8Array } | undefined {
  if (!isReadableToken(token)) return undefined
  const [version, kid, encodedIv, encodedEncrypted] = token.split('.') as [string, string, string, string]
  if (version !== VERSION) return undefined
  const iv = fromBase64Url(encodedIv), encrypted = fromBase64Url(encodedEncrypted)
  return iv.byteLength === 12 && encrypted.byteLength >= 16 ? { kid, iv, encrypted } : undefined
}

function parsePayload(json: string): TokenPayload | undefined {
  const value: unknown = JSON.parse(json)
  if (typeof value !== 'object' || value === null || Array.isArray(value) || Object.keys(value).length !== 7) return undefined
  const record = value as Record<string, unknown>
  if (!['v', 'iat', 'exp', 'title', 'winner', 'optionCount', 'decisionCount'].every((key) => Object.hasOwn(record, key))) return undefined
  const { v, title, winner, optionCount, decisionCount, iat, exp } = record
  if (v !== VERSION || typeof iat !== 'number' || typeof exp !== 'number' || !Number.isSafeInteger(iat) || !Number.isSafeInteger(exp) || exp !== iat + TTL_SECONDS) return undefined
  const mint = validateMintInput({ title, winner, optionCount, decisionCount })
  const payload = mint === undefined ? undefined : { ...mint, iat, exp }
  return payload !== undefined && JSON.stringify({ v, iat, exp, ...mint }) === json ? payload : undefined
}

function currentSeconds(clock?: () => number): number { return Math.floor((clock ?? Date.now)() / 1_000) }
function secureRandomBytes(length: number): Uint8Array { return crypto.getRandomValues(new Uint8Array(length)) }
function bufferOf(bytes: Uint8Array): ArrayBuffer { return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer }
function base64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}
function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/')
  return Uint8Array.from(atob(`${base64}${'='.repeat((4 - (base64.length % 4)) % 4)}`), (byte) => byte.charCodeAt(0))
}
