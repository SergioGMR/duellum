import {
  TournamentError,
  chooseWinner,
  deriveTournament,
  undoLastWinner,
  type DecisionOption,
  type TournamentRun,
  type TournamentSnapshot,
} from '../domain/tournament'

export interface DecisionBracket {
  id: string
  title: string
  options: readonly DecisionOption[]
  createdAt: number
  updatedAt: number
  run: TournamentRun | null
}

export interface AppState {
  brackets: readonly DecisionBracket[]
}

export type AppAction =
  | { type: 'bracket/create'; bracket: DecisionBracket }
  | {
      type: 'bracket/update'
      bracketId: string
      title: string
      options: readonly DecisionOption[]
      updatedAt: number
    }
  | { type: 'bracket/delete'; bracketId: string }
  | { type: 'run/start'; bracketId: string; run: TournamentRun; updatedAt: number }
  | { type: 'run/choose'; bracketId: string; winnerId: string; updatedAt: number }
  | { type: 'run/undo'; bracketId: string; updatedAt: number }

export const EMPTY_APP_STATE: AppState = { brackets: [] }

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'bracket/create':
      return { brackets: [action.bracket, ...state.brackets] }
    case 'bracket/update':
      return updateBracket(state, action.bracketId, (bracket) => ({
        ...bracket,
        title: action.title,
        options: action.options,
        updatedAt: action.updatedAt,
        run: null,
      }))
    case 'bracket/delete':
      return {
        brackets: state.brackets.filter((bracket) => bracket.id !== action.bracketId),
      }
    case 'run/start':
      return updateBracket(state, action.bracketId, (bracket) => ({
        ...bracket,
        run: action.run,
        updatedAt: action.updatedAt,
      }))
    case 'run/choose':
      return updateBracket(state, action.bracketId, (bracket) => {
        if (bracket.run === null) {
          return bracket
        }
        try {
          return {
            ...bracket,
            run: chooseWinner(bracket.options, bracket.run, action.winnerId),
            updatedAt: action.updatedAt,
          }
        } catch (error) {
          if (error instanceof TournamentError) {
            return bracket
          }
          throw error
        }
      })
    case 'run/undo':
      return updateBracket(state, action.bracketId, (bracket) => {
        if (bracket.run === null) {
          return bracket
        }
        return {
          ...bracket,
          run: undoLastWinner(bracket.run),
          updatedAt: action.updatedAt,
        }
      })
  }
}

export function getTournamentSnapshot(bracket: DecisionBracket): TournamentSnapshot | null {
  if (bracket.run === null) {
    return null
  }
  return deriveTournament(bracket.options, bracket.run)
}

function updateBracket(
  state: AppState,
  bracketId: string,
  update: (bracket: DecisionBracket) => DecisionBracket,
): AppState {
  return {
    brackets: state.brackets.map((bracket) =>
      bracket.id === bracketId ? update(bracket) : bracket,
    ),
  }
}
