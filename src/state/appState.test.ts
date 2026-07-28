import { describe, expect, it } from 'vitest'
import { createTournamentRun } from '../domain/tournament'
import { appReducer, type DecisionBracket } from './appState'

const bracket: DecisionBracket = {
  id: 'bracket-1',
  title: 'Lunch',
  options: [
    { id: 'a', name: 'Tacos' },
    { id: 'b', name: 'Ramen' },
  ],
  createdAt: 1,
  updatedAt: 1,
  run: null,
}

describe('appReducer', () => {
  it('invalidates run state when a bracket is edited', () => {
    const running = {
      ...bracket,
      run: createTournamentRun(bracket.options, () => 0),
    }

    const state = appReducer(
      { brackets: [running] },
      {
        type: 'bracket/update',
        bracketId: bracket.id,
        title: 'Dinner',
        options: bracket.options,
        updatedAt: 2,
      },
    )

    expect(state.brackets[0]?.title).toBe('Dinner')
    expect(state.brackets[0]?.run).toBeNull()
  })

  it('deletes only the requested bracket', () => {
    const other = { ...bracket, id: 'bracket-2' }
    const state = appReducer(
      { brackets: [bracket, other] },
      { type: 'bracket/delete', bracketId: bracket.id },
    )

    expect(state.brackets).toEqual([other])
  })

  it('replay replaces only run progress and updates recency', () => {
    const completed = {
      ...bracket,
      run: { seedOrder: ['a', 'b'], decisions: ['a'] },
    }
    const freshRun = { seedOrder: ['b', 'a'], decisions: [] }

    const state = appReducer(
      { brackets: [completed] },
      {
        type: 'run/start',
        bracketId: bracket.id,
        run: freshRun,
        updatedAt: 3,
      },
    )

    expect(state.brackets[0]).toEqual({
      ...bracket,
      run: freshRun,
      updatedAt: 3,
    })
  })
})
