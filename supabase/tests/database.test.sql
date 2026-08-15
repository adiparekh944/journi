begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

select has_table('public', 'places', 'places table exists');

select ok(
  (select count(*) from public.places) >= 150,
  'the seed contains at least the 150 places Part 15.1 requires'
);

select ok(
  not exists (
    select 1
    from (
      values
        ('manhattan', 60), ('brooklyn', 40), ('queens', 25),
        ('bronx', 15), ('staten_island', 10)
    ) as required(borough, floor)
    where (
      select count(*) from public.places where borough = required.borough
    ) < required.floor
  ),
  'every borough meets the Part 15.1 distribution floor'
);

select ok(
  (
    select min(place_count) >= 4
    from (
      select category, count(*) as place_count
      from public.places
      group by category
    ) as category_counts
  ),
  'every category has at least four places'
);

select ok(
  (select count(*) >= 40 from public.places where price_tier = 0),
  'the seed has at least 40 free places'
);

select ok(
  (
    select count(*) >= 20
    from public.places
    where popularity_seed >= 70
  ),
  'the seed has at least 20 popular places'
);

select ok(
  (
    select count(*) >= 30
    from public.places
    where popularity_seed <= 30
  ),
  'the seed has at least 30 offbeat places'
);

select ok(
  not has_table_privilege('anon', 'public.places', 'SELECT'),
  'anonymous users cannot read places'
);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '10000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'ranking-test@journi.local',
  '',
  now(),
  '{}',
  '{}',
  now(),
  now()
);

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000001',
  true
);
set local role authenticated;

select lives_ok(
  $$
    select public.log_visit(
      (select id from public.places order by slug limit 1 offset 0),
      'liked',
      0
    )
  $$,
  'the first ranked visit is logged'
);

select lives_ok(
  $$
    select public.log_visit(
      (select id from public.places order by slug limit 1 offset 1),
      'liked',
      1
    )
  $$,
  'the second ranked visit is logged'
);

select lives_ok(
  $$
    select public.log_visit(
      (select id from public.places order by slug limit 1 offset 2),
      'liked',
      2
    )
  $$,
  'the third ranked visit is logged'
);

select lives_ok(
  $$
    select public.log_visit(
      (select id from public.places order by slug limit 1 offset 3),
      'liked',
      3
    )
  $$,
  'the fourth ranked visit is logged'
);

select lives_ok(
  $$
    select public.log_visit(
      (select id from public.places order by slug limit 1 offset 4),
      'liked',
      4
    )
  $$,
  'the fifth ranked visit is logged'
);

select lives_ok(
  $$
    select public.log_visit(
      (select id from public.places order by slug limit 1 offset 5),
      'liked',
      5
    )
  $$,
  'the sixth ranked visit is logged'
);

select results_eq(
  $$
    select score::text
    from public.visits
    where user_id = auth.uid() and bucket = 'liked'
    order by rank_position
  $$,
  $$ values ('10.0'), ('9.3'), ('8.7'), ('8.0'), ('7.4'), ('6.7') $$,
  'six liked places are evenly scored from 10.0 to 6.7'
);

select lives_ok(
  $$
    select public.log_visit(
      (select id from public.places order by slug limit 1 offset 6),
      'liked',
      3
    )
  $$,
  'a seventh visit can be inserted at rank position three'
);

select results_eq(
  $$
    select score::text
    from public.visits
    where user_id = auth.uid() and bucket = 'liked'
    order by rank_position
  $$,
  $$
    values ('10.0'), ('9.5'), ('8.9'), ('8.4'), ('7.8'), ('7.3'), ('6.7')
  $$,
  'inserting at position three deterministically rescores all seven visits'
);

select is(
  (
    select count(distinct rank_position)
    from public.visits
    where user_id = auth.uid() and bucket = 'liked'
  ),
  7::bigint,
  'every visit retains a unique rank position'
);

select ok(
  exists (
    select 1
    from public.user_badges
    where user_id = auth.uid() and badge_key = 'first_log'
  ),
  'the first visit awards the first_log badge'
);

select is(
  (
    select count(*)
    from public.user_badges
    where user_id = auth.uid() and badge_key = 'first_log'
  ),
  1::bigint,
  'badge evaluation never awards a duplicate'
);

select * from finish();
rollback;
