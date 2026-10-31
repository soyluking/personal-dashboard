import type { ReactNode } from "react";

// Íconos de línea al estilo Gemini; heredan el color del texto.
export function Icon({ children, size = 22 }: { children: ReactNode; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" width={size} height={size} className="shrink-0">
      {children}
    </svg>
  );
}

export const menuIcon = (
  <Icon>
    <path d="M4 9h16M4 15h16" />
  </Icon>
);

export const closeIcon = (
  <Icon>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);

export const logoutIcon = (
  <Icon>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
  </Icon>
);


export const chevronLeftIcon = (
  <Icon size={18}>
    <path d="M15 6l-6 6 6 6" />
  </Icon>
);

export const chevronRightIcon = (
  <Icon size={18}>
    <path d="M9 6l6 6-6 6" />
  </Icon>
);
