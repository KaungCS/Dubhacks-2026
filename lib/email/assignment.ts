import { sendEmail } from "./send";

/** First-assignment-of-the-day email to an assignee. */
export async function sendAssignmentEmail(input: {
  to: string;
  assigneeName?: string | null;
  taskTitle: string;
  dueAt?: string | null;
}): Promise<void> {
  const dueLine = input.dueAt
    ? `Due: ${new Date(input.dueAt).toLocaleString()}`
    : "No due date set.";

  await sendEmail({
    to: input.to,
    subject: `New task assigned: ${input.taskTitle}`,
    text: [
      input.assigneeName ? `Hi ${input.assigneeName},` : "Hi,",
      "",
      `You were assigned a task: ${input.taskTitle}`,
      dueLine,
      "",
      "Open Club Ops to see details and update status.",
      "",
      "(You only get one assignment email per day; later assignments show in the app.)",
    ].join("\n"),
  });
}
