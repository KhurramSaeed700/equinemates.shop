"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { ProductListingVariation } from "@/lib/types";

type ProductVariationPreviewContextValue = {
  previewVariation: ProductListingVariation | null;
  clearPreviewVariation: () => void;
  previewVariationBySlug: (slug: string) => void;
};

const ProductVariationPreviewContext =
  createContext<ProductVariationPreviewContextValue | null>(null);

export function ProductVariationPreviewProvider({
  children,
  variations,
}: {
  children: ReactNode;
  variations: ProductListingVariation[];
}) {
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);
  const previewVariation = previewSlug
    ? variations.find((variation) => variation.slug === previewSlug) ?? null
    : null;
  const previewVariationBySlug = useCallback((slug: string) => {
    setPreviewSlug(slug);
  }, []);
  const clearPreviewVariation = useCallback(() => {
    setPreviewSlug(null);
  }, []);
  const value = useMemo(
    () => ({
      previewVariation,
      clearPreviewVariation,
      previewVariationBySlug,
    }),
    [clearPreviewVariation, previewVariation, previewVariationBySlug],
  );

  return (
    <ProductVariationPreviewContext.Provider value={value}>
      {children}
    </ProductVariationPreviewContext.Provider>
  );
}

export function useProductVariationPreview() {
  const value = useContext(ProductVariationPreviewContext);

  if (!value) {
    throw new Error(
      "useProductVariationPreview must be used inside ProductVariationPreviewProvider.",
    );
  }

  return value;
}
