# JOURNI — Implementation Specification v1.0

A Beli-style social ranking app for tourism. Curated NYC dataset, Base44 frontend, Supabase backend.

**This document is the single source of truth.** Every technology, schema field, algorithm constant, and screen is decided. If something is not in this document, it is out of scope for v1. Do not substitute libraries. Do not invent fields. Do not skip acceptance criteria.

---

## PART 0 — LOCKED DECISION LOG

Read this section first. Do not deviate.

### 0.1 Stack

| Layer             | Decision                                       | Version | Why locked                                           |
| ----------------- | ---------------------------------------------- | ------- | ---------------------------------------------------- |
| Frontend host     | Base44                                         | current | User requirement                                     |
| UI framework      | React                                          | 18.3.x  | Base44 native                                        |
| Language          | TypeScript                                     | 5.5.x   | strict mode on                                       |
| Styling           | Tailwind CSS                                   | 3.4.x   | Base44 native                                        |
| Components        | shadcn/ui                                      | latest  | Base44 native                                        |
| Icons             | lucide-react                                   | 0.383.0 | Base44 native                                        |
| Routing           | react-router-dom                               | 6.24.x  |                                                      |
| Server state      | @tanstack/react-query                          | 5.51.x  | caching, optimistic updates, infinite feed           |
| Client state      | zustand                                        | 4.5.x   | onboarding wizard + comparison ladder only           |
| Forms             | react-hook-form                                | 7.52.x  |                                                      |
| Validation        | zod                                            | 3.23.x  | shared between client and edge functions             |
| Backend           | Supabase                                       | hosted  | Postgres 15, Auth, Storage, Edge Functions, Realtime |
| DB extensions     | postgis, pg_trgm, uuid-ossp                    |         | geo queries, fuzzy search                            |
| Auth              | Supabase Auth, Google OAuth + email magic link |         |                                                      |
| Storage           | Supabase Storage                               |         | bucket `visit-photos`, bucket `avatars`              |
| Edge runtime      | Supabase Edge Functions (Deno)                 |         | recommendations, badge evaluation, LLM calls         |
| Map renderer      | Mapbox GL JS                                   | 3.5.x   |                                                      |
| Map React wrapper | react-map-gl                                   | 7.1.x   |                                                      |
| Clustering        | supercluster                                   | 8.0.x   | client-side, dataset is small                        |
| Map style         | `mapbox://styles/mapbox/standard`              |         | with custom pin layer                                |
| Image compression | browser-image-compression                      | 2.0.2   | client-side before upload                            |
| Image serving     | Supabase Storage image transform CDN           |         | `?width=&quality=`                                   |
| Date handling     | date-fns                                       | 3.6.x   |                                                      |
| LLM               | `claude-sonnet-4-6` via Anthropic Messages API |         | called ONLY from edge functions, never client        |
| Charts            | recharts                                       | 2.12.x  | profile stats only                                   |
| Animation         | framer-motion                                  | 11.3.x  | comparison card transitions, badge unlock            |
| Confetti          | canvas-confetti                                | 1.9.3   | badge unlock only                                    |

### 0.2 Hard product rules

1. **There is no XP, no points, no levels.** Gamification is collection, badges, streaks, and friend leaderboards only. If you find yourself writing a `points` column, stop.
2. **The 0.0 to 10.0 score is pure preference.** Value-for-money, price, and crowd level are captured and displayed but they NEVER enter the score calculation. This mirrors Beli and keeps the ranking honest.
3. **Scores are personal, not global.** A place has a per-user score. The "community score" shown on a place page is the mean of all user scores, displayed to 1 decimal, and requires at least 3 ratings to display at all.
4. **Recommendations are soft.** Every recommendation card must render a human-readable reason string. A recommendation with no reason is a bug.
5. **Every score is derived from position in an ordered list, never typed in directly.** There is no slider. There is no star input. Users pick a bucket then compare.
6. **NYC only in v1.** Bounding box enforced: lat 40.4774 to 40.9176, lng -74.2591 to -73.7002. Anything outside is rejected at the DB constraint level.

### 0.3 Naming

- App name: **Journi**
- Repo: `journi`
- Supabase project: `journi-prod`
- Primary brand color: `#0F766E` (teal-700)
- Score band colors: 8.0+ `#0F766E`, 6.0 to 7.9 `#65A30D`, 4.0 to 5.9 `#CA8A04`, below 4.0 `#DC2626`, want-to-go `#7C3AED`

---

## PART 1 — ENVIRONMENT SETUP

### 1.1 Supabase project

Create project. Region `us-east-1`. Enable extensions in SQL editor:

```sql
create extension if not exists "uuid-ossp";
create extension if not exists postgis;
create extension if not exists pg_trgm;
```

### 1.2 Environment variables

Client-side (safe to expose, Base44 env config):

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_MAPBOX_TOKEN=
```

Edge function secrets (Supabase dashboard, never in client):

```
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
```

### 1.3 Directory structure

```
src/
  lib/
    supabase.ts          # client singleton
    types.ts             # generated DB types + app types
    constants.ts         # score bands, taste dims, NYC bbox
  features/
    auth/
    onboarding/
    places/
    rating/              # the comparison engine lives here
    map/
    feed/
    profile/
    friends/
    recommendations/
    badges/
  components/ui/         # shadcn
  hooks/
  pages/
supabase/
  migrations/
  functions/
    recommend/
    evaluate-badges/
    taste-vector-refresh/
  seed/
    places.csv
    seed.sql
```

---

## PART 2 — TAXONOMY (define before schema)

### 2.1 The 10 taste dimensions

These are the ONLY dimensions. Every place carries a 10-float vector, every user carries a 10-float vector, similarity is cosine.

| Index | Key                  | Meaning                                              |
| ----- | -------------------- | ---------------------------------------------------- |
| 0     | `culture_history`    | historical sites, monuments, heritage                |
| 1     | `art_museums`        | galleries, museums, exhibitions                      |
| 2     | `nature_outdoors`    | parks, waterfront, gardens, green space              |
| 3     | `food_drink`         | markets, food halls, iconic eateries as destinations |
| 4     | `nightlife_music`    | venues, bars as destinations, live music             |
| 5     | `shopping_markets`   | retail districts, flea markets, boutiques            |
| 6     | `architecture_views` | skyline, observation decks, notable buildings        |
| 7     | `active_adventure`   | walking, cycling, climbing, physical activity        |
| 8     | `offbeat_local`      | non-touristy, neighborhood-level, hidden             |
| 9     | `family_friendly`    | works with kids, low-stress, accessible              |

### 2.2 Two modifier traits (NOT part of the similarity vector)

Stored separately on the user, used as re-ranking penalties.

| Key                 | Range      | Meaning                             |
| ------------------- | ---------- | ----------------------------------- |
| `crowd_tolerance`   | 0.0 to 1.0 | 1.0 means crowds do not bother them |
| `price_sensitivity` | 0.0 to 1.0 | 1.0 means highly price sensitive    |

Places carry matching attributes `crowd_level` (1 to 5 int) and `price_tier` (0 to 4 int, 0 = free).

### 2.3 Place categories (single-select, for filtering and badges)

`museum`, `park`, `landmark`, `viewpoint`, `neighborhood`, `market`, `venue`, `waterfront`, `garden`, `historic_site`, `bridge`, `gallery`, `theater`, `sports_venue`, `tour_experience`

---

## PART 3 — DATABASE SCHEMA

Full migration. Run as `supabase/migrations/0001_init.sql`.

### 3.1 Profiles

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null check (char_length(display_name) between 1 and 40),
  avatar_url text,
  bio text check (char_length(bio) <= 160),
  home_city text,
  is_private boolean not null default false,
  onboarding_complete boolean not null default false,
  taste_vector real[10] not null default '{0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5}',
  crowd_tolerance real not null default 0.5 check (crowd_tolerance between 0 and 1),
  price_sensitivity real not null default 0.5 check (price_sensitivity between 0 and 1),
  travel_frequency text check (travel_frequency in ('rarely','once_year','few_times_year','monthly','constantly')),
  countries_visited_count int not null default 0,
  typical_companion text check (typical_companion in ('solo','partner','friends','family','mixed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_username_trgm on profiles using gin (username gin_trgm_ops);
create index profiles_display_name_trgm on profiles using gin (display_name gin_trgm_ops);
```

### 3.2 Places

```sql
create table places (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name text not null,
  category text not null check (category in (
    'museum','park','landmark','viewpoint','neighborhood','market','venue',
    'waterfront','garden','historic_site','bridge','gallery','theater',
    'sports_venue','tour_experience')),
  borough text not null check (borough in ('manhattan','brooklyn','queens','bronx','staten_island')),
  neighborhood text not null,
  address text,
  lat double precision not null check (lat between 40.4774 and 40.9176),
  lng double precision not null check (lng between -74.2591 and -73.7002),
  geog geography(point,4326) generated always as (st_setsrid(st_makepoint(lng,lat),4326)::geography) stored,
  short_description text not null check (char_length(short_description) <= 200),
  hero_image_url text not null,
  taste_vector real[10] not null,
  crowd_level int not null check (crowd_level between 1 and 5),
  price_tier int not null check (price_tier between 0 and 4),
  typical_price_usd numeric(6,2),
  typical_duration_minutes int,
  best_time text check (best_time in ('early_morning','morning','afternoon','sunset','evening','night','anytime')),
  indoor_outdoor text not null check (indoor_outdoor in ('indoor','outdoor','both')),
  is_free boolean generated always as (price_tier = 0) stored,
  popularity_seed int not null default 50 check (popularity_seed between 0 and 100),
  created_at timestamptz not null default now()
);

create index places_geog_idx on places using gist (geog);
create index places_name_trgm on places using gin (name gin_trgm_ops);
create index places_category_idx on places (category);
create index places_borough_idx on places (borough);
```

### 3.3 Visits (the core rating record)

```sql
create table visits (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  place_id uuid not null references places(id) on delete cascade,
  bucket text not null check (bucket in ('liked','fine','disliked')),
  rank_position int not null,           -- 0-indexed position within (user_id, bucket)
  score numeric(3,1) not null check (score between 0.0 and 10.0),
  note text check (char_length(note) <= 500),
  visited_on date not null default current_date,
  was_paid boolean not null default false,
  amount_paid_usd numeric(7,2),
  value_rating int check (value_rating between 1 and 5),   -- required iff was_paid
  crowd_experienced int check (crowd_experienced between 1 and 5),
  time_spent_minutes int check (time_spent_minutes between 5 and 720),
  companion text check (companion in ('solo','partner','friends','family','group_tour')),
  would_return boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, place_id),
  constraint value_required_when_paid check (
    (was_paid = false) or (was_paid = true and value_rating is not null and amount_paid_usd is not null)
  )
);

create unique index visits_user_bucket_rank on visits (user_id, bucket, rank_position);
create index visits_user_created on visits (user_id, created_at desc);
create index visits_place on visits (place_id);
```

### 3.4 Photos

```sql
create table visit_photos (
  id uuid primary key default uuid_generate_v4(),
  visit_id uuid not null references visits(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  place_id uuid not null references places(id) on delete cascade,
  storage_path text not null,
  width int not null,
  height int not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index visit_photos_visit on visit_photos (visit_id, sort_order);
create index visit_photos_place on visit_photos (place_id, created_at desc);
```

Max 6 photos per visit, enforced in application layer and by this trigger:

```sql
create or replace function check_photo_limit() returns trigger as $$
begin
  if (select count(*) from visit_photos where visit_id = new.visit_id) >= 6 then
    raise exception 'Maximum 6 photos per visit';
  end if;
  return new;
end; $$ language plpgsql;

create trigger visit_photo_limit before insert on visit_photos
for each row execute function check_photo_limit();
```

### 3.5 Want to go

```sql
create table want_to_go (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  place_id uuid not null references places(id) on delete cascade,
  source text not null default 'manual' check (source in ('manual','recommendation','friend_post','search')),
  source_user_id uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, place_id)
);

create index want_to_go_user on want_to_go (user_id, created_at desc);
```

Rule: when a visit is created for a place, any `want_to_go` row for that (user, place) is deleted automatically.

```sql
create or replace function clear_want_to_go() returns trigger as $$
begin
  delete from want_to_go where user_id = new.user_id and place_id = new.place_id;
  return new;
end; $$ language plpgsql;

create trigger visit_clears_want_to_go after insert on visits
for each row execute function clear_want_to_go();
```

### 3.6 Social graph

```sql
create table follows (
  follower_id uuid not null references profiles(id) on delete cascade,
  followee_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'accepted' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create index follows_followee on follows (followee_id, status);
```

Follow is one-directional like Beli. If target profile `is_private = true`, status starts `pending` and requires acceptance. Otherwise `accepted` immediately.

### 3.7 Feed, comments, reactions

```sql
create table posts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  visit_id uuid unique references visits(id) on delete cascade,
  place_id uuid not null references places(id) on delete cascade,
  kind text not null default 'visit' check (kind in ('visit','want_to_go','badge')),
  badge_key text,
  like_count int not null default 0,
  comment_count int not null default 0,
  created_at timestamptz not null default now()
);

create index posts_user_created on posts (user_id, created_at desc);
create index posts_created on posts (created_at desc, id desc);

create table post_likes (
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table comments (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 300),
  created_at timestamptz not null default now()
);

create index comments_post on comments (post_id, created_at asc);
```

Counter maintenance via triggers on `post_likes` and `comments` (increment/decrement `posts.like_count` and `posts.comment_count`). Write both triggers.

Post creation: a row is inserted into `posts` automatically after a visit insert, and after a want_to_go insert where `source <> 'recommendation'`.

### 3.8 Onboarding responses

```sql
create table onboarding_responses (
  user_id uuid primary key references profiles(id) on delete cascade,
  likert jsonb not null,        -- { "q1": 4, "q2": 2, ... }
  seed_taps jsonb not null,     -- { "<place_id>": "been" | "want" | "not_interested" }
  completed_at timestamptz not null default now()
);
```

### 3.9 Badges

```sql
create table badges (
  key text primary key,
  name text not null,
  description text not null,
  icon text not null,           -- lucide icon name
  tier text not null check (tier in ('bronze','silver','gold'))
);

create table user_badges (
  user_id uuid not null references profiles(id) on delete cascade,
  badge_key text not null references badges(key) on delete cascade,
  earned_at timestamptz not null default now(),
  seen boolean not null default false,
  primary key (user_id, badge_key)
);
```

### 3.10 Recommendation cache

```sql
create table recommendations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  place_id uuid not null references places(id) on delete cascade,
  rank int not null,
  score real not null,
  reason text not null,
  generated_at timestamptz not null default now(),
  dismissed boolean not null default false,
  unique (user_id, place_id)
);

create index recommendations_user_rank on recommendations (user_id, rank) where dismissed = false;
```

Cache is invalidated (rows deleted) whenever the user creates a visit, saves a want_to_go, or follows someone. Regenerated lazily on next fetch.

---

## PART 4 — ROW LEVEL SECURITY

Enable RLS on every table. Policies:

```sql
alter table profiles enable row level security;
alter table visits enable row level security;
alter table visit_photos enable row level security;
alter table want_to_go enable row level security;
alter table follows enable row level security;
alter table posts enable row level security;
alter table post_likes enable row level security;
alter table comments enable row level security;
alter table onboarding_responses enable row level security;
alter table user_badges enable row level security;
alter table recommendations enable row level security;
alter table places enable row level security;
```

Helper function for visibility:

```sql
create or replace function can_view_user(target uuid) returns boolean as $$
  select
    target = auth.uid()
    or exists (select 1 from profiles p where p.id = target and p.is_private = false)
    or exists (select 1 from follows f
               where f.follower_id = auth.uid() and f.followee_id = target
                 and f.status = 'accepted');
$$ language sql stable security definer;
```

Policy set (write all of these):

- `places`: select allowed to all authenticated. No insert/update/delete for normal users.
- `profiles`: select if `can_view_user(id)` OR always allow selecting `id, username, display_name, avatar_url, is_private` (create a public view `profiles_public` for search). Update only where `id = auth.uid()`.
- `visits`: select if `can_view_user(user_id)`. Insert/update/delete only where `user_id = auth.uid()`.
- `visit_photos`: same rule as visits, joined through `user_id`.
- `want_to_go`: select if `can_view_user(user_id)`. Mutate only own.
- `follows`: select if `follower_id = auth.uid() or followee_id = auth.uid()`. Insert only where `follower_id = auth.uid()`. Update (accept) only where `followee_id = auth.uid()`. Delete where either is auth.uid().
- `posts`: select if `can_view_user(user_id)`. Insert/delete only own.
- `post_likes`, `comments`: select if the parent post is visible. Insert only own. Delete own (comment authors and post owners both may delete comments).
- `onboarding_responses`, `recommendations`, `user_badges`: select and mutate own only.

### 4.1 Storage policies

Bucket `visit-photos`, public read, authenticated write. Path convention: `{user_id}/{visit_id}/{uuid}.webp`. Write policy requires `(storage.foldername(name))[1] = auth.uid()::text`.

Bucket `avatars`, public read. Path `{user_id}/avatar.webp`. Same folder-ownership write policy.

---

## PART 5 — THE RATING ENGINE (most important section)

This is the heart of the product. Implement exactly as written.

### 5.1 Score bands

```ts
export const BANDS = {
  liked: { min: 6.7, max: 10.0 },
  fine: { min: 3.4, max: 6.6 },
  disliked: { min: 0.0, max: 3.3 },
} as const;
```

### 5.2 Flow

1. User taps "I've been here" on a place.
2. **Screen A: details.** Photos, note, visited date, was_paid toggle. If paid: amount and value_rating (1 to 5 "not worth it" to "absolutely worth it"). Optional: crowd_experienced, time_spent, companion, would_return.
3. **Screen B: bucket.** Three large cards: "Loved it", "It was fine", "Not for me". Maps to `liked`, `fine`, `disliked`.
4. **Screen C: comparison ladder.** Runs only if the user already has at least 1 place in that bucket. Otherwise skip straight to insertion at position 0.
5. **Screen D: reveal.** Animated count-up to the final score, plus the resulting position ("#3 of 14 in Loved it").

### 5.3 The comparison ladder

Binary insertion. The user's existing places in the chosen bucket are already an ordered array sorted by `rank_position` ascending, where position 0 is the BEST.

```ts
export const MAX_COMPARISONS = 5;

type LadderState = {
  lo: number; // inclusive lower bound of insertion window
  hi: number; // inclusive upper bound
  comparisons: number;
  done: boolean;
  finalPosition: number | null;
};

export function initLadder(bucketSize: number): LadderState {
  return {
    lo: 0,
    hi: bucketSize,
    comparisons: 0,
    done: bucketSize === 0,
    finalPosition: bucketSize === 0 ? 0 : null,
  };
}

export function nextPivot(s: LadderState): number {
  return Math.floor((s.lo + s.hi) / 2);
}

// preferNew = true means "I liked the NEW place more than the pivot place"
export function applyAnswer(s: LadderState, preferNew: boolean): LadderState {
  const pivot = nextPivot(s);
  const next = { ...s, comparisons: s.comparisons + 1 };

  if (preferNew)
    next.hi = pivot; // new place ranks above pivot
  else next.lo = pivot + 1; // new place ranks below pivot

  if (next.lo >= next.hi || next.comparisons >= MAX_COMPARISONS) {
    next.done = true;
    next.finalPosition = next.lo;
  }
  return next;
}
```

**"Too close to call" option.** A third button. Treat it as `preferNew = false` but immediately terminate the ladder, inserting at `pivot + 1`. Do not count it against MAX_COMPARISONS differently, just end.

**Comparison card UI:** two cards side by side (stacked on mobile), each showing hero image, place name, category, and for the already-rated one, the user's own photo if they have one. Never show the existing place's numeric score during comparison. Showing it anchors the user and corrupts the ranking.

### 5.4 Insertion and rescore

After `finalPosition` is determined:

```sql
-- inside a transaction
update visits
   set rank_position = rank_position + 1
 where user_id = $1 and bucket = $2 and rank_position >= $3;

insert into visits (user_id, place_id, bucket, rank_position, score, ...)
values ($1, $4, $2, $3, 0.0, ...);

-- then rescore the whole bucket
```

Rescore function, exact formula. For a bucket with `n` places, the place at position `i` (0 = best) gets:

```
if n == 1:  score = max
else:       score = max - (i / (n - 1)) * (max - min)
```

Rounded to 1 decimal.

```sql
create or replace function rescore_bucket(p_user uuid, p_bucket text)
returns void as $$
declare
  v_min numeric; v_max numeric; v_n int;
begin
  select case p_bucket when 'liked' then 6.7 when 'fine' then 3.4 else 0.0 end,
         case p_bucket when 'liked' then 10.0 when 'fine' then 6.6 else 3.3 end
    into v_min, v_max;

  select count(*) into v_n from visits where user_id = p_user and bucket = p_bucket;
  if v_n = 0 then return; end if;

  if v_n = 1 then
    update visits set score = v_max where user_id = p_user and bucket = p_bucket;
  else
    update visits v
       set score = round((v_max - (v.rank_position::numeric / (v_n - 1)) * (v_max - v_min))::numeric, 1)
     where v.user_id = p_user and v.bucket = p_bucket;
  end if;
end; $$ language plpgsql security definer;
```

Wrap the whole insert + shift + rescore in a single RPC:

```sql
create or replace function log_visit(
  p_place_id uuid, p_bucket text, p_position int, p_payload jsonb
) returns visits as $$ ... $$ language plpgsql security definer;
```

Client calls `supabase.rpc('log_visit', {...})`. Never do the shift from the client.

### 5.5 Deleting and re-ranking

Deleting a visit: remove row, decrement `rank_position` for all higher positions in that bucket, rescore. Same transaction.

"Re-rank this place": delete then re-run the ladder. Reuse the same RPC.

### 5.6 Displaying scores

- Always 1 decimal: `8.4`, not `8.40` or `8`.
- Color by band using the constants from 0.3.
- On a place page show BOTH: "Your score 8.4" and "Community 7.9 (23 ratings)".
- Community score = `round(avg(score), 1)` over all visits for that place, shown only when `count >= 3`.

---

## PART 6 — ONBOARDING

Runs once, gated by `profiles.onboarding_complete`. Four steps, progress bar at top, skippable only on step 4.

### Step 1: Profile basics

Username (live uniqueness check, debounced 400ms), display name, avatar upload (optional), home city (free text).

### Step 2: Travel familiarity

- "How many countries have you visited?" → numeric stepper, 0 to 100+. Stored in `countries_visited_count`.
- "How often do you travel?" → single select mapping to `travel_frequency`.
- "Who do you usually travel with?" → single select mapping to `typical_companion`.

### Step 3: Likert block

Exactly 12 statements, 1 to 5 scale (Strongly disagree to Strongly agree), presented 4 per screen across 3 screens. Store raw responses in `onboarding_responses.likert`.

| ID  | Statement                                                        | Affects                    |
| --- | ---------------------------------------------------------------- | -------------------------- |
| q1  | I go out of my way to visit historic sites and monuments.        | dim 0                      |
| q2  | I could spend an entire afternoon in a single museum.            | dim 1                      |
| q3  | A trip feels incomplete without time in parks or nature.         | dim 2                      |
| q4  | I plan my days around where I'm going to eat.                    | dim 3                      |
| q5  | Nightlife and live music are a big part of how I explore a city. | dim 4                      |
| q6  | I enjoy browsing local shops and markets even if I buy nothing.  | dim 5                      |
| q7  | Skyline views and impressive buildings are worth a detour.       | dim 6                      |
| q8  | I'd rather walk ten miles than take a taxi.                      | dim 7                      |
| q9  | I avoid places that show up on every "top 10" list.              | dim 8                      |
| q10 | I usually travel with kids or people who need an easy pace.      | dim 9                      |
| q11 | Long lines and big crowds ruin a place for me.                   | crowd_tolerance (inverted) |
| q12 | I'm careful about how much I spend on attractions.               | price_sensitivity          |

Mapping: Likert value `v` in 1..5 → `(v - 1) / 4` giving 0.0 to 1.0.

- Dimensions 0 through 9 take that value directly.
- `crowd_tolerance = 1 - normalize(q11)`
- `price_sensitivity = normalize(q12)`

### Step 4: Seed taps

Show 15 well-known NYC places in a swipeable grid (chosen from seed data where `popularity_seed >= 70`, covering at least 6 different categories). Three buttons per card: **Been**, **Want to go**, **Not for me**. Store in `onboarding_responses.seed_taps`.

Effect on the taste vector, applied after the Likert baseline:

```ts
const W_LIKERT = 1.0;
const W_BEEN = 0.35;
const W_WANT = 0.25;
const W_NOT = -0.3;

// for each tapped place, blend its taste_vector into the user vector
for (const [placeId, action] of taps) {
  const w = action === "been" ? W_BEEN : action === "want" ? W_WANT : W_NOT;
  for (let d = 0; d < 10; d++) {
    userVec[d] += w * (place.taste_vector[d] - userVec[d]) * 0.5;
  }
}
// clamp every dimension to [0, 1]
```

Places tapped "Been" during onboarding are NOT converted into visits. They have no score. They are signal only. Places tapped "Want to go" ARE inserted into `want_to_go` with `source = 'manual'`.

### Step 5 (auto): finalize

Write `taste_vector`, `crowd_tolerance`, `price_sensitivity`, set `onboarding_complete = true`, trigger initial recommendation generation, route to Home.

---

## PART 7 — TASTE VECTOR LEARNING

The onboarding vector is a starting point. Behavior overrides it progressively.

Edge function `taste-vector-refresh`, invoked after every visit insert, delete, or want_to_go insert.

```ts
// n = number of scored visits for this user
// behaviorWeight ramps from 0 at n=0 to 0.85 at n=25, then holds
const behaviorWeight = Math.min(0.85, (n / 25) * 0.85);

// behaviorVector = score-weighted average of visited places' taste vectors
// weight per visit: (score - 5.0) so disliked places pull AWAY
let acc = new Array(10).fill(0);
let totalW = 0;
for (const v of visits) {
  const w = v.score - 5.0; // range -5.0 to +5.0
  for (let d = 0; d < 10; d++) acc[d] += w * v.place.taste_vector[d];
  totalW += Math.abs(w);
}
const behaviorVector =
  totalW === 0 ? onboardingVector : acc.map((x) => clamp01(0.5 + (x / totalW) * 0.5));

// want_to_go contributes at 30% the weight of a visit, treated as score 7.5
// (fold those in with w = 0.3 * (7.5 - 5.0) = 0.75)

const finalVector = onboardingVector.map(
  (o, d) => o * (1 - behaviorWeight) + behaviorVector[d] * behaviorWeight,
);
```

Store `finalVector` in `profiles.taste_vector`. Keep the raw onboarding vector recoverable by recomputing from `onboarding_responses` (do not store it separately).

---

## PART 8 — RECOMMENDATION ENGINE

Edge function `recommend`. Returns 20 ranked places with reasons.

### 8.1 Candidate generation

All places where the user has no `visits` row and no `want_to_go` row and no non-dismissed `recommendations` row older than 7 days. In NYC this is a few hundred rows, so no ANN index needed. Fetch all, score in memory.

### 8.2 Scoring formula

```
final = 0.45 * tasteMatch
      + 0.25 * friendSignal
      + 0.15 * qualitySignal
      + 0.15 * diversityBonus
      - crowdPenalty
      - pricePenalty
```

**tasteMatch** = cosine similarity between `user.taste_vector` and `place.taste_vector`, rescaled from [-1,1] to [0,1] (in practice always positive since all values are non-negative, so it lands in [0,1] already).

**friendSignal** =

```
let s = 0, count = 0;
for each accepted followee who has a visit at this place:
  s += (visit.score / 10);
  count++;
if count === 0: friendSignal = 0.35        // neutral, not zero, so new users aren't punished
else: friendSignal = s / count
```

**qualitySignal** =

```
if community rating count >= 3: avg(score) / 10
else: place.popularity_seed / 100
```

**diversityBonus** = `1.0` if the user has fewer than 2 visits in this place's category, `0.5` if 2 to 4, `0.0` if 5+. Prevents the list collapsing into all museums.

**crowdPenalty** = `(1 - user.crowd_tolerance) * (place.crowd_level - 1) / 4 * 0.20`

**pricePenalty** = `user.price_sensitivity * (place.price_tier / 4) * 0.20`

Sort descending, take top 20.

### 8.3 Reason strings

Generate deterministically first, then optionally enrich with the LLM.

Deterministic rules, pick the highest-priority one that applies:

1. Friend signal, if 1+ friends rated it 7.5+: `"{friendName} rated this {score}"` or `"{n} friends have been here"`.
2. Strongest matching dimension where both user and place exceed 0.65: `"You keep rating {dimensionLabel} spots highly"`.
3. Anchor to their top-scored visit in the same category: `"Because you gave {placeName} a {score}"`.
4. Diversity: `"Something different from your usual {topCategory} picks"`.
5. Fallback: `"Popular with travelers who share your taste"`.

Dimension labels for rule 2: `culture_history` → "historic", `art_museums` → "art and museum", `nature_outdoors` → "outdoor", `food_drink` → "food", `nightlife_music` → "nightlife", `shopping_markets` → "market and shopping", `architecture_views` → "skyline and architecture", `active_adventure` → "active", `offbeat_local` → "off-the-beaten-path", `family_friendly` → "easygoing".

### 8.4 LLM enrichment (optional, behind a flag)

For the top 6 only, call Anthropic from the edge function.

- Model: `claude-sonnet-4-6`
- max_tokens: 1000
- System prompt: instruct it to return ONLY a JSON array, no preamble, no markdown fences.

```
You write one-line recommendation reasons for a travel app.
Input: a user's rating history and a candidate place.
Output: JSON array only. Each element: {"place_id": string, "reason": string}.
Each reason must be under 90 characters, second person, specific, and reference
the user's actual ratings. Never invent ratings. Never use exclamation marks.
```

Parse with a zod schema. On any parse failure, timeout over 4 seconds, or non-200, fall back silently to the deterministic reason. The feature must never block the response.

### 8.5 Invalidation

Delete all `recommendations` rows for a user on: visit insert, visit delete, want_to_go insert, follow accept. Next fetch regenerates.

---

## PART 9 — SEARCH

Single search bar, three result groups, one query.

```sql
create or replace function search_all(p_query text, p_limit int default 20)
returns jsonb as $$
  select jsonb_build_object(
    'places', (
      select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select id, name, category, neighborhood, hero_image_url,
               similarity(name, p_query) as sim
          from places
         where name % p_query or name ilike '%' || p_query || '%'
            or neighborhood ilike '%' || p_query || '%'
         order by sim desc, popularity_seed desc
         limit p_limit) x),
    'people', (
      select coalesce(jsonb_agg(y), '[]'::jsonb) from (
        select id, username, display_name, avatar_url
          from profiles
         where username % p_query or display_name % p_query
         order by similarity(username, p_query) desc
         limit 10) y)
  );
$$ language sql stable;
```

Set the trigram threshold once: `select set_limit(0.25);`

**Search UX:**

- Debounce 250ms, minimum 2 characters.
- Empty state (no query typed) renders the **recommendation rail**: horizontal scroll of the top 8 cached recommendations, each with its reason string, plus category chips (Museums, Parks, Views, Free, Under an hour) that run filtered queries.
- Results page: places section first, then people. Each place row shows name, category, neighborhood, your score if rated, and a quick "Want to go" bookmark toggle.
- Below results, a "You might also like" block pulling recommendations filtered to the same category as the top result.

---

## PART 10 — MAP

### 10.1 Data

Single query on mount:

```sql
create or replace function map_pins(p_user uuid)
returns table (place_id uuid, name text, lat double precision, lng double precision,
               category text, kind text, score numeric) as $$
  select p.id, p.name, p.lat, p.lng, p.category, 'visited', v.score
    from visits v join places p on p.id = v.place_id
   where v.user_id = p_user
  union all
  select p.id, p.name, p.lat, p.lng, p.category, 'want', null
    from want_to_go w join places p on p.id = w.place_id
   where w.user_id = p_user;
$$ language sql stable;
```

### 10.2 Rendering

- `react-map-gl` `<Map>` with `mapboxAccessToken`, initial viewState centered on `[-73.9857, 40.7484]`, zoom 11.
- `maxBounds` set to the NYC bbox so users cannot pan away.
- Feed pins into `supercluster` with `radius: 60, maxZoom: 15`.
- Clusters render as a circle with count, sized `20 + (count / total) * 30` px.
- Individual visited pins: filled circle in the score band color, with the score printed inside at 11px bold white.
- Want-to-go pins: hollow circle, 2px purple stroke, bookmark icon inside.
- Tap a pin → bottom sheet with hero image, name, your score or "Want to go", your photos, and buttons (View place / Rate it / Remove).

### 10.3 Controls

- Segmented toggle top-left: **All / Been / Want to go**.
- Filter sheet: category multi-select, borough multi-select, score range slider (only applies to Been).
- "Fit to my pins" button that calls `map.fitBounds` on the union of visible pins.
- Borough progress strip at the bottom: 5 small bars showing `visited_in_borough / total_in_borough` as a percentage. This is the primary gamification surface on the map.

---

## PART 11 — SOCIAL

### 11.1 Feed query (cursor pagination)

```sql
create or replace function feed_page(p_user uuid, p_before timestamptz, p_limit int default 20)
returns setof jsonb as $$
  select jsonb_build_object(
    'post', to_jsonb(po),
    'author', jsonb_build_object('id', pr.id, 'username', pr.username,
              'display_name', pr.display_name, 'avatar_url', pr.avatar_url),
    'place', jsonb_build_object('id', pl.id, 'name', pl.name, 'category', pl.category,
              'neighborhood', pl.neighborhood, 'hero_image_url', pl.hero_image_url),
    'visit', to_jsonb(v),
    'photos', (select coalesce(jsonb_agg(jsonb_build_object('path', vp.storage_path)
                order by vp.sort_order), '[]'::jsonb)
                 from visit_photos vp where vp.visit_id = v.id),
    'liked_by_me', exists(select 1 from post_likes l where l.post_id = po.id and l.user_id = p_user)
  )
  from posts po
  join profiles pr on pr.id = po.user_id
  join places pl on pl.id = po.place_id
  left join visits v on v.id = po.visit_id
  where (po.user_id = p_user
         or po.user_id in (select followee_id from follows
                           where follower_id = p_user and status = 'accepted'))
    and po.created_at < p_before
  order by po.created_at desc, po.id desc
  limit p_limit;
$$ language sql stable;
```

Client uses `useInfiniteQuery`, cursor = `created_at` of the last item, page size 20.

### 11.2 Post card anatomy (top to bottom)

1. Avatar, display name, `@username`, relative time.
2. Line: "rated **{Place Name}**" with the score chip on the right in band color.
3. Photo carousel if photos exist, 4:5 aspect, swipeable, dot indicators.
4. If no photos, show the place hero image at 16:9 with a subtle overlay.
5. Note text if present.
6. Meta chips row: value-for-money (`$18 · Worth it`), crowd level, time spent, companion. Only render chips that have data.
7. Action row: like (heart, optimistic), comment (opens sheet), share, and "Add to my list" bookmark which inserts `want_to_go` with `source = 'friend_post'` and `source_user_id` set.
8. Comment preview: latest 2 comments, then "View all {n}".

### 11.3 Comments

Bottom sheet, `useInfiniteQuery` ascending, input pinned to the bottom, optimistic insert. Realtime subscription on `comments` filtered to the open post id so live comments appear during the demo.

### 11.4 Share

`navigator.share` when available, fallback to clipboard copy of `https://{app}/place/{slug}?ref={username}`.

### 11.5 Friends

- **Find people:** search results people section, plus a "Suggested" list of users with the highest taste-match who the user does not already follow.
- **Taste match percentage**, shown on every profile:

```
cosineSim = cosine(userA.taste_vector, userB.taste_vector)          // 0..1
shared = places both have rated
if shared.length >= 3:
  agreement = 1 - (mean(|scoreA - scoreB|) / 10)
  match = 0.55 * cosineSim + 0.45 * agreement
else:
  match = cosineSim
display = round(match * 100)
```

- **Compare view:** side-by-side list of shared places with both scores and the delta, sorted by biggest disagreement first. This is the most demo-friendly screen in the app, build it properly.
- **Friend leaderboard:** on the Profile tab, a list of you plus everyone you follow, sortable by places logged, boroughs covered, or taste match. No points, just counts.

---

## PART 12 — GAMIFICATION (no XP)

### 12.1 Badge definitions

Seed exactly these into `badges`.

| key              | name               | description                                    | icon          | tier   | condition                         |
| ---------------- | ------------------ | ---------------------------------------------- | ------------- | ------ | --------------------------------- |
| `first_log`      | First Steps        | Log your first place                           | Footprints    | bronze | visits >= 1                       |
| `ten_places`     | Getting Around     | Log 10 places                                  | MapPin        | bronze | visits >= 10                      |
| `fifty_places`   | Local Knowledge    | Log 50 places                                  | Map           | gold   | visits >= 50                      |
| `all_boroughs`   | Five Borough Sweep | Log a place in every borough                   | Compass       | gold   | distinct boroughs = 5             |
| `museum_5`       | Gallery Walker     | Log 5 museums or galleries                     | Frame         | silver | category in (museum,gallery) >= 5 |
| `park_5`         | Green Thumb        | Log 5 parks or gardens                         | Trees         | silver | category in (park,garden) >= 5    |
| `view_3`         | Skyline Chaser     | Log 3 viewpoints                               | Building2     | bronze | category = viewpoint >= 3         |
| `free_10`        | Budget Explorer    | Log 10 free places                             | PiggyBank     | silver | price_tier = 0 >= 10              |
| `photographer`   | Documentarian      | Upload 25 photos                               | Camera        | silver | visit_photos >= 25                |
| `harsh_critic`   | Tough Crowd        | Rate 5 places below 4.0                        | ThumbsDown    | bronze | score < 4.0 >= 5                  |
| `perfect_ten`    | Perfect Score      | Give a place a 10.0                            | Star          | bronze | score = 10.0 >= 1                 |
| `trailblazer`    | Trailblazer        | Be the first among your friends to log a place | Flag          | silver | see 12.2                          |
| `one_day_3`      | Packed Day         | Log 3 places with the same visited_on          | Sunrise       | bronze | count by visited_on >= 3          |
| `month_streak_3` | Consistent         | Log something in 3 consecutive months          | CalendarCheck | silver | see 12.2                          |
| `social_10`      | Connected          | Follow 10 people                               | Users         | bronze | follows >= 10                     |
| `commenter_20`   | Conversationalist  | Leave 20 comments                              | MessageCircle | bronze | comments >= 20                    |
| `neighborhood_5` | Deep Diver         | Log 5 places in one neighborhood               | Home          | silver | max per neighborhood >= 5         |
| `value_hunter`   | Value Hunter       | Rate 10 paid places for value                  | Receipt       | silver | value_rating not null >= 10       |

### 12.2 Evaluation

Edge function `evaluate-badges`, invoked after visit insert, photo upload, comment insert, and follow accept. Runs all conditions as one SQL query, inserts any missing `user_badges` rows with `on conflict do nothing`, and returns the newly earned keys.

Tricky ones:

- `trailblazer`: the user has a visit at a place where no accepted followee has a visit with an earlier `created_at`, AND at least 3 followees exist.
- `month_streak_3`: `select count(*) from (select distinct date_trunc('month', visited_on) m from visits where user_id = $1) t` with a consecutive-run check using `lag()`.

### 12.3 Unlock UX

When the function returns new keys, show a full-screen modal: badge icon scaling in with framer-motion spring, name, description, `canvas-confetti` burst (particleCount 80, spread 70, origin y 0.6), and a "Share" button that creates a `posts` row with `kind = 'badge'`. Mark `user_badges.seen = true` on dismiss.

### 12.4 Progress surfaces

- Profile header: "**{n}** places · **{m}** neighborhoods · **{k}**/5 boroughs".
- Badge grid on profile, earned badges in color, unearned in grayscale with the condition text and a progress bar where the condition is countable.
- Map borough strip (see 10.3).
- Category coverage donut on the profile using recharts, one slice per category logged.

---

## PART 13 — PHOTO PIPELINE

1. User selects files (`accept="image/*"`, `multiple`, max 6).
2. Client compresses each with `browser-image-compression`: `maxSizeMB: 0.6`, `maxWidthOrHeight: 1600`, `fileType: 'image/webp'`, `useWebWorker: true`.
3. Read dimensions from an offscreen `Image` before upload, store `width` and `height` so the UI can reserve aspect-ratio space and avoid layout shift.
4. Upload to `visit-photos/{user_id}/{visit_id}/{uuid}.webp` with `cacheControl: '31536000'`.
5. Insert `visit_photos` rows with `sort_order` matching selection order.
6. Display via Supabase transform URLs: thumbnails `?width=400&quality=70`, full `?width=1200&quality=80`.
7. Upload happens AFTER the visit row exists, so the flow is: complete ladder → create visit → upload photos → show reveal screen. Show per-file progress bars. If an upload fails, the visit still stands and the user gets a retry affordance on the visit detail screen.

Avatar: same compression at `maxWidthOrHeight: 400`, square center-crop before compression, upload to `avatars/{user_id}/avatar.webp` with upsert.

---

## PART 14 — SCREENS

Bottom tab bar, 5 tabs: **Home**, **Search**, **Log** (center, filled circle), **Map**, **Profile**.

| Route                  | Screen            | Contents                                                                                                                                                                                                                               |
| ---------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/onboarding`          | Onboarding wizard | Steps from Part 6, no tab bar                                                                                                                                                                                                          |
| `/`                    | Home              | Feed (Part 11.1). Top: horizontal "For you" rail of 6 recommendations. Empty state when following nobody: "Follow people to see their visits" plus suggested users                                                                     |
| `/search`              | Search            | Part 9                                                                                                                                                                                                                                 |
| `/log`                 | Log entry point   | Search-first place picker, recent places near you, "Been here" and "Want to go" quick actions                                                                                                                                          |
| `/log/:placeId`        | Rating flow       | Screens A through D from Part 5.2                                                                                                                                                                                                      |
| `/map`                 | Map               | Part 10                                                                                                                                                                                                                                |
| `/place/:slug`         | Place detail      | Hero, name, category, neighborhood, description, community score, your score or CTA, meta (price tier, duration, best time, indoor/outdoor, crowd), photo grid from all users, "Friends who've been" row, ratings list, similar places |
| `/profile`             | Own profile       | Header stats, badge grid, category donut, tabs: Been (ordered list by score desc) / Want to go / Photos grid                                                                                                                           |
| `/u/:username`         | Other profile     | Same, plus follow button and taste-match percentage and "Compare" button                                                                                                                                                               |
| `/u/:username/compare` | Compare           | Part 11.5                                                                                                                                                                                                                              |
| `/friends`             | Friends           | Following, Followers, Requests (if private), Suggested, Leaderboard                                                                                                                                                                    |
| `/settings`            | Settings          | Edit profile, privacy toggle, retake taste quiz, sign out                                                                                                                                                                              |

**Been list ordering:** default sort is score descending across all buckets. Secondary sort key is `rank_position` ascending. Provide sort options: score, recently logged, alphabetical, by neighborhood.

---

## PART 15 — SEED DATA

### 15.1 Requirements

- **150 places minimum**, NYC only.
- Distribution: Manhattan 60, Brooklyn 40, Queens 25, Bronx 15, Staten Island 10.
- Every category from 2.3 represented at least 4 times.
- At least 40 places with `price_tier = 0`.
- At least 20 places with `popularity_seed >= 70` (these feed onboarding step 4).
- At least 30 places with `popularity_seed <= 30` (these make the offbeat dimension meaningful).

### 15.2 CSV columns

`slug,name,category,borough,neighborhood,address,lat,lng,short_description,hero_image_url,tv0,tv1,tv2,tv3,tv4,tv5,tv6,tv7,tv8,tv9,crowd_level,price_tier,typical_price_usd,typical_duration_minutes,best_time,indoor_outdoor,popularity_seed`

### 15.3 Taste vector authoring rules

Each `tv{n}` is 0.0 to 1.0 to one decimal. Rules:

- The dominant dimension for the place's category should be 0.8 or higher.
- At most 3 dimensions above 0.6. A place that is high in everything is useless for similarity.
- `offbeat_local` should be inversely correlated with `popularity_seed`: roughly `tv8 ≈ 1 - (popularity_seed / 100)`, adjusted by hand.
- Never leave a dimension at exactly 0.0, use 0.1 as the floor, so cosine stays well-behaved.

Worked example:

```
central-park,Central Park,park,manhattan,Midtown,...,40.7829,-73.9654,
"843 acres of meadows, lakes and winding paths in the middle of Manhattan.",
https://...,0.3,0.2,0.95,0.3,0.2,0.1,0.5,0.7,0.15,0.9,
4,0,,120,morning,outdoor,95
```

### 15.4 Hero images

Use Unsplash source URLs or self-hosted images in a public Supabase bucket `place-images`. Do not hotlink from sites that block it. Every place must have a working image, a broken hero image on the map bottom sheet ruins the demo.

### 15.5 Demo accounts

Create 5 seeded accounts with realistic, DIFFERENT taste vectors so taste-match and friend signals are visibly non-trivial:

- `@maya_walks` — outdoors and active heavy
- `@artdept_sam` — museums and galleries heavy
- `@eats_with_jo` — food and market heavy
- `@skyline_dev` — views and architecture heavy
- `@offbeat_ray` — offbeat and neighborhood heavy

Each with 18 to 25 visits, scores spread across all three buckets, 2 to 4 photos on at least half their visits, and a handful of comments and likes on each other's posts. The primary demo user follows all 5.

---

## PART 16 — BUILD ORDER

Do not reorder. Each phase must pass its acceptance criteria before the next begins.

### Phase 0 — Foundation

Supabase project, extensions, migration 0001 (all tables), RLS policies, storage buckets and policies, generated TS types, Supabase client singleton, react-query provider, router with tab bar shell, shadcn installed.
**Accept:** an authenticated user can sign in with Google and land on an empty Home tab. `select * from places` returns rows for an authenticated user and errors for an anonymous one.

### Phase 1 — Seed and places

Author `places.csv` (150 rows), write the import script, insert. Build `/place/:slug` read-only. Build `search_all` RPC and the Search tab (results only, no recommendations yet).
**Accept:** searching "brooklyn bridge" returns the place in under 300ms and its detail page renders fully with a working hero image.

### Phase 2 — Rating engine

`log_visit` RPC, `rescore_bucket`, delete-and-reshift RPC, the ladder in TypeScript with unit tests, screens A through D, want-to-go toggle.
**Accept:** log 6 places into "Loved it". Scores must be exactly evenly spaced across 6.7 to 10.0 with the best at 10.0 and the worst at 6.7. Insert a 7th at position 3 and confirm all 7 rescore correctly and no two share a `rank_position`. Ladder never asks more than 5 questions.

### Phase 3 — Onboarding

Wizard, Likert block, seed taps, vector computation, `taste-vector-refresh` edge function.
**Accept:** two users answering opposite Likert sets produce taste vectors with cosine similarity below 0.6. Onboarding cannot be re-entered after completion except from Settings.

### Phase 4 — Map

`map_pins` RPC, Mapbox integration, clustering, pin styling by band, bottom sheet, filters, borough progress strip.
**Accept:** 30 seeded visits render as correctly colored pins, cluster at zoom 11, and separate at zoom 15. Panning outside the NYC bbox is impossible.

### Phase 5 — Photos

Compression, upload, `visit_photos` rows, carousel on post cards, profile photo grid, place photo grid.
**Accept:** a 6MB JPEG uploads as a WebP under 600KB in under 4 seconds on a normal connection, and appears in the feed, on the place page, and on the profile grid.

### Phase 6 — Social

Follows, posts auto-creation, `feed_page`, post card, likes with optimistic updates, comments sheet with realtime, share, other profiles, taste match, compare view, friends leaderboard.
**Accept:** the demo user's feed shows all 5 seeded accounts' visits in reverse chronological order, liking is instant with no flicker, and the compare view shows at least 5 shared places with deltas.

### Phase 7 — Recommendations

`recommend` edge function, deterministic reasons, cache table, invalidation hooks, the Home rail, the Search empty state rail, "You might also like" on search results.
**Accept:** every recommendation card shows a non-empty reason. After logging a new place, the recommendation set visibly changes. Response time under 800ms warm.

### Phase 8 — Badges

Seed badges, `evaluate-badges` function, invocation hooks, unlock modal, profile badge grid with progress.
**Accept:** logging the first place fires `first_log` with the modal and confetti. Logging places across all 5 boroughs fires `all_boroughs`. No badge fires twice.

### Phase 9 — Polish

Skeleton loaders on every list, empty states on every tab, error boundaries, offline toast, haptics on comparison taps (`navigator.vibrate(10)`), page transitions, the reveal count-up animation, accessibility pass (focus rings, alt text on every image, 44px minimum tap targets).
**Accept:** no raw spinner anywhere, every tab has a designed empty state, Lighthouse accessibility score above 90.

---

## PART 17 — TESTING

### 17.1 Unit tests (vitest) — required

- `initLadder`, `nextPivot`, `applyAnswer` across bucket sizes 0, 1, 2, 5, 10, 25. Assert comparison count never exceeds `min(5, ceil(log2(n+1)))`.
- `rescoreBucket` pure TS mirror: n=1 → [max]; n=2 → [max, min]; n=5 → evenly spaced; assert monotonic descending.
- Likert to vector mapping, including inversion of q11.
- Cosine similarity, including the zero-vector guard.
- Taste match formula with fewer than 3 shared places.

### 17.2 Integration tests

- `log_visit` concurrency: two inserts into the same bucket at the same position must not violate the unique index.
- RLS: a user cannot select another private user's visits. Write an explicit failing-query test.
- Photo limit trigger rejects the 7th photo.
- `value_required_when_paid` constraint rejects a paid visit with no value_rating.

### 17.3 Manual demo checklist

Complete onboarding cold, log 3 places, upload photos on one, check the map fills in, follow a seeded account, like and comment on their post, open compare, trigger a badge, refresh recommendations and see them change.

---

## PART 18 — THINGS EXPLICITLY OUT OF SCOPE FOR v1

Do not build these. If a decision seems to require one, choose the simpler path instead.

Trip planning and itineraries. Direct messaging. Push notifications. Places outside NYC. User-submitted places. Reservation or ticketing integrations. Offline mode. Multi-language. Web push. Video upload. Stories. Group trips. Check-in verification by GPS. Any monetization.

---

## PART 19 — HANDOFF NOTES FOR THE AGENT

- Every SQL function in this doc uses `security definer`. Set `search_path = public` on each one explicitly to avoid the Supabase linter warning.
- Generate types with `supabase gen types typescript --project-id <id> > src/lib/types.ts` after every migration. Do not hand-write DB types.
- All mutations go through react-query `useMutation` with `onSuccess` invalidation of the specific query keys, not a blanket `invalidateQueries()`.
- Query key convention: `['feed']`, `['place', slug]`, `['visits', userId]`, `['recs', userId]`, `['mapPins', userId]`, `['profile', username]`.
- Never call the Anthropic API from the client. The key lives only in edge function secrets.
- Every list that can exceed 30 items must be paginated. No exceptions.
- If any step in this document is ambiguous, implement the simplest version that satisfies the acceptance criteria, and leave a `// SPEC-GAP:` comment explaining the choice. Do not silently invent features.
