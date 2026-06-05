import {
  escapeHtml,
  getMailTransporter,
  getTransactionalFromEmail,
} from "@/lib/server/email-transport";

interface ContactEmailPayload {
  name: string;
  email: string;
  phone?: string;
  message: string;
}

export async function sendContactEmail(payload: ContactEmailPayload) {
  const transport = getMailTransporter();
  const toEmail = process.env.CONTACT_TO_EMAIL ?? "equinemates@gmail.com";
  const fromEmail = getTransactionalFromEmail();

  const safeName = escapeHtml(payload.name);
  const safeEmail = escapeHtml(payload.email);
  const safePhone = escapeHtml(payload.phone ?? "Not provided");
  const safeMessage = escapeHtml(payload.message).replaceAll("\n", "<br />");
  const submittedAt = new Date().toISOString();

  await transport.sendMail({
    from: fromEmail,
    to: toEmail,
    replyTo: payload.email,
    subject: `New Equinemates Contact Form Message - ${payload.name}`,
    text: [
      "New contact form submission:",
      `Name: ${payload.name}`,
      `Email: ${payload.email}`,
      `Phone: ${payload.phone ?? "Not provided"}`,
      `Submitted At: ${submittedAt}`,
      "",
      payload.message,
    ].join("\n"),
    html: `
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${safeName}</p>
      <p><strong>Email:</strong> ${safeEmail}</p>
      <p><strong>Phone:</strong> ${safePhone}</p>
      <p><strong>Submitted At:</strong> ${submittedAt}</p>
      <hr />
      <p><strong>Message:</strong></p>
      <p>${safeMessage}</p>
    `,
  });
}
