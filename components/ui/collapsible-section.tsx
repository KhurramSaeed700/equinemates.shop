"use client";

import { useState } from "react";

export function CollapsibleSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="collapsible">
      <button
        type="button"
        className="collapsible-toggle"
        onClick={() => setOpen((s) => !s)}
      >
        {title} <span className="collapsible-caret">{open ? "▾" : "▸"}</span>
      </button>
      {open ? <div className="collapsible-body">{children}</div> : null}
    </div>
  );
}
