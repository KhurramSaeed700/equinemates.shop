import { NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/server/admin-auth";
import { getR2Config, getR2ConfigurationStatus } from "@/lib/server/r2-config";
import { uploadImageToR2 } from "@/lib/server/r2";

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
      message: "Image uploaded to Cloudflare R2.",
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
      message.includes("Unsupported image type") ||
      message.includes("upload limit") ||
      message.includes("selected file is empty")
        ? 400
        : 500;

    return NextResponse.json({ message }, { status });
  }
}
