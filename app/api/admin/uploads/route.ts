import { NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/server/admin-auth";
import { getReferencedProductImageSources } from "@/lib/server/catalog-products";
import { getR2Config, getR2ConfigurationStatus } from "@/lib/server/r2-config";
import { deleteImagesFromR2, uploadImageToR2 } from "@/lib/server/r2";

export const runtime = "nodejs";

function getErrorStatus(message: string, isAuthenticated: boolean): number {
  if (message.includes("Unsupported image type") || message.includes("upload limit")) {
    return 400;
  }

  return isAuthenticated ? 403 : 401;
}

export async function POST(request: Request) {
  const adminAccess = await getAdminAccess();

  if (!adminAccess.isAuthorized) {
    return NextResponse.json(
      { message: adminAccess.reason },
      { status: getErrorStatus(adminAccess.reason, adminAccess.isAuthenticated) },
    );
  }

  const r2Configuration = getR2ConfigurationStatus();

  if (!r2Configuration.isConfigured) {
    return NextResponse.json(
      {
        message: `R2 is not configured. Missing: ${r2Configuration.missing.join(", ")}`,
      },
      { status: 500 },
    );
  }

  const formData = await request.formData();
  const image = formData.get("image");
  const folder = String(formData.get("folder") ?? "");

  if (!(image instanceof File) || image.size === 0) {
    return NextResponse.json(
      { message: "Select an image file before uploading." },
      { status: 400 },
    );
  }

  try {
    const result = await uploadImageToR2({ file: image, folder });

    return NextResponse.json({
      message: result.reused
        ? "Image already exists in Cloudflare R2. Reusing existing image."
        : "Image uploaded to Cloudflare R2.",
      ...result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Cloudflare R2 upload failed.";
    const config = r2Configuration.isConfigured ? getR2Config() : null;

    console.error("[api/admin/uploads] R2 upload failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      message,
      bucketName: config?.bucketName ?? null,
      publicBaseUrl: config?.publicBaseUrl ?? null,
      uploadPrefix: config?.uploadPrefix ?? null,
      folder,
    });

    const status =
      message.includes("denied the upload") || message.includes("write access")
        ? 403
        : message.includes("could not find the configured bucket")
          ? 404
          : message.includes("Unsupported image type") ||
              message.includes("upload limit") ||
              message.includes("selected file is empty")
            ? 400
            : 500;

    return NextResponse.json({ message }, { status });
  }
}

export async function DELETE(request: Request) {
  const adminAccess = await getAdminAccess();

  if (!adminAccess.isAuthorized) {
    return NextResponse.json(
      { message: adminAccess.reason },
      { status: getErrorStatus(adminAccess.reason, adminAccess.isAuthenticated) },
    );
  }

  const r2Configuration = getR2ConfigurationStatus();

  if (!r2Configuration.isConfigured) {
    return NextResponse.json(
      {
        message: `R2 is not configured. Missing: ${r2Configuration.missing.join(", ")}`,
      },
      { status: 500 },
    );
  }

  try {
    const body = (await request.json()) as {
      imageUrl?: string;
      originalSlug?: string;
    };
    const imageUrl = String(body.imageUrl ?? "").trim();
    const originalSlug = String(body.originalSlug ?? "").trim();

    if (!imageUrl) {
      return NextResponse.json(
        { message: "Image URL is required." },
        { status: 400 },
      );
    }

    const protectedSources = await getReferencedProductImageSources({
      excludeProductSlug: originalSlug || undefined,
    });
    const cleanup = await deleteImagesFromR2([imageUrl], {
      protectedSources,
    });

    if (cleanup.failed.length) {
      console.error("[api/admin/uploads] R2 image deletion failed.", {
        imageUrl,
        failed: cleanup.failed,
      });

      return NextResponse.json(
        {
          message: "Image was removed from the draft, but R2 deletion failed.",
          ...cleanup,
        },
        { status: 500 },
      );
    }

    if (cleanup.deletedKeys.length) {
      return NextResponse.json({
        message: "Image removed from the draft and deleted from R2.",
        ...cleanup,
      });
    }

    if (cleanup.skippedSharedKeys.length) {
      return NextResponse.json({
        message: "Image removed from the draft. Kept in R2 because another product uses it.",
        ...cleanup,
      });
    }

    return NextResponse.json({
      message: "Image removed from the draft.",
      ...cleanup,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not delete image from R2.";

    console.error("[api/admin/uploads] R2 image deletion failed.", {
      message,
      error,
    });

    return NextResponse.json({ message }, { status: 500 });
  }
}
