import { ProfileForm } from "@/components/profile-form";
import { getCurrentProfile } from "@/lib/data";

export const metadata = { title: "Profile · DrupalAsia Marketing CMS" };

export default async function ProfilePage() {
  const me = await getCurrentProfile();
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <h1 className="text-[28px] leading-tight font-extrabold tracking-[-0.01em]">Profile and avatar</h1>
      <ProfileForm profile={me} />
    </div>
  );
}
