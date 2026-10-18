import { getDb } from "@/lib/db";
import { removeEventFromGoogleCalendar } from "@/lib/google/calendar";
import { getEvent } from "./get-event";

/** Deletes the event and, by on delete cascade, its tasks and attendees. Its Drive files stay in Drive. */
export async function deleteEvent(workspaceId: string, eventId: string): Promise<void> {
  const event = await getEvent(eventId);
  if (event.workspace_id !== workspaceId) throw new Error("Event not found in this club");

  try {
    await removeEventFromGoogleCalendar(event);
  } catch (err) {
    // ponytail: Google not connected or the entry is already gone; delete anyway and accept a possible stale calendar entry.
    console.error("removeEventFromGoogleCalendar failed", err);
  }

  const { error } = await getDb()
    .from("events")
    .delete()
    .eq("id", eventId)
    .eq("workspace_id", workspaceId);

  if (error) throw new Error(`deleteEvent failed: ${error.message}`);
}
