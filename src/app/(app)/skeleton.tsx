import { TopBar } from "./top-bar";

// Esqueleto que se ve al instante mientras llegan los datos de la página.
export function ListSkeleton() {
  return (
    <div className="flex min-h-dvh flex-col" aria-hidden>
      <TopBar>
        <div className="h-9 flex-1 animate-pulse rounded-full bg-hover" />
      </TopBar>
      <main className="mx-auto w-full max-w-3xl flex-1 animate-pulse px-3 pb-6 pt-4 sm:px-6">
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
