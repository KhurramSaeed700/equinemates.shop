"use client";

import { FormEvent, useState } from "react";

export function CatalogRequestForm() {
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    setIsSubmitting(true);
    setStatus("");

    try {
      const response = await fetch("/api/catalog/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          company: formData.get("company"),
          phone: formData.get("phone"),
          wantsPrintedCatalog: formData.get("printedCatalog") === "on",
          wholesale: formData.get("wholesale") === "on",
          notes: formData.get("notes"),
        }),
      });

      const payload = (await response.json()) as {
        message?: string;
        requestId?: string;
        deliveryEstimate?: string;
      };
      if (!response.ok) {
        throw new Error(payload.message ?? "Could not submit catalog request.");
      }

      setStatus(
        `${payload.message ?? "Catalog request submitted."} Reference ${payload.requestId ?? "-"} ${payload.deliveryEstimate ?? ""}`,
      );
      event.currentTarget.reset();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Request failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="panel form-grid" onSubmit={onSubmit}>
      <label>
        Contact Name
        <input name="name" required type="text" />
      </label>
      <label>
        Email
        <input name="email" required type="email" />
      </label>
      <label>
        Company
        <input name="company" type="text" />
      </label>
      <label>
        Phone
        <input name="phone" type="tel" />
      </label>
      <label className="checkbox-label">
        <input name="printedCatalog" type="checkbox" />
        Request printed catalog delivery
      </label>
      <label className="checkbox-label">
        <input name="wholesale" type="checkbox" />
        This is a business/wholesale inquiry
      </label>
      <label className="full-width">
        Notes
        <textarea name="notes" rows={4} />
      </label>
      <button className="btn-primary" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Submitting..." : "Request Catalog"}
      </button>
      {status ? <p className="form-status">{status}</p> : null}
    </form>
  );
}
