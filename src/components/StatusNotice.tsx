interface StatusNoticeProps {
  message: string
  onDismiss: () => void
}

export function StatusNotice({ message, onDismiss }: StatusNoticeProps) {
  return (
    <div className="mx-auto w-full max-w-7xl px-5 sm:px-8" role="status">
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
        <p>{message}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="min-h-11 shrink-0 rounded-xl px-3 font-bold text-amber-100 hover:bg-amber-100/10"
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}
