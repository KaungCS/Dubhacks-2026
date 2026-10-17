import { getDb } from "@/lib/db";

/**
 * Contract used by Jun and Dom: create an in-app notification for the bell.
 */
export async function createNotification(
  userId: string,
  kind: string,
  payload: object,
): Promise<void> {
  const db = getDb();
  const { error } = await db.from("notification").insert({
    user_id: userId,
    kind,
    payload,
  });

  if (error) {
    throw new Error(`createNotification failed: ${error.message}`);
  }
}
