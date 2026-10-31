"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "./actions";
import { Icon, closeIcon, logoutIcon, menuIcon } from "./nav-icons";
import { setMenuOpen, useMenuOpen } from "./nav-store";
import { PressLink } from "./press-link";

type Props = { inbox: number };

const SECTIONS = [
  {
    href: "/",
    label: "Hoy",
    icon: (
      <Icon>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </Icon>
    ),
  },
  {
    href: "/bandeja",
    label: "Bandeja",
    icon: (
      <Icon>
        <path d="M22 12h-6l-2 3h-4l-2-3H2" />
        <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
      </Icon>
    ),
  },
] as const;

// Como Gemini: en el computador, barra lateral colapsable; en el celular, menú lateral a pantalla completa.
export function AppNav({ inbox }: Props) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const open = useMenuOpen();

  const count = (href: string) => (href === "/bandeja" && inbox > 0 ? inbox : null);

  const links = (compact: boolean, onNavigate?: () => void) =>
    SECTIONS.map(({ href, label, icon }) => {
      const active = pathname === href;
      return (
        <PressLink
          key={href}
          href={href}
          onClick={onNavigate}
          title={compact ? label : undefined}
          className={`flex h-12 items-center gap-4 rounded-full px-3 text-base transition-colors ${
            active ? "bg-white/10 font-medium text-foreground" : "text-muted hover:bg-hover hover:text-foreground has-data-[pending=true]:bg-white/10 has-data-[pending=true]:text-foreground"
          }`}
        >
          {icon}
          {!compact && <span className="flex-1">{label}</span>}
          {!compact && count(href) && <span className="text-sm tabular-nums text-muted">{count(href)}</span>}
        </PressLink>
      );
    });

  const logoutButton = (compact: boolean) => (
    <form action={logout} className="mt-auto">
      <button
        title={compact ? "Cerrar sesión" : undefined}
        className="flex h-12 w-full items-center gap-4 rounded-full px-3 text-base text-muted transition-colors hover:bg-hover hover:text-foreground"
      >
        {logoutIcon}
        {!compact && <span>Cerrar sesión</span>}
      </button>
    </form>
  );

  return (
    <>
      <aside
        className={`sticky top-0 hidden h-dvh shrink-0 flex-col gap-1 px-3 py-4 transition-[width] md:flex ${
          collapsed ? "w-[4.5rem]" : "w-64 bg-sidebar"
        }`}
      >
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
          className="mb-3 flex size-12 items-center justify-center rounded-full text-muted transition-colors hover:bg-hover hover:text-foreground"
        >
          {menuIcon}
        </button>
        {links(collapsed)}
        {logoutButton(collapsed)}
      </aside>

      <div
        inert={!open}
        aria-hidden={!open}
        className={`fixed inset-0 z-40 flex flex-col gap-1 bg-sidebar px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none md:hidden ${
          open ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0"
        }`}
      >
        <div className="mb-4 flex items-center justify-between pl-3">
          <span className="text-2xl font-medium">Dashboard</span>
          <button onClick={() => setMenuOpen(false)} aria-label="Cerrar menú" className="flex size-12 items-center justify-center rounded-full bg-white/10 transition-transform active:scale-90">
            {closeIcon}
          </button>
        </div>
        {links(false, () => setMenuOpen(false))}
        {logoutButton(false)}
      </div>
    </>
  );
}
