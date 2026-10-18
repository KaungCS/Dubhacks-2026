import { redirect } from "next/navigation";

// The calendar is now the Events page's calendar view.
export default function CalendarPage() {
  redirect("/events?view=calendar");
}
