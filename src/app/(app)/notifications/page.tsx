import { NotificationsView } from "@/components/notifications/notifications-view";
import { getCurrentProfile } from "@/lib/data";
import { NOTIFICATION_SELECT, type AppNotification } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Notifications · DrupalAsia Marketing CMS" };

export default async function NotificationsPage() {
  const me = await getCurrentProfile();
  const supabase = await createClient();
  const [list, settings] = await Promise.all([
    supabase
      .from("notifications")
      .select(NOTIFICATION_SELECT)
      .eq("user_id", me.id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("notification_settings").select("muted").eq("user_id", me.id).maybeSingle(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="font-label text-[13px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          DrupalAsia Connect India 2027
        </span>
        <h1 className="text-[28px] leading-tight font-extrabold tracking-[-0.01em]">Notifications</h1>
      </div>
      <NotificationsView
        userId={me.id}
        initial={(list.data ?? []) as unknown as AppNotification[]}
        muted={(settings.data?.muted as string[] | undefined) ?? []}
        vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""}
      />
    </div>
  );
}
