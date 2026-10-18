import { getDb, type Event } from "@/lib/db";

/** Contract used by Dom (and the event page): load one event by id. */
export async function getEvent(eventId: string): Promise<Event> {
  const { data, error } = await getDb()
    .from("events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();

  if (error) throw new Error(`getEvent failed: ${error.message}`);
  if (!data) throw new Error(`Event not found: ${eventId}`);
  return data;
}
