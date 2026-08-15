-- Journi demo accounts (specification Part 15.5).
--
-- Creates the five seeded personas plus a primary demo user who follows all of
-- them, so that taste match, friend signals, the compare view and the feed all
-- have non-trivial data to work with.
--
-- Idempotent: re-running removes the demo accounts and rebuilds them. Safe to
-- run only against local or preview databases; it writes directly to auth.users.
--
--   psql "$DB_URL" -f supabase/seed/demo.sql
--
-- Every account signs in with the password 'journi-demo'.

begin;

-- --------------------------------------------------------------- clean slate
delete from auth.users
where email like '%@journi.demo';

-- ------------------------------------------------------------------ accounts
create temporary table demo_person (
  id uuid primary key,
  username text not null,
  display_name text not null,
  bio text not null,
  taste_vector real[10] not null,
  crowd_tolerance real not null,
  price_sensitivity real not null,
  categories text[] not null,
  visit_count int not null
) on commit drop;

insert into demo_person values
  (
    '1d0f0001-0000-4000-8000-000000000001',
    'maya_walks',
    'Maya Okonkwo',
    'Walking every park in the five boroughs. Slowly.',
    '{0.3,0.2,0.95,0.3,0.2,0.2,0.4,0.9,0.5,0.6}',
    0.7, 0.6,
    array['park', 'garden', 'waterfront', 'bridge', 'sports_venue'],
    24
  ),
  (
    '1d0f0002-0000-4000-8000-000000000002',
    'artdept_sam',
    'Sam Petrakis',
    'Museum member card collector. Ask me about the Cloisters.',
    '{0.7,0.95,0.2,0.3,0.3,0.3,0.5,0.2,0.5,0.3}',
    0.5, 0.3,
    array['museum', 'gallery', 'theater', 'historic_site'],
    22
  ),
  (
    '1d0f0003-0000-4000-8000-000000000003',
    'eats_with_jo',
    'Jo Alvarez',
    'I plan the whole day around lunch. No notes.',
    '{0.3,0.2,0.3,0.95,0.6,0.9,0.3,0.3,0.6,0.4}',
    0.8, 0.7,
    array['market', 'neighborhood', 'venue'],
    20
  ),
  (
    '1d0f0004-0000-4000-8000-000000000004',
    'skyline_dev',
    'Priya Raman',
    'If it has an observation deck I have been up it.',
    '{0.5,0.3,0.2,0.3,0.4,0.2,0.95,0.4,0.3,0.2}',
    0.9, 0.2,
    array['viewpoint', 'landmark', 'bridge', 'tour_experience'],
    19
  ),
  (
    '1d0f0005-0000-4000-8000-000000000005',
    'offbeat_ray',
    'Ray Delacroix',
    'The good stuff is four subway stops past the good stuff.',
    '{0.4,0.4,0.5,0.5,0.5,0.4,0.2,0.4,0.95,0.2}',
    0.3, 0.8,
    array['neighborhood', 'historic_site', 'gallery', 'garden'],
    21
  ),
  (
    '1d0f0000-0000-4000-8000-000000000000',
    'demo_traveler',
    'Alex Chen',
    'Just moved here. Making a list.',
    '{0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5}',
    0.5, 0.5,
    array['park', 'museum', 'viewpoint'],
    6
  );

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  -- GoTrue reads these as strings, not nulls. Leaving them NULL makes every
  -- sign-in fail with "Database error querying schema".
  confirmation_token,
  recovery_token,
  email_change,
  email_change_token_new,
  email_change_token_current,
  phone_change,
  phone_change_token,
  reauthentication_token
)
select
  person.id,
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  person.username || '@journi.demo',
  extensions.crypt('journi-demo', extensions.gen_salt('bf')),
  now(),
  now() - interval '90 days',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', person.display_name),
  '', '', '', '', '', '', '', ''
from demo_person as person;

insert into auth.identities (
  provider_id, user_id, identity_data, provider, last_sign_in_at,
  created_at, updated_at
)
select
  person.id::text,
  person.id,
  jsonb_build_object(
    'sub', person.id::text,
    'email', person.username || '@journi.demo',
    'email_verified', true
  ),
  'email',
  now(),
  now() - interval '90 days',
  now()
from demo_person as person;

-- handle_new_user() already created a profile row for each account.
update public.profiles as profile
set
  username = person.username,
  display_name = person.display_name,
  bio = person.bio,
  home_city = 'New York, NY',
  taste_vector = person.taste_vector,
  crowd_tolerance = person.crowd_tolerance,
  price_sensitivity = person.price_sensitivity,
  onboarding_complete = true,
  travel_frequency = 'few_times_year',
  typical_companion = 'friends',
  countries_visited_count = 4 + (person.visit_count % 9)
from demo_person as person
where profile.id = person.id;

insert into public.onboarding_responses (user_id, likert, seed_taps, completed_at)
select
  person.id,
  (
    select jsonb_object_agg(
      'q' || dimension,
      greatest(1, least(5, round(person.taste_vector[dimension] * 4 + 1)::int))
    )
    from generate_series(1, 10) as dimension
  )
  || jsonb_build_object(
    'q11', greatest(1, least(5, round((1 - person.crowd_tolerance) * 4 + 1)::int)),
    'q12', greatest(1, least(5, round(person.price_sensitivity * 4 + 1)::int))
  ),
  '{}'::jsonb,
  now() - interval '89 days'
from demo_person as person;

-- -------------------------------------------------------------------- visits
-- Each persona rates places drawn from the categories they care about, spread
-- deterministically across all three buckets so score bands are all populated.
create temporary table demo_visit as
with ranked as (
  select
    person.id as user_id,
    place.id as place_id,
    row_number() over (
      partition by person.id
      order by
        (place.category = any (person.categories)) desc,
        md5(person.id::text || place.slug)
    ) as position,
    person.visit_count
  from demo_person as person
  cross join public.places as place
),
selected as (
  select *
  from ranked
  where position <= visit_count
)
select
  user_id,
  place_id,
  position,
  case
    when position <= ceil(visit_count * 0.6) then 'liked'
    when position <= ceil(visit_count * 0.9) then 'fine'
    else 'disliked'
  end as bucket
from selected;

insert into public.visits (
  user_id, place_id, bucket, rank_position, score, visited_on, note,
  was_paid, amount_paid_usd, value_rating, crowd_experienced,
  time_spent_minutes, companion, would_return, created_at
)
select
  visit.user_id,
  visit.place_id,
  visit.bucket,
  (
    row_number() over (
      partition by visit.user_id, visit.bucket order by visit.position
    ) - 1
  )::int,
  0.0,
  (current_date - (((visit.position * 5) % 300))::int)::date,
  case
    when visit.position % 3 = 0
      then 'Worth the trip. Went on a weekday and had it almost to myself.'
    when visit.position % 3 = 1 then null
    else 'Second time here. Still holds up.'
  end,
  place.price_tier > 0,
  case when place.price_tier > 0 then place.price_tier * 18.0 else null end,
  case
    when place.price_tier > 0
      then greatest(1, least(5, 6 - (visit.position % 5)))
    else null
  end,
  place.crowd_level,
  30 + (visit.position % 6) * 20,
  (array['solo', 'partner', 'friends', 'family', 'group_tour'])[
    1 + (visit.position % 5)
  ],
  visit.bucket <> 'disliked',
  now() - (visit.position || ' days')::interval
from demo_visit as visit
join public.places as place on place.id = visit.place_id;

-- Replace the placeholder scores with the real band-spread values.
select public.rescore_bucket(person.id, bucket.name)
from demo_person as person
cross join (values ('liked'), ('fine'), ('disliked')) as bucket(name);

-- --------------------------------------------------------------- want to go
insert into public.want_to_go (user_id, place_id, source, created_at)
select
  person.id,
  place.id,
  'manual',
  now() - ((row_number() over (partition by person.id order by place.slug)) ||
    ' days')::interval
from demo_person as person
join public.places as place
  on place.category = any (person.categories)
 and not exists (
   select 1
   from public.visits as visited
   where visited.user_id = person.id and visited.place_id = place.id
 )
where person.username <> 'demo_traveler'
limit 40;

-- ------------------------------------------------------------------- follows
-- The primary demo user follows all five personas, and the personas follow
-- each other, so trailblazer and the friend leaderboard have real edges.
insert into public.follows (follower_id, followee_id, status, created_at)
select
  follower.id,
  followee.id,
  'accepted',
  now() - interval '60 days'
from demo_person as follower
cross join demo_person as followee
where follower.id <> followee.id
  and (
    follower.username = 'demo_traveler'
    or followee.username <> 'demo_traveler'
  )
on conflict do nothing;

-- ------------------------------------------------------- comments and likes
-- Posts were created by the visit trigger; react to other people's posts only.
insert into public.post_likes (post_id, user_id, created_at)
select
  post.id,
  person.id,
  post.created_at + interval '2 hours'
from public.posts as post
join demo_person as person on person.id <> post.user_id
join demo_person as author on author.id = post.user_id
where (
  'x' || substr(md5(post.id::text || person.username), 1, 8)
)::bit(32)::bigint % 4 = 0
on conflict do nothing;

insert into public.comments (post_id, user_id, body, created_at)
select
  post.id,
  person.id,
  (
    array[
      'Adding this to my list right now.',
      'Went last month, completely agree.',
      'Try the north entrance, way quieter.',
      'How long did you spend here?',
      'This is the one I keep meaning to get to.',
      'Bold rating. I would have gone higher.'
    ]
  )[
    1 + (
      ('x' || substr(md5(post.id::text || person.username), 9, 8))::bit(32)::bigint
      % 6
    )
  ],
  post.created_at + interval '5 hours'
from public.posts as post
join demo_person as person on person.id <> post.user_id
join demo_person as author on author.id = post.user_id
where (
  'x' || substr(md5(post.id::text || person.username), 17, 8)
)::bit(32)::bigint % 9 = 0;

-- Badges were evaluated per event by trigger; run a final pass so score-derived
-- badges see the rescored values.
select public.evaluate_badges_for_user(person.id) from demo_person as person;

commit;
