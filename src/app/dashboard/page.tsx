import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SiteHeader } from "@/components/site-header";
import { getClubName } from "@/lib/config";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  const clubName = getClubName();

  return (
    <main>
      <SiteHeader clubName={clubName} userEmail={session.user.email} />
      <section className="shell pb-16 pt-4">
        <div className="animate-rise max-w-2xl">
          <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight text-[var(--ink)] sm:text-5xl">
            Ready when you are
          </h1>
          <p className="mt-3 text-lg text-[var(--ink-soft)]">
            No saved plans yet. Start with a plain-language description and we
            will draft templates, then kick off Calendar and Drive.
          </p>
          <div className="mt-8">
            <Link href="/plan" className="btn btn-primary">
              Plan an event
            </Link>
          </div>
        </div>

        {session.error === "RefreshAccessTokenError" ? (
          <p className="panel mt-10 max-w-2xl border-[rgba(140,40,40,0.25)] text-[var(--ink-soft)]">
            Your Google session needs a refresh. Sign out and sign in again so
            Calendar and Drive actions keep working.
          </p>
        ) : null}
      </section>
    </main>
  );
}
