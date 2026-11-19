/** UTM tagging for links in post copy. Only DrupalAsia links are tagged; other sites are left alone. */

export const UTM_MEDIUM = "social";
const UTM_HOSTS = ["drupalasia.org"]; // and their subdomains

// http(s) links and bare www. links. Trailing punctuation stays outside the link.
const URL_RE = /((?:https?:\/\/|www\.)[^\s<>"]+)/gi;
const TRAILING = /[.,!?;:'")\]}>]+$/;

export type UtmParams = { source: string; medium?: string; campaign?: string | null };

function isOwnHost(host: string) {
  const h = host.toLowerCase();
  return UTM_HOSTS.some((d) => h === d || h.endsWith(`.${d}`));
}

/** Adds (or updates) utm_source, utm_medium and, when given, utm_campaign on every DrupalAsia link. */
export function tagLinks(text: string, p: UtmParams): { text: string; changed: number } {
  let changed = 0;
  const out = text.replace(URL_RE, (match) => {
    const trail = match.match(TRAILING)?.[0] ?? "";
    const raw = trail ? match.slice(0, -trail.length) : match;
    const hadScheme = /^https?:\/\//i.test(raw);
    let url: URL;
    try {
      url = new URL(hadScheme ? raw : `https://${raw}`);
    } catch {
      return match;
    }
    if (!isOwnHost(url.hostname)) return match;
    url.searchParams.set("utm_source", p.source);
    url.searchParams.set("utm_medium", p.medium ?? UTM_MEDIUM);
    if (p.campaign) url.searchParams.set("utm_campaign", p.campaign);
    let next = url.toString();
    if (!hadScheme) next = next.replace(/^https:\/\//, "");
    if (next !== raw) changed++;
    return next + trail;
  });
  return { text: out, changed };
}

/** Turns a campaign name into a UTM-safe value: lowercase letters, numbers and underscores. */
export function utmSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 100);
}

/** utm_campaign values already used in some text, most used first. */
export function utmCampaignsIn(texts: (string | null | undefined)[]) {
  const counts = new Map<string, number>();
  for (const t of texts) {
    for (const m of (t ?? "").matchAll(/utm_campaign=([A-Za-z0-9_-]+)/g)) {
      counts.set(m[1], (counts.get(m[1]) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([value, count]) => ({ value, count }));
}
