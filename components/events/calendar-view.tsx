"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui";
import type { Event, Task } from "@/lib/db";

type Props = {
  events: Event[];
  tasks: Task[];
  initialYear: number;
  initialMonth: number;
};

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseDayKey(iso: string) {
  return dateKey(new Date(iso));
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarView({ events, tasks, initialYear, initialMonth }: Props) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);

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
      <div className="flex items-center justify-end gap-2">
        <Button type="button" onClick={prevMonth}>
          Prev
        </Button>
        <span className="min-w-40 text-center text-sm text-neutral-700">{label}</span>
        <Button type="button" onClick={nextMonth}>
          Next
        </Button>
      </div>

      <div className="grid grid-cols-7 border border-neutral-200">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="border-b border-neutral-200 bg-neutral-50 px-2 py-2 text-xs font-medium text-neutral-600"
          >
            {d}
          </div>
        ))}
        {cells.map((cell) => {
          if (!cell.date) {
            return (
              <div key={cell.key} className="min-h-28 border-b border-r border-neutral-100 bg-white" />
            );
          }
          const dayEvents = eventsByDay.get(cell.key) ?? [];
          const dayTasks = tasksByDay.get(cell.key) ?? [];
          return (
            <div
              key={cell.key}
              className="min-h-28 border-b border-r border-neutral-100 bg-white p-2"
            >
              <div className="mb-1 text-xs text-neutral-500">{cell.date.getDate()}</div>
              <ul className="space-y-1">
                {dayEvents.map((event) => (
                  <li key={event.id}>
                    <Link
                      href={`/events/${event.id}`}
                      className="block truncate text-xs text-black underline-offset-2 hover:underline"
                    >
                      {event.title}
                    </Link>
                  </li>
                ))}
                {dayTasks.map((task) => (
                  <li key={task.id} className="truncate text-xs text-neutral-600">
                    Task: {task.title}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
