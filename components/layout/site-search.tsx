"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { SearchIcon } from "@/components/ui/icons";
import { searchSuggestions } from "@/lib/catalog";

export function SiteSearch() {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const router = useRouter();

  const suggestions = useMemo(() => searchSuggestions(query), [query]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    setFocused(false);
  };

  return (
    <div className="search-wrap">
      <form className="search-form" onSubmit={handleSubmit}>
        <SearchIcon width={16} height={16} />
        <input
          aria-label="Search by name or SKU"
          onBlur={() => window.setTimeout(() => setFocused(false), 120)}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setFocused(true)}
          placeholder="Search name or SKU"
          type="search"
          value={query}
        />
      </form>
      {focused && query.trim() ? (
        <div className="search-suggestions">
          {suggestions.length ? (
            suggestions.map((product) => (
              <Link
                href={`/products/${product.slug}`}
                key={product.id}
                onClick={() => setFocused(false)}
              >
                <span>{product.name}</span>
                <span>{product.sku}</span>
              </Link>
            ))
          ) : (
            <p>No matching products</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
