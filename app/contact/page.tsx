import type { Metadata } from "next";

import { ContactForm } from "@/components/forms/contact-form";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Contact Equinemates support and business teams.",
};

export default function ContactPage() {
  return (
    <div className="grid-two">
      <section className="panel">
        <h2>Contact Information</h2>
        <p>Phone: +1 302 555 0188</p>
        <p>Email: support@equinemates.com</p>
        <p>Office Address: 350 Fifth Avenue, New York, NY, United States</p>
        <p>Support Hours: Monday - Friday, 9:00 AM to 6:00 PM EST</p>
        <div className="section-spacing">
          <h3>Google Map</h3>
          <iframe
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src="https://www.google.com/maps?q=350+Fifth+Avenue+New+York&output=embed"
            style={{ border: 0, width: "100%", minHeight: "260px", borderRadius: "12px" }}
            title="Equinemates Office Location"
          />
        </div>
      </section>
      <section>
        <h2>Contact Form</h2>
        <ContactForm />
      </section>
    </div>
  );
}
