"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { Notification } from "@/lib/notifications";
import {
  actionListNotifications,
  actionMarkAllNotificationsRead,
  actionMarkNotificationRead,
} from "@/app/tasks/actions";

type Props = {
  userId: string;
  initialUnreadCount?: number;
};

function labelFor(n: Notification): string {
  const title =
    typeof n.payload.title === "string" ? n.payload.title : undefined;
  switch (n.kind) {
    case "task_assigned":
      return title ? `Assigned: ${title}` : "New task assigned";
    case "prereq_done":
      return title ? `Prereq done: ${title}` : "Prerequisite task done";
    case "event_created":
      return title ? `Event: ${title}` : "Event created";
    case "poll_opened":
      return title ? `Poll: ${title}` : "Poll opened";
    case "poll_closing":
      return title ? `Poll closing: ${title}` : "Poll closing soon";
    case "rsvp_target":
      return title ? `RSVP target: ${title}` : "RSVP target reached";
    default:
      return title ?? n.kind;
  }
}

/**
 * In-app notification bell. Kaung can mount this in the app shell layout;
 * also usable on the tasks page until then.
 */
export function NotificationBell({ userId, initialUnreadCount = 0 }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(initialUnreadCount);
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function load() {
    startTransition(async () => {
      const list = await actionListNotifications(userId);
      setItems(list);
      setUnread(list.filter((n) => !n.readAt).length);
    });
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) load();
  }

  function markOne(id: string) {
    startTransition(async () => {
      await actionMarkNotificationRead(id);
      setItems((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, readAt: new Date().toISOString() } : n,
        ),
      );
      setUnread((c) => Math.max(0, c - 1));
    });
  }

  function markAll() {
    startTransition(async () => {
      await actionMarkAllNotificationsRead(userId);
      setItems((prev) =>
        prev.map((n) => ({
          ...n,
          readAt: n.readAt ?? new Date().toISOString(),
        })),
      );
      setUnread(0);
    });
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label="Notifications"
        className="relative rounded-full border border-black bg-white px-4 py-2 text-sm text-black hover:bg-black hover:text-white"
      >
        Bell
        {unread > 0 ? (
          <span className="ml-2 inline-block min-w-5 rounded-full border border-black px-1.5 text-xs">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-80 border border-black bg-white">
          <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2">
            <p className="text-sm font-medium text-black">Notifications</p>
            <button
              type="button"
              onClick={markAll}
              disabled={pending || unread === 0}
              className="text-xs text-neutral-600 underline-offset-2 hover:underline disabled:opacity-40"
            >
              Mark all read
            </button>
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-neutral-500">
                {pending ? "Loading…" : "No notifications"}
              </li>
            ) : (
              items.map((n) => (
                <li
                  key={n.id}
                  className={
                    n.readAt
                      ? "border-b border-neutral-100 px-3 py-2"
                      : "border-b border-neutral-100 bg-neutral-50 px-3 py-2"
                  }
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (!n.readAt) markOne(n.id);
                    }}
                    className="w-full text-left"
                  >
                    <p className="text-sm text-black">{labelFor(n)}</p>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {new Date(n.createdAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
