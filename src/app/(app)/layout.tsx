import { Suspense } from "react";
import { EXPERIENCES, experienceOf } from "@/lib/experiences";
import { verifySession } from "@/lib/session";
import { countInbox } from "@/lib/tasks";
import { AppNav } from "./app-nav";
import { ThemeSync } from "./theme-sync";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Suspense fallback={<AppNav inbox={0} showInbox={false} experience={null} experiences={[]} />}>
        <Nav />
      </Suspense>
      <div className="min-w-0 flex-1">{children}</div>
    </>
  );
}

async function Nav() {
  const user = await verifySession();
  const experience = experienceOf(user);
  return (
    <>
      <ThemeSync theme={experience.theme} />
      <AppNav
        inbox={experience.areasAndInbox ? await countInbox(user.id) : 0}
        showInbox={experience.areasAndInbox}
        experience={user.experience}
        experiences={Object.entries(EXPERIENCES).map(([value, e]) => ({ value, label: e.label }))}
      />
    </>
  );
}
