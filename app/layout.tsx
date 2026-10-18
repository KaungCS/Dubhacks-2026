import type { Metadata } from "next";
import Link from "next/link";
import { getContext, type Workspace } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { NotificationBell } from "@/components/notifications/Bell";
import { ProgressBar } from "@/components/ui";
import { SidebarNav } from "@/components/ui/sidebar-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Club Ops",
  description: "Events, tasks and decisions for club officers",
};

// Admins see how far the club's setup is (spec phase 1) until every step is done.
async function SetupProgress({ workspace }: { workspace: Workspace }) {
  const db = getDb();
  const [{ count: officers }, { count: templates }] = await Promise.all([
    db.from("memberships").select("id", { count: "exact", head: true }).eq("workspace_id", workspace.id).is("left_at", null),
    db.from("event_templates").select("id", { count: "exact", head: true }).eq("workspace_id", workspace.id),
  ]);
  const steps = [
    { done: workspace.google_connected, next: "Connect Google", href: "/settings" },
    { done: !!workspace.shared_drive_id, next: "Pick the shared drive", href: "/settings" },
    { done: (officers ?? 0) > 1, next: "Invite officers", href: "/settings" },
    { done: (templates ?? 0) > 0, next: "Make your first template", href: "/templates/new" },
  ];
  const done = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done);
  if (!next) return null;
  return (
    <div className="space-y-1.5 px-3 py-3">
      <div className="flex justify-between text-sm">
        <span>Finish setup</span>
        <span className="text-neutral-600">
          {done} of {steps.length}
        </span>
      </div>
      <ProgressBar value={done} max={steps.length} label="Club setup" />
      <Link href={next.href} className="text-xs text-neutral-600 underline-offset-2 hover:underline">
        Next: {next.next}
      </Link>
    </div>
  );
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const ctx = await getContext();
  const current = ctx?.current;
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <div className="md:flex">
          {current && (
            <aside className="flex flex-col gap-3 border-b border-neutral-200 bg-neutral-50 px-3 py-4 md:sticky md:top-0 md:h-screen md:w-56 md:shrink-0 md:overflow-y-auto md:border-b-0 md:border-r">
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 md:block md:space-y-3">
                <div>
                  <p className="font-semibold">{current.workspace.name}</p>
                  {ctx.memberships.length > 1 ? (
                    <Link href="/settings" className="text-xs text-neutral-600 underline-offset-2 hover:underline">
                      Switch club
                    </Link>
                  ) : null}
                </div>
                <NotificationBell />
              </div>
              {current.role === "admin" ? <SetupProgress workspace={current.workspace} /> : null}
              <SidebarNav />
              <p className="mt-auto hidden truncate border-t border-neutral-200 px-3 pt-3 text-sm text-neutral-700 md:block">
                {ctx.user.name || ctx.user.email}
              </p>
            </aside>
          )}
          <div className="min-w-0 flex-1">
            {current && !current.workspace.google_connected && (
              <p className="bg-neutral-100 px-6 py-3 text-center text-sm">
                Google is disconnected, so calendar and file actions are paused.{" "}
                {current.role === "admin" ? (
                  <Link href="/settings" className="underline">
                    Reconnect in Settings
                  </Link>
                ) : (
                  "Ask an admin to reconnect it in Settings."
                )}
              </p>
            )}
            <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 md:py-10">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
