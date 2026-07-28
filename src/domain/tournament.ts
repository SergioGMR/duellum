export type OptionId = string

export interface DecisionOption {
  id: OptionId
  name: string
  imageUrl?: string
  linkUrl?: string
}

export interface TournamentRun {
  seedOrder: readonly OptionId[]
  decisions: readonly OptionId[]
}

export type MatchStatus = 'complete' | 'ready' | 'waiting'

export interface TournamentMatch {
  id: string
  roundNumber: number
  matchNumber: number
  entrantIds: readonly [OptionId | null, OptionId | null]
  winnerId: OptionId | null
  status: MatchStatus
  automatic: boolean
}

export interface TournamentRound {
  roundNumber: number
  matches: readonly TournamentMatch[]
}

export interface ActiveMatch {
  id: string
  roundNumber: number
  matchNumber: number
  entrantIds: readonly [OptionId, OptionId]
}

export interface TournamentSnapshot {
  bracketSize: number
  rounds: readonly TournamentRound[]
  currentMatch: ActiveMatch | null
  winnerId: OptionId | null
  decisionsMade: number
  totalDecisions: number
  complete: boolean
}

export type TournamentErrorCode =
  | 'INVALID_OPTIONS'
  | 'INVALID_SEED_ORDER'
  | 'INVALID_DECISION'
  | 'INVALID_RANDOM_SOURCE'
  | 'TOURNAMENT_COMPLETE'

export class TournamentError extends Error {
  readonly code: TournamentErrorCode

  constructor(code: TournamentErrorCode, message: string) {
    super(message)
    this.name = 'TournamentError'
    this.code = code
  }
}

export function createTournamentRun(
  options: readonly DecisionOption[],
  random: () => number = Math.random,
): TournamentRun {
  validateOptions(options)

  const seedOrder = options.map((option) => option.id)
  for (let index = seedOrder.length - 1; index > 0; index -= 1) {
    const sample = random()
    if (!Number.isFinite(sample) || sample < 0 || sample >= 1) {
      throw new TournamentError(
        'INVALID_RANDOM_SOURCE',
        'Random source must return a number from 0 up to, but not including, 1.',
      )
    }

    const swapIndex = Math.floor(sample * (index + 1))
    const current = seedOrder[index]
    const replacement = seedOrder[swapIndex]
    if (current === undefined || replacement === undefined) {
      throw new TournamentError('INVALID_OPTIONS', 'Options could not be shuffled.')
    }
    seedOrder[index] = replacement
    seedOrder[swapIndex] = current
  }

  return { seedOrder, decisions: [] }
}

export function deriveTournament(
  options: readonly DecisionOption[],
  run: TournamentRun,
): TournamentSnapshot {
  validateOptions(options)
  validateSeedOrder(options, run.seedOrder)

  const bracketSize = nextPowerOfTwo(options.length)
  let participants = buildFirstRound(run.seedOrder, bracketSize)
  const rounds: TournamentRound[] = []
  let currentMatch: ActiveMatch | null = null
  let decisionCursor = 0

  for (let roundIndex = 0; participants.length > 1; roundIndex += 1) {
    const matches: TournamentMatch[] = []
    const nextParticipants: Array<OptionId | null> = []
    let roundComplete = true

    for (let matchIndex = 0; matchIndex < participants.length / 2; matchIndex += 1) {
      const left = participants[matchIndex * 2] ?? null
      const right = participants[matchIndex * 2 + 1] ?? null
      const matchId = `round-${roundIndex + 1}-match-${matchIndex + 1}`

      if (left === null && right === null) {
        throw new TournamentError(
          'INVALID_SEED_ORDER',
          'Bracket construction produced an empty matchup.',
        )
      }

      let winnerId: OptionId | null = null
      let status: MatchStatus = 'complete'
      const automatic = left === null || right === null

      if (automatic) {
        winnerId = left ?? right
      } else if (decisionCursor < run.decisions.length) {
        const recordedWinner = run.decisions[decisionCursor]
        if (recordedWinner !== left && recordedWinner !== right) {
          throw new TournamentError(
            'INVALID_DECISION',
            `Decision ${decisionCursor + 1} does not belong to its matchup.`,
          )
        }
        winnerId = recordedWinner
        decisionCursor += 1
      } else {
        status = currentMatch === null ? 'ready' : 'waiting'
        roundComplete = false
        if (currentMatch === null) {
          currentMatch = {
            id: matchId,
            roundNumber: roundIndex + 1,
            matchNumber: matchIndex + 1,
            entrantIds: [left, right],
          }
        }
      }

      matches.push({
        id: matchId,
        roundNumber: roundIndex + 1,
        matchNumber: matchIndex + 1,
        entrantIds: [left, right],
        winnerId,
        status,
        automatic,
      })
      nextParticipants.push(winnerId)
    }

    rounds.push({ roundNumber: roundIndex + 1, matches })
    if (!roundComplete) {
      break
    }

    participants = nextParticipants
  }

  if (decisionCursor !== run.decisions.length) {
    throw new TournamentError(
      'INVALID_DECISION',
      'Decision history contains choices after the tournament finished.',
    )
  }

  const finalRound = rounds.at(-1)
  const finalMatch = finalRound?.matches[0]
  const complete =
    participants.length === 1 &&
    currentMatch === null &&
    finalMatch?.status === 'complete' &&
    finalMatch.winnerId !== null
  const winnerId = complete ? finalMatch.winnerId : null
  const totalDecisions = options.length - 1

  if (complete && decisionCursor !== totalDecisions) {
    throw new TournamentError(
      'INVALID_DECISION',
      'A completed tournament must contain exactly one fewer decision than options.',
    )
  }

  return {
    bracketSize,
    rounds,
    currentMatch: complete ? null : currentMatch,
    winnerId,
    decisionsMade: decisionCursor,
    totalDecisions,
    complete,
  }
}

export function chooseWinner(
  options: readonly DecisionOption[],
  run: TournamentRun,
  winnerId: OptionId,
): TournamentRun {
  const snapshot = deriveTournament(options, run)
  if (snapshot.complete || snapshot.currentMatch === null) {
    throw new TournamentError('TOURNAMENT_COMPLETE', 'Tournament has no open matchup.')
  }

  if (!snapshot.currentMatch.entrantIds.includes(winnerId)) {
    throw new TournamentError(
      'INVALID_DECISION',
      'Selected winner does not belong to the current matchup.',
    )
  }

  return { ...run, decisions: [...run.decisions, winnerId] }
}

export function undoLastWinner(run: TournamentRun): TournamentRun {
  if (run.decisions.length === 0) {
    return run
  }
  return { ...run, decisions: run.decisions.slice(0, -1) }
}

function validateOptions(options: readonly DecisionOption[]): void {
  if (options.length < 2 || options.length > 16) {
    throw new TournamentError('INVALID_OPTIONS', 'Tournament requires 2 to 16 options.')
  }

  const ids = new Set<string>()
  for (const option of options) {
    if (option.id.trim() === '' || option.name.trim() === '' || ids.has(option.id)) {
      throw new TournamentError(
        'INVALID_OPTIONS',
        'Options require unique IDs and non-empty names.',
      )
    }
    ids.add(option.id)
  }
}

function validateSeedOrder(
  options: readonly DecisionOption[],
  seedOrder: readonly OptionId[],
): void {
  const optionIds = new Set(options.map((option) => option.id))
  const seededIds = new Set(seedOrder)
  if (
    seedOrder.length !== options.length ||
    seededIds.size !== seedOrder.length ||
    [...seededIds].some((id) => !optionIds.has(id))
  ) {
    throw new TournamentError(
      'INVALID_SEED_ORDER',
      'Seed order must contain every option exactly once.',
    )
  }
}

function nextPowerOfTwo(value: number): number {
  let result = 1
  while (result < value) {
    result *= 2
  }
  return result
}

function buildFirstRound(
  seedOrder: readonly OptionId[],
  bracketSize: number,
): Array<OptionId | null> {
  const slots: Array<OptionId | null> = Array.from({ length: bracketSize }, () => null)
  const pairCount = bracketSize / 2

  for (let pairIndex = 0; pairIndex < pairCount; pairIndex += 1) {
    slots[pairIndex * 2] = seedOrder[pairIndex] ?? null
  }

  const extraCount = seedOrder.length - pairCount
  const balancedPairs = bitReversedOrder(pairCount)
  for (let extraIndex = 0; extraIndex < extraCount; extraIndex += 1) {
    const pairIndex = balancedPairs[extraIndex]
    const optionId = seedOrder[pairCount + extraIndex]
    if (pairIndex === undefined || optionId === undefined) {
      throw new TournamentError('INVALID_SEED_ORDER', 'Seed order could not fill the bracket.')
    }
    slots[pairIndex * 2 + 1] = optionId
  }

  return slots
}

function bitReversedOrder(size: number): number[] {
  const bitCount = Math.log2(size)
  return Array.from({ length: size }, (_, value) => {
    let source = value
    let reversed = 0
    for (let bit = 0; bit < bitCount; bit += 1) {
      reversed = reversed * 2 + (source % 2)
      source = Math.floor(source / 2)
    }
    return reversed
  })
}
