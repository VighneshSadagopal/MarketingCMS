/**
 * Social content guidelines for DrupalAsia Connect India 2027.
 * Source: the "DAC27 Social Content Guidelines" design, drawn from the Outreach & Attention Plan
 * discussion draft (19 October 2026). Edit the copy here; the /guidelines page renders it.
 */

export const SECTIONS = [
  { id: "facts", label: "Non-negotiables" },
  { id: "days", label: "Imagine · Discover · Build" },
  { id: "anatomy", label: "Post anatomy" },
  { id: "funnel", label: "Funnel stages" },
  { id: "audiences", label: "Audiences" },
  { id: "links", label: "Where to link" },
  { id: "series", label: "Editorial series" },
  { id: "channels", label: "Channels" },
  { id: "voice", label: "Voice and visuals" },
  { id: "dos", label: "Do and don't" },
  { id: "checklist", label: "Checklist" },
  { id: "utm", label: "UTM builder" },
  { id: "workflow", label: "Workflow" },
  { id: "cadence", label: "Cadence" },
  { id: "metrics", label: "Metrics" },
] as const;

export const NON_NEGOTIABLES = [
  {
    label: "Dates",
    value: "28 - 30 January 2027",
    note: "Never 21 - 23 January. Older partner posts and artwork still carry those dates: do not share or amplify them.",
  },
  {
    label: "Venue",
    value: "IIT Bombay, Mumbai",
    note: "Written as a date line: 28 - 30 January | IIT Bombay (spaced hyphen, spaced bar).",
  },
  {
    label: "Name",
    value: "DrupalAsia Connect India 2027",
    note: "DrupalAsia is one word with two capitals. Never Drupal Asia, Drupalasia or DAC in public copy.",
  },
  {
    label: "Positioning",
    value: "Drupal is our foundation.",
    note: "Conversations extend across AI, engineering, DXP, product thinking, open source, education and public digital infrastructure.",
  },
  {
    label: "Unpublished means unshareable",
    value: "Panel pages are still being built.",
    note: "No guessed URLs, unapproved topics, speakers or rosters. Draft privately; schedule only after the page is live and approved.",
  },
  {
    label: "Only verified offers",
    value: "Prices, deadlines, discounts, visas.",
    note: "Publish them only once Registration has confirmed them. No promised student discounts or travel details before approval.",
  },
];

export const DAYS = [
  {
    date: "28 January 2027",
    verb: "IMAGINE",
    title: "AI Summit",
    body: "Lead AI-practitioner and decision-maker content here. Practical AI, open-source AI, responsible adoption.",
  },
  {
    date: "29 January 2027",
    verb: "DISCOVER",
    title: "Conference: Sessions and Workshops",
    body: "Sessions, speakers, workshops and technical depth for engineers, product owners and digital leaders.",
  },
  {
    date: "30 January 2027",
    verb: "BUILD",
    title: "Contribution and Hackathon",
    body: "Contribution, mentoring and hands-on building. Strong for contributors, students and early-career engineers.",
  },
];

export const ANATOMY = [
  {
    q: "Why does this topic matter to me?",
    a: "Open with the reader's problem or question, not the event name.",
  },
  {
    q: "What will I find at DrupalAsia Connect?",
    a: "Name the specific conversation, session type or day (Imagine, Discover, Build).",
  },
  {
    q: "What should I do next?",
    a: "One primary call to action. One relevant destination. Tagged link.",
  },
];

export const FUNNEL = [
  {
    stage: "Awareness",
    content: "stories and thoughtful questions.",
    link: "the AI Summit backstory, a blog post or a focused article.",
    ask: "read the story.",
  },
  {
    stage: "Consideration",
    content: "Program, sessions, speakers, panel topics, travel context.",
    link: "the AI Summit or Program-at-a-glance page.",
    ask: "explore the Program.",
  },
  {
    stage: "Registration",
    content: "clear ticket types, what's included, verified prices and deadlines, social proof.",
    link: "the verified, live ticketing page.",
    ask: "get your ticket.",
  },
];

export const AUDIENCES = [
  {
    name: "Drupal contributors and agencies",
    angle: "Community, contribution, product roadmap, technical sessions.",
    lead: "why reconnecting in person matters.",
  },
  {
    name: "AI practitioners and builders",
    angle: "Practical examples, open-source AI, architectural trade-offs, responsible adoption.",
    lead: "the AI Summit, not only Drupal branding.",
  },
  {
    name: "CTOs, engineering and platform leaders",
    angle: "Reliability, governance, DXP, open web, AI integration, implementation lessons.",
    lead: "a business or engineering problem statement.",
  },
  {
    name: "Product owners and digital leaders",
    angle: "Outcomes, user experience, product thinking, innovation, cross-functional views.",
    lead: "outcomes and the people they serve.",
  },
  {
    name: "Government, education and social impact",
    angle: "Public infrastructure, accessibility, local-language possibilities, trust, community capability.",
    lead: "public digital infrastructure and trust.",
  },
  {
    name: "Students, faculty and early-career engineers",
    angle: "Learning through contribution, mentorship, networking.",
    lead: "BUILD day. Promote only confirmed student ticket offers.",
  },
  {
    name: "Asia-Pacific and international communities",
    angle: "Collaboration across the region.",
    lead: "regional connection. Travel and visa details only once officially confirmed.",
  },
];

export const LINK_TARGETS = [
  {
    url: "drupalasia.org/how-an-ai-focused-day-became-a-summit",
    note: "The origin story; a strong cross-disciplinary entry point. Share short excerpts with a human “why”.",
  },
  {
    url: "drupalasia.org/ai-summit",
    note: "For AI practitioners, product leaders, educators and decision-makers. Use themes, approved speakers and real-world questions.",
  },
  {
    url: "drupalasia.org/program-at-a-glance",
    note: "What each day offers. The best destination for “what will I get out of attending?” posts.",
  },
  {
    url: "drupalasia.org/blogs",
    note: "Discovery hub. Prefer the individual article over the listing whenever one exists.",
  },
  { url: "drupalasia.org", note: "Broad introduction, only when no more targeted page exists." },
  {
    url: "[VERIFIED TICKET PAGE]",
    note: "For every registration post. Confirm the canonical URL with Registration and test it before scheduling.",
  },
];

export const SERIES = [
  { name: "Beyond the tools", body: "Practical AI questions and perspectives that bridge to the AI Summit." },
  {
    name: "People behind the event",
    body: "Organisers, reviewers, volunteers and Program leads. Authentic community moments.",
  },
  { name: "Three days, three connected ideas", body: "Imagine, Discover, Build explainers with consistent labels and visuals." },
  {
    name: "What should Drupal become?",
    body: "Open questions on AI, agentic experiences, DXP, the open web and engineering direction.",
  },
  {
    name: "Panel conversations",
    body: "Provocative questions before launch → approved overview once the page is live → panelist perspectives once confirmed.",
  },
  { name: "Your seat at the table", body: "Ticket options and benefits, explained clearly. Deadline reminders only when verified." },
  { name: "Coming to Mumbai", body: "Venue, travel and visa resources, once confirmed. Key for international attendees." },
];

export const CHANNELS = [
  {
    name: "Official Drupal Asia LinkedIn",
    body: "Milestones, Early Bird, Program updates, volunteer thanks. Run its own coordinated cadence.",
    extra: "Also: website and blogs, the consent-based mailing list, community Slack or Discord where appropriate.",
  },
  {
    name: "Organisers' personal accounts",
    body: "Interpret the story in your own voice. Never repost the official caption word for word.",
    extra: "About 2 posts a week on LinkedIn. Keep “Drupal conversations” when describing the wider event.",
  },
  {
    name: "Community micro-kit",
    body: "For regional Drupal groups, Drupal Association channels, meetups and contributors.",
    extra: "Kit: 50-word blurb, square and portrait art, exact dates, tracked links.",
  },
  {
    name: "Speaker and panel kit",
    body: "Only after the announcement is approved. Personalised, simple, optional to post.",
    extra: "Kit: one paragraph, one artwork, one official session or panel URL, an optional personal hook.",
  },
  {
    name: "Sponsors and partners",
    body: "Ask partners to share their participation on their own channels.",
    extra: "Kit: a partner card plus two captions, brand awareness and technical relevance. No heavy product claims.",
  },
  {
    name: "Universities and students",
    body: "A faculty-friendly overview for departments and clubs to pass on.",
    extra: "Program relevance, ways to learn and contribute, verified student ticket details only.",
  },
  {
    name: "Newsletters and media",
    body: "A concise pitch for developer, open-source, higher-education, AI and regional tech newsletters.",
    extra: "The authentic story and confirmed Program. No inflated attendance claims.",
  },
  {
    name: "Personal invitations",
    body: "Thoughtful, low-volume notes to people you know, saying why they in particular might care.",
    extra: "Never mass unsolicited DMs.",
  },
];

export const WRITING = [
  "Lead with community and connection, not features or hype.",
  "“We” for organisers, “you” for attendees.",
  "Taglines in sentence case, one sentence, no full stop.",
  "Date line format: 28 - 30 January | IIT Bombay.",
  "No emoji. Keep hashtags few and agreed in the asset kit.",
  "Inform, don't advertise: every post should be useful even to someone who doesn't buy a ticket.",
  "Claim only what you can prove: no inflated attendance or reach numbers.",
];

export const VISUALS = [
  "Navy ground (#03163B) with white type. Highlight one headline line in signal blue (#006EFF), 24px or larger.",
  "Orange (#F86802) is a mark, not a fill: the accent rule and one arc at most.",
  "Imagery uses the network map vocabulary: points, lines, arcs. No stock people.",
  "Use the official logo files only. Never redraw or recolour; on navy, place it on an ice-blue plate.",
  "Produce square and portrait sizes for every kit.",
  "Each panel gets its own visual and question, not several identical posters.",
  "Photos of people only with recorded permission.",
];

export const SWATCHES = [
  { name: "Navy 900", hex: "#03163B" },
  { name: "Signal blue", hex: "#006EFF" },
  { name: "Node cyan", hex: "#38D9F5" },
  { name: "Orange mark", hex: "#F86802" },
  { name: "Ice / white", hex: "#E4EFFE" },
];

export const DOS = [
  "Give every post one audience, one CTA and one destination.",
  "Lead AI-audience posts with the AI Summit story.",
  "Keep celebrating milestones and volunteers: 100+ session submissions is credible social proof.",
  "Let participants, speakers and volunteers tell stories, not only organisers.",
  "Hold a slot open to swap in a stronger approved speaker or panel milestone.",
  "Turn recurring questions in comments into FAQ answers and posts.",
];

export const DONTS = [
  "Share or reshare anything showing 21 - 23 January.",
  "Post guessed panel URLs, unapproved topics, speakers or rosters.",
  "Promise discounts, prices or visa help before Registration confirms them.",
  "Post the same caption across every account on the same day.",
  "Stack several CTAs or links into one post.",
  "Treat likes as success, or send mass unsolicited DMs.",
];

export const CHECKLIST = [
  "Dates read 28 - 30 January 2027. Nothing shows 21 - 23 January.",
  "The post speaks to one audience and says why the topic matters to them.",
  "It names what the reader will find at DrupalAsia Connect.",
  "There is one primary call to action and one destination link.",
  "The link is live, published, works on mobile and carries UTM tags.",
  "Every speaker, panel, price, deadline, discount or visa detail is approved by Program or Registration.",
  "Imagine, Discover and Build are capitalised and on the right days.",
  "DrupalAsia is one word, the logo is unedited, and there are no emoji.",
  "Every photo of a person has recorded permission.",
  "The caption differs from other accounts posting today, and one owner has signed off.",
];

export const UTM_CAMPAIGN = "dac27_outreach";

export const UTM_DESTINATIONS = [
  { url: "https://drupalasia.org/how-an-ai-focused-day-became-a-summit", label: "AI Summit story" },
  { url: "https://drupalasia.org/ai-summit", label: "AI Summit" },
  { url: "https://drupalasia.org/program-at-a-glance", label: "Program at a glance" },
  { url: "https://drupalasia.org/blogs", label: "Blogs" },
  { url: "https://drupalasia.org/", label: "Home page" },
];

export const UTM_SOURCES = ["linkedin", "newsletter", "slack", "discord", "partner"];
export const UTM_MEDIUMS = ["organic", "email", "community", "partner"];

export const WORKFLOW_STEPS = [
  "Idea",
  "Audience and outcome",
  "Verified landing page",
  "Copy and artwork",
  "Program / Registration fact check",
  "Brand approval",
  "Scheduled distribution",
  "Responses",
  "Performance review",
];

export const OWNERS = [
  { team: "Program team", body: "Track and panel descriptions, speaker data, session status, factual sign-off." },
  { team: "Marketing", body: "Editorial calendar, copy and design, distribution, amplification, comments." },
  {
    team: "Website team",
    body: "Live pages, stable canonical links, mobile previews and metadata, accessibility, timing.",
  },
  { team: "Registration team", body: "Ticket categories, prices, deadlines, coupon terms, conversion tracking." },
  {
    team: "Partnerships",
    body: "Speakers, sponsors, meetups, universities, ecosystem channels, personal invitations.",
  },
];

export const CADENCE = [
  {
    week: "Week of 19 Oct",
    title: "Set up",
    body: "One calendar, asset library and review workflow. One personal perspective post and one AI Summit story post. Audit old-date assets. Name owners.",
  },
  {
    week: "Week of 26 Oct",
    title: "Explain",
    body: "Three-day Program explainer and an engineering or product post. Send community and partner kits. Make ticket explanations easy to reach.",
  },
  {
    week: "Week of 2 Nov",
    title: "Widen",
    body: "Student and educator angle; “AI is for more than AI specialists”. Approved speaker promotion and a first panel teaser if available.",
  },
  {
    week: "Week of 9 Nov",
    title: "Convert",
    body: "Early Bird push before the published 15 November deadline, subject to live availability. One clear CTA. Turn content into FAQ answers.",
  },
];

export const METRICS = [
  "Impressions and engaged viewers per post",
  "Substantive comments and new relevant connections",
  "Clicks to individual pages",
  "Ticket button clicks",
  "Completed registrations by source and UTM",
  "Speaker and partner amplification",
  "Common unanswered attendee questions",
];
