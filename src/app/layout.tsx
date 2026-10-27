import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { countInbox } from "@/lib/tasks";
import { AppNav } from "./app-nav";
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
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col md:flex-row">
        <Suspense fallback={<AppNav inbox={0} />}>
          <Nav />
        </Suspense>
        <div className="min-w-0 flex-1">{children}</div>
      </body>
    </html>
  );
}

async function Nav() {
  return <AppNav inbox={await countInbox()} />;
}
