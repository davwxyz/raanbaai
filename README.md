# Raanbaai — Supabase Social Platform

A runnable React + Vite starter for a social platform with public profiles, follows, friend requests, posts and photo uploads, likes, comments, pokes, disappearing stories, notifications, real-time direct messages, user search, blocking/reporting, and an admin moderation screen.

## Requirements

- Node.js 18+ (Node.js 20+ recommended)
- A Supabase project
- npm

## 1. Configure Supabase

1. Create a project at https://supabase.com/dashboard.
2. Open **SQL Editor**, create a new query, paste all of `supabase/schema.sql`, and run it.
3. Open **Project Settings → API** (or **Data API**) and copy your project URL and publishable/anon key.
4. In **Authentication → URL Configuration**, set your local site URL to `http://localhost:5173`. Add your deployed site URL later.
5. For a quick local test, you can disable email confirmations under **Authentication → Providers → Email**. For a real deployment, keep confirmations enabled and configure email delivery.
6. Create the public Storage bucket and its policies by running the supplied SQL. The schema creates `raanbaai-media`; if your Supabase project does not permit bucket creation through SQL, create a public bucket named `raanbaai-media` in **Storage**, then rerun the storage policy section from the SQL file.

## 2. Run the frontend

```bash
npm install
cp .env.example .env
```

Edit `.env` and set the values:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

Then run:

```bash
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`.

## 3. Create an account and profile

Register from the app. When email confirmation is enabled, confirm the email before signing in. The database trigger creates a profile row automatically.

## 4. Make an admin account

Admin status is intentionally not self-service. After registering, copy your user's UUID from **Authentication → Users**. In the SQL Editor run:

```sql
insert into public.admin_users (user_id)
values ('YOUR-AUTH-USER-UUID')
on conflict (user_id) do nothing;
```

Only insert trusted user IDs. Admin privileges are checked by RLS using the private `admin_users` table. The app's Admin tab is visible only to users who are listed there.

## Features

- Email/password authentication
- Public profiles and user search
- Feed, text posts and image uploads
- Follow/unfollow and friend requests
- Likes, comments and pokes
- Stories that expire after 24 hours (expired stories are filtered and can be cleaned up)
- Notifications for follows, friend requests, likes, comments and pokes
- Real-time one-to-one messaging
- Block/unblock and report users/posts
- Admin moderation view for reports and post/user moderation
- Supabase RLS policies and storage policies

## Security notes

- The frontend uses only the publishable/anon key. **Never put a service-role key in a browser app.**
- RLS is enabled on all application tables. Messages are readable only by conversation members; users cannot edit another person's posts or notifications.
- Profiles are public by design. Avoid putting private details in profile fields.
- The `raanbaai-media` bucket is public so post/story/avatar image URLs can be rendered without signing URLs. Upload and delete permissions are still restricted by Storage RLS to the uploader. Do not upload sensitive files.
- This starter uses public profile and post visibility. Blocking hides content and interactions in the app and denies certain database operations, but no public website can prevent someone from viewing content they have already copied or cached.
- Rate limits, abuse review, email verification, and CAPTCHA should be configured before a public launch. Add a trusted server/Edge Function for stronger rate limiting and complex moderation workflows.
- Stories expire in queries after 24 hours. For storage/database cleanup, configure a scheduled Supabase Cron job or periodically run:
  `delete from public.stories where expires_at <= now();`
- Admin access is managed by trusted SQL only. Never expose admin insertion policies to regular users.

## Deployment

Build with `npm run build`; deploy the `dist/` folder to Vercel, Netlify, Cloudflare Pages, or another static host. Add the production URL to Supabase Auth URL Configuration and set the same environment variables in the host's project settings.

## Project structure

```text
raanbaai/
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── supabase.js
│   └── styles.css
├── supabase/
│   └── schema.sql
├── .env.example
├── index.html
├── package.json
└── README.md
```
