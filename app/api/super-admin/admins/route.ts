import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { sendAdminInviteEmail } from "@/lib/server/admin-invite-email-service";
import { getAdminAccess } from "@/lib/server/admin-auth";
import {
  addAdminAccount,
  isValidAdminEmail,
  listAdminAccounts,
  normalizeAdminEmail,
  recordAdminInviteSent,
  removeAdminAccount,
} from "@/lib/server/admin-directory";

export const runtime = "nodejs";

function getUnauthorizedResponse(reason: string, isAuthenticated: boolean) {
  return NextResponse.json(
    { message: reason },
    { status: isAuthenticated ? 403 : 401 },
  );
}

async function requireSuperAdmin() {
  const adminAccess = await getAdminAccess();

  if (!adminAccess.isAuthorized || !adminAccess.isSuperAdmin) {
    return {
      adminAccess,
      response: getUnauthorizedResponse(
        adminAccess.isAuthorized
          ? "Super admin access is required."
          : adminAccess.reason,
        adminAccess.isAuthenticated,
      ),
    };
  }

  return { adminAccess, response: null };
}

function getInviteUrl(request: Request) {
  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host") ?? requestUrl.host;
  const forwardedProtocol = request.headers.get("x-forwarded-proto");
  const protocol = forwardedProtocol ?? requestUrl.protocol.replace(":", "");

  return new URL("/account", `${protocol}://${host}`).toString();
}

export async function GET() {
  const { response } = await requireSuperAdmin();

  if (response) {
    return response;
  }

  const admins = await listAdminAccounts();
  return NextResponse.json({ admins });
}

export async function POST(request: Request) {
  const { adminAccess, response } = await requireSuperAdmin();

  if (response) {
    return response;
  }

  try {
    const body = (await request.json()) as { email?: string };
    const email = normalizeAdminEmail(String(body.email ?? ""));

    if (!isValidAdminEmail(email)) {
      return NextResponse.json(
        { message: "Enter a valid email address." },
        { status: 400 },
      );
    }

    let admin = await addAdminAccount({
      email,
      invitedByEmail: adminAccess.primaryEmail ?? "super admin",
    });
    const inviteUrl = getInviteUrl(request);
    let inviteEmailSent = false;
    let inviteEmailError: string | null = null;

    try {
      await sendAdminInviteEmail({
        toEmail: admin.email,
        invitedByEmail: adminAccess.primaryEmail ?? "super admin",
        inviteUrl,
      });
      admin = await recordAdminInviteSent(admin.email);
      inviteEmailSent = true;
    } catch (error) {
      inviteEmailError =
        error instanceof Error ? error.message : "Invite email could not be sent.";
      console.error("[api/super-admin/admins] Invite email failed.", {
        email: admin.email,
        errorName: error instanceof Error ? error.name : "UnknownError",
        message: inviteEmailError,
      });
    }

    revalidatePath("/super-admin");

    return NextResponse.json({
      admin,
      admins: await listAdminAccounts(),
      inviteEmailError,
      inviteEmailSent,
      inviteUrl,
      message: inviteEmailSent
        ? "Admin added and invitation sent."
        : "Admin added. Invite email was not sent.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Could not add admin access.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const { response } = await requireSuperAdmin();

  if (response) {
    return response;
  }

  try {
    const body = (await request.json()) as { email?: string };
    const email = normalizeAdminEmail(String(body.email ?? ""));

    if (!isValidAdminEmail(email)) {
      return NextResponse.json(
        { message: "Enter a valid email address." },
        { status: 400 },
      );
    }

    await removeAdminAccount(email);
    revalidatePath("/super-admin");

    return NextResponse.json({
      admins: await listAdminAccounts(),
      message: "Admin access removed.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Could not remove admin access.",
      },
      { status: 400 },
    );
  }
}
