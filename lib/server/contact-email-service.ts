import nodemailer from "nodemailer";

interface ContactEmailPayload {
  name: string;
  email: string;
  phone?: string;
  message: string;
}

declare global {
  var __equinematesMailTransport:
    | nodemailer.Transporter<nodemailer.SentMessageInfo>
    | undefined;
}

function toBoolean(input: string | undefined, fallback: boolean): boolean {
  if (input === undefined) {
    return fallback;
  }
  return input.toLowerCase() === "true";
}

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getTransporter() {
  if (globalThis.__equinematesMailTransport) {
    return globalThis.__equinematesMailTransport;
  }

  const smtpHost = process.env.SMTP_HOST ?? "smtp.gmail.com";
  const smtpPort = Number(process.env.SMTP_PORT ?? 465);
  const smtpSecure = toBoolean(process.env.SMTP_SECURE, smtpPort === 465);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpUser || !smtpPass) {
    throw new Error("SMTP_USER and SMTP_PASS are required for contact emails.");
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  globalThis.__equinematesMailTransport = transporter;
  return transporter;
}

export async function sendContactEmail(payload: ContactEmailPayload) {
  const transport = getTransporter();
  const toEmail = process.env.CONTACT_TO_EMAIL ?? "equinemates@gmail.com";
  const fromEmail = process.env.CONTACT_FROM_EMAIL ?? process.env.SMTP_USER;

  if (!fromEmail) {
    throw new Error("CONTACT_FROM_EMAIL or SMTP_USER must be configured.");
  }

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
