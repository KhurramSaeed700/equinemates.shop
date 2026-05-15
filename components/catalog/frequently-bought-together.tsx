"use client";

import { Fragment, useMemo, useState } from "react";
import { useCatalogProducts } from "@/components/hooks/useCatalogProducts";
import { useCart } from "@/components/providers/cart-provider";
import { useCurrency } from "@/components/providers/currency-provider";
import { useMounted } from "@/components/hooks/useMounted";
import { Product } from "@/lib/types";

export function FrequentlyBoughtTogether({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const { formatFromUsd } = useCurrency();
  const mounted = useMounted();
  const { products: defaults } = useCatalogProducts({
    slugs: product.relatedSlugs,
    excludeSlugs: [product.slug],
    limit: 2,
    enabled: true,
  });
  const defaultSlugs = useMemo(
    () => defaults.map((candidate) => candidate.slug),
    [defaults],
  );
  const [manualSelected, setManualSelected] = useState<string[] | null>(null);
  const selected = useMemo(() => {
    if (manualSelected === null) {
      return defaultSlugs;
    }

    return manualSelected.filter((slug) => defaultSlugs.includes(slug));
  }, [defaultSlugs, manualSelected]);

  const toggle = (slug: string) => {
    setManualSelected((current) => {
      const baseSelection =
        current === null
          ? defaultSlugs
          : current.filter((candidate) => defaultSlugs.includes(candidate));

      return baseSelection.includes(slug)
        ? baseSelection.filter((candidate) => candidate !== slug)
        : [...baseSelection, slug];
    });
  };

  const combinedTotalUsd = useMemo(() => {
    let total = product.basePriceUsd;
    defaults.forEach((p) => {
      if (selected.includes(p.slug)) total += p.basePriceUsd;
    });
    return total;
  }, [product, defaults, selected]);

  if (!defaults.length) return null;

  return (
    <div className="panel fbt-panel">
      <h4>Frequently Bought Together</h4>
      <div className="fbt-row">
        <div className="fbt-main">
          <div className="fbt-card">
            <img src={product.images[0]} alt={product.name} />
            <div>
              <strong>{product.name}</strong>
              <p className="tiny">
                {mounted
                  ? formatFromUsd(product.basePriceUsd)
                  : `$${product.basePriceUsd.toFixed(2)}`}
              </p>
            </div>
          </div>
        </div>
        <div className="fbt-related">
          {defaults.map((p, idx) => (
            <Fragment key={p.slug}>
              <label className="fbt-related-item">
                <input
                  type="checkbox"
                  checked={selected.includes(p.slug)}
                  onChange={() => toggle(p.slug)}
                />
                <img src={p.images[0]} alt={p.name} />
                <div className="fbt-related-info">
                  <div className="tiny">{p.name}</div>
                  <div className="tiny strong">
                    {mounted
                      ? formatFromUsd(p.basePriceUsd)
                      : `$${p.basePriceUsd.toFixed(2)}`}
                  </div>
                </div>
              </label>
              {idx < defaults.length - 1 && (
                <span className="fbt-sep" aria-hidden="true">
                  +
                </span>
              )}
            </Fragment>
          ))}
        </div>
      </div>
      <div className="fbt-actions action-row">
        <div>
          <div className="tiny">Combined total</div>
          <div className="product-price">
            {mounted ? formatFromUsd(combinedTotalUsd) : `$${combinedTotalUsd.toFixed(2)}`}
          </div>
        </div>
        <div className="action-row">
          <button
            className="btn-secondary"
            type="button"
            onClick={() => {
              // add selected items
              defaults.forEach((p) => {
                if (selected.includes(p.slug)) addToCart(p, 1);
              });
              addToCart(product, 1);
            }}
          >
            Add Selected to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
