import { describe, expect, it } from 'vitest'
import { MAX_MINT_BODY_BYTES, MAX_TOKEN_LENGTH, isReadableToken, parseMintBody } from './validation'
const encoder = new TextEncoder()
const validInput = {
  title: 'Where should we eat?',
  winner: 'Ramen',
  optionCount: 4,
  decisionCount: 3,
}
describe('mint body validation', () => {
  it('accepts exactly 4,096 UTF-8 bytes and rejects 4,097 before parsing', () => {
    expect([paddedBody(4_096).byteLength, parseMintBody(paddedBody(4_096)), parseMintBody(paddedBody(4_097))]).toEqual([MAX_MINT_BODY_BYTES, validInput, undefined])
  })
  it('rejects fatal UTF-8, escaped lone surrogates, and controls before trimming', () => {
    expect([parseMintBody(new Uint8Array([0xff])), parseMintBody(loneSurrogateBody()), parseMintBody(jsonBody({ ...validInput, title: ' \u0001Title ' })), parseMintBody(jsonBody({ ...validInput, winner: '\u0085Winner' }))]).toEqual([undefined, undefined, undefined, undefined])
  })
  it('trims only allowed edges, NFC-normalizes, and preserves internal Unicode', () => {
    expect(parseMintBody(jsonBody({ ...validInput, title: '\u00a0Cafe\u0301\u3000東京\u00a0', winner: 'Zoë\u2007A' }))).toEqual({ ...validInput, title: 'Café\u3000東京', winner: 'Zoë\u2007A' })
  })
  it('enforces exact UTF-8 byte boundaries for title and winner', () => {
    const title256 = `${'é'.repeat(127)}aa`, winner128 = `${'é'.repeat(63)}aa`
    expect([encoder.encode(title256).byteLength, parseMintBody(jsonBody({ ...validInput, title: title256 }))?.title, encoder.encode(`${title256}a`).byteLength, parseMintBody(jsonBody({ ...validInput, title: `${title256}a` })), encoder.encode(winner128).byteLength, parseMintBody(jsonBody({ ...validInput, winner: winner128 }))?.winner, encoder.encode(`${winner128}a`).byteLength, parseMintBody(jsonBody({ ...validInput, winner: `${winner128}a` }))]).toEqual([256, title256, 257, undefined, 128, winner128, 129, undefined])
  })
  it('requires exact fields, integer option bounds, and matching decision counts', () => {
    const minimum = { ...validInput, optionCount: 2, decisionCount: 1 }
    expect([parseMintBody(jsonBody({ ...validInput, extra: true })), parseMintBody(jsonBody({ title: validInput.title, winner: validInput.winner })), parseMintBody(jsonBody(minimum)), parseMintBody(jsonBody({ ...validInput, optionCount: 1, decisionCount: 0 })), parseMintBody(jsonBody({ ...validInput, optionCount: 17, decisionCount: 16 })), parseMintBody(jsonBody({ ...validInput, title: 'x', winner: 'y', optionCount: 16, decisionCount: 15 })), parseMintBody(jsonBody({ ...validInput, optionCount: 3.5, decisionCount: 2.5 })), parseMintBody(jsonBody({ ...validInput, title: '', winner: '' })), parseMintBody(jsonBody({ ...validInput, decisionCount: 2 }))]).toEqual([undefined, undefined, minimum, undefined, undefined, { ...validInput, title: 'x', winner: 'y', optionCount: 16, decisionCount: 15 }, undefined, undefined, undefined])
  })
})
describe('read token boundary validation', () => {
  it('allows a URL-safe 2,048-character token and rejects overlong or non-URL-safe input', () => {
    const exact = `v1.k.a.${'a'.repeat(MAX_TOKEN_LENGTH - 7)}`
    expect([exact.length, isReadableToken(exact), isReadableToken(`${exact}a`), isReadableToken('v1.k.a.!')]).toEqual([2_048, true, false, false])
  })
})
function jsonBody(input: unknown): Uint8Array { return encoder.encode(JSON.stringify(input)) }
function paddedBody(length: number): Uint8Array {
  const json = jsonBody(validInput), body = new Uint8Array(length)
  body.set(json); body.fill(0x20, json.byteLength)
  return body
}
function loneSurrogateBody(): Uint8Array { return encoder.encode(JSON.stringify({ ...validInput, title: '_' }).replace('_', `${String.fromCharCode(92)}uD800`)) }
