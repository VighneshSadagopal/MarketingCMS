/** Shared server caches and how long (seconds) each may be kept before it's fetched again anyway. */
export const SHARED_CACHE = {
  team: 600,
  campaigns: 600,
  "comment-counts": 120,
} as const;

export type SharedTag = keyof typeof SHARED_CACHE;

export const SHARED_TAGS = Object.keys(SHARED_CACHE) as SharedTag[];
