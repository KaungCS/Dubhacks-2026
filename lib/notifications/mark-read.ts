import { getDb } from "@/lib/db";

export async function markNotificationRead(notificationId: string): Promise<void> {
  const db = getDb();
  const { error } = await db
    .from("notification")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .is("read_at", null);

  if (error) {
    throw new Error(`markNotificationRead failed: ${error.message}`);
  }
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const db = getDb();
  const { error } = await db
    .from("notification")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) {
    throw new Error(`markAllNotificationsRead failed: ${error.message}`);
  }
}
