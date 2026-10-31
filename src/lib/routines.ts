import { db } from "@/db";
import { routineExceptions, routineLogs, routines, routineSlots } from "@/db/schema";
import type { RoutineException, Slot } from "./routine";

export type RoutineData = {
  id: number;
  name: string;
  trackStreak: boolean;
  area: string | null;
  archivedAt: string | null;
  slots: (Slot & { id: number })[];
  exceptions: RoutineException[];
  // Fechas originales de las ocurrencias hechas.
  done: Set<string>;
};

// Toda la rutina con su historia: son pocas filas y las reglas se calculan en código.
export async function loadRoutines(): Promise<RoutineData[]> {
  const [rs, slots, exceptions, logs] = await Promise.all([
    db.select().from(routines),
    db.select().from(routineSlots),
    db.select().from(routineExceptions),
    db.select({ routineId: routineLogs.routineId, date: routineLogs.date }).from(routineLogs),
  ]);
  return rs.map((r) => ({
    id: r.id,
    name: r.name,
    trackStreak: r.trackStreak,
    area: r.area,
    archivedAt: r.archivedAt,
    slots: slots.filter((s) => s.routineId === r.id),
    exceptions: exceptions.filter((e) => e.routineId === r.id),
    done: new Set(logs.filter((l) => l.routineId === r.id).map((l) => l.date)),
  }));
}
