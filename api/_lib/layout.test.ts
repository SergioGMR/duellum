import { describe, expect, it } from 'vitest'
import { OG_CARD, layoutText } from './layout'

const graphemes = (value: string) => Array.from(new Intl.Segmenter().segment(value), ({ segment }) => segment)

describe('OG text layout', () => {
  it('wraps spaced text deterministically into at most two readable lines', () => {
    const value = 'The decisive final between Ada and Grace is now complete'

    const first = layoutText(value, 18)
    const second = layoutText(value, 18)

    expect(first).toEqual(second)
    expect(first.lines).toHaveLength(2)
    expect(first.lines.join(' ')).toContain('The decisive final')
    expect(first.lines.at(-1)).toContain('…')
    expect(first.truncated).toBe(true)
  })

  it('hard-breaks unspaced graphemes without splitting them and ellipsizes overflow', () => {
    const value = '🧑🏽‍🚀'.repeat(12)
    const layout = layoutText(value, 4)
    const visible = layout.lines.join('').replace('…', '')

    expect(layout).toEqual({ lines: ['🧑🏽‍🚀🧑🏽‍🚀🧑🏽‍🚀🧑🏽‍🚀', '🧑🏽‍🚀🧑🏽‍🚀🧑🏽‍🚀…'], truncated: true })
    expect(graphemes(visible)).toEqual(graphemes(value).slice(0, 7))
  })

  it('keeps the 1200×630 card inside 64px margins with readable winner contrast', () => {
    const contrast = contrastRatio(OG_CARD.colors.ink, OG_CARD.colors.surface)

    expect(OG_CARD).toMatchObject({ width: 1200, height: 630, margin: 64 })
    expect([contrast >= 4.5, OG_CARD.type.winner > OG_CARD.type.title, OG_CARD.titleColumns > OG_CARD.winnerColumns]).toEqual([true, true, true])
  })
})

function contrastRatio(foreground: string, background: string): number {
  const luminance = (value: string) => {
    const channels = value.slice(1).match(/../g)?.map((channel) => Number.parseInt(channel, 16) / 255) ?? []
    const [red = 0, green = 0, blue = 0] = channels.map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue
  }
  const [lighter = 0, darker = 0] = [luminance(foreground), luminance(background)].sort((left, right) => right - left)
  return (lighter + 0.05) / (darker + 0.05)
}
