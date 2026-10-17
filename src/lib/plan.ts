import { z } from "zod";
import { getTimezone } from "@/lib/config";

export const EventPlanSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  suggestedStart: z.string().min(1),
  suggestedEnd: z.string().min(1),
  timezone: z.string().min(1),
  checklist: z.array(z.string()).min(1),
  templates: z.object({
    agenda: z.array(z.string()).min(1),
    roles: z.array(z.string()).min(1),
    materials: z.array(z.string()).min(1),
  }),
  source: z.enum(["llm", "stub"]),
});

export type EventPlan = z.infer<typeof EventPlanSchema>;

function roundToNextHour(date: Date): Date {
  const next = new Date(date);
  next.setMinutes(0, 0, 0);
  next.setHours(next.getHours() + 1);
  return next;
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function titleFromDescription(description: string): string {
  const cleaned = description.replace(/\s+/g, " ").trim();
  if (!cleaned) return "Club Event";
  const firstSentence = cleaned.split(/[.!?]/)[0]?.trim() ?? cleaned;
  if (firstSentence.length <= 72) return firstSentence;
  return `${firstSentence.slice(0, 69).trim()}...`;
}

/** Deterministic plan when no LLM key is configured. */
export function buildStubPlan(description: string): EventPlan {
  const timezone = getTimezone();
  const start = roundToNextHour(addHours(new Date(), 24 * 7));
  const end = addHours(start, 2);
  const title = titleFromDescription(description);

  return {
    title,
    summary:
      description.trim() ||
      "Club event planned from the RSO Manager stub assistant.",
    suggestedStart: start.toISOString(),
    suggestedEnd: end.toISOString(),
    timezone,
    checklist: [
      "Confirm venue / meeting link",
      "Assign event lead and day-of roles",
      "Draft promo blurb and share with officers",
      "Prepare materials list and budget notes",
      "Send calendar invite to core team",
    ],
    templates: {
      agenda: [
        "Welcome + purpose (5 min)",
        "Main activity / speaker (45–60 min)",
        "Q&A or discussion (15 min)",
        "Next steps + wrap (5 min)",
      ],
      roles: [
        "Event lead — owns timeline and decisions",
        "Logistics — room, tech, supplies",
        "Outreach — posts and reminders",
        "Day-of greeter — check-in and hospitality",
      ],
      materials: [
        "Sign-in sheet or QR check-in",
        "Slides or handout outline",
        "Name tags / club table materials",
        "Backup HDMI / laptop charger",
      ],
    },
    source: "stub",
  };
}

async function buildLlmPlan(description: string): Promise<EventPlan | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const timezone = getTimezone();
  const system = `You are an RSO event planning assistant. Return ONLY valid JSON matching this shape:
{
  "title": string,
  "summary": string,
  "suggestedStart": ISO-8601 datetime,
  "suggestedEnd": ISO-8601 datetime,
  "timezone": string,
  "checklist": string[],
  "templates": {
    "agenda": string[],
    "roles": string[],
    "materials": string[]
  }
}
Use timezone "${timezone}". Suggest a practical start about one week out unless the user specifies otherwise. Keep lists short and actionable.`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: description },
      ],
    }),
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) return null;

  const parsed = EventPlanSchema.omit({ source: true }).safeParse(
    JSON.parse(content),
  );
  if (!parsed.success) return null;

  return { ...parsed.data, source: "llm" };
}

export async function generateEventPlan(
  description: string,
): Promise<EventPlan> {
  const trimmed = description.trim();
  if (!trimmed) {
    throw new Error("Event description is required");
  }

  try {
    const llmPlan = await buildLlmPlan(trimmed);
    if (llmPlan) return llmPlan;
  } catch {
    // Fall through to stub.
  }

  return buildStubPlan(trimmed);
}
