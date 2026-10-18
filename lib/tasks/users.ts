import { getDb } from "@/lib/db";

export type OfficerProfile = {
  id: string;
  email: string;
  name: string | null;
};

type UserRow = {
  id: string;
  email: string;
  name: string | null;
};

type MembershipEmailedRow = {
  user_id: string;
  last_emailed_on: string | null;
};

/**
 * Load officer profiles by id. Table name follows the spec entity `user`
 * (Kaung's schema). If Kaung renames to `profiles`, update here only.
 */
export async function getUsersByIds(userIds: string[]): Promise<Map<string, OfficerProfile>> {
  const map = new Map<string, OfficerProfile>();
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return map;

  const db = getDb();
  const { data, error } = await db
    .from("user")
    .select("id, email, name")
    .in("id", unique);

  if (error) {
    throw new Error(`getUsersByIds failed: ${error.message}`);
  }

  for (const row of (data ?? []) as UserRow[]) {
    map.set(row.id, { id: row.id, email: row.email, name: row.name });
  }
  return map;
}

export async function getMembershipLastEmailedOn(
  workspaceId: string,
  userIds: string[],
): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>();
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return map;

  const db = getDb();
  const { data, error } = await db
    .from("membership")
    .select("user_id, last_emailed_on")
    .eq("workspace_id", workspaceId)
    .in("user_id", unique)
    .is("left_at", null);

  if (error) {
    throw new Error(`getMembershipLastEmailedOn failed: ${error.message}`);
  }

  for (const row of (data ?? []) as MembershipEmailedRow[]) {
    map.set(row.user_id, row.last_emailed_on);
  }
  return map;
}

export async function setMembershipLastEmailedOn(
  workspaceId: string,
  userId: string,
  pacificDate: string,
): Promise<void> {
  const db = getDb();
  const { error } = await db
    .from("membership")
    .update({ last_emailed_on: pacificDate })
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`setMembershipLastEmailedOn failed: ${error.message}`);
  }
}

export async function listWorkspaceOfficers(
  workspaceId: string,
): Promise<OfficerProfile[]> {
  const db = getDb();
  const { data, error } = await db
    .from("membership")
    .select("user_id, user:user_id ( id, email, name )")
    .eq("workspace_id", workspaceId)
    .is("left_at", null);

  if (error) {
    throw new Error(`listWorkspaceOfficers failed: ${error.message}`);
  }

  type Nested = {
    user_id: string;
    user:
      | UserRow
      | UserRow[]
      | null;
  };

  const officers: OfficerProfile[] = [];
  for (const row of (data ?? []) as Nested[]) {
    const raw = row.user;
    const profile = Array.isArray(raw) ? raw[0] : raw;
    if (profile?.id && profile.email) {
      officers.push({
        id: profile.id,
        email: profile.email,
        name: profile.name,
      });
    }
  }
  return officers;
}
