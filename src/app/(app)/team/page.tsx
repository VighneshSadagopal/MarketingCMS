import { redirect } from "next/navigation";

import { TeamAccess } from "@/components/team/team-access";
import { getCurrentProfile, getTeamMembers } from "@/lib/data";

export const metadata = { title: "Team access · DrupalAsia Marketing CMS" };

export default async function TeamPage() {
  const me = await getCurrentProfile();
  if (me.role !== "owner") redirect("/");
  const members = await getTeamMembers();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] leading-tight font-extrabold tracking-[-0.01em]">Team access</h1>
        <p className="text-[15px] text-muted-foreground">
          Only the Google accounts listed here can sign in. Add someone&apos;s Gmail or Google Workspace address, then
          they sign in with Continue with Google.
        </p>
      </div>
      <TeamAccess members={members} />
    </div>
  );
}
