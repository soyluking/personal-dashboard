import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { areaEnum } from "@/db/schema";
import { experienceOf } from "@/lib/experiences";
import { todayISO } from "@/lib/dates";
import { userTimeZone } from "@/lib/time-zone";
import { loadRoutines } from "@/lib/routines";
import { verifySession } from "@/lib/session";
import { ListSkeleton } from "../../skeleton";
import { TopBar } from "../../top-bar";
import { archiveRoutine } from "../actions";
import { RoutineForm } from "../routine-form";

type Props = { searchParams: Promise<{ id?: string }> };

export default function EditarRutinaPage({ searchParams }: Props) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <EditarRutina searchParams={searchParams} />
    </Suspense>
  );
}

async function EditarRutina({ searchParams }: Props) {
  const user = await verifySession();
  await connection();
  const id = Number((await searchParams).id);
  const today = todayISO(await userTimeZone());
  const routine = (await loadRoutines(user.id)).find((r) => r.id === id && r.archivedAt === null);
  if (!routine) notFound();
  // El formulario edita los horarios de hoy en adelante.
  const slots = routine.slots.filter((s) => s.validTo === null || s.validTo >= today);

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar>
        <h1 className="min-w-0 flex-1 truncate text-xl font-semibold leading-none tracking-tight sm:text-2xl">{routine.name}</h1>
      </TopBar>
      <main className="mx-auto w-full max-w-3xl flex-1 px-3 pb-10 pt-4 sm:px-6">
        <RoutineForm today={today} areas={experienceOf(user).areasAndInbox ? areaEnum.enumValues : []} initial={{ ...routine, slots }} />
        <form action={archiveRoutine} className="mt-10 border-t border-line pt-5">
          <input type="hidden" name="id" value={routine.id} />
          <button className="text-sm text-muted hover:text-red-400">Archivar rutina</button>
          <p className="mt-1 text-xs text-muted">Deja de aparecer desde hoy. Lo hecho y las rachas pasadas se guardan.</p>
        </form>
      </main>
    </div>
  );
}
