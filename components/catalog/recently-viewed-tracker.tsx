"use client";

import { useEffect } from "react";

import { useRecentlyViewed } from "@/components/hooks/useRecentlyViewed";

export function RecentlyViewedTracker({ slug }: { slug: string }) {
  const { add } = useRecentlyViewed();

  useEffect(() => {
    add(slug);
  }, [add, slug]);

  return null;
}
