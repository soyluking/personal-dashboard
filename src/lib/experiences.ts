import type { experienceEnum } from "@/db/schema";

export type ExperienceName = (typeof experienceEnum.enumValues)[number];

// Una sola «Hoy» para todos: lo que cambia entre usuarios es el look y cómo se trata lo no hecho.
// Para probar algo de una experiencia en la otra, se cambia aquí una línea.
export type Experience = {
  label: string;
  theme: "oscuro" | "claro";
  // La hora pasada se marca en rojo.
  overdueAlert: boolean;
  // Contador ↻ y, desde la tercera postergación, pedir decisión.
  postponeCounter: boolean;
  // Áreas de Sharma y bandeja.
  areasAndInbox: boolean;
  // Las hechas se colapsan al final; si no, quedan tachadas a la vista.
  collapseDone: boolean;
  // Lo nuevo sin hora entra arriba de la lista; si no, al final.
  newOnTop: boolean;
  // completa: 🔥 desde 1, «no falles dos veces». positiva: 🔥 desde 2, sin avisos ni ceros.
  streak: "completa" | "positiva";
  // anillo: «3 de 8» y confeti. chispa: estrellas que solo suben, Chispa y sonido.
  reward: "anillo" | "chispa";
};

export const EXPERIENCES: Record<ExperienceName, Experience> = {
  ejecutiva: {
    label: "Ejecutiva",
    theme: "oscuro",
    overdueAlert: true,
    postponeCounter: true,
    areasAndInbox: true,
    collapseDone: true,
    newOnTop: false,
    streak: "completa",
    reward: "anillo",
  },
  juego: {
    label: "Juego",
    theme: "claro",
    overdueAlert: false,
    postponeCounter: false,
    areasAndInbox: false,
    collapseDone: false,
    newOnTop: true,
    streak: "positiva",
    reward: "chispa",
  },
};

export function experienceOf(user: { experience: ExperienceName }): Experience {
  return EXPERIENCES[user.experience];
}

// Estrellas por cada tarea o rutina hecha.
export const STARS_PER_DONE = 10;

// Racha que se muestra: en la positiva solo aparece cuando suma (desde 2) y nunca es «0».
export function visibleStreak(streak: number | null, style: Experience["streak"]): number | null {
  if (!streak) return null;
  if (style === "positiva" && streak < 2) return null;
  return streak;
}
