import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { getProfileById } from "@/lib/server/profile-service";

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

  return NextResponse.json({ orders: profile.orders });
}
