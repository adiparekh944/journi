create extension if not exists "uuid-ossp";
create extension if not exists postgis with schema extensions;
create extension if not exists pg_trgm;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null
    check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null
    check (char_length(display_name) between 1 and 40),
  avatar_url text,
  bio text check (char_length(bio) <= 160),
  home_city text,
  -- Where the person is based, so the map and "near you" can open somewhere
  -- meaningful. Same NYC bounds the places table enforces.
  home_lat double precision check (home_lat between 40.4774 and 40.9176),
  home_lng double precision check (home_lng between -74.2591 and -73.7002),
  -- How far out the map ring reaches, in miles.
  home_radius_miles real not null default 2
    check (home_radius_miles between 0.25 and 25),
  is_private boolean not null default false,
  theme text not null default 'system'
    check (theme in ('light', 'dark', 'system')),
  onboarding_complete boolean not null default false,
  taste_vector real[10] not null default
    '{0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5}',
  crowd_tolerance real not null default 0.5
    check (crowd_tolerance between 0 and 1),
  price_sensitivity real not null default 0.5
    check (price_sensitivity between 0 and 1),
  travel_frequency text check (
    travel_frequency in (
      'rarely',
      'once_year',
      'few_times_year',
      'monthly',
      'constantly'
    )
  ),
  countries_visited_count int not null default 0,
  typical_companion text check (
    typical_companion in ('solo', 'partner', 'friends', 'family', 'mixed')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (array_length(taste_vector, 1) = 10)
);

create index profiles_username_trgm
  on public.profiles using gin (username gin_trgm_ops);
create index profiles_display_name_trgm
  on public.profiles using gin (display_name gin_trgm_ops);

create table public.places (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name text not null,
  category text not null check (
    category in (
      'museum',
      'park',
      'landmark',
      'viewpoint',
      'neighborhood',
      'market',
      'venue',
      'waterfront',
      'garden',
      'historic_site',
      'bridge',
      'gallery',
      'theater',
      'sports_venue',
      'tour_experience'
    )
  ),
  borough text not null check (
    borough in (
      'manhattan',
      'brooklyn',
      'queens',
      'bronx',
      'staten_island'
    )
  ),
  neighborhood text not null,
  address text,
  lat double precision not null check (lat between 40.4774 and 40.9176),
  lng double precision not null check (lng between -74.2591 and -73.7002),
  geog extensions.geography(point, 4326) generated always as (
    extensions.st_setsrid(
      extensions.st_makepoint(lng, lat),
      4326
    )::extensions.geography
  ) stored,
  short_description text not null
    check (char_length(short_description) <= 200),
  hero_image_url text not null,
  taste_vector real[10] not null,
  crowd_level int not null check (crowd_level between 1 and 5),
  price_tier int not null check (price_tier between 0 and 4),
  typical_price_usd numeric(6, 2),
  typical_duration_minutes int,
  best_time text check (
    best_time in (
      'early_morning',
      'morning',
      'afternoon',
      'sunset',
      'evening',
      'night',
      'anytime'
    )
  ),
  indoor_outdoor text not null check (
    indoor_outdoor in ('indoor', 'outdoor', 'both')
  ),
  is_free boolean generated always as (price_tier = 0) stored,
  popularity_seed int not null default 50
    check (popularity_seed between 0 and 100),
  -- Where to buy admission. Only set where a real booking page is known; the
  -- ticket button stays hidden rather than sending people to a guess.
  ticket_url text check (ticket_url is null or ticket_url like 'https://%'),
  created_at timestamptz not null default now(),
  check (array_length(taste_vector, 1) = 10)
);

create index places_geog_idx on public.places using gist (geog);
create index places_name_trgm
  on public.places using gin (name gin_trgm_ops);
create index places_category_idx on public.places (category);
create index places_borough_idx on public.places (borough);

create table public.visits (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  place_id uuid not null references public.places(id) on delete cascade,
  bucket text not null check (bucket in ('liked', 'fine', 'disliked')),
  rank_position int not null check (rank_position >= 0),
  score numeric(3, 1) not null check (score between 0.0 and 10.0),
  note text check (char_length(note) <= 500),
  visited_on date not null default current_date,
  was_paid boolean not null default false,
  amount_paid_usd numeric(7, 2),
  value_rating int check (value_rating between 1 and 5),
  crowd_experienced int check (crowd_experienced between 1 and 5),
  time_spent_minutes int check (time_spent_minutes between 5 and 720),
  companion text check (
    companion in ('solo', 'partner', 'friends', 'family', 'group_tour')
  ),
  would_return boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, place_id),
  constraint value_required_when_paid check (
    not was_paid
    or (value_rating is not null and amount_paid_usd is not null)
  )
);

create unique index visits_user_bucket_rank
  on public.visits (user_id, bucket, rank_position);
create index visits_user_created
  on public.visits (user_id, created_at desc);
create index visits_place on public.visits (place_id);

create table public.visit_photos (
  id uuid primary key default uuid_generate_v4(),
  visit_id uuid not null references public.visits(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  place_id uuid not null references public.places(id) on delete cascade,
  storage_path text not null,
  width int not null check (width > 0),
  height int not null check (height > 0),
  sort_order int not null default 0 check (sort_order between 0 and 5),
  created_at timestamptz not null default now()
);

create index visit_photos_visit
  on public.visit_photos (visit_id, sort_order);
create index visit_photos_place
  on public.visit_photos (place_id, created_at desc);

create table public.want_to_go (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  place_id uuid not null references public.places(id) on delete cascade,
  source text not null default 'manual' check (
    source in ('manual', 'recommendation', 'friend_post', 'search')
  ),
  source_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, place_id)
);

create index want_to_go_user
  on public.want_to_go (user_id, created_at desc);

create table public.follows (
  follower_id uuid not null
    references public.profiles(id) on delete cascade,
  followee_id uuid not null
    references public.profiles(id) on delete cascade,
  status text not null default 'accepted'
    check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create index follows_followee
  on public.follows (followee_id, status);

create table public.posts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  visit_id uuid unique references public.visits(id) on delete cascade,
  -- SPEC-GAP: badge posts have no place, although the source schema marked this
  -- column not null. Nullable is the simplest shape that supports badge sharing.
  place_id uuid references public.places(id) on delete cascade,
  kind text not null default 'visit'
    check (kind in ('visit', 'want_to_go', 'badge')),
  badge_key text,
  like_count int not null default 0 check (like_count >= 0),
  comment_count int not null default 0 check (comment_count >= 0),
  created_at timestamptz not null default now()
);

create index posts_user_created on public.posts (user_id, created_at desc);
create index posts_created on public.posts (created_at desc, id desc);

create table public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.comments (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 300),
  created_at timestamptz not null default now()
);

create index comments_post on public.comments (post_id, created_at asc);

create table public.onboarding_responses (
  user_id uuid primary key
    references public.profiles(id) on delete cascade,
  likert jsonb not null default '{}'::jsonb,
  seed_taps jsonb not null default '{}'::jsonb,
  completed_steps smallint[] not null default '{}',
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  check (
    completed_steps <@ array[1, 2, 3, 4]::smallint[]
  )
);

create table public.badges (
  key text primary key,
  name text not null,
  description text not null,
  icon text not null,
  tier text not null check (tier in ('bronze', 'silver', 'gold'))
);

create table public.user_badges (
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_key text not null references public.badges(key) on delete cascade,
  earned_at timestamptz not null default now(),
  seen boolean not null default false,
  primary key (user_id, badge_key)
);

alter table public.posts
  add constraint posts_badge_key_fk
  foreign key (badge_key) references public.badges(key) on delete cascade;

alter table public.posts
  add constraint posts_kind_payload_check check (
    (
      kind = 'visit'
      and visit_id is not null
      and place_id is not null
      and badge_key is null
    )
    or (
      kind = 'want_to_go'
      and visit_id is null
      and place_id is not null
      and badge_key is null
    )
    or (
      kind = 'badge'
      and visit_id is null
      and place_id is null
      and badge_key is not null
    )
  );

create table public.recommendations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  place_id uuid not null references public.places(id) on delete cascade,
  rank int not null check (rank >= 0),
  score real not null,
  reason text not null check (char_length(trim(reason)) > 0),
  generated_at timestamptz not null default now(),
  dismissed boolean not null default false,
  dismissed_at timestamptz,
  check (dismissed = (dismissed_at is not null)),
  unique (user_id, place_id)
);

create index recommendations_user_rank
  on public.recommendations (user_id, rank)
  where dismissed = false;
create index recommendations_user_hidden
  on public.recommendations (user_id, dismissed_at desc)
  where dismissed = true;

-- Deliberately a definer view (security_invoker = false). Part 4 of the
-- specification requires that this minimal projection be selectable for every
-- profile so that people search and follow requests can reach private accounts,
-- which Part 3.6 supports through pending follows. An invoker view would apply
-- the caller's RLS and hide exactly the accounts it exists to expose. Only the
-- five columns named here are reachable; everything else stays behind RLS.
create view public.profiles_public
with (security_invoker = false) as
select id, username, display_name, avatar_url, is_private
from public.profiles;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger visits_set_updated_at
before update on public.visits
for each row execute function public.set_updated_at();

create trigger onboarding_set_updated_at
before update on public.onboarding_responses
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  generated_username text;
  generated_name text;
begin
  generated_username := 'user_' || left(replace(new.id::text, '-', ''), 12);
  generated_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    'Journi traveler'
  );

  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    generated_username,
    left(generated_name, 40),
    new.raw_user_meta_data ->> 'avatar_url'
  );

  return new;
end;
$$;

create trigger auth_user_creates_profile
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.check_photo_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.visit_id::text, 0));

  if (
    select count(*)
    from public.visit_photos
    where visit_id = new.visit_id
  ) >= 6 then
    raise exception 'Maximum 6 photos per visit';
  end if;

  if not exists (
    select 1
    from public.visits
    where id = new.visit_id
      and user_id = new.user_id
      and place_id = new.place_id
  ) then
    raise exception 'Photo ownership must match its visit';
  end if;

  return new;
end;
$$;

create trigger visit_photo_limit
before insert on public.visit_photos
for each row execute function public.check_photo_limit();

create or replace function public.clear_want_to_go()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.want_to_go
  where user_id = new.user_id and place_id = new.place_id;
  return new;
end;
$$;

create trigger visit_clears_want_to_go
after insert on public.visits
for each row execute function public.clear_want_to_go();

create or replace function public.set_follow_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select case when is_private then 'pending' else 'accepted' end
  into new.status
  from public.profiles
  where id = new.followee_id;

  return new;
end;
$$;

create trigger follows_set_initial_status
before insert on public.follows
for each row execute function public.set_follow_status();

create or replace function public.prevent_follow_identity_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.follower_id <> old.follower_id
    or new.followee_id <> old.followee_id then
    raise exception 'Follow participants cannot be changed';
  end if;

  return new;
end;
$$;

create trigger follows_keep_participants
before update on public.follows
for each row execute function public.prevent_follow_identity_change();

create or replace function public.create_activity_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'visits' then
    insert into public.posts (user_id, visit_id, place_id, kind)
    values (new.user_id, new.id, new.place_id, 'visit');
  elsif new.source <> 'recommendation' then
    insert into public.posts (user_id, place_id, kind)
    values (new.user_id, new.place_id, 'want_to_go');
  end if;

  return new;
end;
$$;

create trigger visit_creates_post
after insert on public.visits
for each row execute function public.create_activity_post();

create trigger want_to_go_creates_post
after insert on public.want_to_go
for each row execute function public.create_activity_post();

create or replace function public.maintain_post_counter()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_post_id uuid;
  amount int;
begin
  target_post_id := coalesce(new.post_id, old.post_id);
  amount := case when tg_op = 'INSERT' then 1 else -1 end;

  if tg_table_name = 'post_likes' then
    update public.posts
    set like_count = greatest(0, like_count + amount)
    where id = target_post_id;
  else
    update public.posts
    set comment_count = greatest(0, comment_count + amount)
    where id = target_post_id;
  end if;

  return coalesce(new, old);
end;
$$;

create trigger post_likes_maintain_count
after insert or delete on public.post_likes
for each row execute function public.maintain_post_counter();

create trigger comments_maintain_count
after insert or delete on public.comments
for each row execute function public.maintain_post_counter();

create or replace function public.invalidate_recommendations()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
begin
  if tg_table_name = 'follows' then
    target_user_id := coalesce(new.follower_id, old.follower_id);
  else
    target_user_id := coalesce(new.user_id, old.user_id);
  end if;

  delete from public.recommendations
  where user_id = target_user_id and not dismissed;
  return coalesce(new, old);
end;
$$;

create trigger visits_invalidate_recommendations
after insert or delete on public.visits
for each row execute function public.invalidate_recommendations();

create trigger want_to_go_invalidates_recommendations
after insert on public.want_to_go
for each row execute function public.invalidate_recommendations();

create trigger follows_invalidate_recommendations
after insert or update of status on public.follows
for each row execute function public.invalidate_recommendations();

create or replace function public.can_view_user(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    target = auth.uid()
    or exists (
      select 1
      from public.profiles
      where id = target and not is_private
    )
    or exists (
      select 1
      from public.follows
      where follower_id = auth.uid()
        and followee_id = target
        and status = 'accepted'
    );
$$;

create or replace function public.rescore_bucket(
  p_user uuid,
  p_bucket text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  minimum_score numeric;
  maximum_score numeric;
  visit_count int;
begin
  -- auth.uid() is null for the service role and for seed scripts, which need to
  -- rescore on behalf of the accounts they create. An end-user session may still
  -- only rescore itself.
  if auth.uid() is not null and p_user <> auth.uid() then
    raise exception 'A user may only rescore their own visits';
  end if;

  if p_bucket not in ('liked', 'fine', 'disliked') then
    raise exception 'Invalid rating bucket';
  end if;

  select
    case p_bucket
      when 'liked' then 6.7
      when 'fine' then 3.4
      else 0.0
    end,
    case p_bucket
      when 'liked' then 10.0
      when 'fine' then 6.6
      else 3.3
    end
  into minimum_score, maximum_score;

  select count(*)
  into visit_count
  from public.visits
  where user_id = p_user and bucket = p_bucket;

  if visit_count = 0 then
    return;
  end if;

  if visit_count = 1 then
    update public.visits
    set score = maximum_score
    where user_id = p_user and bucket = p_bucket;
  else
    update public.visits
    set score = round(
      (
        maximum_score
        - (
          rank_position::numeric * (maximum_score - minimum_score)
        ) / (visit_count - 1)
      )::numeric,
      1
    )
    where user_id = p_user and bucket = p_bucket;
  end if;
end;
$$;

create or replace function public.log_visit(
  p_place_id uuid,
  p_bucket text,
  p_position int,
  p_payload jsonb default '{}'::jsonb
)
returns public.visits
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  bucket_size int;
  created_visit public.visits;
begin
  if current_user_id is null then
    raise exception 'Authentication is required';
  end if;

  if p_bucket not in ('liked', 'fine', 'disliked') then
    raise exception 'Invalid rating bucket';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(current_user_id::text || ':' || p_bucket, 0)
  );

  select count(*)
  into bucket_size
  from public.visits
  where user_id = current_user_id and bucket = p_bucket;

  if p_position < 0 or p_position > bucket_size then
    raise exception 'Rank position is outside the bucket';
  end if;

  -- The temporary offset avoids transient collisions in the unique rank index.
  update public.visits
  set rank_position = rank_position + 100000
  where user_id = current_user_id
    and bucket = p_bucket
    and rank_position >= p_position;

  update public.visits
  set rank_position = rank_position - 99999
  where user_id = current_user_id
    and bucket = p_bucket
    and rank_position >= 100000;

  insert into public.visits (
    user_id,
    place_id,
    bucket,
    rank_position,
    score,
    note,
    visited_on,
    was_paid,
    amount_paid_usd,
    value_rating,
    crowd_experienced,
    time_spent_minutes,
    companion,
    would_return
  ) values (
    current_user_id,
    p_place_id,
    p_bucket,
    p_position,
    0.0,
    nullif(trim(p_payload ->> 'note'), ''),
    coalesce((p_payload ->> 'visited_on')::date, current_date),
    coalesce((p_payload ->> 'was_paid')::boolean, false),
    (p_payload ->> 'amount_paid_usd')::numeric,
    (p_payload ->> 'value_rating')::int,
    (p_payload ->> 'crowd_experienced')::int,
    (p_payload ->> 'time_spent_minutes')::int,
    p_payload ->> 'companion',
    (p_payload ->> 'would_return')::boolean
  )
  returning * into created_visit;

  perform public.rescore_bucket(current_user_id, p_bucket);

  -- Badges are evaluated here rather than from an after-insert trigger on
  -- visits: the trigger would run while the new row still holds the 0.0
  -- placeholder score, so score-derived badges (perfect_ten, harsh_critic)
  -- would be judged against a score the user never received.
  perform public.evaluate_badges_for_user(current_user_id);

  select *
  into created_visit
  from public.visits
  where id = created_visit.id;

  return created_visit;
end;
$$;

create or replace function public.delete_visit_and_rescore(p_visit_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  removed_bucket text;
  removed_position int;
begin
  select bucket, rank_position
  into removed_bucket, removed_position
  from public.visits
  where id = p_visit_id and user_id = current_user_id
  ;

  if not found then
    raise exception 'Visit was not found';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(current_user_id::text || ':' || removed_bucket, 0)
  );

  select bucket, rank_position
  into removed_bucket, removed_position
  from public.visits
  where id = p_visit_id and user_id = current_user_id
  for update;

  if not found then
    raise exception 'Visit was not found';
  end if;

  delete from public.visits where id = p_visit_id;

  update public.visits
  set rank_position = rank_position + 100000
  where user_id = current_user_id
    and bucket = removed_bucket
    and rank_position > removed_position;

  update public.visits
  set rank_position = rank_position - 100001
  where user_id = current_user_id
    and bucket = removed_bucket
    and rank_position >= 100000;

  perform public.rescore_bucket(current_user_id, removed_bucket);
end;
$$;

create or replace function public.edit_visit_details(
  p_visit_id uuid,
  p_payload jsonb
)
returns public.visits
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_visit public.visits;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  -- A key that is absent from the payload leaves its column untouched; a key
  -- present with an explicit null clears it. Assigning unconditionally would
  -- erase metadata the caller never intended to edit, and would break the
  -- value_required_when_paid constraint whenever was_paid stayed true.
  update public.visits
  set
    note = case
      when p_payload ? 'note' then nullif(trim(p_payload ->> 'note'), '')
      else note
    end,
    visited_on = coalesce(
      (p_payload ->> 'visited_on')::date,
      visited_on
    ),
    was_paid = coalesce(
      (p_payload ->> 'was_paid')::boolean,
      was_paid
    ),
    amount_paid_usd = case
      when p_payload ? 'amount_paid_usd'
        then (p_payload ->> 'amount_paid_usd')::numeric
      else amount_paid_usd
    end,
    value_rating = case
      when p_payload ? 'value_rating' then (p_payload ->> 'value_rating')::int
      else value_rating
    end,
    crowd_experienced = case
      when p_payload ? 'crowd_experienced'
        then (p_payload ->> 'crowd_experienced')::int
      else crowd_experienced
    end,
    time_spent_minutes = case
      when p_payload ? 'time_spent_minutes'
        then (p_payload ->> 'time_spent_minutes')::int
      else time_spent_minutes
    end,
    companion = case
      when p_payload ? 'companion' then p_payload ->> 'companion'
      else companion
    end,
    would_return = case
      when p_payload ? 'would_return' then (p_payload ->> 'would_return')::boolean
      else would_return
    end
  where id = p_visit_id and user_id = auth.uid()
  returning * into updated_visit;

  if not found then
    raise exception 'Visit was not found';
  end if;
  return updated_visit;
end;
$$;

create or replace function public.search_all(
  p_query text,
  p_limit int default 20
)
returns jsonb
language sql
stable
security definer
set search_path = public
-- The specification asks for the trigram threshold to be set once via
-- set_limit(0.25). set_limit() is session state, which does not survive
-- connection pooling, so the threshold is pinned per call instead. This also
-- lets the % operator below use the gin_trgm_ops indexes; the equivalent
-- similarity(...) > 0.25 predicate cannot be index-accelerated.
set pg_trgm.similarity_threshold = 0.25
as $$
  select jsonb_build_object(
    'places', (
      select coalesce(jsonb_agg(place_result), '[]'::jsonb)
      from (
        -- SPEC-GAP: slug is required to construct the mandated detail route.
        select
          id,
          slug,
          name,
          category,
          neighborhood,
          hero_image_url,
          similarity(name, p_query) as sim
        from public.places
        where name % p_query
          or name ilike '%' || p_query || '%'
          or neighborhood ilike '%' || p_query || '%'
        order by sim desc, popularity_seed desc
        limit least(greatest(p_limit, 1), 30)
      ) as place_result
    ),
    'people', (
      select coalesce(jsonb_agg(person_result), '[]'::jsonb)
      from (
        select id, username, display_name, avatar_url
        from public.profiles
        where username % p_query
          or display_name % p_query
        order by similarity(username, p_query) desc
        limit 10
      ) as person_result
    )
  );
$$;

create or replace function public.map_pins(p_user uuid)
returns table (
  place_id uuid,
  name text,
  lat double precision,
  lng double precision,
  category text,
  kind text,
  score numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    place.id,
    place.name,
    place.lat,
    place.lng,
    place.category,
    'visited'::text,
    visit.score
  from public.visits as visit
  join public.places as place on place.id = visit.place_id
  where visit.user_id = p_user and public.can_view_user(p_user)

  union all

  select
    place.id,
    place.name,
    place.lat,
    place.lng,
    place.category,
    'want'::text,
    null::numeric
  from public.want_to_go as wanted
  join public.places as place on place.id = wanted.place_id
  where wanted.user_id = p_user and public.can_view_user(p_user);
$$;

create or replace function public.feed_page(
  p_user uuid,
  p_before timestamptz,
  p_limit int default 20
)
returns setof jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'post', to_jsonb(post),
    'author', jsonb_build_object(
      'id', profile.id,
      'username', profile.username,
      'display_name', profile.display_name,
      'avatar_url', profile.avatar_url
    ),
    'place', case
      when place.id is null then null
      else jsonb_build_object(
        'id', place.id,
        'slug', place.slug,
        'name', place.name,
        'category', place.category,
        'neighborhood', place.neighborhood,
        'hero_image_url', place.hero_image_url
      )
    end,
    'visit', to_jsonb(visit),
    'photos', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object('path', photo.storage_path)
          order by photo.sort_order
        ),
        '[]'::jsonb
      )
      from public.visit_photos as photo
      where photo.visit_id = visit.id
    ),
    'liked_by_me', exists (
      select 1
      from public.post_likes as post_like
      where post_like.post_id = post.id
        and post_like.user_id = p_user
    )
  )
  from public.posts as post
  join public.profiles as profile on profile.id = post.user_id
  left join public.places as place on place.id = post.place_id
  left join public.visits as visit on visit.id = post.visit_id
  where p_user = auth.uid()
    and (
      post.user_id = p_user
      or post.user_id in (
        select followee_id
        from public.follows
        where follower_id = p_user and status = 'accepted'
      )
    )
    and post.created_at < p_before
  order by post.created_at desc, post.id desc
  limit least(greatest(p_limit, 1), 30);
$$;

create or replace function public.current_streak(p_user uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  with visit_months as (
    select distinct date_trunc('month', visited_on)::date as month
    from public.visits
    where user_id = p_user and public.can_view_user(p_user)
  ),
  streak_anchor as (
    select case
      when current_month.month is not null then current_month.month
      when previous_month.month is not null then previous_month.month
      else null
    end as month
    from (
      select month
      from visit_months
      where month = date_trunc('month', current_date)::date
    ) as current_month
    full join (
      select month
      from visit_months
      where month = (
        date_trunc('month', current_date)::date - interval '1 month'
      )::date
    ) as previous_month on true
  ),
  numbered_months as (
    select
      visit_months.month,
      row_number() over (order by visit_months.month desc) as position,
      streak_anchor.month as anchor
    from visit_months
    cross join streak_anchor
    where visit_months.month <= streak_anchor.month
  )
  select coalesce(count(*), 0)::int
  from numbered_months
  where month = (
    anchor - ((position - 1)::text || ' month')::interval
  )::date;
$$;

create or replace function public.public_place(
  p_slug text,
  p_ref_username text default null
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'place', jsonb_build_object(
      'id', place.id,
      'slug', place.slug,
      'name', place.name,
      'category', place.category,
      'neighborhood', place.neighborhood,
      'short_description', place.short_description,
      'hero_image_url', place.hero_image_url
    ),
    'community', (
      select case
        when count(*) >= 3 then jsonb_build_object(
          'score', round(avg(visit.score), 1),
          'rating_count', count(*)
        )
        else null
      end
      from public.visits as visit
      where visit.place_id = place.id
    ),
    'photos', (
      select coalesce(jsonb_agg(photo.storage_path), '[]'::jsonb)
      from (
        select visit_photo.storage_path
        from public.visit_photos as visit_photo
        join public.profiles as photographer
          on photographer.id = visit_photo.user_id
        where visit_photo.place_id = place.id
          and not photographer.is_private
        order by visit_photo.created_at desc
        limit 12
      ) as photo
    ),
    'ref_rating', (
      select jsonb_build_object(
        'display_name', profile.display_name,
        'username', profile.username,
        'score', visit.score
      )
      from public.profiles as profile
      join public.visits as visit on visit.user_id = profile.id
      where profile.username = p_ref_username
        and not profile.is_private
        and visit.place_id = place.id
      limit 1
    )
  )
  from public.places as place
  where place.slug = p_slug;
$$;

create or replace function public.profile_summary(p_username text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', profile.id,
    'username', profile.username,
    'display_name', profile.display_name,
    'avatar_url', profile.avatar_url,
    'bio', profile.bio,
    'is_private', profile.is_private,
    'places_logged', (
      select count(*)
      from public.visits
      where user_id = profile.id
    ),
    'viewer_can_see_details', public.can_view_user(profile.id)
  )
  from public.profiles as profile
  where profile.username = p_username;
$$;

create or replace function public.set_recommendation_dismissal(
  p_place_id uuid,
  p_dismissed boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  update public.recommendations
  set
    dismissed = p_dismissed,
    dismissed_at = case when p_dismissed then now() else null end
  where user_id = auth.uid() and place_id = p_place_id;
end;
$$;

create or replace function public.reset_hidden_recommendations()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  update public.recommendations
  set dismissed = false, dismissed_at = null
  where user_id = auth.uid() and dismissed;
end;
$$;

insert into public.badges (key, name, description, icon, tier) values
  ('first_log', 'First Steps', 'Log your first place', 'Footprints', 'bronze'),
  ('ten_places', 'Getting Around', 'Log 10 places', 'MapPin', 'bronze'),
  ('fifty_places', 'Local Knowledge', 'Log 50 places', 'Map', 'gold'),
  (
    'all_boroughs',
    'Five Borough Sweep',
    'Log a place in every borough',
    'Compass',
    'gold'
  ),
  (
    'museum_5',
    'Gallery Walker',
    'Log 5 museums or galleries',
    'Frame',
    'silver'
  ),
  ('park_5', 'Green Thumb', 'Log 5 parks or gardens', 'Trees', 'silver'),
  ('view_3', 'Skyline Chaser', 'Log 3 viewpoints', 'Building2', 'bronze'),
  ('free_10', 'Budget Explorer', 'Log 10 free places', 'PiggyBank', 'silver'),
  ('photographer', 'Documentarian', 'Upload 25 photos', 'Camera', 'silver'),
  (
    'harsh_critic',
    'Tough Crowd',
    'Rate 5 places below 4.0',
    'ThumbsDown',
    'bronze'
  ),
  ('perfect_ten', 'Perfect Score', 'Give a place a 10.0', 'Star', 'bronze'),
  (
    'trailblazer',
    'Trailblazer',
    'Be the first among your friends to log a place',
    'Flag',
    'silver'
  ),
  (
    'one_day_3',
    'Packed Day',
    'Log 3 places with the same visited date',
    'Sunrise',
    'bronze'
  ),
  (
    'month_streak_3',
    'Consistent',
    'Log something in 3 consecutive months',
    'CalendarCheck',
    'silver'
  ),
  ('social_10', 'Connected', 'Follow 10 people', 'Users', 'bronze'),
  (
    'commenter_20',
    'Conversationalist',
    'Leave 20 comments',
    'MessageCircle',
    'bronze'
  ),
  (
    'neighborhood_5',
    'Deep Diver',
    'Log 5 places in one neighborhood',
    'Home',
    'silver'
  ),
  (
    'value_hunter',
    'Value Hunter',
    'Rate 10 paid places for value',
    'Receipt',
    'silver'
  );

create or replace function public.evaluate_badges_for_user(p_user uuid)
returns table (badge_key text)
language sql
security definer
set search_path = public
as $$
  with visit_stats as (
    select
      count(*) as visit_count,
      count(distinct place.borough) as borough_count,
      count(*) filter (
        where place.category in ('museum', 'gallery')
      ) as museum_count,
      count(*) filter (
        where place.category in ('park', 'garden')
      ) as park_count,
      count(*) filter (
        where place.category = 'viewpoint'
      ) as view_count,
      count(*) filter (where place.price_tier = 0) as free_count,
      count(*) filter (where visit.score < 4.0) as low_score_count,
      count(*) filter (where visit.score = 10.0) as perfect_count,
      count(*) filter (
        where visit.was_paid and visit.value_rating is not null
      ) as value_count
    from public.visits as visit
    join public.places as place on place.id = visit.place_id
    where visit.user_id = p_user
  ),
  day_stats as (
    select coalesce(max(day_count), 0) as maximum_count
    from (
      select count(*) as day_count
      from public.visits
      where user_id = p_user
      group by visited_on
    ) as grouped_days
  ),
  neighborhood_stats as (
    select coalesce(max(neighborhood_count), 0) as maximum_count
    from (
      select count(*) as neighborhood_count
      from public.visits as visit
      join public.places as place on place.id = visit.place_id
      where visit.user_id = p_user
      group by place.neighborhood
    ) as grouped_neighborhoods
  ),
  visit_months as (
    select distinct date_trunc('month', visited_on)::date as month
    from public.visits
    where user_id = p_user
  ),
  numbered_months as (
    select
      month,
      month - row_number() over (order by month) * interval '1 month'
        as streak_group
    from visit_months
  ),
  month_stats as (
    select coalesce(max(streak_length), 0) as maximum_count
    from (
      select count(*) as streak_length
      from numbered_months
      group by streak_group
    ) as streaks
  ),
  social_stats as (
    select
      (
        select count(*)
        from public.visit_photos
        where user_id = p_user
      ) as photo_count,
      (
        select count(*)
        from public.follows
        where follower_id = p_user and status = 'accepted'
      ) as follow_count,
      (
        select count(*)
        from public.comments
        where user_id = p_user
      ) as comment_count
  ),
  trailblazer_stats as (
    select (
      (
        select count(*)
        from public.follows
        where follower_id = p_user and status = 'accepted'
      ) >= 3
      and exists (
        select 1
        from public.visits as own_visit
        where own_visit.user_id = p_user
          and not exists (
            select 1
            from public.follows as follow
            join public.visits as friend_visit
              on friend_visit.user_id = follow.followee_id
             and friend_visit.place_id = own_visit.place_id
             and friend_visit.created_at < own_visit.created_at
            where follow.follower_id = p_user
              and follow.status = 'accepted'
          )
      )
    ) as earned
  ),
  eligible_badges as (
    select condition.key
    from visit_stats,
      day_stats,
      neighborhood_stats,
      month_stats,
      social_stats,
      trailblazer_stats,
      lateral (
        values
          ('first_log', visit_count >= 1),
          ('ten_places', visit_count >= 10),
          ('fifty_places', visit_count >= 50),
          ('all_boroughs', borough_count = 5),
          ('museum_5', museum_count >= 5),
          ('park_5', park_count >= 5),
          ('view_3', view_count >= 3),
          ('free_10', free_count >= 10),
          ('photographer', photo_count >= 25),
          ('harsh_critic', low_score_count >= 5),
          ('perfect_ten', perfect_count >= 1),
          ('trailblazer', earned),
          ('one_day_3', day_stats.maximum_count >= 3),
          ('month_streak_3', month_stats.maximum_count >= 3),
          ('social_10', follow_count >= 10),
          ('commenter_20', comment_count >= 20),
          (
            'neighborhood_5',
            neighborhood_stats.maximum_count >= 5
          ),
          ('value_hunter', value_count >= 10)
      ) as condition(key, is_earned)
    where condition.is_earned
  ),
  inserted_badges as (
    insert into public.user_badges (user_id, badge_key)
    select p_user, eligible_badges.key
    from eligible_badges
    on conflict (user_id, badge_key) do nothing
    returning user_badges.badge_key
  )
  select inserted_badges.badge_key from inserted_badges;
$$;

create or replace function public.evaluate_badges_after_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
begin
  if tg_table_name = 'follows' then
    target_user_id := new.follower_id;
  else
    target_user_id := new.user_id;
  end if;

  perform public.evaluate_badges_for_user(target_user_id);
  return new;
end;
$$;

-- Visits are deliberately absent here. public.log_visit() evaluates badges
-- itself, after rescore_bucket has replaced the placeholder score.
create trigger visit_photos_evaluate_badges
after insert on public.visit_photos
for each row execute function public.evaluate_badges_after_event();

create trigger comments_evaluate_badges
after insert on public.comments
for each row execute function public.evaluate_badges_after_event();

create trigger follows_evaluate_badges
after insert or update of status on public.follows
for each row
when (new.status = 'accepted')
execute function public.evaluate_badges_after_event();

alter table public.profiles enable row level security;
alter table public.places enable row level security;
alter table public.visits enable row level security;
alter table public.visit_photos enable row level security;
alter table public.want_to_go enable row level security;
alter table public.follows enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.comments enable row level security;
alter table public.onboarding_responses enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.recommendations enable row level security;

create policy places_authenticated_read
on public.places for select to authenticated
using (true);

create policy profiles_visible_read
on public.profiles for select to authenticated
using (public.can_view_user(id));

create policy profiles_own_update
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy visits_visible_read
on public.visits for select to authenticated
using (public.can_view_user(user_id));

create policy visit_photos_visible_read
on public.visit_photos for select to authenticated
using (public.can_view_user(user_id));

create policy visit_photos_own_insert
on public.visit_photos for insert to authenticated
with check (user_id = auth.uid());

create policy visit_photos_own_update
on public.visit_photos for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy visit_photos_own_delete
on public.visit_photos for delete to authenticated
using (user_id = auth.uid());

create policy want_to_go_visible_read
on public.want_to_go for select to authenticated
using (public.can_view_user(user_id));

create policy want_to_go_own_insert
on public.want_to_go for insert to authenticated
with check (user_id = auth.uid());

create policy want_to_go_own_update
on public.want_to_go for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy want_to_go_own_delete
on public.want_to_go for delete to authenticated
using (user_id = auth.uid());

create policy follows_participant_read
on public.follows for select to authenticated
using (follower_id = auth.uid() or followee_id = auth.uid());

create policy follows_own_insert
on public.follows for insert to authenticated
with check (follower_id = auth.uid());

create policy follows_followee_accept
on public.follows for update to authenticated
using (followee_id = auth.uid())
with check (followee_id = auth.uid());

create policy follows_participant_delete
on public.follows for delete to authenticated
using (follower_id = auth.uid() or followee_id = auth.uid());

create policy posts_visible_read
on public.posts for select to authenticated
using (public.can_view_user(user_id));

create policy posts_own_insert
on public.posts for insert to authenticated
with check (
  user_id = auth.uid()
  and (
    kind <> 'badge'
    or exists (
      select 1
      from public.user_badges
      where user_id = auth.uid() and badge_key = posts.badge_key
    )
  )
);

create policy posts_own_delete
on public.posts for delete to authenticated
using (user_id = auth.uid());

create policy post_likes_visible_read
on public.post_likes for select to authenticated
using (
  exists (
    select 1 from public.posts
    where id = post_id and public.can_view_user(user_id)
  )
);

create policy post_likes_own_insert
on public.post_likes for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.posts
    where id = post_id and public.can_view_user(user_id)
  )
);

create policy post_likes_own_delete
on public.post_likes for delete to authenticated
using (user_id = auth.uid());

create policy comments_visible_read
on public.comments for select to authenticated
using (
  exists (
    select 1 from public.posts
    where id = post_id and public.can_view_user(user_id)
  )
);

create policy comments_own_insert
on public.comments for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.posts
    where id = post_id and public.can_view_user(user_id)
  )
);

create policy comments_author_or_post_owner_delete
on public.comments for delete to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.posts
    where id = post_id and user_id = auth.uid()
  )
);

create policy onboarding_own_read
on public.onboarding_responses for select to authenticated
using (user_id = auth.uid());

create policy onboarding_own_insert
on public.onboarding_responses for insert to authenticated
with check (user_id = auth.uid());

create policy onboarding_own_update
on public.onboarding_responses for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy onboarding_own_delete
on public.onboarding_responses for delete to authenticated
using (user_id = auth.uid());

create policy badges_authenticated_read
on public.badges for select to authenticated
using (true);

create policy user_badges_own_read
on public.user_badges for select to authenticated
using (user_id = auth.uid());

create policy user_badges_own_update
on public.user_badges for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy recommendations_own_read
on public.recommendations for select to authenticated
using (user_id = auth.uid());

create policy recommendations_own_delete
on public.recommendations for delete to authenticated
using (user_id = auth.uid());

insert into storage.buckets (id, name, public)
values
  ('visit-photos', 'visit-photos', true),
  ('avatars', 'avatars', true),
  ('place-images', 'place-images', true)
on conflict (id) do update set public = excluded.public;

create policy public_reads_journi_images
on storage.objects for select to public
using (bucket_id in ('visit-photos', 'avatars', 'place-images'));

create policy users_upload_own_journi_images
on storage.objects for insert to authenticated
with check (
  bucket_id in ('visit-photos', 'avatars')
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy users_update_own_journi_images
on storage.objects for update to authenticated
using (
  bucket_id in ('visit-photos', 'avatars')
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id in ('visit-photos', 'avatars')
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy users_delete_own_journi_images
on storage.objects for delete to authenticated
using (
  bucket_id in ('visit-photos', 'avatars')
  and (storage.foldername(name))[1] = auth.uid()::text
);

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

grant usage on schema public to authenticated;
grant select on all tables in schema public to authenticated;
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant update on public.profiles to authenticated;
grant insert, update, delete on public.visit_photos to authenticated;
grant insert, update, delete on public.want_to_go to authenticated;
grant insert, update, delete on public.follows to authenticated;
grant insert, delete on public.posts to authenticated;
grant insert, delete on public.post_likes to authenticated;
grant insert, delete on public.comments to authenticated;
grant insert, update, delete on public.onboarding_responses
  to authenticated;
grant update on public.user_badges to authenticated;

revoke all on function public.log_visit(uuid, text, int, jsonb) from public;
revoke all on function public.delete_visit_and_rescore(uuid) from public;
revoke all on function public.edit_visit_details(uuid, jsonb) from public;
revoke all on function public.search_all(text, int) from public;
revoke all on function public.map_pins(uuid) from public;
revoke all on function public.feed_page(uuid, timestamptz, int) from public;
revoke all on function public.current_streak(uuid) from public;
revoke all on function public.public_place(text, text) from public;
revoke all on function public.profile_summary(text) from public;
revoke all on function public.set_recommendation_dismissal(uuid, boolean)
  from public;
revoke all on function public.reset_hidden_recommendations() from public;
revoke all on function public.evaluate_badges_for_user(uuid) from public;
revoke all on function public.set_updated_at() from public;
revoke all on function public.handle_new_user() from public;
revoke all on function public.check_photo_limit() from public;
revoke all on function public.clear_want_to_go() from public;
revoke all on function public.set_follow_status() from public;
revoke all on function public.prevent_follow_identity_change() from public;
revoke all on function public.create_activity_post() from public;
revoke all on function public.maintain_post_counter() from public;
revoke all on function public.invalidate_recommendations() from public;
revoke all on function public.can_view_user(uuid) from public;
revoke all on function public.rescore_bucket(uuid, text) from public;
revoke all on function public.evaluate_badges_after_event() from public;

grant execute on function public.log_visit(uuid, text, int, jsonb)
  to authenticated;
grant execute on function public.delete_visit_and_rescore(uuid)
  to authenticated;
grant execute on function public.edit_visit_details(uuid, jsonb)
  to authenticated;
grant execute on function public.search_all(text, int) to authenticated;
grant execute on function public.map_pins(uuid) to authenticated;
grant execute on function public.feed_page(uuid, timestamptz, int)
  to authenticated;
grant execute on function public.current_streak(uuid) to authenticated;
grant execute on function public.public_place(text, text)
  to anon, authenticated;
grant execute on function public.profile_summary(text)
  to anon, authenticated;
grant execute on function public.set_recommendation_dismissal(uuid, boolean)
  to authenticated;
grant execute on function public.reset_hidden_recommendations()
  to authenticated;
grant execute on function public.can_view_user(uuid) to authenticated;
grant execute on function public.evaluate_badges_for_user(uuid)
  to service_role;
grant select on public.profiles_public to authenticated;
