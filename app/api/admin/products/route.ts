import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import {
  checkProductSkuAvailability,
  deleteAdminProduct,
  getAdminProductSummaries,
  getProductBySlug,
  saveAdminProduct,
} from "@/lib/server/catalog-products";
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
  const sku = searchParams.get("sku");

  if (sku) {
    const result = await checkProductSkuAvailability({
      sku,
      originalSlug: searchParams.get("originalSlug") ?? undefined,
    });

    return NextResponse.json(result);
  }

  if (!slug) {
    return NextResponse.json({
      products: await getAdminProductSummaries(),
    });
  }

  const product = await getProductBySlug(slug);

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
    };

    const categoryPath = normalizeStringList(body.categoryPath);
    const category =
      String(body.category ?? categoryPath[0] ?? "").trim() as ProductCategory;
    const { product, created } = await saveAdminProduct({
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

export async function DELETE(request: Request) {
  const adminAccess = await getAdminAccess();

  if (!adminAccess.isAuthorized) {
    return getUnauthorizedResponse(
      adminAccess.reason,
      adminAccess.isAuthenticated,
    );
  }

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  try {
    if (!slug) {
      return NextResponse.json(
        { message: "Product slug is required." },
        { status: 400 },
      );
    }

    const result = await deleteAdminProduct(slug);
    const message = result.deleted
      ? `${result.name} was removed.`
      : `${result.name} was removed from the storefront.`;

    revalidatePath("/admin");
    revalidatePath("/products");
    revalidatePath(`/products/${slug}`);

    return NextResponse.json({
      message,
      ...result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not remove product.";
    const status = message === "Product not found." ? 404 : 400;

    console.error("[api/admin/products] Product removal failed.", {
      slug,
      message,
      error,
    });

    return NextResponse.json({ message }, { status });
  }
}
