"use client";

import { FormEvent, useState } from "react";

export function WholesaleRequestForm() {
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    setIsSubmitting(true);
    setStatus("");
    try {
      const response = await fetch("/api/wholesale/request", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as {
        message?: string;
        requestId?: string;
      };
      if (!response.ok) {
        throw new Error(payload.message ?? "Could not submit quote request.");
      }

      setStatus(`${payload.message ?? "Quote request submitted."} ID: ${payload.requestId}`);
      event.currentTarget.reset();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Submission failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="panel form-grid" onSubmit={onSubmit}>
      <label>
        Company Name
        <input name="companyName" required type="text" />
      </label>
      <label>
        Contact Name
        <input name="contactName" required type="text" />
      </label>
      <label>
        Business Email
        <input name="email" required type="email" />
      </label>
      <label>
        Phone
        <input name="phone" required type="tel" />
      </label>
      <label>
        Business Registration ID
        <input name="taxId" type="text" />
      </label>
      <label>
        Monthly Volume Estimate
        <input name="expectedMonthlyVolume" placeholder="e.g. 200 units" type="text" />
      </label>
      <label className="full-width">
        Request Notes
        <textarea name="notes" rows={4} />
      </label>
      <label className="full-width">
        Attach Requirements (PDF, XLSX, DOC)
        <input multiple name="attachments" type="file" />
      </label>
      <button className="btn-primary" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Submitting..." : "Submit Bulk Quote Request"}
      </button>
      {status ? <p className="form-status">{status}</p> : null}
    </form>
  );
}
