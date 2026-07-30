export const OG_CARD = {
  width: 1200,
  height: 630,
  margin: 64,
  titleColumns: 34,
  winnerColumns: 13,
  type: { title: 32, winner: 88 },
  colors: { surface: '#dfff58', ink: '#090b12', accent: '#ff5f57', muted: '#25302a' },
} as const

export interface TextLayout { lines: readonly string[]; truncated: boolean }

const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' })

export function layoutText(value: string, columns: number): TextLayout {
  const graphemes = Array.from(segmenter.segment(value), ({ segment }) => segment)
  const truncated = graphemes.length > columns * 2
  const visible = graphemes.slice(0, truncated ? columns * 2 - 1 : undefined)
  const lines: string[] = []
  let start = 0

  while (start < visible.length && lines.length < 2) {
    let end = Math.min(start + columns, visible.length)
    if (end < visible.length) end = lastWhitespace(visible, start, end) ?? end
    lines.push(visible.slice(start, end).join('').trimEnd())
    start = end
    while (start < visible.length && /\s/u.test(visible[start] ?? '')) start += 1
  }

  if (truncated) lines[lines.length - 1] = `${lines.at(-1) ?? ''}…`
  return { lines, truncated }
}

function lastWhitespace(graphemes: readonly string[], start: number, end: number): number | undefined {
  for (let index = end - 1; index > start; index -= 1) if (/\s/u.test(graphemes[index] ?? '')) return index
  return undefined
}
