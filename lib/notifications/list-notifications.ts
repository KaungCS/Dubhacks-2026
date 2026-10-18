import { getDb } from "@/lib/db";
import { mapNotificationRow, type Notification, type NotificationRow } from "./types";

export async function listNotifications(
  userId: string,
  opts: { unreadOnly?: boolean; limit?: number } = {},
): Promise<Notification[]> {
  const db = getDb();
  let query = db
    .from("notification")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 30);

  if (opts.unreadOnly) {
    query = query.is("read_at", null);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`listNotifications failed: ${error.message}`);
  }

  return ((data ?? []) as NotificationRow[]).map(mapNotificationRow);
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  const db = getDb();
  const { count, error } = await db
    .from("notification")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) {
    throw new Error(`countUnreadNotifications failed: ${error.message}`);
  }
  return count ?? 0;
}
