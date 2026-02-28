export const ITEMS_PER_PAGE = 12;
export const PER_PAGE_OPTIONS = [12, 24, 32] as const;

export function parsePageParam(value?: string): number {
  if (!value) {
    return 1;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

export function clampPage(page: number, totalPages: number): number {
  if (totalPages < 1) {
    return 1;
  }
  return Math.min(Math.max(page, 1), totalPages);
}

export function parsePerPageParam(value?: string): number {
  if (!value) {
    return ITEMS_PER_PAGE;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return ITEMS_PER_PAGE;
  }

  return PER_PAGE_OPTIONS.includes(parsed as (typeof PER_PAGE_OPTIONS)[number])
    ? parsed
    : ITEMS_PER_PAGE;
}
