import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { EventPlanSchema } from "@/lib/plan";
import { createCalendarEvent, createDriveFolder } from "@/lib/google";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session.accessToken) {
    return NextResponse.json(
      {
        error:
          "Missing Google access token. Sign out and sign in again, and confirm Calendar + Drive scopes are granted.",
      },
      { status: 403 },
    );
  }

  if (session.error === "RefreshAccessTokenError") {
    return NextResponse.json(
      {
        error:
          "Google session expired. Sign out and sign in again to refresh Calendar/Drive access.",
      },
      { status: 401 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = EventPlanSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid plan payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Sequential on purpose: Calendar first, then Drive. Avoids orphaning a
  // Drive folder when Calendar fails. If Drive fails after Calendar succeeds,
  // return a partial result so the officer can still open the event.
  let calendar: { id?: string; htmlLink?: string };
  try {
    calendar = await createCalendarEvent(session.accessToken, parsed.data);
  } catch (error) {
    return googleErrorResponse(error, "Calendar");
  }

  try {
    const drive = await createDriveFolder(session.accessToken, parsed.data);
    return NextResponse.json({
      calendar,
      drive,
      plan: parsed.data,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Google API request failed";
    return NextResponse.json(
      {
        error: `Calendar event was created, but Drive folder failed: ${message}.${scopeHint(message)} Open the Calendar link and retry Drive later, or create the folder manually.`,
        calendar,
        plan: parsed.data,
        partial: true,
      },
      { status: 502 },
    );
  }
}

function scopeHint(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("insufficient") ||
    lower.includes("scope") ||
    lower.includes("permission")
  ) {
    return " Check that Calendar Events and Drive File scopes are enabled on the OAuth consent screen, then sign in again.";
  }
  return "";
}

function googleErrorResponse(error: unknown, surface: string) {
  const message =
    error instanceof Error ? error.message : "Google API request failed";
  return NextResponse.json(
    {
      error: `${surface} request failed: ${message}.${scopeHint(message)}`,
    },
    { status: 502 },
  );
}
