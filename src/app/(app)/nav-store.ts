import { useSyncExternalStore } from "react";

// Estado del menú del celular compartido entre el botón (en la barra) y el panel (en AppNav).
let open = false;
const listeners = new Set<() => void>();

export function setMenuOpen(value: boolean) {
  open = value;
  listeners.forEach((l) => l());
}

export function useMenuOpen() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => open,
    () => false,
  );
}
