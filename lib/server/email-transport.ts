import nodemailer from "nodemailer";

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

export function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function getMailTransporter() {
  if (globalThis.__equinematesMailTransport) {
    return globalThis.__equinematesMailTransport;
  }

  const smtpHost = process.env.SMTP_HOST ?? "smtp.gmail.com";
  const smtpPort = Number(process.env.SMTP_PORT ?? 465);
  const smtpSecure = toBoolean(process.env.SMTP_SECURE, smtpPort === 465);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpUser || !smtpPass) {
    throw new Error("SMTP_USER and SMTP_PASS are required for email delivery.");
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

export function getTransactionalFromEmail() {
  const fromEmail = process.env.CONTACT_FROM_EMAIL ?? process.env.SMTP_USER;

  if (!fromEmail) {
    throw new Error("CONTACT_FROM_EMAIL or SMTP_USER must be configured.");
  }

  return fromEmail;
}
