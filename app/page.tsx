import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { ProductGrid } from "@/components/catalog/product-grid";
import { HomeHeroCarousel } from "@/components/home/home-hero-carousel";
import { SectionHeading } from "@/components/ui/section-heading";
import { FEATURED_CATEGORY_SUMMARY, getBestSellers, getNewArrivals } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Home",
  description:
    "Equinemates storefront for pet, horse, and rider products with wholesale-ready workflows.",
};

const valueProps = [
  {
    title: "Free Delivery Available",
    text: "Nationwide shipping support across Pakistan for qualifying orders.",
  },
  {
    title: "Top Product Access",
    text: "Stable, rider, and pet best sellers from one unified catalog.",
  },
  {
    title: "Wholesale Assistance",
    text: "Business quote workflows for clubs, stables, and distributors.",
  },
];

export default function Home() {
  const bestSellers = getBestSellers(4);
  const newArrivals = getNewArrivals(4);

  return (
    <>
      <section className="home-hero reveal">
        <div className="hero-media">
          <HomeHeroCarousel />
        </div>
        <div className="hero-copy">
          <p className="hero-kicker">Built for performance</p>
          <h1>Premium equestrian, rider, and pet essentials.</h1>
          <p>
            Discover category-focused collections with responsive ordering, account
            tools, and wholesale-ready operations.
          </p>
          <div className="hero-actions">
            <Link className="btn-primary" href="/products">
              Shop Collection
            </Link>
            <Link className="btn-secondary" href="/wholesale">
              Wholesale Quote
            </Link>
          </div>
        </div>
      </section>

      <section className="usp-strip section-spacing">
        {valueProps.map((item) => (
          <article key={item.title}>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </article>
        ))}
      </section>

      <section className="category-ribbon section-spacing">
        {FEATURED_CATEGORY_SUMMARY.map((category) => (
          <Link href={category.href} key={category.id}>
            {category.name}
          </Link>
        ))}
      </section>

      <section className="split-promos section-spacing">
        <article className="promo-card">
          <Image
            alt="Horse collection"
            height={700}
            src="/banners/promo-yard.svg"
            width={1200}
          />
          <div>
            <p className="section-eyebrow">Horse Products</p>
            <h3>Stable season essentials</h3>
            <Link className="text-link" href="/products?category=Horse%20Products">
              Shop Horse Range
            </Link>
          </div>
        </article>
        <article className="promo-card">
          <Image
            alt="Rider collection"
            height={700}
            src="/banners/promo-rider.svg"
            width={1200}
          />
          <div>
            <p className="section-eyebrow">Rider Products</p>
            <h3>This season&apos;s rider favourites</h3>
            <Link className="text-link" href="/products?category=Rider%20Products">
              Shop Rider Range
            </Link>
          </div>
        </article>
      </section>

      <section className="section-spacing">
        <SectionHeading
          eyebrow="Best Sellers"
          ctaHref="/products"
          ctaLabel="View all"
          description="Our most purchased lines across stables, riders, and households."
          title="Explore the collection"
        />
        <ProductGrid products={bestSellers} />
      </section>

      <section className="home-highlight section-spacing">
        <SectionHeading
          eyebrow="New Arrivals"
          ctaHref="/search?tag=new"
          ctaLabel="Discover new"
          description="Fresh inventory added for weekly demand and upcoming events."
          title="Latest additions"
        />
        <ProductGrid products={newArrivals} />
      </section>
    </>
  );
}
