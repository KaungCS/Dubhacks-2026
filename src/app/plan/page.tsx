import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PlanFlow } from "@/components/plan-flow";
import { SiteHeader } from "@/components/site-header";
import { getClubName } from "@/lib/config";

export default async function PlanPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  return (
    <main>
      <SiteHeader clubName={getClubName()} userEmail={session.user.email} />
      <section className="shell pb-16 pt-4">
        <PlanFlow />
      </section>
    </main>
  );
}
