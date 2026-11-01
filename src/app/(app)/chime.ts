// Sonido corto al completar, sintetizado: sin archivos que descargar. Cambia de tono al azar
// para que no canse. En el iPhone con el modo silencio puede no sonar: lo visual tiene que bastar.
const NOTES = [659.25, 739.99, 783.99, 880, 987.77];
let audio: AudioContext | null = null;

export function chime(big = false) {
  try {
    audio ??= new AudioContext();
    const ctx = audio;
    // iOS lo deja suspendido hasta que se toca algo; esto corre dentro de un toque.
    if (ctx.state === "suspended") void ctx.resume();
    const base = NOTES[Math.floor(Math.random() * NOTES.length)];
    const notes = big ? [base, base * 1.25, base * 1.5, base * 2] : [base, base * 1.5];
    notes.forEach((freq, i) => {
      const t = ctx.currentTime + i * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.16, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  } catch {
    // Sin audio no pasa nada.
  }
}
