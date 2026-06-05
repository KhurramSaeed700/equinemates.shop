import {
  escapeHtml,
  getMailTransporter,
  getTransactionalFromEmail,
} from "@/lib/server/email-transport";

type AdminInviteEmailPayload = {
  toEmail: string;
  invitedByEmail: string;
  inviteUrl: string;
};

export async function sendAdminInviteEmail({
  toEmail,
  invitedByEmail,
  inviteUrl,
}: AdminInviteEmailPayload) {
  const transport = getMailTransporter();
  const fromEmail = getTransactionalFromEmail();
  const safeToEmail = escapeHtml(toEmail);
  const safeInvitedBy = escapeHtml(invitedByEmail);
  const safeInviteUrl = escapeHtml(inviteUrl);

  await transport.sendMail({
    from: fromEmail,
    to: toEmail,
    subject: "Equinemates admin access",
    text: [
      "You have been granted admin access to Equinemates.",
      "",
      `Invited by: ${invitedByEmail}`,
      "",
      "Sign in with this email address to open the admin panel:",
      inviteUrl,
      "",
      "If you were not expecting this invitation, you can ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.55;color:#111827">
        <h2 style="margin:0 0 12px">Equinemates admin access</h2>
        <p>You have been granted admin access to Equinemates.</p>
        <p><strong>Email:</strong> ${safeToEmail}</p>
        <p><strong>Invited by:</strong> ${safeInvitedBy}</p>
        <p>
          <a href="${safeInviteUrl}" style="display:inline-block;padding:12px 16px;background:#111;color:#fff;text-decoration:none;border-radius:8px;font-weight:700">
            Sign in to Equinemates
          </a>
        </p>
        <p style="color:#4b5563;font-size:13px">
          If you were not expecting this invitation, you can ignore this email.
        </p>
      </div>
    `,
  });
}
