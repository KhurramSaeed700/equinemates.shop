import { NextResponse } from "next/server";

import { createWholesaleRequest } from "@/lib/server/submissions-service";
import { WholesaleRequest } from "@/lib/types";

export async function POST(request: Request) {
  const formData = await request.formData();
  const attachments = formData.getAll("attachments");
  const payload: WholesaleRequest = {
    companyName: String(formData.get("companyName") ?? ""),
    contactName: String(formData.get("contactName") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    taxId: String(formData.get("taxId") ?? ""),
    expectedMonthlyVolume: String(formData.get("expectedMonthlyVolume") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    attachments: attachments
      .filter((entry) => entry instanceof File)
      .map((entry) => (entry instanceof File ? entry.name : "")),
  };

  if (!payload.companyName || !payload.contactName || !payload.email || !payload.phone) {
    return NextResponse.json(
      { message: "companyName, contactName, email, and phone are required." },
      { status: 400 },
    );
  }

  const result = createWholesaleRequest(payload);
  return NextResponse.json({
    message: "Wholesale request submitted for admin review.",
    requestId: result.requestId,
    quote: result.quote,
  });
}
