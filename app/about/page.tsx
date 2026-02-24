import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us",
  description: "Mission, vision, and quality commitment of Equinemates.",
};

export default function AboutPage() {
  return (
    <div className="grid-two">
      <section className="panel">
        <h2>Company Introduction</h2>
        <p>
          Equinemates is an equine and pet-focused commerce company built to serve
          households, riders, stables, and wholesale buyers through a unified digital
          platform.
        </p>
        <h3>Mission Statement</h3>
        <p>
          Deliver dependable, category-specific products with transparent pricing,
          fast support, and operational reliability.
        </p>
        <h3>Vision & Goals</h3>
        <p>
          Build the leading Pakistan-based ecosystem for horse, rider, and pet
          commerce with regional and global expansion capability.
        </p>
      </section>
      <section className="panel">
        <h2>Brand Story</h2>
        <p>
          The brand started around one practical question: why are core stable and
          rider products still hard to source consistently? Equinemates was built to
          solve that gap with modern logistics and structured catalog operations.
        </p>
        <h3>Quality Commitment</h3>
        <ul className="trust-list">
          <li>Vendor qualification and category-level quality checks</li>
          <li>Batch and SKU traceability for core inventory</li>
          <li>Feedback loops from riders, clinics, and stable managers</li>
          <li>Continuous performance reviews for products and partners</li>
        </ul>
      </section>
    </div>
  );
}
