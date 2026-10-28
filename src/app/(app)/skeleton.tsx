// Esqueleto que se ve al instante mientras llegan los datos de la página.
export function ListSkeleton() {
  return (
    <div className="flex min-h-dvh flex-col" aria-hidden>
      <main className="mx-auto w-full max-w-3xl flex-1 animate-pulse px-3 pb-6 pt-3 sm:px-6 md:pt-8">
        <div className="mb-6 ml-14 h-10 rounded-full bg-hover md:ml-0" />
        <ul className="flex flex-col gap-1">
          {Array.from({ length: 7 }, (_, i) => (
            <li key={i} className="flex items-center gap-3 px-2 py-2.5">
              <div className="size-6 shrink-0 rounded-md bg-hover" />
              <div className="h-4 rounded bg-hover" style={{ width: `${45 + ((i * 17) % 40)}%` }} />
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
