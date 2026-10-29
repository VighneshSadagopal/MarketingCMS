import { MyWork } from "@/components/my-work/my-work";
import { getCampaigns, getCurrentProfile, getTeam, getWorkFor } from "@/lib/data";

export const metadata = { title: "My work · DrupalAsia Marketing CMS" };

/** Homepage: the signed-in person's assigned posts, progress and completed work. The owner can view anyone's. */
export default async function MyWorkPage({ searchParams }: { searchParams: Promise<{ person?: string }> }) {
  const { person } = await searchParams;
  const [me, team, campaigns] = await Promise.all([getCurrentProfile(), getTeam(), getCampaigns()]);

  const isOwner = me.role === "owner";
  const viewing = (isOwner && person ? team.find((p) => p.id === person) : undefined) ?? me;
  const { assigned, toReview, graphics } = await getWorkFor(viewing.id);

  return (
    <MyWork
      me={me}
      viewing={viewing}
      team={isOwner ? team : []}
      assigned={assigned}
      toReview={toReview}
      graphics={graphics}
      campaigns={campaigns}
    />
  );
}
