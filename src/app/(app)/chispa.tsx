// Chispa: brilla más con cada cosa hecha del día y nunca se apaga por lo que falta.
// Habla con frases escritas, sin AI. Solo en la experiencia «juego».

export type Mood = "hola" | "feliz" | "fiesta";
export type Line = { text: string; mood: Mood };

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

const CHEERS = [
  "¡Eso!",
  "¡Una menos!",
  "¡Buena!",
  "¡Bacán!",
  "¡Brillo más gracias a ti!",
  "¡Vas volando!",
  "¡Seguimos!",
  "¡Qué rico tacharla!",
  "¡Imparable!",
];

const ALL_DONE = ["¡Día completo! Brillo a full ✨", "¡Todo listo! Te ganaste el descanso", "¡Lo hiciste todo! 🎉"];

export function greeting(name: string | null, now: string, empty: boolean): Line {
  const hour = Number(now.slice(0, 2));
  const hello = hour < 12 ? "¡Buenos días" : hour < 20 ? "¡Buenas tardes" : "¡Buenas noches";
  const who = name ? `, ${name.split(" ")[0]}` : "";
  return { mood: "hola", text: `${hello}${who}! ${empty ? "Anota lo primero y partimos." : "¿Con cuál partimos?"}` };
}

export function cheer(allDone: boolean): Line {
  return allDone ? { mood: "fiesta", text: pick(ALL_DONE) } : { mood: "feliz", text: pick(CHEERS) };
}

// `glow` son las cosas hechas del día: solo suma.
export function Chispa({ line, glow, stars, lineKey }: { line: Line; glow: number; stars: number; lineKey: number }) {
  const g = Math.min(glow, 10);
  return (
    <div className="mb-4 flex items-center gap-3 px-1">
      <div
        key={lineKey}
        className="chispa-bounce shrink-0"
        style={{
          filter: `drop-shadow(0 0 ${4 + g * 2.2}px rgb(255 170 40 / ${0.35 + g * 0.05}))`,
          transform: `scale(${1 + g * 0.025})`,
        }}
      >
        <Face mood={line.mood} />
      </div>
      <p key={`t${lineKey}`} role="status" className="row-in min-w-0 flex-1 rounded-2xl rounded-bl-sm bg-card px-4 py-2.5 text-[15px] font-medium shadow-[0_2px_10px_rgb(124_77_255/0.12)]">
        {line.text}
      </p>
      <span aria-label={`${stars} estrellas`} className="shrink-0 rounded-full bg-card px-3 py-1.5 text-sm font-semibold tabular-nums shadow-[0_2px_10px_rgb(245_158_11/0.2)]">
        ⭐ {stars}
      </span>
    </div>
  );
}

function Face({ mood }: { mood: Mood }) {
  const happy = mood !== "hola";
  return (
    <svg viewBox="0 0 100 100" className="chispa-float size-16" aria-hidden>
      <defs>
        <radialGradient id="chispa-body" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#fff3b0" />
          <stop offset="55%" stopColor="#ffc93c" />
          <stop offset="100%" stopColor="#ff8a1f" />
        </radialGradient>
      </defs>
      {/* Las cuatro puntas de la chispa, detrás del cuerpo. */}
      <path d="M50 2 C56 30 70 44 98 50 C70 56 56 70 50 98 C44 70 30 56 2 50 C30 44 44 30 50 2Z" fill="#ffd166" opacity="0.9" />
      <circle cx="50" cy="52" r="27" fill="url(#chispa-body)" />
      {happy ? (
        <g fill="none" stroke="#5b3410" strokeWidth="3.4" strokeLinecap="round">
          <path d="M37 49 q4 -6 8 0" />
          <path d="M55 49 q4 -6 8 0" />
        </g>
      ) : (
        <g fill="#5b3410">
          <ellipse cx="41" cy="48" rx="3.2" ry="4.2" />
          <ellipse cx="59" cy="48" rx="3.2" ry="4.2" />
          <circle cx="42.2" cy="46.5" r="1.1" fill="#fff" />
          <circle cx="60.2" cy="46.5" r="1.1" fill="#fff" />
        </g>
      )}
      <circle cx="34" cy="58" r="4" fill="#ff7a7a" opacity="0.45" />
      <circle cx="66" cy="58" r="4" fill="#ff7a7a" opacity="0.45" />
      {mood === "fiesta" ? (
        <path d="M41 58 q9 12 18 0 z" fill="#5b3410" />
      ) : (
        <path d={happy ? "M40 58 q10 9 20 0" : "M43 59 q7 5 14 0"} fill="none" stroke="#5b3410" strokeWidth="3.2" strokeLinecap="round" />
      )}
      {mood === "fiesta" && (
        <g fill="#7c4dff">
          <path d="M14 18 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" />
          <path d="M84 14 l1.5 4 4 1.5 -4 1.5 -1.5 4 -1.5 -4 -4 -1.5 4 -1.5z" />
          <path d="M86 80 l1.5 4 4 1.5 -4 1.5 -1.5 4 -1.5 -4 -4 -1.5 4 -1.5z" />
        </g>
      )}
    </svg>
  );
}
