import { Product, ProductCategory, Promotion, SearchFilters } from "@/lib/types";

export const CATEGORY_OPTIONS: ProductCategory[] = [
  "Pet Products",
  "Horse Products",
  "Rider Products",
];

export const PROMOTIONS: Promotion[] = [
  {
    id: "promo-1",
    title: "Stable Comfort Event",
    copy: "Save up to 20% on premium horse bedding, stable care kits, and grooming essentials.",
    ctaLabel: "Shop Horse Care",
    ctaHref: "/products?category=Horse%20Products",
  },
  {
    id: "promo-2",
    title: "Rider Safety Week",
    copy: "Bundle helmets, gloves, and protective wear with same-day dispatch in major Pakistan cities.",
    ctaLabel: "Explore Rider Gear",
    ctaHref: "/products?category=Rider%20Products",
  },
];

export const PRODUCTS: Product[] = [
  {
    id: "eqm-001",
    slug: "stablecore-groom-kit",
    name: "StableCore Groom Kit",
    sku: "EQM-HR-001",
    category: "Horse Products",
    shortDescription: "Complete grooming kit for daily stable routines.",
    longDescription:
      "A 7-piece grooming set with ergonomic grips, built for quick cleaning before rides or shows.",
    basePricePkr: 14500,
    compareAtPricePkr: 16900,
    images: ["/products/groom-kit.svg", "/products/stable-clean.svg"],
    variants: [
      { id: "v1", label: "Color", options: ["Walnut", "Forest", "Sand"] },
      { id: "v2", label: "Bundle", options: ["Standard", "With Tote"] },
    ],
    rating: 4.8,
    reviewCount: 86,
    reviews: [
      {
        id: "r1",
        author: "A. Khan",
        rating: 5,
        headline: "Durable build",
        comment: "Brushes and combs hold up well in daily use.",
        date: "2026-01-18",
      },
      {
        id: "r2",
        author: "S. Ahmad",
        rating: 4,
        headline: "Great value",
        comment: "Useful set, especially for new stables.",
        date: "2026-01-03",
      },
    ],
    tags: ["grooming", "stable", "best-seller"],
    isBestSeller: true,
    isNewArrival: false,
    relatedSlugs: ["smartfeed-pro-dispenser", "allweather-saddle-cover"],
    stock: 120,
  },
  {
    id: "eqm-002",
    slug: "allweather-saddle-cover",
    name: "AllWeather Saddle Cover",
    sku: "EQM-HR-002",
    category: "Horse Products",
    shortDescription: "Water-resistant, travel-friendly saddle protection.",
    longDescription:
      "A breathable saddle cover with reinforced seams and adjustable fit for transport and storage.",
    basePricePkr: 8900,
    images: ["/products/saddle-cover.svg", "/products/arena-pack.svg"],
    variants: [
      { id: "v1", label: "Size", options: ["Pony", "Cob", "Full"] },
      { id: "v2", label: "Color", options: ["Navy", "Charcoal"] },
    ],
    rating: 4.6,
    reviewCount: 42,
    reviews: [
      {
        id: "r1",
        author: "M. Fatima",
        rating: 5,
        headline: "Fits perfectly",
        comment: "Strong fabric and clean stitching.",
        date: "2026-01-09",
      },
    ],
    tags: ["travel", "saddle"],
    isBestSeller: false,
    isNewArrival: true,
    relatedSlugs: ["stablecore-groom-kit"],
    stock: 64,
  },
  {
    id: "eqm-003",
    slug: "smartfeed-pro-dispenser",
    name: "SmartFeed Pro Dispenser",
    sku: "EQM-HR-003",
    category: "Horse Products",
    shortDescription: "Timed feed dispenser with battery backup.",
    longDescription:
      "Automate feeding windows with configurable portions, audit history, and backup mode for stable teams.",
    basePricePkr: 38500,
    images: ["/products/smartfeed.svg", "/products/stable-clean.svg"],
    variants: [
      { id: "v1", label: "Capacity", options: ["8 L", "12 L"] },
      { id: "v2", label: "Mount", options: ["Wall", "Stand"] },
    ],
    rating: 4.7,
    reviewCount: 25,
    reviews: [
      {
        id: "r1",
        author: "R. Ali",
        rating: 5,
        headline: "Reliable scheduling",
        comment: "Helped us standardize feeding on busy days.",
        date: "2026-01-29",
      },
    ],
    tags: ["feeding", "automation", "new"],
    isBestSeller: false,
    isNewArrival: true,
    relatedSlugs: ["stablecore-groom-kit"],
    stock: 28,
  },
  {
    id: "eqm-004",
    slug: "pawshield-care-bundle",
    name: "PawShield Care Bundle",
    sku: "EQM-PT-001",
    category: "Pet Products",
    shortDescription: "Skin and coat wellness set for active pets.",
    longDescription:
      "Daily care bundle with gentle shampoo, coat tonic, and paw balm for household and kennel use.",
    basePricePkr: 6200,
    compareAtPricePkr: 7200,
    images: ["/products/pawshield.svg", "/products/pet-bed.svg"],
    variants: [
      { id: "v1", label: "Pack", options: ["Single", "Family"] },
      { id: "v2", label: "Fragrance", options: ["Unscented", "Herbal"] },
    ],
    rating: 4.5,
    reviewCount: 73,
    reviews: [
      {
        id: "r1",
        author: "N. Iqbal",
        rating: 4,
        headline: "Mild and effective",
        comment: "Good for routine grooming at home.",
        date: "2025-12-30",
      },
    ],
    tags: ["pet-care", "bundle", "best-seller"],
    isBestSeller: true,
    isNewArrival: false,
    relatedSlugs: ["comfortnest-orthopedic-bed"],
    stock: 210,
  },
  {
    id: "eqm-005",
    slug: "comfortnest-orthopedic-bed",
    name: "ComfortNest Orthopedic Bed",
    sku: "EQM-PT-002",
    category: "Pet Products",
    shortDescription: "Supportive memory foam bed with washable cover.",
    longDescription:
      "Orthopedic cushion and anti-slip base for older pets, rescues, and premium boarding facilities.",
    basePricePkr: 12900,
    images: ["/products/pet-bed.svg", "/products/pawshield.svg"],
    variants: [
      { id: "v1", label: "Size", options: ["Small", "Medium", "Large"] },
      { id: "v2", label: "Color", options: ["Olive", "Beige", "Slate"] },
    ],
    rating: 4.9,
    reviewCount: 101,
    reviews: [
      {
        id: "r1",
        author: "H. Zahid",
        rating: 5,
        headline: "Excellent quality",
        comment: "Our clinic uses this in recovery rooms.",
        date: "2026-02-05",
      },
    ],
    tags: ["pet-bed", "premium", "best-seller"],
    isBestSeller: true,
    isNewArrival: false,
    relatedSlugs: ["pawshield-care-bundle"],
    stock: 96,
  },
  {
    id: "eqm-006",
    slug: "trailbuddy-hydration-flask",
    name: "TrailBuddy Hydration Flask",
    sku: "EQM-PT-003",
    category: "Pet Products",
    shortDescription: "Travel bottle and fold-out bowl combo.",
    longDescription:
      "Leak-resistant hydration flask designed for outdoor walks, trekking trips, and event days.",
    basePricePkr: 4300,
    images: ["/products/trailbuddy.svg", "/products/pawshield.svg"],
    variants: [
      { id: "v1", label: "Capacity", options: ["300ml", "500ml"] },
      { id: "v2", label: "Color", options: ["Canyon", "Aqua"] },
    ],
    rating: 4.4,
    reviewCount: 33,
    reviews: [
      {
        id: "r1",
        author: "K. Raza",
        rating: 4,
        headline: "Practical design",
        comment: "Easy to carry and clean.",
        date: "2026-01-12",
      },
    ],
    tags: ["travel", "new"],
    isBestSeller: false,
    isNewArrival: true,
    relatedSlugs: ["comfortnest-orthopedic-bed"],
    stock: 145,
  },
  {
    id: "eqm-007",
    slug: "aerofit-riding-helmet",
    name: "AeroFit Riding Helmet",
    sku: "EQM-RD-001",
    category: "Rider Products",
    shortDescription: "Impact-tested helmet with ventilation channels.",
    longDescription:
      "Competition-ready riding helmet with adjustable harness and sweat-wicking internal lining.",
    basePricePkr: 22400,
    images: ["/products/helmet.svg", "/products/rider-gloves.svg"],
    variants: [
      { id: "v1", label: "Size", options: ["S", "M", "L"] },
      { id: "v2", label: "Finish", options: ["Matte", "Gloss"] },
    ],
    rating: 4.9,
    reviewCount: 57,
    reviews: [
      {
        id: "r1",
        author: "U. Tariq",
        rating: 5,
        headline: "Secure fit",
        comment: "Great ventilation in warm weather.",
        date: "2026-02-01",
      },
    ],
    tags: ["safety", "helmet", "best-seller"],
    isBestSeller: true,
    isNewArrival: false,
    relatedSlugs: ["stridegrip-riding-gloves", "arena-commute-backpack"],
    stock: 70,
  },
  {
    id: "eqm-008",
    slug: "stridegrip-riding-gloves",
    name: "StrideGrip Riding Gloves",
    sku: "EQM-RD-002",
    category: "Rider Products",
    shortDescription: "All-season grip gloves with reinforced palm.",
    longDescription:
      "Flexible riding gloves with breathable mesh and anti-slip zones for endurance and precision control.",
    basePricePkr: 5600,
    images: ["/products/rider-gloves.svg", "/products/helmet.svg"],
    variants: [
      { id: "v1", label: "Size", options: ["XS", "S", "M", "L"] },
      { id: "v2", label: "Color", options: ["Black", "Tan"] },
    ],
    rating: 4.6,
    reviewCount: 44,
    reviews: [
      {
        id: "r1",
        author: "J. Qureshi",
        rating: 5,
        headline: "Excellent grip",
        comment: "Comfortable for long practice sessions.",
        date: "2026-01-25",
      },
    ],
    tags: ["gloves", "rider"],
    isBestSeller: false,
    isNewArrival: true,
    relatedSlugs: ["aerofit-riding-helmet"],
    stock: 162,
  },
  {
    id: "eqm-009",
    slug: "arena-commute-backpack",
    name: "Arena Commute Backpack",
    sku: "EQM-RD-003",
    category: "Rider Products",
    shortDescription: "Multi-pocket rider backpack with boot compartment.",
    longDescription:
      "Weather-ready backpack with dedicated compartments for helmet, gloves, documents, and hydration.",
    basePricePkr: 9800,
    images: ["/products/arena-pack.svg", "/products/helmet.svg"],
    variants: [
      { id: "v1", label: "Color", options: ["Sand", "Olive", "Graphite"] },
    ],
    rating: 4.3,
    reviewCount: 19,
    reviews: [
      {
        id: "r1",
        author: "L. Younis",
        rating: 4,
        headline: "Useful storage",
        comment: "Great layout for daily stable commuting.",
        date: "2026-01-14",
      },
    ],
    tags: ["backpack", "travel"],
    isBestSeller: false,
    isNewArrival: false,
    relatedSlugs: ["aerofit-riding-helmet"],
    stock: 88,
  },
];

export const FEATURED_CATEGORY_SUMMARY = [
  {
    id: "cat-pet",
    name: "Pet Products",
    description: "Wellness and everyday essentials for home and retail shelves.",
    href: "/products?category=Pet%20Products",
  },
  {
    id: "cat-horse",
    name: "Horse Products",
    description: "Stable operations, grooming, and high-durability equine gear.",
    href: "/products?category=Horse%20Products",
  },
  {
    id: "cat-rider",
    name: "Rider Products",
    description: "Performance apparel, safety gear, and rider accessories.",
    href: "/products?category=Rider%20Products",
  },
];

export function getProductBySlug(slug: string): Product | undefined {
  return PRODUCTS.find((product) => product.slug === slug);
}

export function getRelatedProducts(slug: string): Product[] {
  const product = getProductBySlug(slug);
  if (!product) {
    return [];
  }

  return product.relatedSlugs
    .map((relatedSlug) => getProductBySlug(relatedSlug))
    .filter((relatedProduct): relatedProduct is Product => Boolean(relatedProduct));
}

export function getBestSellers(limit = 4): Product[] {
  return PRODUCTS.filter((product) => product.isBestSeller).slice(0, limit);
}

export function getNewArrivals(limit = 4): Product[] {
  return PRODUCTS.filter((product) => product.isNewArrival).slice(0, limit);
}

export function filterProducts(filters: SearchFilters): Product[] {
  return PRODUCTS.filter((product) => {
    if (filters.category && product.category !== filters.category) {
      return false;
    }

    if (filters.minPricePkr && product.basePricePkr < filters.minPricePkr) {
      return false;
    }

    if (filters.maxPricePkr && product.basePricePkr > filters.maxPricePkr) {
      return false;
    }

    if (filters.tag && !product.tags.includes(filters.tag)) {
      return false;
    }

    if (!filters.query) {
      return true;
    }

    const normalizedQuery = filters.query.trim().toLowerCase();
    if (!normalizedQuery) {
      return true;
    }

    return (
      product.name.toLowerCase().includes(normalizedQuery) ||
      product.sku.toLowerCase().includes(normalizedQuery)
    );
  });
}

export function searchSuggestions(query: string): Product[] {
  if (!query.trim()) {
    return [];
  }
  return filterProducts({ query }).slice(0, 6);
}
