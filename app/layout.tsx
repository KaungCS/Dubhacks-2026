import type { Metadata } from "next";
import Link from "next/link";
import { getContext, memberHasPermission, type Permission } from "@/lib/auth";
import { nav } from "@/lib/nav";
import { NotificationBell } from "@/components/notifications/Bell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Club Ops",
  description: "Events, tasks and decisions for club officers",
};

const navPermission: Partial<Record<string, Permission>> = {
  "/tasks": "tasks:view",
  "/calendar": "calendar:view",
  "/events": "calendar:view",
  "/templates": "templates:view",
  "/polls": "polls:view",
  "/metrics": "metrics:view",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const current = (await getContext())?.current;
  const visibleNav = current
    ? nav.filter((item) => {
        const need = navPermission[item.href];
        return !need || memberHasPermission(current, need);
      })
    : [];

  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        {current && (
          <header className="border-b border-neutral-200">
            <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-4 text-sm">
              <span className="font-semibold">{current.workspace.name}</span>
              {visibleNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`hover:underline ${item.secondary ? "text-neutral-500" : ""}`}
                >
                  {item.label}
                </Link>
              ))}
              <span className="ml-auto">
                <NotificationBell />
              </span>
            </nav>
          </header>
        )}
        {current && !current.workspace.google_connected && (
          <p className="bg-neutral-100 px-6 py-3 text-center text-sm">
            Google is disconnected, so calendar and file actions are paused.{" "}
            {memberHasPermission(current, "settings:manage") ? (
              <Link href="/settings" className="underline">
                Reconnect in Settings
              </Link>
            ) : (
              "Ask an admin to reconnect it in Settings."
            )}
          </p>
        )}
        <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
