import { Suspense } from "react";
import { verifySession } from "@/lib/session";
import { countInbox } from "@/lib/tasks";
import { AppNav } from "./app-nav";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Suspense fallback={<AppNav inbox={0} />}>
        <Nav />
      </Suspense>
      <div className="min-w-0 flex-1">{children}</div>
    </>
  );
}

async function Nav() {
  await verifySession();
  return <AppNav inbox={await countInbox()} />;
}
