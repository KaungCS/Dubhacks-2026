import { redirect } from "next/navigation";
import { EventsOverview } from "@/components/events/events-overview";

export default async function EventsPage({ searchParams }: PageProps<"/events">) {
  // Old links to the calendar toggle.
  if ((await searchParams).view === "calendar") redirect("/calendar");
  return <EventsOverview view="list" />;
}
