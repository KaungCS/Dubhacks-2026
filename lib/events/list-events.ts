import { getDb, type Event } from "@/lib/db";

/** Contract used by Dom (and calendar): events overlapping [from, to]. */
export async function listEvents(
  workspaceId: string,
  from: Date,
  to: Date,
): Promise<Event[]> {
  const { data, error } = await getDb()
    .from("events")
    .select("*")
    .eq("workspace_id", workspaceId)
    .lt("starts_at", to.toISOString())
    .or(`ends_at.gt.${from.toISOString()},ends_at.is.null`)
    .gte("starts_at", new Date(from.getTime() - 1000 * 60 * 60 * 24).toISOString())
    .order("starts_at", { ascending: true });

  if (error) throw new Error(`listEvents failed: ${error.message}`);

  // Filter in JS for null ends_at overlapping [from, to] (starts before `to`, and either
  // no end or end after `from`). The `.or` + `.gte` above is a coarse DB filter.
  return (data ?? []).filter((event) => {
    const start = new Date(event.starts_at).getTime();
    const end = event.ends_at ? new Date(event.ends_at).getTime() : start;
    return start < to.getTime() && end > from.getTime();
  });
}
