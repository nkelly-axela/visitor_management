# Visitor Management System

Kiosk sign-in/out for office staff, non-office guests, and visitors, plus an
admin panel for managing staff, auditing visits, and exporting data.

- **Office staff** (`/kiosk/staff`): pick your name from an autofill list, no
  password. Sign in / sign out.
- **Visitors & guests** (`/kiosk/guest`): sign in with name + purpose (guest)
  or name + company + host (visitor). Sign out by searching your name.
- **Admin** (`/admin`): secure email+password login (Supabase Auth). Manage
  the office staff directory, view/audit all sign-in data, export CSV.

Notifications (via [Resend](https://resend.com)):
- Weekdays at 17:15 **GMT** (fixed UTC+0, not adjusted for British Summer
  Time — see note below): alert if any staff signed in but haven't signed out.
- Fridays at 17:30 GMT: weekly staff attendance summary to HR.
  (Company-calendar cross-checking against holiday/WFH is **not** wired up
  yet — the email says so explicitly. That's a follow-up once you confirm
  which calendar system to integrate.)

> **Why fixed GMT and not "5:15pm UK time"?** Vercel's free Hobby plan only
> allows cron jobs to run once per day, which rules out the two-fires-a-day
> trick needed to track the GMT/BST clock change automatically. A fixed
> 17:15 UTC satisfies "5:15 GMT" literally and works year-round on Hobby. If
> you want it to track UK local time through BST instead (so it's always
> 5:15pm on the wall clock), either upgrade to Vercel Pro and reintroduce a
> twice-daily schedule, or trigger these same routes from an external
> scheduler (e.g. a free GitHub Actions cron) instead of `vercel.json`.

Stack: Next.js 14 (App Router) + TypeScript + Tailwind, Supabase (Postgres +
Auth), Resend, deployed on Vercel (Vercel Cron for the scheduled emails).

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) → New project.
2. Once it's up, go to **Project Settings → API** and note:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret — server-only)
3. Go to **SQL Editor → New query**, paste the contents of
   [`supabase/schema.sql`](supabase/schema.sql), and run it. This creates all
   the tables (`office_staff`, `admins`, `visit_logs`, `notification_runs`).

## 2. Create your first admin user

1. In Supabase, go to **Authentication → Users → Add user**, create yourself
   with an email + password (this is what you'll log into `/admin` with).
2. Copy the new user's UID.
3. Back in the **SQL Editor**, run:
   ```sql
   insert into admins (id, name, email)
   values ('paste-the-uid-here', 'Your Name', 'you@company.com');
   ```
   Only rows in `admins` can access the admin panel — creating a Supabase
   Auth user alone is not enough.

## 3. Set up Resend (email notifications)

1. Create a [Resend](https://resend.com) account and an API key.
2. Verify a sending domain (or use their `onboarding@resend.dev` sandbox
   address while testing — it only delivers to your own verified account
   email).

## 4. Environment variables

Copy `.env.example` to `.env.local` for local development, and add the same
variables in **Vercel → Project Settings → Environment Variables** for
production:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (safe for browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only, full DB access) |
| `RESEND_API_KEY` | Resend API key |
| `RESEND_FROM_ADDRESS` | Verified sender, e.g. `Reception <reception@yourcompany.com>` |
| `ALERT_RECIPIENTS` | Comma-separated emails for the 5:15pm not-signed-out alert |
| `HR_REPORT_RECIPIENTS` | Comma-separated emails for the Friday HR summary |
| `CRON_SECRET` | Random string; also set as a Vercel env var so Vercel Cron can authenticate to `/api/cron/*` |
| `NEXT_PUBLIC_APP_URL` | Deployed app URL |

## 5. Deploy on Vercel

1. Push this repo to GitHub (see below).
2. In [vercel.com](https://vercel.com), **Add New Project** → import the
   GitHub repo → add the environment variables above → Deploy.
3. Vercel automatically picks up the cron jobs defined in `vercel.json`:
   - `/api/cron/staff-not-signed-out` — weekdays at 17:15 UTC (once/day, to
     stay within the Hobby plan's cron limits — see the note above).
   - `/api/cron/weekly-hr-report` — Fridays at 17:30 UTC.
   - Vercel sends `Authorization: Bearer <CRON_SECRET>` automatically to
     these routes when `CRON_SECRET` is set as an env var — no extra config
     needed.

### Pushing to GitHub

```bash
git remote add origin https://github.com/<you>/visitor-management-system.git
git add -A
git commit -m "Initial visitor management system"
git push -u origin main
```

## Local development

This machine didn't have Node.js installed when this project was scaffolded,
so it hasn't been run locally yet. To develop locally:

```bash
npm install
cp .env.example .env.local   # fill in the values from steps 1-3 above
npm run dev
```

Then open http://localhost:3000. Cron routes can be tested manually with:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/staff-not-signed-out
```

(Note: the cron routes run immediately whenever hit — timing is entirely
down to when something calls them, e.g. Vercel Cron. Each route only skips
if `notification_runs` already has a row for today/this week; delete that
row to re-trigger a same-day send while testing.)

## Roles recap

| Role | Access |
|---|---|
| **Admin** | Full admin panel: manage staff directory, see all sign-in/out data for anyone, filter/export. Requires Supabase Auth login + a row in `admins`. |
| **Office staff** | `/kiosk/staff` — pick name from autofill, sign in/out. No password. |
| **Visitor / Guest** | `/kiosk/guest` — sign in with name + purpose, or name + company + host; sign out by searching their name. No password. |

## Known follow-ups

- **Company calendar integration** is intentionally deferred — the weekly HR
  email says so. Once you confirm the calendar system/API, `sendWeeklyHrReport`
  in `src/lib/resend.ts` and the cron route in
  `src/app/api/cron/weekly-hr-report/route.ts` are the places to add the
  holiday/WFH cross-check.
- No automated tests yet.
