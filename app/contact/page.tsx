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
        <p>Phone: +92 42 111 222 333</p>
        <p>Email: support@equinemates.com</p>
        <p>Office Address: 44C Gulberg III, Lahore, Punjab, Pakistan</p>
        <p>Support Hours: Monday - Saturday, 9:00 AM to 8:00 PM PKT</p>
        <div className="section-spacing">
          <h3>Google Map</h3>
          <iframe
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src="https://www.google.com/maps?q=Lahore%20Pakistan&output=embed"
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
