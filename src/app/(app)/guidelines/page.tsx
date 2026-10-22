import { Check, X as XIcon } from "lucide-react";

import { PrePublishChecklist } from "@/components/guidelines/checklist";
import { UtmBuilder } from "@/components/guidelines/utm-builder";
import {
  ANATOMY,
  AUDIENCES,
  CADENCE,
  CHANNELS,
  DAYS,
  DONTS,
  DOS,
  FUNNEL,
  LINK_TARGETS,
  METRICS,
  NON_NEGOTIABLES,
  OWNERS,
  SECTIONS,
  SERIES,
  SWATCHES,
  UTM_CAMPAIGN,
  VISUALS,
  WORKFLOW_STEPS,
  WRITING,
} from "@/lib/guidelines";

export const metadata = { title: "Content guidelines · DrupalAsia Marketing CMS" };

function Section({
  id,
  n,
  eyebrow,
  title,
  intro,
  children,
}: {
  id: string;
  n: number;
  eyebrow: string;
  title: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="flex scroll-mt-6 flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className="font-label text-[13px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          {String(n).padStart(2, "0")} · {eyebrow}
        </span>
        <h2 id={`${id}-h`} className="text-[28px] leading-tight font-extrabold tracking-[-0.01em]">
          {title}
        </h2>
        {intro ? <p className="max-w-3xl text-[15px] leading-relaxed text-muted-foreground">{intro}</p> : null}
      </div>
      {children}
    </section>
  );
}

const card = "flex flex-col gap-2 rounded-2xl border border-border bg-white p-5";

export default function GuidelinesPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-10">
      <header className="night relative overflow-hidden rounded-2xl bg-navy-900 p-8 text-white sm:p-12">
        <svg
          aria-hidden
          className="absolute inset-0 size-full"
          viewBox="0 0 1200 360"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
        >
          <path d="M600 380 C 760 160, 980 90, 1240 120" stroke="#0462d2" strokeWidth="2" />
          <path d="M700 400 C 860 240, 1040 220, 1240 260" stroke="#f86802" strokeWidth="2" />
          <path d="M860 70 L960 130 L1080 90 L1130 200" stroke="#38d9f5" strokeWidth="1.5" opacity="0.55" />
          {[
            [860, 70],
            [960, 130],
            [1080, 90],
            [1130, 200],
          ].map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="5" fill="#38d9f5" />
          ))}
        </svg>
        <div className="relative flex max-w-3xl flex-col gap-6">
          <span className="font-label text-[13px] font-semibold tracking-[0.12em] text-ice-100/70 uppercase">
            DrupalAsia Connect India 2027 · 28 - 30 January | IIT Bombay
          </span>
          <h1 className="text-4xl leading-[0.95] font-extrabold tracking-[-0.02em] sm:text-6xl">
            Social content guidelines
            <br />
            <span className="text-blue-500">for every post</span>
          </h1>
          <span aria-hidden className="h-1.5 w-18 rounded-full bg-orange-500" />
          <p className="text-[22px] leading-snug font-bold">
            How we write, design, check and publish social media posts for DrupalAsia Connect
          </p>
          <p className="text-sm text-ice-100/70">
            Drawn from the Outreach &amp; Attention Plan discussion draft (19 October 2026). Working guidance for
            Marketing, Program, Website, Registration and Partnerships until the campaign is approved.
          </p>
        </div>
      </header>

      <div className="flex flex-wrap items-start gap-10">
        <nav
          aria-label="On this page"
          className="flex-[1_1_200px] lg:sticky lg:top-6 lg:max-w-[220px]"
        >
          <ol className="flex flex-wrap gap-2 lg:flex-col lg:gap-0.5">
            {SECTIONS.map((s, i) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="flex min-h-9 items-center gap-2 rounded-md px-2.5 text-sm font-semibold text-navy-800 no-underline hover:bg-white"
                >
                  <span className="w-5 text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                  {s.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="flex min-w-0 flex-[999_1_640px] flex-col gap-16">
          <Section
            id="facts"
            n={1}
            eyebrow="Get these right every time"
            title="The non-negotiables"
            intro="If a post gets one of these wrong, it does not go out. Everything else on this page is judgement; these are facts."
          >
            <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
              {NON_NEGOTIABLES.map((f) => (
                <div key={f.label} className={card}>
                  <span className="text-[13px] font-bold tracking-wide text-muted-foreground uppercase">{f.label}</span>
                  <span className="text-lg leading-snug font-extrabold">{f.value}</span>
                  <p className="text-sm leading-relaxed text-muted-foreground">{f.note}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section
            id="days"
            n={2}
            eyebrow="Approved campaign language"
            title="Three days, three connected ideas"
            intro="Imagine → Discover → Build is the event's narrative. Use it in captions, programme graphics, landing-page summaries and calls to action. Always capitalise the three verbs and keep them on their own day."
          >
            <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
              {DAYS.map((d) => (
                <div key={d.verb} className="night flex flex-col gap-3 rounded-2xl bg-navy-900 p-6 text-white">
                  <span className="font-label text-[13px] font-semibold tracking-[0.12em] text-ice-100/70 uppercase">
                    {d.date}
                  </span>
                  <span className="text-3xl font-extrabold tracking-[-0.02em] text-blue-500">{d.verb}</span>
                  <span className="text-lg font-bold">{d.title}</span>
                  <p className="text-sm leading-relaxed text-ice-100/70">{d.body}</p>
                </div>
              ))}
            </div>
            <p className="rounded-md bg-white px-4 py-3 text-sm">
              <strong>Personal posts:</strong> when organisers describe the wider event in their own voice, keep the
              phrase “Drupal conversations”. That positioning is deliberate.
            </p>
          </Section>

          <Section
            id="anatomy"
            n={3}
            eyebrow="Before you write"
            title="Anatomy of a useful post"
            intro="Every post answers three questions for one reader, then gives them one thing to do. If you can't answer all three, the post isn't ready."
          >
            <ol className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
              {ANATOMY.map((a, i) => (
                <li key={a.q} className={card}>
                  <span className="flex size-8 items-center justify-center rounded-full bg-blue-600 text-sm font-extrabold text-white">
                    {i + 1}
                  </span>
                  <span className="font-extrabold">{a.q}</span>
                  <p className="text-sm text-muted-foreground">{a.a}</p>
                </li>
              ))}
            </ol>
            <figure className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-6">
              <figcaption className="text-[13px] font-bold tracking-wide text-muted-foreground uppercase">
                Example caption · Awareness · AI practitioners
              </figcaption>
              <div className="flex flex-col gap-3 text-[15px] leading-relaxed">
                <p>
                  <mark className="rounded-sm bg-ice-100 px-1 text-navy-800">
                    Most AI conversations stop at the tools. The harder questions are about architecture, open source
                    and responsible adoption.
                  </mark>
                </p>
                <p>
                  <mark className="rounded-sm bg-cyan-300/30 px-1 text-navy-800">
                    On 28 January, IMAGINE opens DrupalAsia Connect with the AI Summit, where practitioners, product
                    leaders and educators take those questions on together.
                  </mark>
                </p>
                <p>
                  <mark className="rounded-sm bg-orange-500/15 px-1 text-navy-800">
                    Read how an AI-focused day became a summit: [TRACKED LINK]
                  </mark>
                </p>
                <p className="font-semibold">28 - 30 January | IIT Bombay</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-full bg-ice-100 px-2.5 py-1">1 · Why it matters</span>
                <span className="rounded-full bg-cyan-300/30 px-2.5 py-1">2 · What you&apos;ll find</span>
                <span className="rounded-full bg-orange-500/15 px-2.5 py-1">3 · One CTA, one link</span>
              </div>
            </figure>
          </Section>

          <Section
            id="funnel"
            n={4}
            eyebrow="Pick the stage"
            title="Match the post to the funnel"
            intro="Decide which stage a post serves before you write it. The stage sets the content, the destination and the ask."
          >
            <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
              {FUNNEL.map((f, i) => (
                <div key={f.stage} className={card}>
                  <span className="text-[13px] font-bold text-muted-foreground">Stage {i + 1}</span>
                  <h3 className="text-lg font-extrabold">{f.stage}</h3>
                  <dl className="flex flex-col gap-1.5 text-sm">
                    <div>
                      <dt className="inline font-bold">Content: </dt>
                      <dd className="inline">{f.content}</dd>
                    </div>
                    <div>
                      <dt className="inline font-bold">Link to: </dt>
                      <dd className="inline">{f.link}</dd>
                    </div>
                    <div>
                      <dt className="inline font-bold">Ask: </dt>
                      <dd className="inline">{f.ask}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          </Section>

          <Section
            id="audiences"
            n={5}
            eyebrow="Who it's for"
            title="Write for one audience at a time"
            intro="A post written for everyone reaches no one. Choose the reader, then use their angle and their language."
          >
            <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
              {AUDIENCES.map((a) => (
                <div key={a.name} className={card}>
                  <h3 className="font-extrabold">{a.name}</h3>
                  <p className="text-sm text-muted-foreground">{a.angle}</p>
                  <p className="text-sm">
                    <strong>Lead with:</strong> {a.lead}
                  </p>
                </div>
              ))}
            </div>
          </Section>

          <Section
            id="links"
            n={6}
            eyebrow="The website is the engine"
            title="Where to link"
            intro="Link to the most specific live page that answers the reader's next question. The home page is the fallback, not the default."
          >
            <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-white">
              {LINK_TARGETS.map((l) => (
                <li key={l.url} className="flex flex-col gap-1 p-4 sm:flex-row sm:gap-6">
                  <code className="shrink-0 font-mono text-sm font-bold break-all text-blue-600 sm:w-80">{l.url}</code>
                  <span className="text-sm text-muted-foreground">{l.note}</span>
                </li>
              ))}
            </ul>
          </Section>

          <Section
            id="series"
            n={7}
            eyebrow="Recurring formats"
            title="Editorial series"
            intro="Build anticipation with series people recognise, not one-off adverts. Tag each post with its series in the content calendar."
          >
            <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
              {SERIES.map((s) => (
                <div key={s.name} className={card}>
                  <h3 className="font-extrabold">{s.name}</h3>
                  <p className="text-sm text-muted-foreground">{s.body}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section
            id="channels"
            n={8}
            eyebrow="Channel playbook"
            title="Adapt the post to the channel"
            intro="Same facts, different jobs. Give every amplifier a ready-made kit and never an obligation."
          >
            <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
              {CHANNELS.map((c) => (
                <div key={c.name} className={card}>
                  <h3 className="font-extrabold">{c.name}</h3>
                  <p className="text-sm">{c.body}</p>
                  <p className="text-sm text-muted-foreground">{c.extra}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section id="voice" n={9} eyebrow="Brand" title="Voice, style and visuals">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
              <div className={card}>
                <h3 className="text-lg font-extrabold">Writing</h3>
                <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed">
                  {WRITING.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
              <div className={card}>
                <h3 className="text-lg font-extrabold">Visuals</h3>
                <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed">
                  {VISUALS.map((v) => (
                    <li key={v}>{v}</li>
                  ))}
                </ul>
              </div>
            </div>
            <ul className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
              {SWATCHES.map((s) => (
                <li key={s.hex} className="flex items-center gap-3 rounded-md border border-border bg-white p-3">
                  <span
                    aria-hidden
                    className="size-10 shrink-0 rounded-md border border-border"
                    style={{ background: s.hex }}
                  />
                  <span className="flex flex-col text-sm">
                    <span className="font-bold">{s.name}</span>
                    <code className="font-mono text-muted-foreground">{s.hex}</code>
                  </span>
                </li>
              ))}
            </ul>
          </Section>

          <Section id="dos" n={10} eyebrow="Quick reference" title="Do and don't">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
              <div className={card}>
                <h3 className="text-lg font-extrabold">Do</h3>
                <ul className="flex flex-col gap-2.5 text-sm">
                  {DOS.map((d) => (
                    <li key={d} className="flex gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-blue-600" strokeWidth={3} aria-hidden />
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
              <div className={card}>
                <h3 className="text-lg font-extrabold">Don&apos;t</h3>
                <ul className="flex flex-col gap-2.5 text-sm">
                  {DONTS.map((d) => (
                    <li key={d} className="flex gap-2">
                      <XIcon className="mt-0.5 size-4 shrink-0 text-destructive" strokeWidth={3} aria-hidden />
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Section>

          <Section
            id="checklist"
            n={11}
            eyebrow="Before you schedule"
            title="Pre-publish checklist"
            intro="Tick through it for every post. All ten, or it waits."
          >
            <PrePublishChecklist />
          </Section>

          <Section
            id="utm"
            n={12}
            eyebrow="Attribution"
            title="Tag every link"
            intro={
              <>
                Use one campaign name, <code className="font-mono font-bold text-navy-800">{UTM_CAMPAIGN}</code>, and a
                short lowercase content name per post. Build the link here and paste it into the post.
              </>
            }
          >
            <UtmBuilder />
          </Section>

          <Section
            id="workflow"
            n={13}
            eyebrow="From idea to published"
            title="Workflow and owners"
            intro="One accountable owner per post, not approval by everyone on every post."
          >
            <ol className="flex flex-wrap gap-2">
              {WORKFLOW_STEPS.map((s, i) => (
                <li
                  key={s}
                  className="flex items-center gap-2 rounded-full border border-border bg-white py-1.5 pr-3.5 pl-1.5 text-sm font-semibold"
                >
                  <span className="flex size-6 items-center justify-center rounded-full bg-navy-800 text-xs font-extrabold text-white">
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ol>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
              {OWNERS.map((o) => (
                <div key={o.team} className={card}>
                  <h3 className="font-extrabold">{o.team}</h3>
                  <p className="text-sm text-muted-foreground">{o.body}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section
            id="cadence"
            n={14}
            eyebrow="Rhythm"
            title="Cadence and the next four weeks"
            intro="About two posts a week from an organiser's personal LinkedIn; the official account runs its own coordinated cadence. Stagger captions across accounts."
          >
            <ol className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
              {CADENCE.map((c) => (
                <li key={c.week} className={card}>
                  <span className="text-[13px] font-bold text-muted-foreground">{c.week}</span>
                  <h3 className="text-lg font-extrabold">{c.title}</h3>
                  <p className="text-sm leading-relaxed">{c.body}</p>
                </li>
              ))}
            </ol>
          </Section>

          <Section
            id="metrics"
            n={15}
            eyebrow="Weekly review"
            title="Measure what matters"
            intro="Record a baseline in the first two weeks, then set realistic targets. Likes alone are not success."
          >
            <ul className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3">
              {METRICS.map((m) => (
                <li key={m} className="rounded-md border border-border bg-white p-4 text-sm font-semibold">
                  {m}
                </li>
              ))}
            </ul>
            <div className="night flex flex-col gap-4 rounded-2xl bg-navy-900 p-8 text-white">
              <p className="text-[22px] leading-snug font-bold">
                Not more noise. The right conversations, visible to the right people, so they can confidently decide to
                take part
              </p>
              <span aria-hidden className="h-1.5 w-16 rounded-full bg-orange-500" />
              <p className="text-sm text-ice-100/70">
                Questions about this guideline go to the content calendar owner and the Program or Registration
                fact-checker named for the campaign.
              </p>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
