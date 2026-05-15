"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { ProductPreviewModal } from "@/components/catalog/product-preview-modal";
import { useMounted } from "@/components/hooks/useMounted";
import { useCart } from "@/components/providers/cart-provider";
import { useCurrency } from "@/components/providers/currency-provider";
import { useWishlist } from "@/components/providers/wishlist-provider";
import { HeartIcon } from "@/components/ui/icons";
import { CartIcon } from "@/components/ui/icons";
import { FiCheck } from "react-icons/fi";
import { Product } from "@/lib/types";
import { useUser } from "@clerk/nextjs";

export function ProductCard({ product }: { product: Product }) {
  const { formatFromUsd } = useCurrency();
  const { addToCart, items } = useCart();
  const { has: hasInWishlist, toggle } = useWishlist();
  const isFavorited = hasInWishlist(product.slug);
  const { isSignedIn } = useUser();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const mounted = useMounted();
  const isInCart = items.some((item) => item.productSlug === product.slug);

  return (
    <>
      <article className="product-card reveal">
        <Link href={`/products/${product.slug}`} className="product-link">
          <div className="product-image-wrap relative">
            <Image
              alt={product.name}
              className="product-image"
              height={420}
              src={product.images[0]}
              width={640}
            />
            {isSignedIn ? (
              <button
                type="button"
                className="absolute top-2 right-2 p-1 bg-white/80 rounded-full hover:bg-white"
                onClick={(e) => {
                  // prevent the surrounding link from firing
                  e.preventDefault();
                  e.stopPropagation();
                  toggle(product.slug);
                }}
              >
                <HeartIcon
                  className={`w-5 h-5 text-red-500 ${isFavorited ? "fill-current" : ""}`}
                />
              </button>
            ) : null}
          </div>
          <div className="product-body">
            <p className="product-meta">
              <span>{product.category}</span>
              <span>{product.sku}</span>
            </p>
            <h3>{product.name}</h3>
            <p className="product-description">{product.shortDescription}</p>
            <p className="product-price">
              {mounted
                ? formatFromUsd(product.basePriceUsd)
                : `$${product.basePriceUsd.toFixed(2)}`}
            </p>
          </div>
        </Link>
        <div className={isSignedIn ? "product-actions" : "product-actions product-actions-single"}>
          {isSignedIn ? (
            <button
              className="btn-primary product-card-action-btn"
              onClick={() => {
                addToCart(product, 1);
              }}
              type="button"
              aria-pressed={isInCart}
            >
              <span className="inline-flex items-center gap-1">
                {isInCart ? (
                  <FiCheck className="h-3.5 w-3.5 text-white" />
                ) : (
                  <CartIcon className="h-3.5 w-3.5" />
                )}
                <span>{isInCart ? "Added" : "Add to Cart"}</span>
              </span>
            </button>
          ) : null}
          <button
            className="btn-secondary product-card-action-btn"
            onClick={() => setIsPreviewOpen(true)}
            type="button"
          >
            See Preview
          </button>
        </div>
      </article>

      <ProductPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        product={product}
        key={`${product.slug}-${isPreviewOpen ? "open" : "closed"}`}
      />
    </>
  );
}
