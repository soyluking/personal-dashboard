import { Suspense } from "react";
import { connection } from "next/server";
import { areaEnum } from "@/db/schema";
import { experienceOf } from "@/lib/experiences";
import { todayISO } from "@/lib/dates";
import { verifySession } from "@/lib/session";
import { ListSkeleton } from "../../skeleton";
import { TopBar } from "../../top-bar";
import { RoutineForm } from "../routine-form";

export default function NuevaRutinaPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <NuevaRutina />
    </Suspense>
  );
}

async function NuevaRutina() {
  const user = await verifySession();
  await connection();
  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar>
        <h1 className="text-xl font-semibold leading-none tracking-tight sm:text-2xl">Nueva rutina</h1>
      </TopBar>
      <main className="mx-auto w-full max-w-3xl flex-1 px-3 pb-10 pt-4 sm:px-6">
        <RoutineForm today={todayISO()} areas={experienceOf(user).areasAndInbox ? areaEnum.enumValues : []} />
      </main>
    </div>
  );
}
