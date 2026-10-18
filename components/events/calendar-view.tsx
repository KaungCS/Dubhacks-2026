"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui";
import type { Event, Task } from "@/lib/db";
import { EventHoverPreview, EventPreviewModal } from "./event-preview";

type Props = {
  events: Event[];
  tasks: Task[];
  initialYear: number;
  initialMonth: number;
  /** YYYY-MM-DD of today, from the server, so it renders the same on both sides. */
  todayKey: string;
};

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseDayKey(iso: string) {
  return dateKey(new Date(iso));
}

// Events are filled black chips, task due dates outlined ones; overdue tasks outlined in red.
const eventChip = "block truncate rounded-md bg-black px-1.5 py-0.5 text-xs text-white hover:bg-neutral-800";
const taskChip = (task: Task, dayKey: string, today = "") =>
  `block truncate rounded-md border px-1.5 py-px text-xs ${task.status !== "done" && today && dayKey < today ? "border-red-700 text-red-700" : "border-neutral-400 text-neutral-800"} hover:border-black`;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarView({ events, tasks, initialYear, initialMonth, todayKey }: Props) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const total = new Date(year, month + 1, 0).getDate();
    const pad = first.getDay();
    const out: Array<{ date: Date | null; key: string }> = [];
    for (let i = 0; i < pad; i++) out.push({ date: null, key: `pad-${i}` });
    for (let day = 1; day <= total; day++) {
      const date = new Date(year, month, day);
      out.push({ date, key: dateKey(date) });
    }
    return out;
  }, [year, month]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const event of events) {
      const key = parseDayKey(event.starts_at);
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    return map;
  }, [events]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      if (!task.due_at) continue;
      const key = parseDayKey(task.due_at);
      const list = map.get(key) ?? [];
      list.push(task);
      map.set(key, list);
    }
    return map;
  }, [tasks]);

  const selected = selectedId
    ? (events.find((e) => e.id === selectedId) ?? null)
    : null;

  function prevMonth() {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else setMonth((m) => m - 1);
  }

  function nextMonth() {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else setMonth((m) => m + 1);
  }

  const label = new Date(year, month, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" onClick={prevMonth} aria-label="Previous month">
          ‹
        </Button>
        <span className="min-w-36 text-center font-semibold">{label}</span>
        <Button type="button" onClick={nextMonth} aria-label="Next month">
          ›
        </Button>
        <Button
          type="button"
          onClick={() => {
            setYear(initialYear);
            setMonth(initialMonth);
          }}
        >
          Today
        </Button>
      </div>

      {/* Phones: a day-by-day list instead of the 7-column grid. */}
      <ul className="space-y-3 md:hidden">
        {cells
          .filter((cell) => cell.date && (eventsByDay.has(cell.key) || tasksByDay.has(cell.key)))
          .map((cell) => (
            <li key={cell.key} className="rounded-2xl border border-neutral-200 p-3">
              <p className={`mb-2 text-sm ${cell.key === todayKey ? "font-semibold" : "text-neutral-600"}`}>
                {cell.date!.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                {cell.key === todayKey ? " · Today" : ""}
              </p>
              <ul className="space-y-1">
                {(eventsByDay.get(cell.key) ?? []).map((event) => (
                  <li key={event.id}>
                    <Link href={`/events/${event.id}`} className={eventChip}>
                      {event.title}
                    </Link>
                  </li>
                ))}
                {(tasksByDay.get(cell.key) ?? []).map((task) => (
                  <li key={task.id}>
                    <Link href={`/tasks/${task.id}`} className={taskChip(task, cell.key, todayKey)}>
                      {task.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        {!cells.some((cell) => cell.date && (eventsByDay.has(cell.key) || tasksByDay.has(cell.key))) ? (
          <li className="text-sm text-neutral-600">Nothing this month.</li>
        ) : null}
      </ul>

      <div className="hidden grid-cols-7 overflow-hidden rounded-2xl border border-neutral-200 md:grid">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="border-b border-neutral-200 bg-neutral-50 px-2 py-2 text-xs text-neutral-600"
          >
            {d}
          </div>
        ))}
        {cells.map((cell) => {
          if (!cell.date) {
            return (
              <div
                key={cell.key}
                className="min-h-28 border-b border-r border-neutral-100 bg-neutral-50/50"
              />
            );
          }
          const dayEvents = eventsByDay.get(cell.key) ?? [];
          const dayTasks = tasksByDay.get(cell.key) ?? [];
          return (
            <div
              key={cell.key}
              className="group min-h-28 min-w-0 border-b border-r border-neutral-100 bg-white p-1.5"
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${cell.key === todayKey ? "bg-black font-semibold text-white" : "text-neutral-700"}`}
                >
                  {cell.date.getDate()}
                </span>
                <Link
                  href={`/events/new?date=${cell.key}`}
                  aria-label={`Plan an event on ${cell.date.toLocaleDateString(undefined, { month: "long", day: "numeric" })}`}
                  className="rounded-full px-1.5 text-sm text-neutral-500 opacity-0 hover:text-black focus-visible:opacity-100 group-hover:opacity-100"
                >
                  +
                </Link>
              </div>
              <ul className="space-y-1">
                {dayEvents.map((event) => (
                  <li
                    key={event.id}
                    className="relative"
                    onMouseEnter={() => setHoveredId(event.id)}
                    onMouseLeave={() =>
                      setHoveredId((id) => (id === event.id ? null : id))
                    }
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setHoveredId(null);
                        setSelectedId(event.id);
                      }}
                      className={`${eventChip} w-full text-left focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-black`}
                    >
                      {event.title}
                    </button>
                    {hoveredId === event.id && selectedId !== event.id ? (
                      <EventHoverPreview event={event} />
                    ) : null}
                  </li>
                ))}
                {dayTasks.map((task) => (
                  <li key={task.id}>
                    <Link href={`/tasks/${task.id}`} className={taskChip(task, cell.key, todayKey)} title={`Task: ${task.title}`}>
                      {task.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {selected ? (
        <EventPreviewModal event={selected} onClose={() => setSelectedId(null)} />
      ) : null}
    </div>
  );
}
