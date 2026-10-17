export type Notification = {
  id: string;
  userId: string;
  kind: string;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
};

export type NotificationRow = {
  id: string;
  user_id: string;
  kind: string;
  payload: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
};

export function mapNotificationRow(row: NotificationRow): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    kind: row.kind,
    payload: (row.payload ?? {}) as Record<string, unknown>,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}
