import { NextResponse } from "next/server";

import { sendContactEmail } from "@/lib/server/contact-email-service";
import { createContactSubmission } from "@/lib/server/submissions-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    email?: string;
    phone?: string;
    message?: string;
  };

  if (!body.name || !body.email || !body.message) {
    return NextResponse.json(
      { message: "Name, email, and message are required." },
      { status: 400 },
    );
  }

  const submission = createContactSubmission({
    name: body.name,
    email: body.email,
    phone: body.phone,
    message: body.message,
  });

  try {
    await sendContactEmail({
      name: body.name,
      email: body.email,
      phone: body.phone,
      message: body.message,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? `Message saved but email delivery failed: ${error.message}`
            : "Message saved but email delivery failed.",
        id: submission.id,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    message: "Contact request submitted. Email notification sent to support.",
    id: submission.id,
  });
}
