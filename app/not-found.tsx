import Link from "next/link";

export default function NotFoundPage() {
  return (
    <section className="panel">
      <h2>Page not found</h2>
      <p>The requested route does not exist in this environment.</p>
      <Link className="btn-primary" href="/">
        Return Home
      </Link>
    </section>
  );
}
