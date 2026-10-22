import { AppHeader } from "@/components/app-header";
import { getCurrentProfile } from "@/lib/data";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader profile={profile} />
      <main className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-8">{children}</main>
    </div>
  );
}
