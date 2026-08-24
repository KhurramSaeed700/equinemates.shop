import { useCallback, useMemo, useSyncExternalStore } from "react";

const STORAGE_KEY = "eqm_recently_viewed";
const STORAGE_CHANGE_EVENT = "eqm_recently_viewed_change";
const MAX_ITEMS = 10;

function parseStoredSlugs(stored: string | null) {
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored) as unknown;
    return Array.isArray(parsed)
      ? parsed
          .map((item) => String(item).trim())
          .filter(Boolean)
          .slice(0, MAX_ITEMS)
      : [];
  } catch {
    return [];
  }
}

function readStoredSlugs() {
  if (typeof window === "undefined") return [];
  return parseStoredSlugs(window.localStorage.getItem(STORAGE_KEY));
}

function getStoredSnapshot() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

function getServerSnapshot() {
  return null;
}

function notifyRecentlyViewedChange() {
  window.dispatchEvent(new Event(STORAGE_CHANGE_EVENT));
}

function subscribeToRecentlyViewed(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      onStoreChange();
    }
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(STORAGE_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(STORAGE_CHANGE_EVENT, onStoreChange);
  };
}

export function useRecentlyViewed() {
  const storedSnapshot = useSyncExternalStore(
    subscribeToRecentlyViewed,
    getStoredSnapshot,
    getServerSnapshot,
  );
  const slugs = useMemo(() => parseStoredSlugs(storedSnapshot), [storedSnapshot]);

  const add = useCallback((slug: string) => {
    const prev = readStoredSlugs();
    const next = [slug, ...prev.filter((s) => s !== slug)].slice(0, MAX_ITEMS);

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      notifyRecentlyViewedChange();
    } catch {}
  }, []);

  const clear = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      notifyRecentlyViewedChange();
    } catch {}
  }, []);

  return { slugs, add, clear };
}
