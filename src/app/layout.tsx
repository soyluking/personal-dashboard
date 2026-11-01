import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hoy",
  description: "Dashboard personal",
  appleWebApp: { title: "Hoy", statusBarStyle: "default" },
};

// El tema depende del usuario, que se conoce recién en el servidor. Para no pintar el oscuro y
// después cambiar, se aplica antes de pintar el último tema que se vio en este dispositivo (ThemeSync).
const themeScript = `try{var t=localStorage.getItem("theme");if(t)document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col overflow-x-clip md:flex-row">
        {children}
      </body>
    </html>
  );
}
