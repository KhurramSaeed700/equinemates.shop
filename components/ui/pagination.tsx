import * as React from "react";
import Link from "next/link";

type PaginationProps = React.ComponentProps<"nav">;

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Pagination({ className, ...props }: PaginationProps) {
  return (
    <nav
      aria-label="pagination"
      className={cx("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  );
}

export function PaginationContent({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      className={cx("flex flex-row items-center gap-1", className)}
      {...props}
    />
  );
}

export function PaginationItem(props: React.ComponentProps<"li">) {
  return <li {...props} />;
}

type PaginationLinkProps = {
  isActive?: boolean;
} & React.ComponentProps<typeof Link>;

export function PaginationLink({
  className,
  isActive,
  ...props
}: PaginationLinkProps) {
  return (
    <Link
      aria-current={isActive ? "page" : undefined}
      className={cx(
        "inline-flex h-9 min-w-9 items-center justify-center border border-[var(--line)] px-3 text-sm transition-colors",
        isActive
          ? "bg-[var(--ink)] !text-white hover:bg-[var(--ink)] hover:!text-white"
          : "bg-white text-[var(--ink)] hover:bg-[var(--bg-elevated)]",
        className,
      )}
      {...props}
    />
  );
}

export function PaginationPrevious(props: React.ComponentProps<typeof Link>) {
  return <PaginationLink aria-label="Go to previous page" {...props} />;
}

export function PaginationNext(props: React.ComponentProps<typeof Link>) {
  return <PaginationLink aria-label="Go to next page" {...props} />;
}

export function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      className={cx("inline-flex h-9 min-w-9 items-center justify-center", className)}
      {...props}
    >
      ...
    </span>
  );
}
