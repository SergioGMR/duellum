import { describe, expect, it } from 'vitest'
import type { MintInput } from './validation'
import { CodecConfigurationError, issueToken, readToken, tokenAad, validateKeyring, type Keyring } from './codec'
import { cacheHeaders, noStoreHeaders } from './http'
const input: MintInput = { title: 'Plan de fin de semana', winner: 'Visitar el museo', optionCount: 4, decisionCount: 3 }
const now = (seconds: number) => () => seconds * 1_000
describe('public result token codec', () => {
  it('mints canonical payloads with an exact seven-day TTL and a fresh nonce', async () => {
    const keyring = ring('active', 1), mint = { now: now(1_000), randomBytes: randomBytes(7, 8) }
    const first = await issueToken(input, keyring, mint), second = await issueToken(input, keyring, mint)
    const [, , iv, encrypted] = first.token.split('.')
    expect(first.payload).toEqual({ ...input, iat: 1_000, exp: 605_800 })
    expect(Object.keys(first.payload)).toEqual(['title', 'winner', 'optionCount', 'decisionCount', 'iat', 'exp'])
    expect(new Uint8Array(await decrypt(encrypted, iv, keyring.active.key, tokenAad('v1', 'active')))).toEqual(new TextEncoder().encode(JSON.stringify({ v: 'v1', iat: 1_000, exp: 605_800, ...input })))
    expect(first.payload.exp - first.payload.iat).toBe(604_800)
    expect(first.token).not.toBe(second.token)
    expect(first.token).not.toContain(input.title)
    await expect(readToken(first.token, keyring, { now: now(1_000) })).resolves.toEqual({
      kind: 'valid',
      payload: first.payload,
    })
  })
  it('binds the version and key id into AES-GCM additional authenticated data', async () => {
    const keyring = ring('active', 1), minted = await issueToken(input, keyring, { now: now(1_000), randomBytes: randomBytes(7) })
    const [, , iv, encrypted] = minted.token.split('.')
    expect(tokenAad('v1', 'active')).toBe('public-result:v1:active')
    await expect(decrypt(encrypted, iv, keyring.active.key, tokenAad('v1', 'other'))).rejects.toThrow()
    await expect(decrypt(encrypted, iv, keyring.active.key, tokenAad('v2', 'active'))).rejects.toThrow()
    await expect(readToken(minted.token.replace('v1.', 'v2.'), keyring, { now: now(1_000) })).resolves.toEqual({ kind: 'not-found' })
  })
  it('returns generic not-found results for tampered, unknown-key, and wrong-key tokens', async () => {
    const keyring = ring('active', 1), minted = await issueToken(input, keyring, { now: now(1_000), randomBytes: randomBytes(7) })
    const tampered = `${minted.token.slice(0, -1)}${minted.token.endsWith('a') ? 'b' : 'a'}`
    const unknownKey = minted.token.replace('.active.', '.missing.')
    const [, , iv] = minted.token.split('.')
    const malformed = ['v1', 'active', iv, await encrypt(JSON.stringify({ v: 'v1', iat: 1_000, exp: 'malformed', ...input }), iv, keyring.active.key, tokenAad('v1', 'active'))].join('.')

    await expect(readToken(tampered, keyring, { now: now(1_000) })).resolves.toEqual({ kind: 'not-found' })
    await expect(readToken(unknownKey, keyring, { now: now(1_000) })).resolves.toEqual({ kind: 'not-found' })
    await expect(readToken(minted.token, ring('active', 2), { now: now(1_000) })).resolves.toEqual({ kind: 'not-found' })
    await expect(readToken(malformed, keyring, { now: now(1_000) })).resolves.toEqual({ kind: 'not-found' })
  })
  it('rejects future issue times and expires at now >= exp', async () => {
    const keyring = ring('active', 1), minted = await issueToken(input, keyring, { now: now(1_000), randomBytes: randomBytes(7) })
    const future = await issueToken(input, keyring, { now: now(1_001), randomBytes: randomBytes(8) })
    await expect(readToken(minted.token, keyring, { now: now(605_799) })).resolves.toEqual({ kind: 'valid', payload: minted.payload })
    await expect(readToken(minted.token, keyring, { now: now(605_800) })).resolves.toEqual({ kind: 'expired' })
    await expect(readToken(future.token, keyring, { now: now(1_000) })).resolves.toEqual({ kind: 'not-found' })
  })
  it('mints only with the active key and reads active and previous rotation keys', async () => {
    const previous = ring('previous', 1), active = ring('active', 2)
    const reader: Keyring = { active: active.active, previous: [previous.active] }
    const oldToken = await issueToken(input, previous, { now: now(1_000), randomBytes: randomBytes(7) })
    const currentToken = await issueToken(input, reader, { now: now(1_000), randomBytes: randomBytes(8) })

    expect(currentToken.token.startsWith('v1.active.')).toBe(true)
    await expect(readToken(oldToken.token, reader, { now: now(1_000) })).resolves.toEqual({ kind: 'valid', payload: oldToken.payload })
    await expect(readToken(currentToken.token, reader, { now: now(1_000) })).resolves.toEqual({ kind: 'valid', payload: currentToken.payload })
  })
  it('rejects duplicate key identifiers and duplicate decoded key bytes', () => {
    const duplicatedKid = ring('active', 1)
    const duplicatedBytes = ring('previous', 1)

    expect(() => validateKeyring({ active: duplicatedKid.active, previous: [duplicatedKid.active] })).toThrow(
      CodecConfigurationError,
    )
    expect(() => validateKeyring({ active: duplicatedKid.active, previous: [duplicatedBytes.active] })).toThrow(
      CodecConfigurationError,
    )
  })
})
describe('reader cache headers', () => {
  it('produces exact bounded success and no-store error headers', () => {
    expect(cacheHeaders(605_800, 1_000_000)).toEqual({
      'Cache-Control': 'public, max-age=0, s-maxage=604800, must-revalidate',
    })
    expect(noStoreHeaders()).toEqual({ 'Cache-Control': 'no-store' })
  })
})
function ring(kid: string, seed: number): Keyring {
  return { active: { kid, key: new Uint8Array(32).fill(seed) } }
}
function randomBytes(...seeds: number[]): (length: number) => Uint8Array {
  let next = 0
  return (length) => new Uint8Array(length).fill(seeds[next++] ?? 0)
}
async function decrypt(
  encrypted: string | undefined,
  iv: string | undefined,
  key: Uint8Array,
  aad: string,
): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey('raw', bufferOf(key), 'AES-GCM', false, ['decrypt'])
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv: bufferOf(decodeBase64Url(iv ?? '')), additionalData: bufferOf(new TextEncoder().encode(aad)), tagLength: 128 }, cryptoKey, bufferOf(decodeBase64Url(encrypted ?? '')))
}
async function encrypt(json: string, iv: string | undefined, key: Uint8Array, aad: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey('raw', bufferOf(key), 'AES-GCM', false, ['encrypt'])
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: bufferOf(decodeBase64Url(iv ?? '')), additionalData: bufferOf(new TextEncoder().encode(aad)), tagLength: 128 }, cryptoKey, bufferOf(new TextEncoder().encode(json)))
  return base64Url(new Uint8Array(encrypted))
}
function decodeBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(`${base64}${'='.repeat((4 - (base64.length % 4)) % 4)}`), (byte) => byte.charCodeAt(0))
}
function base64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}
function bufferOf(bytes: Uint8Array): ArrayBuffer { return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer }
