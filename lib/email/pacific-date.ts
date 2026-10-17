/**
 * Pacific calendar date as YYYY-MM-DD.
 * Used for membership.last_emailed_on (once-a-day assignment emails).
 */
export function pacificDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
