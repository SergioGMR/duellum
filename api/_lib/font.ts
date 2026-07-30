export interface OgFont {
  name: 'Inter'
  data: ArrayBuffer
  weight: 400 | 900
  style: 'normal'
}

const FONT_LOAD_ERROR = 'Unable to load bundled OG font'
const FONT_CMAP_ERROR = 'Unable to parse bundled OG font'
const CMAP_TABLE = 0x636d6170
const MAX_UNICODE_CODE_POINT = 0x10ffff
const bundledFonts = [
  {
    name: 'Inter' as const,
    weight: 400 as const,
    style: 'normal' as const,
    source: new URL('../_assets/fonts/Inter-Regular.ttf', import.meta.url),
  },
  {
    name: 'Inter' as const,
    weight: 900 as const,
    style: 'normal' as const,
    source: new URL('../_assets/fonts/Inter-Black.ttf', import.meta.url),
  },
]

let cachedFonts: Promise<readonly OgFont[]> | undefined
let cachedCoverage: Promise<FontCoverage> | undefined

export function loadOgFonts(): Promise<readonly OgFont[]> {
  cachedFonts ??= Promise.all(bundledFonts.map(loadFont)).catch(() => {
    cachedFonts = undefined
    throw fontLoadError()
  })
  return cachedFonts
}

export async function hasOgGlyphCoverage(title: string, winner: string): Promise<boolean> {
  const coverage = await loadCoverage()
  return textHasGlyphCoverage(title, coverage.regular) && textHasGlyphCoverage(winner, coverage.black)
}

export function parseTrueTypeCmap(buffer: ArrayBuffer): GlyphCoverage {
  try {
    const view = new DataView(buffer)
    const { offset, end } = cmapTable(view)
    const records = uint16(view, offset + 2, end)
    const maps: GlyphCoverage[] = []
    requireRange(offset + 4, records * 8, end)
    for (let index = 0; index < records; index += 1) {
      const record = offset + 4 + index * 8
      const platform = uint16(view, record, end)
      const encoding = uint16(view, record + 2, end)
      if (platform !== 0 && (platform !== 3 || (encoding !== 1 && encoding !== 10))) continue
      const subtable = offset + uint32(view, record + 4, end)
      requireRange(subtable, 2, end)
      const format = uint16(view, subtable, end)
      if (format === 4) maps.push(parseFormat4(view, subtable, end))
      if (format === 12) maps.push(parseFormat12(view, subtable, end))
    }
    if (maps.length === 0) throw new Error()
    return { hasGlyph: (codePoint) => Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= MAX_UNICODE_CODE_POINT && maps.some((map) => map.hasGlyph(codePoint)) }
  } catch {
    throw cmapError()
  }
}

async function loadFont({ source, ...font }: typeof bundledFonts[number]): Promise<OgFont> {
  const response = await fetch(source)
  if (!response.ok) throw fontLoadError()
  return { ...font, data: await response.arrayBuffer() }
}

function loadCoverage(): Promise<FontCoverage> {
  cachedCoverage ??= loadOgFonts().then((fonts) => {
    const [regular, black] = fonts
    if (regular === undefined || black === undefined) throw cmapError()
    return { regular: parseTrueTypeCmap(regular.data), black: parseTrueTypeCmap(black.data) }
  }).catch((error: unknown) => {
    cachedCoverage = undefined
    throw error
  })
  return cachedCoverage
}

function textHasGlyphCoverage(text: string, coverage: GlyphCoverage): boolean {
  for (const character of text) {
    const codePoint = character.codePointAt(0)
    if (codePoint === undefined || !coverage.hasGlyph(codePoint)) return false
  }
  return true
}

function cmapTable(view: DataView): { offset: number, end: number } {
  requireRange(0, 12, view.byteLength)
  const tables = uint16(view, 4, view.byteLength)
  requireRange(12, tables * 16, view.byteLength)
  for (let index = 0; index < tables; index += 1) {
    const record = 12 + index * 16
    if (uint32(view, record, view.byteLength) === CMAP_TABLE) {
      const offset = uint32(view, record + 8, view.byteLength)
      const length = uint32(view, record + 12, view.byteLength)
      requireRange(offset, length, view.byteLength)
      requireRange(offset, 4, offset + length)
      return { offset, end: offset + length }
    }
  }
  throw new Error()
}

function parseFormat4(view: DataView, offset: number, cmapEnd: number): GlyphCoverage {
  const length = uint16(view, offset + 2, cmapEnd)
  const end = offset + length
  requireRange(offset, 16, end)
  requireRange(offset, length, cmapEnd)
  const segments = uint16(view, offset + 6, end) / 2
  if (!Number.isInteger(segments) || segments === 0) throw new Error()
  const ends = offset + 14
  const starts = ends + segments * 2 + 2
  const deltas = starts + segments * 2
  const ranges = deltas + segments * 2
  requireRange(ranges, segments * 2, end)
  let previousEnd = -1
  for (let index = 0; index < segments; index += 1) {
    const start = uint16(view, starts + index * 2, end), finish = uint16(view, ends + index * 2, end), range = uint16(view, ranges + index * 2, end)
    if (start > finish || finish <= previousEnd) throw new Error()
    previousEnd = finish
    if (range !== 0) requireRange(ranges + index * 2 + range, (finish - start + 1) * 2, end)
  }
  return { hasGlyph: (codePoint) => {
    if (codePoint > 0xffff) return false
    let low = 0, high = segments - 1
    while (low <= high) {
      const index = Math.floor((low + high) / 2), finish = uint16(view, ends + index * 2, end)
      if (codePoint > finish) { low = index + 1; continue }
      const start = uint16(view, starts + index * 2, end)
      if (codePoint < start) { high = index - 1; continue }
      const delta = view.getInt16(deltas + index * 2), range = uint16(view, ranges + index * 2, end)
      if (range === 0) return ((codePoint + delta) & 0xffff) !== 0
      const glyph = uint16(view, ranges + index * 2 + range + (codePoint - start) * 2, end)
      return glyph !== 0 && ((glyph + delta) & 0xffff) !== 0
    }
    return false
  } }
}

function parseFormat12(view: DataView, offset: number, cmapEnd: number): GlyphCoverage {
  const length = uint32(view, offset + 4, cmapEnd), end = offset + length
  requireRange(offset, 16, end)
  requireRange(offset, length, cmapEnd)
  const groups = uint32(view, offset + 12, end)
  requireRange(offset + 16, groups * 12, end)
  let previousEnd = -1
  for (let index = 0; index < groups; index += 1) {
    const group = offset + 16 + index * 12, start = uint32(view, group, end), finish = uint32(view, group + 4, end)
    if (start > finish || finish > MAX_UNICODE_CODE_POINT || start <= previousEnd) throw new Error()
    previousEnd = finish
  }
  return { hasGlyph: (codePoint) => {
    let low = 0, high = groups - 1
    while (low <= high) {
      const index = Math.floor((low + high) / 2), group = offset + 16 + index * 12, start = uint32(view, group, end), finish = uint32(view, group + 4, end)
      if (codePoint < start) high = index - 1
      else if (codePoint > finish) low = index + 1
      else return uint32(view, group + 8, end) + codePoint - start !== 0
    }
    return false
  } }
}

function uint16(view: DataView, offset: number, end: number): number { requireRange(offset, 2, end); return view.getUint16(offset) }
function uint32(view: DataView, offset: number, end: number): number { requireRange(offset, 4, end); return view.getUint32(offset) }
function requireRange(offset: number, length: number, end: number): void { if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length) || offset < 0 || length < 0 || offset + length > end) throw new Error() }
function cmapError(): Error { return new Error(FONT_CMAP_ERROR) }
function fontLoadError(): Error {
  return new Error(FONT_LOAD_ERROR)
}

interface GlyphCoverage { hasGlyph(codePoint: number): boolean }
interface FontCoverage { regular: GlyphCoverage, black: GlyphCoverage }
