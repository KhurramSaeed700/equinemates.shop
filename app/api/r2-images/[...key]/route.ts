import { NextResponse } from "next/server";

import { getImageFromR2 } from "@/lib/server/r2";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    key?: string[];
  }>;
};

function isSafeObjectKey(key: string): boolean {
  return Boolean(key) && !key.split("/").some((segment) => segment === "..");
}

export async function GET(_request: Request, context: RouteContext) {
  const { key: keySegments = [] } = await context.params;
  const key = keySegments.join("/");

  if (!isSafeObjectKey(key)) {
    return NextResponse.json({ message: "Image key is invalid." }, { status: 400 });
  }

  try {
    const image = await getImageFromR2(key);
    const headers = new Headers({
      "cache-control": image.cacheControl,
      "content-type": image.contentType,
    });

    if (typeof image.contentLength === "number") {
      headers.set("content-length", String(image.contentLength));
    }

    return new Response(image.body, { headers });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load image from R2.";
    const status =
      error instanceof Error &&
      (error.name === "NoSuchKey" || /not found|no such key/i.test(message))
        ? 404
        : 500;

    console.error("[api/r2-images] R2 image proxy failed.", {
      key,
      message,
      error,
    });

    return NextResponse.json({ message }, { status });
  }
}
