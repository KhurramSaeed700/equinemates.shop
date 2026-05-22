"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useDeferredValue, useEffect, useState } from "react";

import { SearchIcon } from "@/components/ui/icons";
import { ProductMedia } from "@/components/ui/product-media";
import { getProductImageSrc } from "@/lib/image-utils";

type SearchSuggestion = {
  id: string;
  slug: string;
  name: string;
  sku: string;
  image?: string;
};

export function SiteSearch() {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const deferredQuery = useDeferredValue(query.trim());
  const router = useRouter();

  useEffect(() => {
    if (!deferredQuery) {
      return;
    }

    const controller = new AbortController();

    fetch(`/api/search?mode=suggestions&q=${encodeURIComponent(deferredQuery)}`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Search suggestions failed.");
        }
        return response.json() as Promise<{ suggestions?: SearchSuggestion[] }>;
      })
      .then((payload) => {
        setSuggestions(payload.suggestions ?? []);
      })
      .catch((error) => {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        setSuggestions([]);
      });

    return () => controller.abort();
  }, [deferredQuery]);

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
                <span className="search-suggestion-main">
                  <ProductMedia
                    alt={product.name}
                    className="search-suggestion-thumb"
                    height={40}
                    src={getProductImageSrc(product.image)}
                    width={40}
                  />
                  <span className="search-suggestion-text">
                    <span className="search-suggestion-name">{product.name}</span>
                    <span className="search-suggestion-sku">{product.sku}</span>
                  </span>
                </span>
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
