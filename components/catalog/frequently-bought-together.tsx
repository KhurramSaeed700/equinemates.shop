"use client";

import { useState, useMemo, Fragment } from "react";
import { PRODUCTS } from "@/lib/catalog";
import { Product } from "@/lib/types";
import { useCart } from "@/components/providers/cart-provider";
import { useCurrency } from "@/components/providers/currency-provider";
import { useMounted } from "@/components/hooks/useMounted";

export function FrequentlyBoughtTogether({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const { formatFromPkr } = useCurrency();
  const mounted = useMounted();
  // pick related or fallback
  const related = product.relatedSlugs
    ?.map((s) => PRODUCTS.find((p) => p.slug === s))
    .filter(Boolean) as Product[];

  const defaults = related.length
    ? related.slice(0, 2)
    : PRODUCTS.filter((p) => p.slug !== product.slug).slice(0, 2);

  const [selected, setSelected] = useState<string[]>(
    defaults.map((p) => p.slug),
  );

  const toggle = (slug: string) => {
    setSelected((s) =>
      s.includes(slug) ? s.filter((x) => x !== slug) : [...s, slug],
    );
  };

  const items = useMemo(
    () => [
      product,
      ...defaults
        .filter((d) => d)
        .filter((p) => (!selected.includes(p.slug) ? false : true)),
    ],
    [product, defaults, selected],
  );

  const combinedTotal = useMemo(() => {
    let total = product.basePricePkr;
    defaults.forEach((p) => {
      if (selected.includes(p.slug)) total += p.basePricePkr;
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
                  ? formatFromPkr(product.basePricePkr)
                  : `Rs ${product.basePricePkr}`}
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
                      ? formatFromPkr(p.basePricePkr)
                      : `Rs ${p.basePricePkr}`}
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
            {mounted ? formatFromPkr(combinedTotal) : `Rs ${combinedTotal}`}
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
