import { randomUUID } from "node:crypto";

import { db } from "@/lib/server/db";
import { CatalogRequest, QuoteSummary, WholesaleRequest } from "@/lib/types";

export function createContactSubmission(input: {
  name: string;
  email: string;
  phone?: string;
  message: string;
}) {
  const record = {
    id: randomUUID(),
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone?.trim(),
    message: input.message.trim(),
    createdAt: new Date().toISOString(),
  };

  db.contactSubmissions.push(record);
  return record;
}

export function createCatalogRequest(input: CatalogRequest) {
  const record = {
    id: `CAT-${Math.floor(Math.random() * 9000 + 1000)}`,
    payload: input,
    createdAt: new Date().toISOString(),
  };

  db.catalogSubmissions.push(record);
  return {
    ...record,
    deliveryEstimate: "Catalog email delivery in 3-10 minutes.",
  };
}

export function createWholesaleRequest(
  input: WholesaleRequest,
): {
  requestId: string;
  quote: QuoteSummary;
} {
  const requestId = `WQ-${Math.floor(Math.random() * 9000 + 1000)}`;
  const estimatedTotalPkr = 150000 + Math.floor(Math.random() * 400000);

  const record = {
    id: requestId,
    payload: input,
    createdAt: new Date().toISOString(),
  };
  db.wholesaleSubmissions.push(record);

  const quote: QuoteSummary = {
    id: requestId,
    companyName: input.companyName,
    requestedAt: new Date().toISOString().slice(0, 10),
    status: "submitted",
    estimatedTotalPkr,
  };
  db.quoteHistory.unshift(quote);

  return { requestId, quote };
}

export function listWholesaleQuotes(limit = 20): QuoteSummary[] {
  return db.quoteHistory.slice(0, limit);
}
