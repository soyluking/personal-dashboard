// Genera los íconos de la app (pantalla de inicio y manifest): node scripts/icons.mjs
import sharp from "sharp";

const sparkle = "M50 14 C54 38 62 46 86 50 C62 54 54 62 50 86 C46 62 38 54 14 50 C38 46 46 38 50 14Z";
// `pad` achica el dibujo para la zona segura de los íconos «maskable» de Android.
const svg = ({ rounded, pad = 0 }) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#7c4dff"/>
      <stop offset="1" stop-color="#ff8a1f"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="${rounded ? 22 : 0}" fill="url(#bg)"/>
  <g transform="translate(${pad} ${pad}) scale(${(100 - 2 * pad) / 100})">
    <path d="${sparkle}" fill="#fff"/>
    <circle cx="74" cy="26" r="5" fill="#fff" opacity="0.85"/>
  </g>
</svg>`;

const out = [
  ["public/icon-192.png", 192, { rounded: false }],
  ["public/icon-512.png", 512, { rounded: false }],
  ["public/icon-maskable-512.png", 512, { rounded: false, pad: 12 }],
  // iOS redondea solo las esquinas.
  ["src/app/apple-icon.png", 180, { rounded: false }],
  ["src/app/icon.png", 64, { rounded: true }],
];
for (const [file, size, opts] of out) {
  await sharp(Buffer.from(svg(opts))).resize(size, size).png().toFile(file);
  console.log(file);
}
