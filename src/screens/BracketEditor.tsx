import { useState, type FormEvent } from 'react'
import type { DecisionOption } from '../domain/tournament'
import { createId } from '../shared/id'
import type { DecisionBracket } from '../state/appState'
import { MAX_OPTIONS, mergeOptionList, MIN_OPTIONS, normalizeOptionName } from './optionList'

export interface BracketDraft {
  title: string
  options: readonly DecisionOption[]
}

interface BracketEditorProps {
  bracket: DecisionBracket | null
  onCancel: () => void
  onSave: (draft: BracketDraft) => void
}

interface FormErrors {
  title: string | null
  options: Readonly<Record<string, string>>
}

const EMPTY_ERRORS: FormErrors = { title: null, options: {} }

export function BracketEditor({ bracket, onCancel, onSave }: BracketEditorProps) {
  const [title, setTitle] = useState(bracket?.title ?? '')
  const [options, setOptions] = useState<DecisionOption[]>(
    bracket?.options.map((option) => ({ ...option })) ?? [newOption(), newOption()],
  )
  const [optionList, setOptionList] = useState('')
  const [optionListError, setOptionListError] = useState<string | null>(null)
  const [isOptionListOpen, setIsOptionListOpen] = useState(false)
  const [errors, setErrors] = useState<FormErrors>(EMPTY_ERRORS)

  function updateOption(optionId: string, name: string) {
    setOptions((current) =>
      current.map((option) => (option.id === optionId ? { ...option, name } : option)),
    )
    if (errors.options[optionId] !== undefined) {
      setErrors(EMPTY_ERRORS)
    }
  }

  function removeOption(optionId: string) {
    if (options.length <= MIN_OPTIONS) {
      return
    }
    setOptions((current) => current.filter((option) => option.id !== optionId))
    setOptionListError(null)
    setErrors(EMPTY_ERRORS)
  }

  function addOptionList() {
    const result = mergeOptionList(options, optionList)
    if (!result.ok) {
      if (result.error === 'empty-list') {
        setOptionListError('Escribe al menos una opción separada por coma o punto y coma.')
      } else if (result.error === 'too-many-options') {
        setOptionListError(
          `Solo puedes añadir ${result.availableSlots} ${result.availableSlots === 1 ? 'opción más' : 'opciones más'}.`,
        )
      } else {
        setOptionListError('La lista no puede contener opciones repetidas ni ya existentes.')
      }
      return
    }

    const nextOptions = [
      ...result.existingOptions,
      ...result.newNames.map((name) => newOption(name)),
      ...Array.from({ length: result.blankOptionCount }, () => newOption()),
    ]

    setOptions(nextOptions)
    setOptionList('')
    setOptionListError(null)
    setIsOptionListOpen(false)
    setErrors(EMPTY_ERRORS)
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validation = validateDraft(title, options)
    setErrors(validation)
    if (validation.title !== null || Object.keys(validation.options).length > 0) {
      return
    }

    onSave({
      title: title.trim(),
      options: options.map((option) => ({ ...option, name: option.name.trim() })),
    })
  }

  return (
    <main className="view-enter mx-auto w-full max-w-4xl px-5 pt-10 pb-16 sm:px-8 sm:pt-14">
      <button
        type="button"
        onClick={onCancel}
        className="min-h-11 rounded-xl px-1 text-sm font-bold text-slate-400 hover:text-white"
      >
        Volver a la biblioteca
      </button>
      <div className="mt-6">
        <p className="text-xs font-black tracking-[0.2em] text-electric uppercase">
          {bracket === null ? 'Nuevo cuadro' : 'Editar cuadro'}
        </p>
        <h1 className="display-type mt-3 text-5xl leading-[0.9] text-white sm:text-7xl">
          Nombra las opciones.
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
          Define opciones claras y específicas. Solo compararás dos cada vez.
        </p>
      </div>

      <form className="mt-10 space-y-9" onSubmit={submit} noValidate>
        <div>
          <label htmlFor="bracket-title" className="mb-3 block text-sm font-black text-white">
            Título del cuadro
          </label>
          <input
            id="bracket-title"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value)
              if (errors.title !== null) setErrors(EMPTY_ERRORS)
            }}
            className="min-h-15 w-full rounded-2xl border border-white/15 bg-panel px-5 text-lg font-bold text-white placeholder:text-slate-600 hover:border-white/25"
            placeholder="¿Adónde deberíamos ir este fin de semana?"
            autoComplete="off"
            autoFocus
            aria-invalid={errors.title !== null}
            aria-describedby={errors.title === null ? undefined : 'bracket-title-error'}
          />
          {errors.title !== null && (
            <p id="bracket-title-error" className="mt-2 text-sm font-semibold text-red-300">
              {errors.title}
            </p>
          )}
        </div>

        <fieldset>
          <legend className="sr-only">Opciones</legend>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
               <p className="text-sm font-black text-white" aria-hidden="true">
                 Opciones
               </p>
               <p className="mt-1 text-xs text-slate-500">
                 Mínimo {MIN_OPTIONS}, máximo {MAX_OPTIONS}
               </p>
            </div>
            <span className="text-sm font-black text-slate-500" aria-live="polite">
              {options.length} / {MAX_OPTIONS}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsOptionListOpen((current) => !current)}
            aria-expanded={isOptionListOpen}
            aria-controls="option-list-panel"
            className="mb-3 flex min-h-12 w-full items-center justify-between rounded-2xl border border-white/15 bg-panel/75 px-4 text-sm font-black text-white hover:border-electric/50 hover:text-electric"
          >
            Creación masiva
            <span aria-hidden="true">{isOptionListOpen ? '−' : '+'}</span>
          </button>
          {isOptionListOpen && (
            <div
              id="option-list-panel"
              className="mb-5 rounded-2xl border border-white/10 bg-panel/75 p-4"
            >
              <label htmlFor="option-list" className="text-sm font-black text-white">
                Añadir varias opciones
              </label>
              <p id="option-list-help" className="mt-1 text-xs leading-5 text-slate-500">
                Sepáralas con comas o punto y coma. Las opciones que ya tienen nombre se conservarán.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <textarea
                  id="option-list"
                  value={optionList}
                  onChange={(event) => {
                    setOptionList(event.target.value)
                    if (optionListError !== null) setOptionListError(null)
                  }}
                  rows={3}
                  className="min-h-24 w-full resize-y rounded-xl border border-white/15 bg-ink/40 px-4 py-3 font-bold text-white placeholder:text-slate-600 hover:border-white/25"
                  placeholder="Pizza, Sushi; Hamburguesa"
                  autoComplete="off"
                  aria-invalid={optionListError !== null}
                  aria-describedby={
                    optionListError === null
                      ? 'option-list-help'
                      : 'option-list-help option-list-error'
                  }
                />
                <button
                  type="button"
                  onClick={addOptionList}
                  className="min-h-12 rounded-xl bg-white px-5 font-black text-ink hover:bg-electric"
                >
                  Crear opciones
                </button>
              </div>
              {optionListError !== null && (
                <p id="option-list-error" className="mt-2 text-sm font-semibold text-red-300">
                  {optionListError}
                </p>
              )}
            </div>
          )}
          <div className="space-y-3">
            {options.map((option, index) => {
              const error = errors.options[option.id]
              const inputId = `option-${option.id}`
              return (
                <div key={option.id}>
                  <div className="grid grid-cols-[3rem_1fr_auto] items-center gap-2 rounded-2xl border border-white/10 bg-panel/75 p-2 sm:gap-3">
                    <span
                      className="display-type grid size-10 place-items-center rounded-xl bg-white/5 text-sm text-slate-500"
                      aria-hidden="true"
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <label htmlFor={inputId} className="sr-only">
                        Opción {index + 1}
                      </label>
                      <input
                        id={inputId}
                        value={option.name}
                        onChange={(event) => updateOption(option.id, event.target.value)}
                        className="min-h-12 w-full rounded-xl border border-transparent bg-transparent px-3 font-bold text-white placeholder:text-slate-600 hover:border-white/10"
                        placeholder={`Opción ${index + 1}`}
                        autoComplete="off"
                        aria-invalid={error !== undefined}
                        aria-describedby={error === undefined ? undefined : `${inputId}-error`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeOption(option.id)}
                      disabled={options.length <= MIN_OPTIONS}
                      className="min-h-11 rounded-xl px-3 text-sm font-bold text-slate-500 hover:bg-signal/10 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-25"
                      aria-label={`Eliminar la opción ${index + 1}`}
                    >
                      Eliminar
                    </button>
                  </div>
                  {error !== undefined && (
                    <p id={`${inputId}-error`} className="mt-2 pl-3 text-sm font-semibold text-red-300">
                      {error}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
          <button
            type="button"
            onClick={() => {
              setOptions((current) => [...current, newOption()])
              setOptionListError(null)
            }}
            disabled={options.length >= MAX_OPTIONS}
            className="mt-4 min-h-12 w-full rounded-2xl border border-dashed border-white/20 text-sm font-black text-slate-300 hover:border-electric/50 hover:bg-electric/5 hover:text-electric disabled:cursor-not-allowed disabled:opacity-40"
          >
            Añadir otra opción
          </button>
        </fieldset>

        {bracket?.run !== null && bracket !== null && (
          <p className="rounded-2xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm leading-6 text-amber-100">
            Al guardar cualquier cambio se borrarán las decisiones actuales. El título y las
            opciones actualizadas quedarán listos para empezar de nuevo.
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-7 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-13 rounded-2xl border border-white/15 px-6 font-bold text-slate-300 hover:bg-white/5"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="min-h-13 rounded-2xl bg-electric px-7 font-black text-ink hover:bg-white"
          >
            {bracket === null ? 'Crear cuadro' : 'Guardar y reiniciar el progreso'}
          </button>
        </div>
      </form>
    </main>
  )
}

function validateDraft(title: string, options: readonly DecisionOption[]): FormErrors {
  const optionErrors: Record<string, string> = {}
  const names = new Map<string, string[]>()

  for (const option of options) {
    const trimmedName = option.name.trim()
    if (trimmedName === '') {
      optionErrors[option.id] = 'Escribe un nombre para esta opción.'
      continue
    }
    const normalized = normalizeOptionName(trimmedName)
    names.set(normalized, [...(names.get(normalized) ?? []), option.id])
  }

  for (const duplicateIds of names.values()) {
    if (duplicateIds.length > 1) {
      for (const optionId of duplicateIds) {
        optionErrors[optionId] = 'Los nombres de las opciones no pueden repetirse.'
      }
    }
  }

  return {
    title: title.trim() === '' ? 'Escribe un título para este cuadro.' : null,
    options: optionErrors,
  }
}

function newOption(name = ''): DecisionOption {
  return { id: createId(), name }
}
