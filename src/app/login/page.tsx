import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in · DrupalAsia Marketing CMS" };

const ERRORS: Record<string, string> = {
  not_allowed: "This Google account isn't on the team list. Ask the owner to add it, then try again.",
  removed: "Your access was removed by the owner.",
  failed: "Google sign-in didn't complete. Please try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  // Only known codes are shown, never text passed in the URL.
  const errorText = error ? (ERRORS[error] ?? ERRORS.failed) : undefined;
  return (
    <div className="flex min-h-screen flex-wrap">
      <section className="night relative flex min-h-[420px] flex-[1_1_520px] flex-col justify-between gap-12 overflow-hidden bg-navy-900 p-8 text-white sm:p-16">
        <svg
          aria-hidden
          className="absolute inset-0 size-full"
          viewBox="0 0 720 900"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
        >
          <path d="M-40 820 C 200 520, 520 460, 780 560" stroke="#0462d2" strokeWidth="2" />
          <path d="M120 940 C 320 700, 560 700, 780 760" stroke="#f86802" strokeWidth="2" />
          <path d="M420 140 L520 230 L640 170 L690 320 L560 380" stroke="#38d9f5" strokeWidth="1.5" opacity="0.55" />
          {[
            [420, 140],
            [520, 230],
            [640, 170],
            [690, 320],
            [560, 380],
          ].map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="5" fill="#38d9f5" />
          ))}
        </svg>
        <div className="relative flex items-center gap-3">
          <span aria-hidden className="h-7 w-1.5 rounded-full bg-orange-500" />
          <span className="font-label text-2xl font-semibold">DrupalAsia</span>
        </div>
        <div className="relative flex flex-col gap-8">
          <h1 className="text-5xl leading-[0.95] font-extrabold tracking-[-0.02em] sm:text-7xl">
            DrupalAsia
            <br />
            Marketing
            <br />
            <span className="text-blue-500">CMS</span>
          </h1>
          <span aria-hidden className="h-1.5 w-18 rounded-full bg-orange-500" />
          <p className="max-w-md text-[22px] leading-snug font-bold">
            Plan, review and publish our community posts in one place
          </p>
        </div>
        <span className="relative font-label text-[13px] font-semibold tracking-[0.12em] text-ice-100/70 uppercase">
          28 - 30 January | IIT Bombay
        </span>
      </section>
      <section className="flex flex-[1_1_480px] items-center justify-center px-4 py-16">
        <LoginForm error={errorText} />
      </section>
    </div>
  );
}
