"use client";

import { useLayoutEffect } from "react";

// Aplica el tema de la experiencia y lo recuerda en el dispositivo para la próxima carga (ver el script del layout raíz).
export function ThemeSync({ theme }: { theme: string }) {
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("theme", theme);
    } catch {}
  }, [theme]);
  return null;
}
