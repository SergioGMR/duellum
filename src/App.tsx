import { useEffect, useReducer, useState } from 'react'
import { AppHeader } from './components/AppHeader'
import { StatusNotice } from './components/StatusNotice'
import { createTournamentRun } from './domain/tournament'
import { BracketEditor, type BracketDraft } from './screens/BracketEditor'
import { HomeScreen } from './screens/HomeScreen'
import { ResultScreen } from './screens/ResultScreen'
import { TournamentScreen } from './screens/TournamentScreen'
import { createId } from './shared/id'
import {
  appReducer,
  getTournamentSnapshot,
  type DecisionBracket,
} from './state/appState'
import { loadAppState, saveAppState } from './storage/appStorage'

type View =
  | { name: 'home' }
  | { name: 'create' }
  | { name: 'edit'; bracketId: string }
  | { name: 'play'; bracketId: string }

export default function App() {
  const [initialLoad] = useState(loadAppState)
  const [state, dispatch] = useReducer(appReducer, initialLoad.state)
  const [view, setView] = useState<View>({ name: 'home' })
  const [notice, setNotice] = useState<string | null>(initialLoad.notice)

  useEffect(() => {
    const result = saveAppState(state)
    if (!result.ok) {
      const timeout = window.setTimeout(() => setNotice(result.notice), 0)
      return () => window.clearTimeout(timeout)
    }
  }, [state])

  const activeBracket =
    'bracketId' in view
      ? state.brackets.find((bracket) => bracket.id === view.bracketId) ?? null
      : null

  function createBracket(draft: BracketDraft) {
    const now = currentTimestamp()
    const bracket: DecisionBracket = {
      id: createId(),
      title: draft.title,
      options: draft.options,
      createdAt: now,
      updatedAt: now,
      run: null,
    }
    dispatch({ type: 'bracket/create', bracket })
    setView({ name: 'play', bracketId: bracket.id })
  }

  function updateBracket(bracket: DecisionBracket, draft: BracketDraft) {
    dispatch({
      type: 'bracket/update',
      bracketId: bracket.id,
      title: draft.title,
      options: draft.options,
      updatedAt: currentTimestamp(),
    })
    setView({ name: 'home' })
  }

  function startRun(bracket: DecisionBracket) {
    dispatch({
      type: 'run/start',
      bracketId: bracket.id,
      run: createTournamentRun(bracket.options),
      updatedAt: currentTimestamp(),
    })
    setView({ name: 'play', bracketId: bracket.id })
  }

  function deleteBracket(bracketId: string) {
    dispatch({ type: 'bracket/delete', bracketId })
    setView({ name: 'home' })
  }

  let content
  if (view.name === 'create') {
    content = (
      <BracketEditor
        key="create"
        bracket={null}
        onCancel={() => setView({ name: 'home' })}
        onSave={createBracket}
      />
    )
  } else if (view.name === 'edit' && activeBracket !== null) {
    content = (
      <BracketEditor
        key={activeBracket.id}
        bracket={activeBracket}
        onCancel={() => setView({ name: 'home' })}
        onSave={(draft) => updateBracket(activeBracket, draft)}
      />
    )
  } else if (view.name === 'play' && activeBracket !== null) {
    const snapshot = safelyGetSnapshot(activeBracket)

    content = snapshot?.complete ? (
      <ResultScreen
        bracket={activeBracket}
        snapshot={snapshot}
        onBack={() => setView({ name: 'home' })}
        onReplay={() => startRun(activeBracket)}
        onUndo={() =>
          dispatch({
            type: 'run/undo',
            bracketId: activeBracket.id,
            updatedAt: currentTimestamp(),
          })
        }
      />
    ) : (
      <TournamentScreen
        bracket={activeBracket}
        snapshot={snapshot}
        hasInvalidRun={activeBracket.run !== null && snapshot === null}
        onBack={() => setView({ name: 'home' })}
        onChoose={(winnerId) =>
          dispatch({
            type: 'run/choose',
            bracketId: activeBracket.id,
            winnerId,
            updatedAt: currentTimestamp(),
          })
        }
        onRestart={() => startRun(activeBracket)}
        onStart={() => startRun(activeBracket)}
        onUndo={() =>
          dispatch({
            type: 'run/undo',
            bracketId: activeBracket.id,
            updatedAt: currentTimestamp(),
          })
        }
      />
    )
  } else {
    content = (
      <HomeScreen
        brackets={state.brackets}
        onCreate={() => setView({ name: 'create' })}
        onDelete={deleteBracket}
        onEdit={(bracketId) => setView({ name: 'edit', bracketId })}
        onOpen={(bracketId) => setView({ name: 'play', bracketId })}
      />
    )
  }

  return (
    <div className="app-shell min-h-screen text-white">
      <AppHeader onHome={() => setView({ name: 'home' })} />
      {notice !== null && (
        <StatusNotice message={notice} onDismiss={() => setNotice(null)} />
      )}
      {content}
      <footer className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-8 text-xs text-slate-500 sm:px-8">
        <span>Duellum</span>
        <span>Privado por diseño. Guardado en este dispositivo.</span>
      </footer>
    </div>
  )
}

function safelyGetSnapshot(bracket: DecisionBracket) {
  try {
    return getTournamentSnapshot(bracket)
  } catch {
    return null
  }
}

function currentTimestamp(): number {
  return Date.now()
}
