import { sendEmail } from "./send";

/** Always-sent email when a prereq task is marked done (bypasses daily limit). */
export async function sendPrereqDoneEmail(input: {
  to: string;
  officerName?: string | null;
  taskTitle: string;
}): Promise<void> {
  await sendEmail({
    to: input.to,
    subject: `Prereq done: ${input.taskTitle}`,
    text: [
      input.officerName ? `Hi ${input.officerName},` : "Hi,",
      "",
      `A prerequisite task was marked done: ${input.taskTitle}`,
      "",
      "You were tagged on this task — follow up in Club Ops if needed.",
    ].join("\n"),
  });
}
