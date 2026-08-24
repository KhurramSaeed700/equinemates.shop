import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FiCopy, FiEdit3 } from "react-icons/fi";

import { ProductDetailActions } from "@/components/catalog/product-detail-actions";
import { ProductGallery } from "@/components/catalog/product-gallery";
import { ProductGrid } from "@/components/catalog/product-grid";
import { ProductVariationPreviewProvider } from "@/components/catalog/product-variation-preview";
import { RecentlyViewedTracker } from "@/components/catalog/recently-viewed-tracker";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { FormattedDescription } from "@/components/ui/formatted-description";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { ProductMedia } from "@/components/ui/product-media";
import { SectionHeading } from "@/components/ui/section-heading";
import { buildCategoryPathHref } from "@/lib/catalog";
import { getProductImageSrc } from "@/lib/image-utils";
import { getRichTextPlainText } from "@/lib/rich-text";
import { getAdminAccess } from "@/lib/server/admin-auth";
import {
  getProductBySlug,
  getRelatedProducts,
} from "@/lib/server/catalog-products";

interface ProductDetailPageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: ProductDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return {
      title: "Product not found",
    };
  }

  return {
    title: product.name,
    description: getRichTextPlainText(product.longDescription),
  };
}

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const [relatedProducts, adminAccess] = await Promise.all([
    getRelatedProducts(product.slug),
    getAdminAccess(),
  ]);
  const categoryBreadcrumbs = product.categoryPath.map((node, index) => {
    if (index === 0) {
      return {
        href: `/products?category=${encodeURIComponent(node)}`,
        label: node,
      };
    }

    return {
      href: buildCategoryPathHref(product.categoryPath.slice(0, index + 1)),
      label: node,
    };
  });

  return (
    <div className="product-detail-page">
      <RecentlyViewedTracker slug={product.slug} />

      <Breadcrumb
        items={[
          { href: "/products", label: "Products" },
          ...categoryBreadcrumbs,
        ]}
      />

      {adminAccess.isAuthorized ? (
        <div className="product-detail-heading-row">
          <div className="product-admin-tools-actions">
            <Link
              className="btn-secondary"
              href={`/admin?product=${encodeURIComponent(product.slug)}`}
            >
              <FiEdit3 aria-hidden="true" />
              Edit listing
            </Link>
            <Link
              className="btn-secondary"
              href={`/admin?product=${encodeURIComponent(product.slug)}&mode=duplicate`}
            >
              <FiCopy aria-hidden="true" />
              Duplicate listing
            </Link>
          </div>
        </div>
      ) : null}

      <ProductVariationPreviewProvider
        variations={product.listingVariations ?? []}
      >
        <div className="grid-two product-detail-grid">
          <div className="product-detail-media-column">
            <section className="panel product-gallery">
              <h3 className="visually-hidden">Product images</h3>
              <ProductGallery images={product.images} name={product.name} />
            </section>
            <section className="product-detail-information">
              <CollapsibleSection title="Description">
                <FormattedDescription text={product.longDescription} />
              </CollapsibleSection>
              <CollapsibleSection title="Care Instructions">
                {product.careInstructions ? (
                  <FormattedDescription text={product.careInstructions} />
                ) : (
                  <p>Care instructions will be provided soon.</p>
                )}
              </CollapsibleSection>
              {product.shippingInfo ? (
                <CollapsibleSection title="Shipping Information">
                  <FormattedDescription text={product.shippingInfo} />
                </CollapsibleSection>
              ) : null}
            </section>
          </div>
          <div className="product-detail-info-column">
            <ProductDetailActions product={product} />
          </div>
        </div>
      </ProductVariationPreviewProvider>

      <section id="reviews" className="reviews-panel product-reviews-section">
        <div className="product-reviews-heading">
          <div>
            <p className="section-eyebrow">Community feedback</p>
            <h2>Customer Reviews</h2>
          </div>
          <p>
            {product.rating.toFixed(1)} out of 5 · {product.reviewCount}{" "}
            {product.reviewCount === 1 ? "review" : "reviews"}
          </p>
        </div>
        {product.reviews.length > 0 ? (
          <div className="review-list">
            {product.reviews.map((review) => (
              <article className="review-item" key={review.id}>
                <strong>{review.headline}</strong>
                <p className="tiny">
                  {review.author} | {review.date} | Rating: {review.rating}/5
                </p>
                <p>{review.comment}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="product-reviews-empty">
            No customer reviews yet. Reviews will appear here once customers
            submit them and they are approved for publishing.
          </p>
        )}
      </section>

      {product.bannerImages.length ? (
        <section
          aria-label={`${product.name} promotional images`}
          className="product-story-banners"
        >
          <div className="product-story-banners-heading">
            <p className="section-eyebrow">In the stable</p>
            <h2>See it in action</h2>
          </div>
          {product.bannerImages.map((banner, index) => (
            <ProductMedia
              alt={`${product.name} promotional banner ${index + 1}`}
              className="product-story-banner"
              height={720}
              key={banner}
              sizes="100vw"
              src={getProductImageSrc(banner)}
              width={1800}
            />
          ))}
        </section>
      ) : null}

      <section className="section-spacing related-products-mobile-scroll">
        <SectionHeading title="Related Products" />
        <ProductGrid products={relatedProducts} />
      </section>
    </div>
  );
}
