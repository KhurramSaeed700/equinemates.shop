import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import {
  getProfileById,
  toggleWishlistItem,
} from "@/lib/server/profile-service";

export function GET(request: Request) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json(
      { message: "Not authenticated." },
      { status: 401 },
    );
  }

  const profile = getProfileById(userId);
  if (!profile) {
    return NextResponse.json(
      { message: "Profile not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({ wishlist: profile.wishlist });
}

export async function POST(request: Request) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json(
      { message: "Not authenticated." },
      { status: 401 },
    );
  }

  const payload = (await request.json()) as { productSlug?: string };
  if (!payload.productSlug) {
    return NextResponse.json(
      { message: "productSlug is required." },
      { status: 400 },
    );
  }

  const profile = toggleWishlistItem(userId, payload.productSlug);
  if (!profile) {
    return NextResponse.json(
      { message: "Profile not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({ wishlist: profile.wishlist });
}
