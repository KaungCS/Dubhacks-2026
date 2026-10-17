import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { generateEventPlan } from "@/lib/plan";

const BodySchema = z.object({
  description: z.string().min(1).max(4000),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "description is required" },
      { status: 400 },
    );
  }

  try {
    const plan = await generateEventPlan(parsed.data.description);
    return NextResponse.json({ plan });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate plan";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
