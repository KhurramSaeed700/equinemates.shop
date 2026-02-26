export const SUPPORTED_CURRENCIES = ["PKR", "USD", "EUR"] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export type ProductCategory =
  | "Pet Products"
  | "Horse Products"
  | "Rider Products";

export interface ProductVariant {
  id: string;
  label: string;
  options: string[];
}

export interface ProductReview {
  id: string;
  author: string;
  rating: number;
  headline: string;
  comment: string;
  date: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  sku: string;
  category: ProductCategory;
  shortDescription: string;
  longDescription: string;
  basePricePkr: number;
  compareAtPricePkr?: number;
  images: string[];
  variants: ProductVariant[];
  rating: number;
  reviewCount: number;
  reviews: ProductReview[];
  tags: string[];
  isBestSeller: boolean;
  isNewArrival: boolean;
  relatedSlugs: string[];
  stock: number;
  careInstructions?: string;
  shippingInfo?: string;
}

export interface Promotion {
  id: string;
  title: string;
  copy: string;
  ctaLabel: string;
  ctaHref: string;
}

export interface Address {
  id: string;
  label: string;
  recipient: string;
  line1: string;
  line2?: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
}

export interface OrderSummary {
  id: string;
  date: string;
  status: "pending" | "processing" | "shipped" | "delivered";
  totalPkr: number;
  itemCount: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: "customer" | "wholesale" | "admin";
  wishlist: string[];
  addresses: Address[];
  orders: OrderSummary[];
}

export interface CatalogRequest {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  wantsPrintedCatalog: boolean;
  wholesale: boolean;
  notes?: string;
}

export interface WholesaleRequest {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  taxId?: string;
  expectedMonthlyVolume?: string;
  notes?: string;
  attachments?: string[];
}

export interface QuoteSummary {
  id: string;
  companyName: string;
  requestedAt: string;
  status: "submitted" | "reviewing" | "quoted" | "approved" | "rejected";
  estimatedTotalPkr: number;
}

export interface SearchFilters {
  query?: string;
  category?: ProductCategory;
  minPricePkr?: number;
  maxPricePkr?: number;
  tag?: string;
}

export interface CartItem {
  sku: string;
  productSlug: string;
  name: string;
  unitPricePkr: number;
  quantity: number;
}
