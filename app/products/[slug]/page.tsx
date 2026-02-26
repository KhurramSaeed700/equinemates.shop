import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { ProductDetailActions } from "@/components/catalog/product-detail-actions";
import { ProductGrid } from "@/components/catalog/product-grid";
import { ProductGallery } from "@/components/catalog/product-gallery";
import { SectionHeading } from "@/components/ui/section-heading";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { getProductBySlug, getRelatedProducts } from "@/lib/catalog";

interface ProductDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ProductDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    return {
      title: "Product not found",
    };
  }

  return {
    title: product.name,
    description: product.longDescription,
  };
}

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const relatedProducts = getRelatedProducts(product.slug);

  return (
    <>
      <Breadcrumb
        items={[
          { href: "/products", label: "Products" },
          { label: product.name },
        ]}
      />

      <SectionHeading
        eyebrow={product.category}
        title={product.name}
        description={product.longDescription}
      />

      {/* rating & quick review link */}
      <div className="product-top-meta">
        <div className="rating-row">
          <span className="stars">
            {Array.from({ length: 5 })
              .map((_, i) => (i < Math.round(product.rating) ? "★" : "☆"))
              .join("")}
          </span>
          <a href="#reviews" className="text-link tiny">
            {product.reviewCount} reviews
          </a>
        </div>
      </div>

      <div className="grid-two product-detail-grid">
        <div className="left-column">
          <section className="panel product-gallery">
            <h3 className="visually-hidden">Product images</h3>
            <ProductGallery images={product.images} name={product.name} />
          </section>
          {product.reviews.length > 0 && (
            <section className="panel reviews-panel left-reviews">
              <h4>Customer Reviews</h4>
              <div className="review-highlight">
                <strong>Most helpful review</strong>
                <div>
                  <p className="tiny">
                    {product.reviews[0].author} — Rating:{" "}
                    {product.reviews[0].rating}/5
                  </p>
                  <p>{product.reviews[0].comment}</p>
                </div>
              </div>
              <div className="review-list">
                {product.reviews.map((r) => (
                  <article className="review-item" key={r.id}>
                    <strong>{r.headline}</strong>
                    <p className="tiny">
                      {r.author} | {r.date} | Rating: {r.rating}/5
                    </p>
                    <p>{r.comment}</p>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
        <ProductDetailActions product={product} />
      </div>

      <section className="section-spacing">
        <CollapsibleSection title="Description">
          <p>{product.longDescription}</p>
        </CollapsibleSection>
        <CollapsibleSection title="Care Instructions">
          <p>
            {product.careInstructions ??
              "Care instructions will be provided soon."}
          </p>
        </CollapsibleSection>
        <CollapsibleSection title="Shipping & Returns">
          <p>
            {product.shippingInfo ??
              "Standard shipping within Pakistan. Returns accepted within 15 days."}
          </p>
        </CollapsibleSection>
      </section>

      <section className="section-spacing">
        <SectionHeading title="Related Products" />
        <ProductGrid products={relatedProducts} />
      </section>
    </>
  );
}
