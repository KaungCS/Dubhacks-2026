"use client";

import Link from "next/link";
import { useEffect, useId, useRef } from "react";
import { Button, Card, buttonClass } from "@/components/ui";
import type { Event } from "@/lib/db";

export function formatEventWhen(event: Event) {
  const start = new Date(event.starts_at);
  const end = event.ends_at ? new Date(event.ends_at) : null;
  const date = start.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const startTime = start.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  if (!end) return `${date} · ${startTime}`;
  const endTime = end.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${date} · ${startTime} – ${endTime}`;
}

/** Lightweight hover card — title, when, optional location. */
export function EventHoverPreview({ event }: { event: Event }) {
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute left-0 top-full z-20 mt-1 w-52 border border-neutral-200 bg-white p-2 text-left"
    >
      <p className="truncate text-xs font-medium text-black">{event.title}</p>
      <p className="mt-1 text-[11px] text-neutral-600">{formatEventWhen(event)}</p>
      {event.location ? (
        <p className="mt-1 truncate text-[11px] text-neutral-500">{event.location}</p>
      ) : null}
    </div>
  );
}

type ModalProps = {
  event: Event;
  onClose: () => void;
};

/** Fuller click preview — modal with key details + link to event page. */
export function EventPreviewModal({ event, onClose }: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    panelRef.current?.querySelector<HTMLElement>("button, a")?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Card
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md space-y-4"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <h2 id={titleId} className="text-lg font-semibold text-black">
              {event.title}
            </h2>
            <p className="text-sm text-neutral-600">{formatEventWhen(event)}</p>
          </div>
          <Button type="button" onClick={onClose} aria-label="Close">
            Close
          </Button>
        </div>

        <dl className="space-y-2 text-sm">
          {event.location ? (
            <div>
              <dt className="text-xs text-neutral-500">Location</dt>
              <dd className="text-neutral-800">{event.location}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-xs text-neutral-500">Status</dt>
            <dd className="capitalize text-neutral-800">{event.status}</dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-2 pt-1">
          <Link href={`/events/${event.id}`} className={buttonClass}>
            Open event
          </Link>
          <Button type="button" onClick={onClose}>
            Dismiss
          </Button>
        </div>
      </Card>
    </div>
  );
}
