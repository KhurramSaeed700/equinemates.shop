import { ProductCard } from "@/components/catalog/product-card";
import { Product } from "@/lib/types";

export function ProductGrid({
  products,
  emptyLabel = "No products found for this filter.",
}: {
  products: Product[];
  emptyLabel?: string;
}) {
  if (!products.length) {
    return <p className="empty-state">{emptyLabel}</p>;
  }

  return (
    <div className="product-grid">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
