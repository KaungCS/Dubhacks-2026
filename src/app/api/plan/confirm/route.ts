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

  try {
    const [calendar, drive] = await Promise.all([
      createCalendarEvent(session.accessToken, parsed.data),
      createDriveFolder(session.accessToken, parsed.data),
    ]);

    return NextResponse.json({
      calendar,
      drive,
      plan: parsed.data,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Google API request failed";
    const lower = message.toLowerCase();
    const scopeHint =
      lower.includes("insufficient") ||
      lower.includes("scope") ||
      lower.includes("permission")
        ? " Check that Calendar Events and Drive File scopes are enabled on the OAuth consent screen, then sign in again."
        : "";

    return NextResponse.json(
      { error: `${message}.${scopeHint}` },
      { status: 502 },
    );
  }
}
