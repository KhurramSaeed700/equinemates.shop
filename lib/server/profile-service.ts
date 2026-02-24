import { db } from "@/lib/server/db";
import { UserProfile } from "@/lib/types";

// helper to return a profile by a Clerk user ID.  the session-token
// concept is removed since Clerk handles authentication.  we just
// look up the in‑memory profile store using the userId.
export function getProfileById(userId: string): UserProfile | null {
  return db.profiles[userId] ?? null;
}

export function upsertProfileAddress(
  userId: string,
  payload: UserProfile["addresses"][number],
): UserProfile | null {
  const profile = getProfileById(userId);
  if (!profile) {
    return null;
  }

  const foundIndex = profile.addresses.findIndex((address) => address.id === payload.id);
  if (foundIndex >= 0) {
    profile.addresses[foundIndex] = payload;
  } else {
    profile.addresses.push(payload);
  }

  return profile;
}

export function toggleWishlistItem(userId: string, productSlug: string): UserProfile | null {
  const profile = getProfileById(userId);
  if (!profile) {
    return null;
  }

  if (profile.wishlist.includes(productSlug)) {
    profile.wishlist = profile.wishlist.filter((item) => item !== productSlug);
  } else {
    profile.wishlist.push(productSlug);
  }

  return profile;
}

