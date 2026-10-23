/**
 * Builds the downloadable Word version of the content guidelines from src/lib/guidelines.ts,
 * so the website and the document always say the same thing.
 *
 *   npm run guidelines:docx
 *
 * Writes public/downloads/drupalasia-connect-2027-social-content-guidelines.docx.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  AlignmentType, BorderStyle, Document, Footer, HeadingLevel, LevelFormat, Packer, PageNumber,
  Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType,
} from "docx";

import * as G from "../src/lib/guidelines";

const NAVY = "031A4B";
const BLUE = "0462D2";
const MUTED = "4A5873";
const PAGE_W = 11906; // A4
const MARGIN = 1134; // 2 cm
const CONTENT_W = PAGE_W - MARGIN * 2;

const p = (text: string, opts: Record<string, unknown> = {}) =>
  new Paragraph({ children: [new TextRun({ text, ...opts })], spacing: { after: 120 } });

const runs = (parts: [string, boolean?][]) =>
  new Paragraph({
    children: parts.map(([text, bold]) => new TextRun({ text, bold: !!bold })),
    spacing: { after: 120 },
  });

const h1 = (text: string) => new Paragraph({ text, heading: HeadingLevel.HEADING_1, pageBreakBefore: false });
const h2 = (text: string) => new Paragraph({ text, heading: HeadingLevel.HEADING_2 });
const h3 = (text: string) => new Paragraph({ text, heading: HeadingLevel.HEADING_3 });

const bullet = (text: string | [string, boolean?][], level = 0) =>
  new Paragraph({
    numbering: { reference: "bullets", level },
    children:
      typeof text === "string" ? [new TextRun(text)] : text.map(([t, b]) => new TextRun({ text: t, bold: !!b })),
    spacing: { after: 60 },
  });

const numbered = (text: string, ref = "steps") =>
  new Paragraph({ numbering: { reference: ref, level: 0 }, children: [new TextRun(text)], spacing: { after: 60 } });

const intro = (text: string) =>
  new Paragraph({ children: [new TextRun({ text, italics: true, color: MUTED })], spacing: { after: 160 } });

const border = { style: BorderStyle.SINGLE, size: 4, color: "C9D3E6" };
const cellBorders = { top: border, bottom: border, left: border, right: border };

/** A simple two-or-more column table with a shaded header row. */
function table(headers: string[], rows: string[][], widths: number[]) {
  const total = widths.reduce((a, b) => a + b, 0);
  const cols = widths.map((w) => Math.round((w / total) * CONTENT_W));
  cols[cols.length - 1] += CONTENT_W - cols.reduce((a, b) => a + b, 0);
  const cell = (text: string, i: number, head: boolean) =>
    new TableCell({
      width: { size: cols[i], type: WidthType.DXA },
      borders: cellBorders,
      shading: head ? { type: ShadingType.CLEAR, color: "auto", fill: "E4EFFE" } : undefined,
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text, bold: head })] })],
    });
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: cols,
    rows: [
      new TableRow({ tableHeader: true, children: headers.map((h, i) => cell(h, i, true)) }),
      ...rows.map((r) => new TableRow({ children: r.map((t, i) => cell(t, i, false)) })),
    ],
  });
}

const spacer = () => new Paragraph({ spacing: { after: 120 }, children: [] });

const children = [
  // Title block
  new Paragraph({
    children: [new TextRun({ text: "DrupalAsia Connect India 2027 · 28 - 30 January | IIT Bombay", color: MUTED, size: 20 })],
    spacing: { after: 120 },
  }),
  new Paragraph({ text: "Social content guidelines for every post", heading: HeadingLevel.TITLE }),
  new Paragraph({
    children: [new TextRun({ text: "How we write, design, check and publish social media posts for DrupalAsia Connect", bold: true, size: 26 })],
    spacing: { after: 160 },
  }),
  intro(
    "Drawn from the Outreach & Attention Plan discussion draft (19 October 2026). Working guidance for Marketing, Program, Website, Registration and Partnerships until the campaign is approved."
  ),

  // How to use with AI
  h2("How to use this document with an AI assistant"),
  p("Give this whole document to the assistant as context, then ask for one post at a time. A good request names:"),
  bullet([["Platform: ", true], ["LinkedIn, X or Instagram (or all three, as separate versions)."]]),
  bullet([["Audience: ", true], ["one audience from section 5."]]),
  bullet([["Funnel stage: ", true], ["Awareness, Consideration or Registration (section 4)."]]),
  bullet([["Day or series: ", true], ["Imagine, Discover or Build (section 2), or an editorial series (section 7)."]]),
  bullet([["Destination: ", true], ["one page from section 6, and the facts you have confirmed."]]),
  p("Ask the assistant to check its draft against the non-negotiables (section 1), the posting rules (section 16) and the pre-publish checklist (section 11) before returning it. Anything marked [IN BRACKETS] is a placeholder the assistant must leave for a person to fill in, never invent."),

  // 1
  h1("1. The non-negotiables"),
  intro("If a post gets one of these wrong, it does not go out. Everything else on this page is judgement; these are facts."),
  table(["Rule", "Fact", "Notes"], G.NON_NEGOTIABLES.map((f) => [f.label, f.value, f.note]), [2, 3, 5]),
  spacer(),

  // 2
  h1("2. Three days, three connected ideas"),
  intro(
    "Imagine → Discover → Build is the event's narrative. Use it in captions, programme graphics, landing-page summaries and calls to action. Always capitalise the three verbs and keep them on their own day."
  ),
  table(["Date", "Idea", "Programme", "What to lead with"], G.DAYS.map((d) => [d.date, d.verb, d.title, d.body]), [2, 1.5, 2.5, 4]),
  spacer(),
  runs([["Personal posts: ", true], ["when organisers describe the wider event in their own voice, keep the phrase “Drupal conversations”. That positioning is deliberate."]]),

  // 3
  h1("3. Anatomy of a useful post"),
  intro("Every post answers three questions for one reader, then gives them one thing to do. If you can't answer all three, the post isn't ready."),
  ...G.ANATOMY.map((a) => new Paragraph({
    numbering: { reference: "anatomy", level: 0 },
    children: [new TextRun({ text: a.q + " ", bold: true }), new TextRun(a.a)],
    spacing: { after: 60 },
  })),
  h3("Example caption · Awareness · AI practitioners"),
  p("Most AI conversations stop at the tools. The harder questions are about architecture, open source and responsible adoption."),
  p("On 28 January, IMAGINE opens DrupalAsia Connect with the AI Summit, where practitioners, product leaders and educators take those questions on together."),
  p("Read how an AI-focused day became a summit: [TRACKED LINK]"),
  p("28 - 30 January | IIT Bombay"),
  p("Structure: 1 · Why it matters → 2 · What you'll find → 3 · One CTA, one link.", { color: MUTED, italics: true }),

  // 4
  h1("4. Match the post to the funnel"),
  intro("Decide which stage a post serves before you write it. The stage sets the content, the destination and the ask."),
  table(["Stage", "Content", "Link to", "Ask"], G.FUNNEL.map((f, i) => [`${i + 1}. ${f.stage}`, f.content, f.link, f.ask]), [2, 3.5, 3.5, 2]),
  spacer(),

  // 5
  h1("5. Write for one audience at a time"),
  intro("A post written for everyone reaches no one. Choose the reader, then use their angle and their language."),
  table(["Audience", "Their angle", "Lead with"], G.AUDIENCES.map((a) => [a.name, a.angle, a.lead]), [3, 4, 3]),
  spacer(),

  // 6
  h1("6. Where to link"),
  intro("Link to the most specific live page that answers the reader's next question. The home page is the fallback, not the default."),
  table(["Page", "Use it for"], G.LINK_TARGETS.map((l) => [l.url, l.note]), [4, 6]),
  spacer(),

  // 7
  h1("7. Editorial series"),
  intro("Build anticipation with series people recognise, not one-off adverts. Tag each post with its series in the content calendar."),
  table(["Series", "What it covers"], G.SERIES.map((s) => [s.name, s.body]), [3, 7]),
  spacer(),

  // 8
  h1("8. Adapt the post to the channel"),
  intro("Same facts, different jobs. Give every amplifier a ready-made kit and never an obligation."),
  table(["Channel", "Its job", "Details"], G.CHANNELS.map((c) => [c.name, c.body, c.extra]), [2.5, 4, 3.5]),
  spacer(),

  // 9
  h1("9. Voice, style and visuals"),
  h2("Writing"),
  ...G.WRITING.map((w) => bullet(w)),
  h2("Visuals"),
  ...G.VISUALS.map((v) => bullet(v)),
  h2("Brand colours"),
  table(["Colour", "Hex"], G.SWATCHES.map((s) => [s.name, s.hex]), [5, 5]),
  spacer(),

  // 10
  h1("10. Do and don't"),
  h2("Do"),
  ...G.DOS.map((d) => bullet(d)),
  h2("Don't"),
  ...G.DONTS.map((d) => bullet(d)),

  // 11
  h1("11. Pre-publish checklist"),
  intro("Tick through it for every post. All ten, or it waits."),
  ...G.CHECKLIST.map((c) => numbered(c, "checklist")),

  // 12
  h1("12. Tag every link"),
  runs([["Use one campaign name, ", false], [G.UTM_CAMPAIGN, true], [", and a short lowercase content name per post.", false]]),
  p("Link format:"),
  new Paragraph({
    children: [new TextRun({ text: `<page>?utm_source=<source>&utm_medium=<medium>&utm_campaign=${G.UTM_CAMPAIGN}&utm_content=<post_name>`, font: "Consolas", size: 20 })],
    spacing: { after: 120 },
  }),
  table(
    ["Part", "Allowed values"],
    [
      ["Destination page", G.UTM_DESTINATIONS.map((d) => `${d.label} (${d.url})`).join("; ")],
      ["utm_source", G.UTM_SOURCES.join(", ")],
      ["utm_medium", G.UTM_MEDIUMS.join(", ")],
      ["utm_content", "Short, lowercase, words joined by underscores, e.g. ai_summit_story"],
    ],
    [3, 7]
  ),
  spacer(),
  p("Example: https://drupalasia.org/how-an-ai-focused-day-became-a-summit?utm_source=linkedin&utm_medium=organic&utm_campaign=dac27_outreach&utm_content=ai_summit_story", { size: 20 }),
  intro("Before relying on end-to-end attribution, confirm analytics respects privacy and that the ticketing provider can report referrals."),

  // 13
  h1("13. Workflow and owners"),
  intro("One accountable owner per post, not approval by everyone on every post."),
  ...G.WORKFLOW_STEPS.map((s) => numbered(s, "workflow")),
  spacer(),
  table(["Team", "Owns"], G.OWNERS.map((o) => [o.team, o.body]), [3, 7]),
  spacer(),

  // 14
  h1("14. Cadence and the next four weeks"),
  intro("About two posts a week from an organiser's personal LinkedIn; the official account runs its own coordinated cadence. Stagger captions across accounts."),
  table(["Week", "Focus", "Plan"], G.CADENCE.map((c) => [c.week, c.title, c.body]), [2, 1.5, 6.5]),
  spacer(),

  // 15
  h1("15. Measure what matters"),
  intro("Record a baseline in the first two weeks, then set realistic targets. Likes alone are not success."),
  ...G.METRICS.map((m) => bullet(m)),
  runs([["Not more noise. The right conversations, visible to the right people, so they can confidently decide to take part", true]]),

  // 16 – CMS rules
  h1("16. Posting rules in the Marketing CMS"),
  intro("How the DrupalAsia Marketing CMS checks a post. Drafts that break these can't be saved or moved forward."),
  table(
    ["Rule", "Detail"],
    [
      ["Platforms", "LinkedIn, X and Instagram. Each platform gets its own copy in the post form."],
      ["X length", "X copy is limited to 280 characters. Links (anything starting http://, https:// or www.) don't count, and the separate Link and Hashtags fields aren't counted either."],
      ["LinkedIn and Instagram length", "No limit is enforced by the CMS; keep them readable and to one idea."],
      ["Images", "Up to 4 images per post, shared by all three platforms. PNG, JPG, WebP or GIF."],
      ["Hashtags and link", "Entered once per post in their own fields and added to every platform's copy."],
      ["Ready for review", "A post must be in Ready for review at least 48 hours before its target publish time."],
      ["Ready for schedule", "A post must be in Ready for schedule at least 12 hours before its target publish time. Only the owner can move it there or to Done / Posted."],
      ["Suggesting changes", "A reviewer suggesting changes must write a note saying what should change; it appears on the post as a change request."],
      ["Campaigns", "A post can belong to a campaign, whose default hashtags and link fill in automatically and whose dates limit the target date."],
    ],
    [3, 7]
  ),
  spacer(),
  new Paragraph({
    children: [new TextRun({ text: "Questions about this guideline go to the content calendar owner and the Program or Registration fact-checker named for the campaign.", italics: true, color: MUTED })],
  }),
];

const doc = new Document({
  creator: "DrupalAsia Marketing CMS",
  title: "DrupalAsia Connect India 2027 – Social content guidelines",
  description: "Social media content guidelines for DrupalAsia Connect India 2027, for people and AI assistants writing posts.",
  styles: {
    default: { document: { run: { font: "Arial", size: 22, color: "1A2440" } } },
    paragraphStyles: [
      { id: "Title", name: "Title", basedOn: "Normal", run: { size: 48, bold: true, color: NAVY }, paragraph: { spacing: { after: 120 } } },
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 32, bold: true, color: NAVY }, paragraph: { spacing: { before: 360, after: 120 }, outlineLevel: 0, keepNext: true } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 26, bold: true, color: BLUE }, paragraph: { spacing: { before: 240, after: 100 }, outlineLevel: 1, keepNext: true } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 23, bold: true, color: NAVY }, paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2, keepNext: true } },
    ],
  },
  numbering: {
    config: [
      { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
      ...["steps", "anatomy", "checklist", "workflow"].map((reference) => ({
        reference,
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }],
      })),
    ],
  },
  sections: [
    {
      properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } } },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({ text: "DrupalAsia Connect India 2027 · Social content guidelines · Page ", size: 16, color: MUTED }),
                new TextRun({ children: [PageNumber.CURRENT], size: 16, color: MUTED }),
              ],
            }),
          ],
        }),
      },
      children,
    },
  ],
});

const out = resolve(process.argv[2] ?? "public/downloads/drupalasia-connect-2027-social-content-guidelines.docx");
Packer.toBuffer(doc).then((buf: Buffer) => {
  writeFileSync(out, buf);
  console.log("wrote", out, buf.length);
});
