import { describe, expect, it } from 'vitest'
import {
  TournamentError,
  chooseWinner,
  createTournamentRun,
  deriveTournament,
  undoLastWinner,
  type DecisionOption,
  type TournamentRun,
} from './tournament'

describe('tournament construction and progression', () => {
  it.each([
    { count: 2, bracketSize: 2, firstRoundByes: 0 },
    { count: 3, bracketSize: 4, firstRoundByes: 1 },
    { count: 5, bracketSize: 8, firstRoundByes: 3 },
    { count: 15, bracketSize: 16, firstRoundByes: 1 },
    { count: 16, bracketSize: 16, firstRoundByes: 0 },
  ])(
    'supports $count options with balanced automatic byes',
    ({ count, bracketSize, firstRoundByes }) => {
      const options = makeOptions(count)
      const run = orderedRun(options)
      const snapshot = deriveTournament(options, run)
      const firstRound = snapshot.rounds[0]

      expect(snapshot.bracketSize).toBe(bracketSize)
      expect(firstRound?.matches.filter((match) => match.automatic)).toHaveLength(
        firstRoundByes,
      )
      expect(
        firstRound?.matches.every(
          (match) => match.entrantIds[0] !== null || match.entrantIds[1] !== null,
        ),
      ).toBe(true)

      const completed = finishTournament(options, run)
      expect(completed.decisions).toHaveLength(count - 1)
      expect(deriveTournament(options, completed).complete).toBe(true)
    },
  )

  it('spreads contested first-round matches across bracket halves', () => {
    const options = makeOptions(6)
    const snapshot = deriveTournament(options, orderedRun(options))
    const contestedIndexes = snapshot.rounds[0]?.matches
      .map((match, index) => ({ match, index }))
      .filter(({ match }) => !match.automatic)
      .map(({ index }) => index)

    expect(contestedIndexes).toEqual([0, 2])
  })

  it('derives the same matchup from the same seed and decisions', () => {
    const options = makeOptions(5)
    let run = orderedRun(options)
    const first = deriveTournament(options, run).currentMatch
    if (first === null) {
      throw new Error('Expected an opening matchup')
    }
    run = chooseWinner(options, run, first.entrantIds[1])

    const firstDerivation = deriveTournament(options, run)
    const secondDerivation = deriveTournament(options, {
      seedOrder: [...run.seedOrder],
      decisions: [...run.decisions],
    })

    expect(secondDerivation).toEqual(firstDerivation)
  })

  it('uses an injected random source for deterministic shuffling', () => {
    const options = makeOptions(5)
    const samples = [0.1, 0.8, 0.3, 0.6]
    let index = 0
    const run = createTournamentRun(options, () => samples[index++] ?? 0)

    expect(run.seedOrder).toEqual(['option-3', 'option-2', 'option-5', 'option-4', 'option-1'])
    expect(createTournamentRun(options, () => 0).seedOrder).toEqual([
      'option-2',
      'option-3',
      'option-4',
      'option-5',
      'option-1',
    ])
  })

  it('rejects decisions outside the current matchup and extra history', () => {
    const options = makeOptions(3)
    const run = orderedRun(options)
    const current = deriveTournament(options, run).currentMatch
    if (current === null) {
      throw new Error('Expected an opening matchup')
    }
    const outsider = options.find((option) => !current.entrantIds.includes(option.id))

    expect(() => chooseWinner(options, run, outsider?.id ?? 'missing')).toThrowError(
      TournamentError,
    )
    expect(() =>
      deriveTournament(options, { ...run, decisions: ['missing-option'] }),
    ).toThrowError(/does not belong/)

    const completed = finishTournament(options, run)
    expect(() =>
      deriveTournament(options, {
        ...completed,
        decisions: [...completed.decisions, completed.decisions[0] ?? 'option-1'],
      }),
    ).toThrowError(/after the tournament finished/)
  })

  it('undo restores the previous deterministic matchup', () => {
    const options = makeOptions(5)
    let run = orderedRun(options)
    const firstMatch = deriveTournament(options, run).currentMatch
    if (firstMatch === null) {
      throw new Error('Expected an opening matchup')
    }
    run = chooseWinner(options, run, firstMatch.entrantIds[0])
    const stateAfterFirstChoice = deriveTournament(options, run)
    const secondMatch = stateAfterFirstChoice.currentMatch
    if (secondMatch === null) {
      throw new Error('Expected a second matchup')
    }
    const afterSecondChoice = chooseWinner(options, run, secondMatch.entrantIds[1])

    const undone = undoLastWinner(afterSecondChoice)

    expect(undone).toEqual(run)
    expect(deriveTournament(options, undone)).toEqual(stateAfterFirstChoice)
    expect(undoLastWinner(orderedRun(options))).toEqual(orderedRun(options))
  })
})

function makeOptions(count: number): DecisionOption[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `option-${index + 1}`,
    name: `Option ${index + 1}`,
  }))
}

function orderedRun(options: readonly DecisionOption[]): TournamentRun {
  return { seedOrder: options.map((option) => option.id), decisions: [] }
}

function finishTournament(
  options: readonly DecisionOption[],
  initialRun: TournamentRun,
): TournamentRun {
  let run = initialRun
  while (true) {
    const snapshot = deriveTournament(options, run)
    if (snapshot.complete) {
      return run
    }
    const currentMatch = snapshot.currentMatch
    if (currentMatch === null) {
      throw new Error('Incomplete tournament did not expose a matchup')
    }
    run = chooseWinner(options, run, currentMatch.entrantIds[0])
  }
}
