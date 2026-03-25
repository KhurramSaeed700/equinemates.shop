import { NextResponse } from "next/server";

import {
  getAdminProductSummaries,
  getProductBySlug,
  saveAdminProduct,
} from "@/lib/catalog";
import { getAdminAccess } from "@/lib/server/admin-auth";
import { ProductCategory } from "@/lib/types";

export const runtime = "nodejs";

function getUnauthorizedResponse(reason: string, isAuthenticated: boolean) {
  return NextResponse.json(
    { message: reason },
    { status: isAuthenticated ? 403 : 401 },
  );
}

function normalizeStringList(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
}

export async function GET(request: Request) {
  const adminAccess = await getAdminAccess();

  if (!adminAccess.isAuthorized) {
    return getUnauthorizedResponse(
      adminAccess.reason,
      adminAccess.isAuthenticated,
    );
  }

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (!slug) {
    return NextResponse.json({
      products: getAdminProductSummaries(),
    });
  }

  const product = getProductBySlug(slug);

  if (!product) {
    return NextResponse.json(
      { message: "Product not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({ product });
}

export async function POST(request: Request) {
  const adminAccess = await getAdminAccess();

  if (!adminAccess.isAuthorized) {
    return getUnauthorizedResponse(
      adminAccess.reason,
      adminAccess.isAuthenticated,
    );
  }

  try {
    const body = (await request.json()) as {
      originalSlug?: string;
      slug?: string;
      name?: string;
      sku?: string;
      category?: string;
      categoryPath?: unknown;
      shortDescription?: string;
      longDescription?: string;
      basePriceUsd?: number;
      basePricePkr?: number;
      compareAtPricePkr?: number | string | null;
      images?: unknown;
      tags?: unknown;
      stock?: number;
      isBestSeller?: boolean;
      isNewArrival?: boolean;
      careInstructions?: string;
      shippingInfo?: string;
    };

    const categoryPath = normalizeStringList(body.categoryPath);
    const category =
      String(body.category ?? categoryPath[0] ?? "").trim() as ProductCategory;
    const { product, created } = saveAdminProduct({
      originalSlug: body.originalSlug,
      slug: String(body.slug ?? ""),
      name: String(body.name ?? ""),
      sku: String(body.sku ?? ""),
      category,
      categoryPath: categoryPath.length ? categoryPath : [category],
      shortDescription: String(body.shortDescription ?? ""),
      longDescription: String(body.longDescription ?? ""),
      basePriceUsd: Number(body.basePriceUsd),
      basePricePkr: Number(body.basePricePkr),
      compareAtPricePkr:
        body.compareAtPricePkr === null ||
        body.compareAtPricePkr === undefined ||
        body.compareAtPricePkr === ""
          ? undefined
          : Number(body.compareAtPricePkr),
      images: normalizeStringList(body.images),
      tags: normalizeStringList(body.tags),
      stock: Number(body.stock),
      isBestSeller: Boolean(body.isBestSeller),
      isNewArrival: Boolean(body.isNewArrival),
      careInstructions: body.careInstructions,
      shippingInfo: body.shippingInfo,
    });

    return NextResponse.json({
      message: created ? "Product created." : "Product updated.",
      product,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Could not save product.",
      },
      { status: 400 },
    );
  }
}
