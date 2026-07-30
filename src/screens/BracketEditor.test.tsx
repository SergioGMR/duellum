// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BracketEditor } from './BracketEditor'

afterEach(() => {
  cleanup()
})

describe('BracketEditor bulk creation disclosure', () => {
  it('starts collapsed and exposes its expanded state accessibly', () => {
    const toggle = renderEditor()

    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(toggle.getAttribute('aria-controls')).toBe('option-list-panel')
    expect(screen.queryByRole('textbox', { name: 'Añadir varias opciones' })).toBeNull()

    fireEvent.click(toggle)

    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('textbox', { name: 'Añadir varias opciones' })).not.toBeNull()
    expect(document.getElementById('option-list-panel')).not.toBeNull()
  })

  it('preserves the entered list after collapsing and reopening', () => {
    const toggle = renderEditor()
    fireEvent.click(toggle)
    const optionList = screen.getByRole('textbox', {
      name: 'Añadir varias opciones',
    }) as HTMLTextAreaElement

    fireEvent.change(optionList, { target: { value: 'Pizza, Sushi' } })
    fireEvent.click(toggle)
    expect(screen.queryByRole('textbox', { name: 'Añadir varias opciones' })).toBeNull()

    fireEvent.click(toggle)

    expect(
      (screen.getByRole('textbox', {
        name: 'Añadir varias opciones',
      }) as HTMLTextAreaElement).value,
    ).toBe('Pizza, Sushi')
  })

  it('collapses after creating valid options', () => {
    const toggle = renderEditor()
    fireEvent.click(toggle)
    fireEvent.change(screen.getByRole('textbox', { name: 'Añadir varias opciones' }), {
      target: { value: 'Pizza, Sushi' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Crear opciones' }))

    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('textbox', { name: 'Añadir varias opciones' })).toBeNull()
    expect((screen.getByRole('textbox', { name: 'Opción 1' }) as HTMLInputElement).value).toBe(
      'Pizza',
    )
    expect((screen.getByRole('textbox', { name: 'Opción 2' }) as HTMLInputElement).value).toBe(
      'Sushi',
    )
  })

  it('stays open and announces a validation error when creation fails', () => {
    const toggle = renderEditor()
    fireEvent.click(toggle)

    fireEvent.click(screen.getByRole('button', { name: 'Crear opciones' }))

    const optionList = screen.getByRole('textbox', {
      name: 'Añadir varias opciones',
    })
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(optionList.getAttribute('aria-invalid')).toBe('true')
    expect(
      screen.getByText('Escribe al menos una opción separada por coma o punto y coma.').textContent,
    ).toBe('Escribe al menos una opción separada por coma o punto y coma.')
  })
})

function renderEditor(): HTMLElement {
  render(<BracketEditor bracket={null} onCancel={vi.fn()} onSave={vi.fn()} />)
  return screen.getByRole('button', { name: 'Creación masiva' })
}
