import type { MetadataRoute } from "next";

import { PRODUCTS } from "@/lib/catalog";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://equinemates.example";
  const staticRoutes = [
    "",
    "/about",
    "/contact",
    "/catalog-request",
    "/wholesale",
    "/wholesale/dashboard",
    "/products",
    "/search",
    "/wishlist",
    "/cart",
    "/account",
    "/account/orders",
    "/account/addresses",
    "/admin",
  ];

  return [
    ...staticRoutes.map((path) => ({
      url: `${baseUrl}${path}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.7,
    })),
    ...PRODUCTS.map((product) => ({
      url: `${baseUrl}/products/${product.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
