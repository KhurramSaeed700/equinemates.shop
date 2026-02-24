import { NextResponse } from "next/server";

import { createCatalogRequest } from "@/lib/server/submissions-service";
import { CatalogRequest } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<CatalogRequest>;

  if (!body.name || !body.email) {
    return NextResponse.json(
      { message: "Name and email are required." },
      { status: 400 },
    );
  }

  const submission = createCatalogRequest({
    name: body.name,
    email: body.email,
    company: body.company,
    phone: body.phone,
    wantsPrintedCatalog: Boolean(body.wantsPrintedCatalog),
    wholesale: Boolean(body.wholesale),
    notes: body.notes,
  });

  return NextResponse.json({
    message: "Catalog request submitted.",
    requestId: submission.id,
    deliveryEstimate: submission.deliveryEstimate,
  });
}
