import { deriveTournament, type DecisionOption, type TournamentRun } from '../domain/tournament'
import {
  EMPTY_APP_STATE,
  type AppState,
  type DecisionBracket,
} from '../state/appState'

const STORAGE_KEY = 'duellum.app-state'
const STORAGE_VERSION = 1

interface StorageEnvelope {
  version: typeof STORAGE_VERSION
  data: AppState
}

export interface LoadStateResult {
  state: AppState
  notice: string | null
}

export interface SaveStateResult {
  ok: boolean
  notice: string | null
}

export function loadAppState(): LoadStateResult {
  try {
    return loadAppStateFromStorage(window.localStorage)
  } catch {
    return {
      state: EMPTY_APP_STATE,
      notice:
        'El almacenamiento local no está disponible. Los cambios solo se conservarán durante esta visita.',
    }
  }
}

export function saveAppState(state: AppState): SaveStateResult {
  try {
    const envelope: StorageEnvelope = {
      version: STORAGE_VERSION,
      data: state,
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope))
    return { ok: true, notice: null }
  } catch {
    return {
      ok: false,
      notice:
        'Duellum no pudo guardar los cambios en este dispositivo. Mantén abierta esta pestaña para no perder el progreso.',
    }
  }
}

export function loadAppStateFromStorage(storage: Pick<Storage, 'getItem'>): LoadStateResult {
  let rawValue: string | null
  try {
    rawValue = storage.getItem(STORAGE_KEY)
  } catch {
    return {
      state: EMPTY_APP_STATE,
      notice:
        'El almacenamiento local no está disponible. Los cambios solo se conservarán durante esta visita.',
    }
  }

  if (rawValue === null) {
    return { state: EMPTY_APP_STATE, notice: null }
  }

  try {
    const value: unknown = JSON.parse(rawValue)
    if (!isRecord(value) || value.version !== STORAGE_VERSION || !isRecord(value.data)) {
      return recoveredEmptyState()
    }

    const rawBrackets = value.data.brackets
    if (!Array.isArray(rawBrackets)) {
      return recoveredEmptyState()
    }

    const brackets: DecisionBracket[] = []
    const bracketIds = new Set<string>()
    let recovered = false

    for (const rawBracket of rawBrackets) {
      const parsed = parseBracket(rawBracket)
      if (parsed === null || bracketIds.has(parsed.bracket.id)) {
        recovered = true
        continue
      }
      bracketIds.add(parsed.bracket.id)
      brackets.push(parsed.bracket)
      recovered ||= parsed.recovered
    }

    return {
      state: { brackets },
      notice: recovered
        ? 'Parte del progreso guardado era incompatible y se reinició de forma segura.'
        : null,
    }
  } catch {
    return recoveredEmptyState()
  }
}

function parseBracket(value: unknown): { bracket: DecisionBracket; recovered: boolean } | null {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.title) ||
    !Number.isFinite(value.createdAt) ||
    !Number.isFinite(value.updatedAt) ||
    !Array.isArray(value.options) ||
    value.options.length < 2 ||
    value.options.length > 16
  ) {
    return null
  }

  const options: DecisionOption[] = []
  const optionIds = new Set<string>()
  const optionNames = new Set<string>()
  for (const rawOption of value.options) {
    const option = parseOption(rawOption)
    const normalizedName = option?.name.toLocaleLowerCase()
    if (
      option === null ||
      optionIds.has(option.id) ||
      normalizedName === undefined ||
      optionNames.has(normalizedName)
    ) {
      return null
    }
    optionIds.add(option.id)
    optionNames.add(normalizedName)
    options.push(option)
  }

  let run: TournamentRun | null = null
  let recovered = false
  if (value.run !== null) {
    run = parseRun(value.run)
    if (run === null) {
      recovered = true
    } else {
      try {
        deriveTournament(options, run)
      } catch {
        run = null
        recovered = true
      }
    }
  }

  return {
    bracket: {
      id: value.id.trim(),
      title: value.title.trim(),
      options,
      createdAt: Number(value.createdAt),
      updatedAt: Number(value.updatedAt),
      run,
    },
    recovered,
  }
}

function parseOption(value: unknown): DecisionOption | null {
  if (!isRecord(value) || !isNonEmptyString(value.id) || !isNonEmptyString(value.name)) {
    return null
  }

  const option: DecisionOption = {
    id: value.id.trim(),
    name: value.name.trim(),
  }
  if (isNonEmptyString(value.imageUrl)) {
    option.imageUrl = value.imageUrl.trim()
  }
  if (isNonEmptyString(value.linkUrl)) {
    option.linkUrl = value.linkUrl.trim()
  }
  return option
}

function parseRun(value: unknown): TournamentRun | null {
  if (
    !isRecord(value) ||
    !Array.isArray(value.seedOrder) ||
    !value.seedOrder.every(isNonEmptyString) ||
    !Array.isArray(value.decisions) ||
    !value.decisions.every(isNonEmptyString)
  ) {
    return null
  }

  return {
    seedOrder: value.seedOrder.map((id) => id.trim()),
    decisions: value.decisions.map((id) => id.trim()),
  }
}

function recoveredEmptyState(): LoadStateResult {
  return {
    state: EMPTY_APP_STATE,
    notice: 'No se pudieron leer los datos guardados. Duellum se inició con una biblioteca vacía.',
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== ''
}
