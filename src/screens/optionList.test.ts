import { describe, expect, it } from 'vitest'
import { MAX_OPTIONS, mergeOptionList } from './optionList'

interface TestOption {
  id: string
  name: string
  metadata?: string
}

describe('option list merge', () => {
  it('parses comma and semicolon separators while ignoring whitespace and empty segments', () => {
    const result = mergeOptionList<TestOption>([], '  Pizza, , Sushi ; ; Hamburguesa  ')

    expect(result).toEqual({
      ok: true,
      existingOptions: [],
      newNames: ['Pizza', 'Sushi', 'Hamburguesa'],
      blankOptionCount: 0,
    })
  })

  it('preserves named options and removes blank placeholders', () => {
    const pizza = { id: 'pizza', name: 'Pizza', metadata: 'preserved' }
    const sushi = { id: 'sushi', name: 'Sushi' }
    const result = mergeOptionList(
      [pizza, { id: 'blank-1', name: '' }, sushi, { id: 'blank-2', name: '   ' }],
      'Tacos',
    )

    expect(result).toEqual({
      ok: true,
      existingOptions: [pizza, sushi],
      newNames: ['Tacos'],
      blankOptionCount: 0,
    })
  })

  it('keeps at least two option rows after replacing blank placeholders', () => {
    const result = mergeOptionList<TestOption>(
      [
        { id: 'blank-1', name: '' },
        { id: 'blank-2', name: ' ' },
      ],
      'Pizza',
    )

    expect(result).toEqual({
      ok: true,
      existingOptions: [],
      newNames: ['Pizza'],
      blankOptionCount: 1,
    })
  })

  it('allows a successful merge to reach exactly the maximum of 16 options', () => {
    const existingOptions = Array.from({ length: MAX_OPTIONS - 1 }, (_, index) => ({
      id: `existing-${index}`,
      name: `Existing ${index}`,
    }))
    const result = mergeOptionList(existingOptions, 'Final option')

    expect(result).toEqual({
      ok: true,
      existingOptions,
      newNames: ['Final option'],
      blankOptionCount: 0,
    })
  })

  it('rejects overflow without changing the existing options', () => {
    const existingOptions = Array.from({ length: MAX_OPTIONS - 1 }, (_, index) => ({
      id: `existing-${index}`,
      name: `Existing ${index}`,
    }))
    const originalOptions = structuredClone(existingOptions)

    expect(mergeOptionList(existingOptions, 'Option 16, Option 17')).toEqual({
      ok: false,
      error: 'too-many-options',
      availableSlots: 1,
    })
    expect(existingOptions).toEqual(originalOptions)
  })

  it('rejects a pasted name matching an existing name case-insensitively', () => {
    const existingOptions = [{ id: 'pizza', name: 'Pizza' }]
    const originalOptions = structuredClone(existingOptions)

    expect(mergeOptionList(existingOptions, '  pIzZa  ')).toEqual({
      ok: false,
      error: 'duplicate-option',
    })
    expect(existingOptions).toEqual(originalOptions)
  })

  it('rejects case-insensitive duplicates within pasted names', () => {
    const existingOptions = [{ id: 'sushi', name: 'Sushi' }]
    const originalOptions = structuredClone(existingOptions)

    expect(mergeOptionList(existingOptions, 'Pizza; pIZZa')).toEqual({
      ok: false,
      error: 'duplicate-option',
    })
    expect(existingOptions).toEqual(originalOptions)
  })

  it('rejects pre-existing case-insensitive duplicates before adding a unique name', () => {
    const existingOptions = [
      { id: 'pizza-1', name: 'Pizza' },
      { id: 'pizza-2', name: '  pIZZa  ' },
      { id: 'blank', name: '' },
    ]
    const originalOptions = structuredClone(existingOptions)

    expect(mergeOptionList(existingOptions, 'Sushi')).toEqual({
      ok: false,
      error: 'duplicate-option',
    })
    expect(existingOptions).toEqual(originalOptions)
  })
})
