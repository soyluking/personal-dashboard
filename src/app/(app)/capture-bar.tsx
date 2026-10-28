import { captureTask } from "./actions";

// `day` es el día de la vista: lo que se anota sin fecha queda ahí. Sin `day` (bandeja), queda sin fecha.
export function CaptureBar({ day, hint }: { day?: string; hint: string }) {
  return (
    <div className="sticky bottom-0 bg-gradient-to-t from-background/70 to-transparent px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-8 sm:px-6">
      <form action={captureTask} className="mx-auto max-w-3xl">
        <input type="hidden" name="day" value={day ?? ""} />
        <div className="glass flex items-center gap-2 rounded-full py-2 pl-5 pr-2">
          <input
            name="text"
            autoFocus
            autoComplete="off"
            placeholder="Anotar… (mañana 15:30, el lunes, 5/11)"
            className="min-w-0 flex-1 bg-transparent py-1.5 text-base outline-none placeholder:text-muted"
          />
          <button aria-label="Agregar" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-lg text-white transition-opacity hover:opacity-90">
            ↑
          </button>
        </div>
        <p className="mt-1.5 text-center text-xs text-muted">{hint}</p>
      </form>
    </div>
  );
}
