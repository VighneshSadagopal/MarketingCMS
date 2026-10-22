import type { Content, ContentStatus } from "@/lib/types";

const HOUR = 60 * 60 * 1000;

/** A post must reach Ready for review this long before its target publish time. */
export const REVIEW_LEAD_HOURS = 48;
/** A post must reach Ready for schedule this long before its target publish time. */
export const SCHEDULE_LEAD_HOURS = 12;

/** How early to start warning before each deadline. */
const REVIEW_WARN_HOURS = 72;
const SCHEDULE_WARN_HOURS = 24;

const BEFORE_REVIEW: ContentStatus[] = ["todo", "changes_suggested", "in_progress"];

export type Deadline = {
  tone: "overdue" | "due";
  /** Short label for cards, e.g. "Review due in 1d 4h". */
  label: string;
  /** Longer explanation for tooltips and the content page. */
  detail: string;
};

const when = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/** "2d 4h", "5h", "40m". */
export function formatSpan(ms: number) {
  const mins = Math.max(1, Math.round(Math.abs(ms) / 60000));
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  if (days > 0) return hours ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
}

/**
 * The most pressing deadline for a post right now, or null when it is on track,
 * already posted, or has no target date.
 */
export function getDeadline(item: Pick<Content, "status" | "publish_at">, now: number): Deadline | null {
  if (!item.publish_at || item.status === "done") return null;
  const target = new Date(item.publish_at).getTime();

  // Past the target time and still not posted.
  if (now > target) {
    return {
      tone: "overdue",
      label: `Past target date by ${formatSpan(now - target)}`,
      detail: `Target was ${when.format(target)} and the post isn't marked Done / Posted yet.`,
    };
  }

  if (BEFORE_REVIEW.includes(item.status)) {
    const due = target - REVIEW_LEAD_HOURS * HOUR;
    if (now > due) {
      return {
        tone: "overdue",
        label: `Review overdue by ${formatSpan(now - due)}`,
        detail: `Should have been in Ready for review by ${when.format(due)}, ${REVIEW_LEAD_HOURS} hours before the target date.`,
      };
    }
    if (due - now <= REVIEW_WARN_HOURS * HOUR) {
      return {
        tone: "due",
        label: `Review due in ${formatSpan(due - now)}`,
        detail: `Move to Ready for review by ${when.format(due)} (${REVIEW_LEAD_HOURS} hours before the target date).`,
      };
    }
    return null;
  }

  if (item.status === "ready_for_review") {
    const due = target - SCHEDULE_LEAD_HOURS * HOUR;
    if (now > due) {
      return {
        tone: "overdue",
        label: `Scheduling overdue by ${formatSpan(now - due)}`,
        detail: `Should have been in Ready for schedule by ${when.format(due)}, ${SCHEDULE_LEAD_HOURS} hours before the target date.`,
      };
    }
    if (due - now <= SCHEDULE_WARN_HOURS * HOUR) {
      return {
        tone: "due",
        label: `Scheduling due in ${formatSpan(due - now)}`,
        detail: `The owner should approve it for schedule by ${when.format(due)} (${SCHEDULE_LEAD_HOURS} hours before the target date).`,
      };
    }
  }

  return null;
}
