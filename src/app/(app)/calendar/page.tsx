import { CalendarView } from "@/components/calendar/calendar-view";
import { getCampaigns, getContentBetween, getCurrentProfile, getIdeasBetween } from "@/lib/data";
import { toIsoDate } from "@/lib/utils";

export const metadata = { title: "Calendar · DrupalAsia Marketing CMS" };

function parseMonth(value: string | undefined) {
  const now = new Date();
  const m = value?.match(/^(\d{4})-(\d{2})$/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    if (mo >= 0 && mo <= 11) return { y, m: mo };
  }
  return { y: now.getFullYear(), m: now.getMonth() };
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; date?: string }>;
}) {
  const sp = await searchParams;
  const { y, m } = parseMonth(sp.month);

  // Weeks start on Monday; show every week that touches the month.
  const first = new Date(y, m, 1);
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7;
  const gridStart = new Date(y, m, 1 - offset);
  const gridEnd = new Date(y, m, 1 - offset + totalCells); // exclusive

  const [me, ideas, posts, campaigns] = await Promise.all([
    getCurrentProfile(),
    getIdeasBetween(toIsoDate(gridStart), toIsoDate(new Date(gridEnd.getTime() - 86400000))),
    // Pad by a day on each side so timezone edges are covered; the client buckets by local date.
    getContentBetween(
      new Date(gridStart.getTime() - 86400000).toISOString(),
      new Date(gridEnd.getTime() + 86400000).toISOString()
    ),
    getCampaigns(),
  ]);

  return (
    <CalendarView
      key={`${y}-${m}-${sp.date ?? ""}`}
      year={y}
      month={m}
      initialSelected={sp.date}
      ideas={ideas}
      posts={posts}
      campaigns={campaigns}
      me={me}
    />
  );
}
