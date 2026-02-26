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
  const { formatFromPkr } = useCurrency();
  const { addToCart } = useCart();
  const { has: hasInWishlist, toggle } = useWishlist();
  const isFavorited = hasInWishlist(product.slug);
  const { isSignedIn } = useUser();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const mounted = useMounted();

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
            {/* favorite heart overlay */}
            <button
              type="button"
              className="absolute top-2 right-2 p-1 bg-white/80 rounded-full hover:bg-white"
              onClick={(e) => {
                // prevent the surrounding link from firing
                e.preventDefault();
                e.stopPropagation();
                toggle(product.slug);
              }}
              disabled={!isSignedIn}
              title={isSignedIn ? undefined : "Sign in to save"}
            >
              <HeartIcon
                className={`w-5 h-5 text-red-500 ${isFavorited ? "fill-current" : ""}`}
              />
            </button>
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
                ? formatFromPkr(product.basePricePkr)
                : `Rs ${product.basePricePkr}`}
            </p>
          </div>
        </Link>
        <div className="product-actions">
          <button
            className="btn-primary"
            onClick={() => {
              if (!isSignedIn) return;
              addToCart(product, 1);
              setJustAdded(true);
              window.setTimeout(() => setJustAdded(false), 1500);
            }}
            type="button"
            disabled={!isSignedIn}
            aria-pressed={justAdded}
          >
            <span className="inline-flex items-center gap-2">
              {justAdded ? (
                <FiCheck className="w-4 h-4 text-white" />
              ) : (
                <CartIcon className="w-4 h-4" />
              )}
              <span>
                {isSignedIn
                  ? justAdded
                    ? "Added"
                    : "Add to Cart"
                  : "Sign in to add"}
              </span>
            </span>
          </button>
          <button
            className="btn-secondary"
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
      />
    </>
  );
}
