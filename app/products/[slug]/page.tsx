import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { ProductDetailActions } from "@/components/catalog/product-detail-actions";
import { ProductGrid } from "@/components/catalog/product-grid";
import { SectionHeading } from "@/components/ui/section-heading";
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
      <SectionHeading
        eyebrow={product.category}
        title={product.name}
        description={product.longDescription}
      />

      <div className="grid-two">
        <section className="panel">
          <h3>Product Gallery</h3>
          <Image
            alt={product.name}
            className="product-image"
            height={420}
            src={product.images[0]}
            style={{ height: "340px", borderRadius: "12px" }}
            width={640}
          />
          <div className="grid-two section-spacing">
            {product.images.slice(1).map((image) => (
              <Image
                alt={`${product.name} gallery`}
                className="product-image"
                height={420}
                key={image}
                src={image}
                style={{ borderRadius: "10px", height: "150px" }}
                width={640}
              />
            ))}
          </div>
        </section>
        <ProductDetailActions product={product} />
      </div>

      <section className="section-spacing panel">
        <h3>Customer Reviews</h3>
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
      </section>

      <section className="section-spacing">
        <SectionHeading title="Related Products" />
        <ProductGrid products={relatedProducts} />
      </section>
    </>
  );
}
