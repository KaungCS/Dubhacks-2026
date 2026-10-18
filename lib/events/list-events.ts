import { getDb, type Event } from "@/lib/db";

/** Contract used by Dom (and calendar): events overlapping [from, to]. */
export async function listEvents(
  workspaceId: string,
  from: Date,
  to: Date,
): Promise<Event[]> {
  // Coarse filter by starts_at, then tighten overlap in JS (ends_at may be null).
  const { data, error } = await getDb()
    .from("events")
    .select("*")
    .eq("workspace_id", workspaceId)
    .lt("starts_at", to.toISOString())
    .order("starts_at", { ascending: true });

  if (error) throw new Error(`listEvents failed: ${error.message}`);

  const fromMs = from.getTime();
  const toMs = to.getTime();
  return (data ?? []).filter((event) => {
    const start = new Date(event.starts_at).getTime();
    const end = event.ends_at ? new Date(event.ends_at).getTime() : start;
    return start < toMs && end > fromMs;
  });
}
