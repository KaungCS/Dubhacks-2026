import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";

type SiteHeaderProps = {
  clubName: string;
  userEmail?: string | null;
  showNav?: boolean;
};

export function SiteHeader({
  clubName,
  userEmail,
  showNav = true,
}: SiteHeaderProps) {
  return (
    <header className="shell flex items-center justify-between gap-4 py-6">
      <div className="min-w-0">
        <Link href="/dashboard" className="block truncate font-[family-name:var(--font-display)] text-2xl tracking-tight text-[var(--ink)]">
          {clubName}
        </Link>
        {userEmail ? (
          <p className="truncate text-sm text-[var(--ink-soft)]">{userEmail}</p>
        ) : null}
      </div>
      {showNav ? (
        <nav className="flex items-center gap-2 text-sm">
          <Link href="/dashboard" className="btn btn-ghost px-3 py-2">
            Dashboard
          </Link>
          <Link href="/plan" className="btn btn-ghost px-3 py-2">
            Plan
          </Link>
          <SignOutButton />
        </nav>
      ) : null}
    </header>
  );
}
