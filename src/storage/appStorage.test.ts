import { describe, expect, it } from 'vitest'
import { loadAppStateFromStorage } from './appStorage'

describe('app storage recovery', () => {
  it('returns an empty library for malformed JSON', () => {
    const result = loadAppStateFromStorage(storageWith('{not-json'))

    expect(result.state.brackets).toEqual([])
    expect(result.notice).toMatch(/no se pudieron leer/i)
  })

  it('keeps a valid definition while resetting incompatible run state', () => {
    const result = loadAppStateFromStorage(
      storageWith(
        JSON.stringify({
          version: 1,
          data: {
            brackets: [
              {
                id: 'bracket-1',
                title: 'Weekend plan',
                options: [
                  { id: 'a', name: 'Hike' },
                  { id: 'b', name: 'Museum' },
                ],
                createdAt: 1,
                updatedAt: 2,
                run: { seedOrder: ['a', 'missing'], decisions: [] },
              },
            ],
          },
        }),
      ),
    )

    expect(result.state.brackets).toHaveLength(1)
    expect(result.state.brackets[0]?.run).toBeNull()
    expect(result.notice).toMatch(/reinició de forma segura/i)
  })

  it('rejects unsupported storage versions without throwing', () => {
    const result = loadAppStateFromStorage(
      storageWith(JSON.stringify({ version: 99, data: { brackets: [] } })),
    )

    expect(result.state.brackets).toEqual([])
    expect(result.notice).not.toBeNull()
  })
})

function storageWith(value: string): Pick<Storage, 'getItem'> {
  return { getItem: () => value }
}
