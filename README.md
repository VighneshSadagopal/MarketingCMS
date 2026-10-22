# DrupalAsia Marketing CMS

A small CMS where the marketing team and the owner plan, review and schedule social posts for LinkedIn, X and Instagram.

Built with Next.js 16 (App Router), shadcn/ui components, Tailwind CSS v4 and Supabase (Postgres, Auth, Storage).

## Features

- **Kanban board** with six columns: Todo, Changes suggested, In progress, Ready for review, Ready for schedule, Done / Posted. Drag cards between columns. Only the owner can move cards into Ready for schedule or Done / Posted (enforced in the UI, the server action and a database trigger).
- **Content detail** with LinkedIn, X and Instagram post previews using the uploaded images (Instagram shows them as a carousel).
- **Content form**: copy per platform, hashtags, link, up to 4 images shared by all platforms, assignee, reviewer, target publish date and time. X copy is limited to 200 words (checked in the form and by a database constraint).
- **Social media calendar**: month view of planned posts (by target publish date) and post ideas. Click a date to add an idea: every idea also creates a card in the Todo column, due that day. Deleting the idea removes its card.
- **Campaigns**: group posts under a campaign with a goal, date range, colour and default hashtags and link. The Campaigns page shows progress for each one; a campaign's page shows its posts as a timeline, flags gaps of a week or more with nothing planned, and counts posts by status. Posts pick a campaign in the content form (its defaults fill in and the date is kept within the campaign), the board can filter by campaign, and the calendar marks each campaign's dates and colours its posts and ideas.
- **Auth and avatars**: email + password or magic link. Avatars appear on board cards and in the header. The first account created becomes the owner; everyone after is a member.

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

## Supabase settings to review

- **Authentication → URL configuration**: set Site URL and add redirect URLs for wherever you deploy (for example `https://your-domain/auth/callback`). Local development uses `http://localhost:3000`.
- **Authentication → Sign in / Providers**: email confirmation is on by default, so new accounts must confirm their email before signing in. Once your team has joined, you can turn off "Allow new users to sign up" and invite people from the dashboard instead.

## Project structure

```
src/
  app/
    (app)/            signed-in pages: board, calendar, campaigns, content, profile
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
