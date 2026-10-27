"use client";

import { useEffect, useRef } from "react";

type Props = { label: string; children: React.ReactNode };

// Menú desplegable sobre <details> que se cierra al tocar afuera o con Escape.
export function Menu({ label, children }: Props) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const close = (e: Event) => {
      const el = ref.current;
      if (!el?.open) return;
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !el.contains(e.target as Node)) {
        el.open = false;
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, []);

  return (
    <details ref={ref} className="relative">
      <summary
        aria-label={label}
        className="flex size-7 list-none items-center justify-center rounded-md text-muted transition-colors hover:bg-line hover:text-foreground [&::-webkit-details-marker]:hidden"
      >
        ⋯
      </summary>
      <div className="absolute right-0 top-8 z-10 flex w-52 flex-col rounded-xl border border-line bg-surface p-1 shadow-lg shadow-black/10">
        {children}
      </div>
    </details>
  );
}
