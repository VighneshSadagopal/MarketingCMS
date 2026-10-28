# DrupalAsia Marketing CMS

A small CMS where the marketing team and the owner plan, review and schedule social posts for LinkedIn, X and Instagram.

Built with Next.js 16 (App Router), shadcn/ui components, Tailwind CSS v4 and Supabase (Postgres, Auth, Storage).

## Features

- **My work (homepage, `/`)**: each person's dashboard of their assigned posts: Assigned, Open, Completed and Overdue counts, an "Up next" list (overdue first, then soonest target) with deadline labels, posts waiting for their review, a progress bar with posts per stage, and their completed posts. The owner can switch to any team member's view.
- **Kanban board** (`/board`) with six columns: Todo, Changes suggested, In progress, Ready for review, Ready for schedule, Done / Posted. Drag cards between columns. Only the owner can move cards into Ready for schedule or Done / Posted (enforced in the UI, the server action and a database trigger).
- **Deadlines**: a post should be in Ready for review at least 48 hours before its target time, and in Ready for schedule at least 12 hours before. Board cards and the content page show "Review due in …" / "Scheduling due in …" as a deadline approaches (from 72 and 24 hours out), and a red "… overdue by …" label once it's missed, or "Past target date" if the post isn't posted by its target time. Rules live in `src/lib/deadlines.ts`.
- **Content detail** with LinkedIn, X and Instagram post previews using the uploaded images, shown whole at their full height (Instagram shows them as a carousel).
- **Content form**: copy per platform, hashtags, link, up to 4 images shared by all platforms, assignee, reviewer, target publish date and time. X copy is limited to 280 characters; links (http://, https://, www.) don't count (checked in the form and by a database constraint).
- **Review and comments**: each post has a Review and activity feed with comments, change requests and its status history. "Suggest changes" asks for a note, saves it as a change request and moves the card to Changes suggested (dropping a card on that column opens the note box). Change requests can be marked resolved, and board cards show open change requests and comment counts.
- **Social media calendar**: month view of planned posts (by target publish date) and post ideas. Click a date to add an idea: every idea also creates a card in the Todo column, due that day. Drag an idea to another day (or pick a new date in the side panel) to move it; its card's target date moves too, keeping the time. Changing a card's target date moves its idea. Removing an idea keeps its card on the board.
- **Campaigns**: group posts under a campaign with a goal, date range, colour and default hashtags and link. The Campaigns page shows progress for each one; a campaign's page shows its posts as a timeline, flags gaps of a week or more with nothing planned, and counts posts by status. Posts pick a campaign in the content form (its defaults fill in and the date is kept within the campaign), the board can filter by campaign, and the calendar marks a campaign's colour only on days when one of its posts or ideas is due.
- **Content guidelines** (`/guidelines`, in the main nav): the DrupalAsia Connect social content guidelines, with an interactive pre-publish checklist, a UTM link builder and a "Download as Word" button (a version written to be given to an AI assistant as context). Copy lives in `src/lib/guidelines.ts`; after changing it, run `npm run guidelines:docx` to regenerate `public/downloads/drupalasia-connect-2027-social-content-guidelines.docx`.
- **Google sign-in with a team allowlist**: people sign in with "Continue with Google". Only emails the owner adds under **Team access** (account menu → Team access) can sign in; a Supabase "Before user created" hook refuses everyone else, and removing someone deletes their login (their posts stay). Names and avatars come from Google. The owner is set in `supabase/schema.sql` (`vighneshp65@gmail.com`).

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` from `.env.example` with your Supabase project URL and publishable (anon) key:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
   ```

3. Run `supabase/schema.sql` once in the Supabase SQL editor (already done for the `marketing-cms` project). It creates the tables, row level security policies, triggers and the `content-images` and `avatars` storage buckets.

4. Start the dev server:

   ```bash
   npm run dev
   ```

   Open http://localhost:3000 and choose **Create an account**. The first account becomes the owner.

## Supabase settings for Google sign-in

1. **Google Cloud Console** → APIs & Services → Credentials → Create OAuth client ID (Web application).
   Authorised redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`.
2. **Supabase → Authentication → Sign In / Providers → Google**: turn it on and paste the client ID and secret.
3. **Supabase → Authentication → Hooks → Before User Created**: choose Postgres and `public.hook_before_user_created`.
4. **Supabase → Authentication → URL Configuration**: Site URL, plus redirect URLs for `http://localhost:3000/auth/callback` and your deployed `/auth/callback`.
5. Optional: turn off the **Email** provider so nobody can create a password account.

## Project structure

```
src/
  app/
    (app)/            signed-in pages: my work (/), board, calendar, campaigns, content, guidelines, team, profile
    auth/callback/    magic link and email confirmation handler
    login/            sign in / create account
  components/
    board/            Kanban board and cards (dnd-kit)
    calendar/         month view and ideas panel
    campaigns/        campaign form, tag and actions
    content/          form, social previews, status actions
    ui/               shadcn/ui components
  lib/
    supabase/         browser, server and proxy clients
    data.ts           server-side data access
    types.ts          statuses, platforms and row types
  proxy.ts            refreshes the session and guards routes
supabase/schema.sql   database schema, policies and storage
```

Add more shadcn/ui components with `npx shadcn@latest add <component>`.
