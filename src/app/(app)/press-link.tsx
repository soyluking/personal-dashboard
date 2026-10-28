"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import type { ComponentProps } from "react";

// Marca que el destino está cargando; el <Link> lo lee con `has-data-[pending=true]:`.
function PendingMark() {
  const { pending } = useLinkStatus();
  return <span hidden data-pending={pending} />;
}

// Link con respuesta inmediata: se hunde al pulsar y pulsa mientras carga la página de destino.
export function PressLink({ children, className = "", ...props }: ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      className={`transition-[transform,background-color,color,opacity] duration-150 active:scale-95 has-data-[pending=true]:animate-pulse ${className}`}
    >
      {children}
      <PendingMark />
    </Link>
  );
}
