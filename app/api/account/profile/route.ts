import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import {
  getProfileById,
  upsertProfileAddress,
} from "@/lib/server/profile-service";
import { Address } from "@/lib/types";

export async function GET(request: Request) {
  const { userId } = await auth();
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

  return NextResponse.json({ profile });
}

export async function PUT(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { message: "Not authenticated." },
      { status: 401 },
    );
  }

  const payload = (await request.json()) as Address;
  if (!payload.id || !payload.label || !payload.line1 || !payload.city) {
    return NextResponse.json(
      { message: "Incomplete address payload." },
      { status: 400 },
    );
  }

  const profile = upsertProfileAddress(userId, payload);
  if (!profile) {
    return NextResponse.json(
      { message: "Profile not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({ message: "Address saved.", profile });
}
