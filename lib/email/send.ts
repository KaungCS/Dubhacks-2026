type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
};

/**
 * Thin Resend wrapper. No-ops (logs) when RESEND_API_KEY / EMAIL_FROM are missing
 * so local/stub environments still work.
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    console.warn(
      "[email] RESEND_API_KEY or EMAIL_FROM missing; skipped send:",
      input.subject,
      "→",
      input.to,
    );
    return;
  }

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: input.to,
    subject: input.subject,
    text: input.text,
  });

  if (error) {
    throw new Error(`Resend send failed: ${error.message}`);
  }
}
