import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductDetailActions } from "@/components/catalog/product-detail-actions";
import { ProductGallery } from "@/components/catalog/product-gallery";
import { ProductGrid } from "@/components/catalog/product-grid";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { SectionHeading } from "@/components/ui/section-heading";
import { buildCategoryPathHref } from "@/lib/catalog";
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
    description: product.longDescription,
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

  const relatedProducts = await getRelatedProducts(product.slug);
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
    <>
      <Breadcrumb
        items={[
          { href: "/products", label: "Products" },
          ...categoryBreadcrumbs,
        ]}
      />

      <SectionHeading
        eyebrow={product.category}
        title={product.name}
      />

      <div className="grid-two product-detail-grid">
        <div className="left-column">
          <section className="panel product-gallery">
            <h3 className="visually-hidden">Product images</h3>
            <ProductGallery images={product.images} name={product.name} />
          </section>
          <section id="reviews" className="panel reviews-panel left-reviews">
            <h4>Customer Reviews</h4>
            {product.reviews.length > 0 ? (
              <>
                <div className="review-highlight">
                  <strong>Most helpful review</strong>
                  <div>
                    <p className="tiny">
                      {product.reviews[0].author} - Rating: {product.reviews[0].rating}/5
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
              </>
            ) : (
              <p className="tiny">
                No customer reviews yet. Reviews will appear here once customers
                submit them and they are approved for publishing.
              </p>
            )}
          </section>
        </div>
        <ProductDetailActions product={product} />
      </div>

      <section className="section-spacing">
        <CollapsibleSection title="Description">
          <p>{product.longDescription}</p>
        </CollapsibleSection>
        <CollapsibleSection title="Care Instructions">
          <p>{product.careInstructions ?? "Care instructions will be provided soon."}</p>
        </CollapsibleSection>
      </section>

      <section className="section-spacing related-products-mobile-scroll">
        <SectionHeading title="Related Products" />
        <ProductGrid products={relatedProducts} />
      </section>
    </>
  );
}
