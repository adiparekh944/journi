# Journi

Journi is a social ranking app for tourism. It helps people remember where they have been, decide how they actually feel about those places, and share that taste with friends.

v1 is New York City only: a curated set of attractions, neighborhoods, restaurants, and bars you can search, map, log, and rank.

## What it does

**Log visits, don’t rate with stars.** After you visit a place you pick a sentiment bucket (loved / fine / no), then compare it against places you already ranked. Your score is derived from that ordered list — there is no slider or star input. The 0.0–10.0 number is personal preference only. Price, crowd, and “worth it” are recorded for context and never enter the score.

**Keep a personal list.** Your ranked visits live on My List. Places you have not been yet go on Want to Go. Place pages show your score, community average (once enough people have rated), and photos from visits.

**See the city on a map.** Visits and saved places plot on a map so you can see where you have been and what is nearby.

**Follow friends.** The feed shows visits from people you follow. You can like and comment, tag companions when you log, and open public profiles.

**Get suggestions that explain themselves.** Home search and recommendations surface places you have not logged yet, with a reason you can read — not a black-box score.

**Collect, don’t grind.** There is no XP or levels. Progress is visits, streaks, badges, and how your list compares with friends.

## App surfaces

| Tab / route | Purpose |
| --- | --- |
| Feed | Activity from people you follow |
| Search | Browse and filter NYC places and members |
| Map | Plot visits and saved places |
| Log | Search a place, add photos/notes, rank by comparison |
| Profile | Your stats, badges, and public page (`/u/:userId`) |
| My List | Your ordered rankings |
| Want to Go | Saved places you have not visited |

## Stack

- **Frontend host:** Base44 (React, Vite, Tailwind, shadcn/ui)
- **Data & auth (target):** Supabase — Postgres, Auth, Storage, Edge Functions
- This repo is the application source. Changes pushed here show up in the Base44 Builder.
