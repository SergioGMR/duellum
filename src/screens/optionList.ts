export const MIN_OPTIONS = 2
export const MAX_OPTIONS = 16

interface NamedOption {
  name: string
}

export type MergeOptionListResult<Option extends NamedOption> =
  | {
      ok: true
      existingOptions: readonly Option[]
      newNames: readonly string[]
      blankOptionCount: number
    }
  | {
      ok: false
      error: 'empty-list' | 'duplicate-option'
    }
  | {
      ok: false
      error: 'too-many-options'
      availableSlots: number
    }

export function mergeOptionList<Option extends NamedOption>(
  options: readonly Option[],
  value: string,
): MergeOptionListResult<Option> {
  const newNames = parseOptionList(value)
  if (newNames.length === 0) {
    return { ok: false, error: 'empty-list' }
  }

  const existingOptions = options.filter((option) => option.name.trim() !== '')
  const knownNames = new Set<string>()
  for (const option of existingOptions) {
    const normalizedName = normalizeOptionName(option.name)
    if (knownNames.has(normalizedName)) {
      return { ok: false, error: 'duplicate-option' }
    }
    knownNames.add(normalizedName)
  }

  const availableSlots = MAX_OPTIONS - existingOptions.length
  if (newNames.length > availableSlots) {
    return { ok: false, error: 'too-many-options', availableSlots }
  }

  for (const name of newNames) {
    const normalizedName = normalizeOptionName(name)
    if (knownNames.has(normalizedName)) {
      return { ok: false, error: 'duplicate-option' }
    }
    knownNames.add(normalizedName)
  }

  return {
    ok: true,
    existingOptions,
    newNames,
    blankOptionCount: Math.max(MIN_OPTIONS - existingOptions.length - newNames.length, 0),
  }
}

export function normalizeOptionName(name: string): string {
  return name.trim().toLocaleLowerCase()
}

function parseOptionList(value: string): string[] {
  return value
    .split(/[,;]/)
    .map((name) => name.trim())
    .filter((name) => name !== '')
}
