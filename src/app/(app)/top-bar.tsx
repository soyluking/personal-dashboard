"use client";

import type { ReactNode } from "react";
import { menuIcon } from "./nav-icons";
import { setMenuOpen } from "./nav-store";

// Barra fija de cada página: el botón del menú (solo celular) y el contenido de la página en la misma fila.
export function TopBar({ children }: { children: ReactNode }) {
  return (
    <div className="topbar">
      <div className="mx-auto flex h-16 w-full max-w-3xl items-center gap-2 px-3 sm:px-6 md:h-20 md:px-6">
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menú"
          className="glass mr-1 flex size-10 shrink-0 items-center justify-center rounded-full transition-transform active:scale-90 md:hidden"
        >
          {menuIcon}
        </button>
        {children}
      </div>
    </div>
  );
}
