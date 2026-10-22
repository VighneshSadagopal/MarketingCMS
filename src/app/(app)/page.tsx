import { KanbanBoard } from "@/components/board/kanban-board";
import { getAllContent, getCampaigns, getCurrentProfile, getTeam } from "@/lib/data";

export const metadata = { title: "Content board · DrupalAsia Marketing CMS" };

export default async function BoardPage() {
  const [profile, team, content, campaigns] = await Promise.all([
    getCurrentProfile(),
    getTeam(),
    getAllContent(),
    getCampaigns(),
  ]);

  return (
    <>
      <div className="flex flex-col gap-2">
        <span className="font-label text-[13px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          DrupalAsia Connect India 2027
        </span>
        <h1 className="text-[28px] leading-tight font-extrabold tracking-[-0.01em]">Content board</h1>
      </div>
      <KanbanBoard initialItems={content} team={team} me={profile} campaigns={campaigns} />
    </>
  );
}
