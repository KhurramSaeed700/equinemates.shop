"use client";

import { FormEvent, useState } from "react";

export function ContactForm() {
  const [status, setStatus] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    setIsSubmitting(true);
    setStatus("");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          message: formData.get("message"),
        }),
      });

      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to submit message.");
      }

      setStatus(payload.message ?? "Message submitted.");
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
        Full Name
        <input name="name" required type="text" />
      </label>
      <label>
        Email
        <input name="email" required type="email" />
      </label>
      <label>
        Phone Number
        <input name="phone" type="tel" />
      </label>
      <label className="full-width">
        Message
        <textarea name="message" required rows={5} />
      </label>
      <button className="btn-primary" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Sending..." : "Send Message"}
      </button>
      {status ? <p className="form-status">{status}</p> : null}
    </form>
  );
}
