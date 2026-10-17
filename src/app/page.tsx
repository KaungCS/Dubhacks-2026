import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignInButton } from "@/components/sign-in-button";
import { getClubName } from "@/lib/config";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  const clubName = getClubName();

  return (
    <main className="relative overflow-hidden">
      <div
        aria-hidden
        className="animate-drift pointer-events-none absolute -right-16 top-10 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,#c8e6a0_0%,transparent_70%)] opacity-80"
      />
      <div className="shell flex min-h-screen flex-col justify-center py-16">
        <p className="animate-rise mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--moss)]">
          DubHacks 2026
        </p>
        <h1 className="animate-rise font-[family-name:var(--font-display)] text-5xl leading-[1.05] tracking-tight text-[var(--ink)] sm:text-7xl">
          {clubName}
        </h1>
        <p className="animate-rise-delay mt-5 max-w-xl text-lg text-[var(--ink-soft)] sm:text-xl">
          Officers describe an event once. RSO Manager drafts the checklist,
          then creates the Calendar invite and Drive folder.
        </p>
        <div className="animate-rise-delay mt-10 flex flex-wrap items-center gap-3">
          <SignInButton />
          <span className="text-sm text-[var(--ink-soft)]">
            Google Calendar + Drive access required
          </span>
        </div>
      </div>
    </main>
  );
}
