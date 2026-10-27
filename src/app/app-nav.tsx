"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type Props = { inbox: number };

const SECTIONS = [
  { href: "/", label: "Hoy", icon: "◉" },
  { href: "/bandeja", label: "Bandeja", icon: "▤" },
] as const;

// En el computador, barra lateral colapsable; en el celular, pestañas abajo.
export function AppNav({ inbox }: Props) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const count = (href: string) => (href === "/bandeja" && inbox > 0 ? inbox : null);

  return (
    <>
      <aside
        className={`sticky top-0 hidden h-dvh shrink-0 flex-col gap-1 border-r border-line px-3 py-4 transition-[width] md:flex ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
          className="mb-3 flex size-10 items-center justify-center rounded-full text-lg text-muted transition-colors hover:bg-hover hover:text-foreground"
        >
          ☰
        </button>
        {SECTIONS.map(({ href, label, icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`flex h-10 items-center gap-3 rounded-full px-3 text-sm transition-colors ${
                active ? "bg-accent/15 font-medium text-foreground" : "text-muted hover:bg-hover hover:text-foreground"
              }`}
            >
              <span className="w-4 text-center">{icon}</span>
              {!collapsed && <span className="flex-1">{label}</span>}
              {!collapsed && count(href) && <span className="text-xs tabular-nums text-muted">{count(href)}</span>}
            </Link>
          );
        })}
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        {SECTIONS.map(({ href, label, icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs ${
                active ? "font-medium text-accent" : "text-muted"
              }`}
            >
              <span className="text-base leading-none">{icon}</span>
              <span>
                {label}
                {count(href) && ` (${count(href)})`}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
