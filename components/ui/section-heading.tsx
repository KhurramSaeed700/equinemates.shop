import Link from "next/link";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  ctaLabel,
  ctaHref,
}: SectionHeadingProps) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow ? <p className="section-eyebrow">{eyebrow}</p> : null}
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {ctaLabel && ctaHref ? (
        <Link className="text-link" href={ctaHref}>
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  );
}
