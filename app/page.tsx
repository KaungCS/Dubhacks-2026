import { redirect } from "next/navigation";
import { requireMembership } from "@/lib/auth";

export default async function Home() {
  await requireMembership();
  redirect("/tasks");
}
