import { redirect } from "next/navigation";

import { UpdateGenerator } from "@/components/updates/update-generator";
import { getCurrentProfile } from "@/lib/data";
import { todayIst } from "@/lib/daily-update";

export const metadata = { title: "Daily update · DrupalAsia Marketing CMS" };

export default async function UpdatesPage() {
  const me = await getCurrentProfile();
  if (me.role !== "owner") redirect("/");

  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="font-label text-[13px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          Owner only
        </span>
        <h1 className="text-[28px] leading-tight font-extrabold tracking-[-0.01em]">Daily update</h1>
        <p className="text-[15px] text-muted-foreground">
          Generate a summary for the team&apos;s Slack channel: what moved today, tomorrow&apos;s tasks with assignees,
          deadlines and reviewers, anything overdue, and the posts going out tomorrow. Times are India time (IST).
        </p>
      </div>
      <UpdateGenerator today={todayIst()} />
    </div>
  );
}
