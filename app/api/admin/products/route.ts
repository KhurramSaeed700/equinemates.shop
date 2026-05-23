import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import {
  checkProductSkuAvailability,
  deleteAdminProduct,
  getAdminProductSummaries,
  getProductBySlug,
  getReferencedProductImageSources,
  saveAdminProduct,
} from "@/lib/server/catalog-products";
import { getAdminAccess } from "@/lib/server/admin-auth";
import { deleteImagesFromR2 } from "@/lib/server/r2";
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

    const { imageSources, ...result } = await deleteAdminProduct(slug);
    let r2DeletedCount = 0;
    let r2FailedCount = 0;
    let r2SkippedSharedCount = 0;

    if (imageSources.length) {
      try {
        const referencedImageSources = await getReferencedProductImageSources();
        const r2Cleanup = await deleteImagesFromR2(imageSources, {
          protectedSources: referencedImageSources,
        });
        r2DeletedCount = r2Cleanup.deletedKeys.length;
        r2FailedCount = r2Cleanup.failed.length;
        r2SkippedSharedCount = r2Cleanup.skippedSharedKeys.length;

        if (r2Cleanup.failed.length) {
          console.error("[api/admin/products] R2 image cleanup had failures.", {
            slug,
            failed: r2Cleanup.failed,
          });
        }
      } catch (error) {
        r2FailedCount = imageSources.length;
        console.error("[api/admin/products] R2 image cleanup failed.", {
          slug,
          error,
        });
      }
    }

    const message = result.deleted
      ? `${result.name} was removed.`
      : `${result.name} was removed from the storefront.`;
    const r2CleanupMessage =
      r2DeletedCount > 0
        ? ` Removed ${r2DeletedCount} image${r2DeletedCount === 1 ? "" : "s"} from R2.`
        : "";
    const r2FailureMessage =
      r2FailedCount > 0
        ? ` ${r2FailedCount} R2 image${r2FailedCount === 1 ? "" : "s"} could not be deleted.`
        : "";
    const r2SharedMessage =
      r2SkippedSharedCount > 0
        ? ` Kept ${r2SkippedSharedCount} shared R2 image${r2SkippedSharedCount === 1 ? "" : "s"}.`
        : "";

    revalidatePath("/admin");
    revalidatePath("/products");
    revalidatePath(`/products/${slug}`);

    return NextResponse.json({
      message: `${message}${r2CleanupMessage}${r2FailureMessage}${r2SharedMessage}`,
      ...result,
      r2Cleanup: {
        deletedCount: r2DeletedCount,
        failedCount: r2FailedCount,
        skippedSharedCount: r2SkippedSharedCount,
      },
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
