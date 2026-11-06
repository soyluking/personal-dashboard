"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Guarda la zona horaria del dispositivo para que el servidor calcule «hoy» y lo atrasado con ella.
// Si cambió (por ejemplo, de viaje), recarga los datos con la zona nueva.
export function TimeZoneSync({ current }: { current: string }) {
  const router = useRouter();
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz || tz === current) return;
    document.cookie = `tz=${tz}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }, [current, router]);
  return null;
}
