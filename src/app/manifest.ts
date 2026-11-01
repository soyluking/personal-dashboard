import type { MetadataRoute } from "next";

// Para agregarla a la pantalla de inicio. Abre en «Hoy» con la captura lista.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hoy",
    short_name: "Hoy",
    description: "Lo de hoy, rutina y tareas",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0b0d",
    theme_color: "#0b0b0d",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
