import Link from "next/link";

export function Breadcrumb({
  items,
}: {
  items: { href?: string; label: string }[];
}) {
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      {items.map((it, idx) => (
        <span key={idx}>
          {it.href ? (
            <Link href={it.href} className="text-link">
              {it.label}
            </Link>
          ) : (
            <span>{it.label}</span>
          )}
          {idx < items.length - 1 ? (
            <span className="breadcrumb-sep">/</span>
          ) : null}
        </span>
      ))}
    </nav>
  );
}
