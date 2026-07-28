interface AppHeaderProps {
  onHome: () => void
}

export function AppHeader({ onHome }: AppHeaderProps) {
  return (
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 sm:py-7">
      <button
        type="button"
        className="group flex min-h-11 items-center gap-3 rounded-xl text-left"
        onClick={onHome}
        aria-label="Ir a la biblioteca de cuadros"
      >
        <span className="display-type grid size-10 rotate-3 place-items-center rounded-xl bg-electric text-xl text-ink transition-transform group-hover:-rotate-3 motion-reduce:transition-none">
          D
        </span>
        <span>
          <span className="display-type block text-xl leading-none text-white">Duellum</span>
          <span className="mt-1 block text-[0.65rem] font-bold tracking-[0.2em] text-slate-500 uppercase">
            Cuadros de decisión
          </span>
        </span>
      </button>
      <span className="hidden rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold tracking-wider text-slate-400 uppercase sm:block">
        Local. Directo. Tuyo.
      </span>
    </header>
  )
}
