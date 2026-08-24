import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import {
  checkProductSkuAvailability,
  combineAdminProductListings,
  deleteAdminProduct,
  getAdminProductSummaries,
  getProductBySlug,
  getReferencedProductImageSources,
  moveAdminProductsToCategory,
  saveAdminProduct,
  uncombineAdminProductListings,
} from "@/lib/server/catalog-products";
import { getAdminCategoryTree } from "@/lib/server/catalog-categories";
import { getAdminAccess } from "@/lib/server/admin-auth";
import { deleteImagesFromR2 } from "@/lib/server/r2";
import { ProductCategory, ProductVariant } from "@/lib/types";

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

function normalizeVariantOptionList(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return Array.from(
    new Set(
      values
        .flatMap((value) => String(value ?? "").split(/[,\n]/))
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}

function normalizeProductVariants(values: unknown): ProductVariant[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((value, index) => {
      if (!value || typeof value !== "object") {
        return null;
      }

      const variant = value as {
        id?: unknown;
        label?: unknown;
        options?: unknown;
      };
      const label = String(variant.label ?? "").trim();
      const options = normalizeVariantOptionList(variant.options);

      if (!label || !options.length) {
        return null;
      }

      return {
        id: String(variant.id ?? `variant-${index}`).trim() || `variant-${index}`,
        label,
        options,
      };
    })
    .filter((variant): variant is ProductVariant => Boolean(variant));
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
      bannerImages?: unknown;
      variants?: unknown;
      tags?: unknown;
      stock?: number;
      amazonSellerSku?: string;
      amazonAsin?: string;
      amazonStoreUrl?: string;
      amazonFulfillableQuantity?: number;
      amazonInventoryUpdatedAt?: string;
      amazonMcfEnabled?: boolean;
      isBestSeller?: boolean;
      isNewArrival?: boolean;
      careInstructions?: string;
      shippingInfo?: string;
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
      bannerImages: normalizeStringList(body.bannerImages),
      variants: normalizeProductVariants(body.variants),
      tags: normalizeStringList(body.tags),
      stock: Number(body.stock),
      amazonSellerSku: body.amazonSellerSku,
      amazonAsin: body.amazonAsin,
      amazonStoreUrl: body.amazonStoreUrl,
      amazonFulfillableQuantity: Number(body.amazonFulfillableQuantity ?? 0),
      amazonInventoryUpdatedAt: body.amazonInventoryUpdatedAt,
      amazonMcfEnabled: Boolean(body.amazonMcfEnabled),
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

export async function PATCH(request: Request) {
  const adminAccess = await getAdminAccess();

  if (!adminAccess.isAuthorized) {
    return getUnauthorizedResponse(
      adminAccess.reason,
      adminAccess.isAuthenticated,
    );
  }

  try {
    const body = (await request.json()) as {
      action?: string;
      categoryId?: string;
      productIds?: unknown;
      parentProductId?: string;
      childProductIds?: unknown;
    };

    if (body.action === "combine-listings") {
      const result = await combineAdminProductListings({
        parentProductId: String(body.parentProductId ?? ""),
        childProductIds: normalizeStringList(body.childProductIds),
      });

      revalidatePath("/admin");
      revalidatePath("/products");

      return NextResponse.json({
        message: `${result.combinedCount} listing${result.combinedCount === 1 ? "" : "s"} combined under ${result.parentName}.`,
        products: await getAdminProductSummaries(),
      });
    }

    if (body.action === "uncombine-listings") {
      const separatedCount = await uncombineAdminProductListings({
        parentProductId: String(body.parentProductId ?? ""),
        childProductIds: normalizeStringList(body.childProductIds),
      });

      revalidatePath("/admin");
      revalidatePath("/products");

      return NextResponse.json({
        message: `${separatedCount} listing${separatedCount === 1 ? "" : "s"} separated from the parent.`,
        products: await getAdminProductSummaries(),
      });
    }

    if (body.action !== "bulk-category-move") {
      return NextResponse.json(
        { message: "Unsupported product action." },
        { status: 400 },
      );
    }

    const productIds = normalizeStringList(body.productIds);
    const result = await moveAdminProductsToCategory({
      categoryId: String(body.categoryId ?? ""),
      productIds,
    });

    revalidatePath("/admin");
    revalidatePath("/admin/categories");
    revalidatePath("/products");

    return NextResponse.json({
      categories: await getAdminCategoryTree(),
      message: `${result.movedCount} product${result.movedCount === 1 ? "" : "s"} moved to ${result.categoryPath.join(" > ")}.`,
      products: await getAdminProductSummaries(),
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Could not update products." },
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
