/**
 * Translate between the Supabase schema and the vocabulary the Base44 screens
 * were written against.
 *
 * The screens came first and use names like `latitude`, `official_photos` and
 * `sentiment_bucket`. The database is the authority and uses `lat`,
 * `hero_image_url` and `bucket`. Rather than rewrite thirteen screens, every
 * row crosses this boundary exactly once.
 */

import { storageUrl } from "./supabaseClient";

export const PLACE_COLUMNS =
  "id, slug, name, category, borough, neighborhood, address, lat, lng, " +
  "short_description, hero_image_url, crowd_level, price_tier, " +
  "typical_price_usd, typical_duration_minutes, best_time, indoor_outdoor, " +
  "is_free, popularity_seed, taste_vector, ticket_url, created_at";

/**
 * The schema stores boroughs as enum keys; the screens compare against the
 * display names ("The Bronx"). Translate in both directions so filters keep
 * working against the database.
 */
const BOROUGH_LABELS = {
  manhattan: "Manhattan",
  brooklyn: "Brooklyn",
  queens: "Queens",
  bronx: "The Bronx",
  staten_island: "Staten Island",
};

const BOROUGH_KEYS = Object.fromEntries(
  Object.entries(BOROUGH_LABELS).map(([key, label]) => [label, key]),
);

export function boroughKey(value) {
  return BOROUGH_KEYS[value] ?? value;
}

/**
 * The screens inherited the bucket names `loved` / `fine` / `no`. The schema
 * uses the specification's `liked` / `fine` / `disliked`, enforced by a CHECK
 * constraint, and the score bands hang off those names — so the database wins
 * and the names are translated here.
 */
const BUCKET_TO_UI = { liked: "loved", fine: "fine", disliked: "no" };
const BUCKET_TO_DB = { loved: "liked", fine: "fine", no: "disliked" };

export function uiBucket(value) {
  return BUCKET_TO_UI[value] ?? value;
}

export function dbBucket(value) {
  return BUCKET_TO_DB[value] ?? value;
}

export function toPlace(row) {
  if (!row) return null;
  return {
    ...row,
    // Screen vocabulary.
    borough: BOROUGH_LABELS[row.borough] ?? row.borough,
    borough_key: row.borough,
    latitude: row.lat,
    longitude: row.lng,
    description: row.short_description,
    price_level: row.price_tier,
    indoor_or_outdoor: row.indoor_outdoor,
    best_time_to_go: row.best_time,
    avg_duration: row.typical_duration_minutes,
    official_photos: row.hero_image_url ? [row.hero_image_url] : [],
    ticket_url: row.ticket_url ?? null,
    created_date: row.created_at,
  };
}

export function toVisit(row) {
  if (!row) return null;
  const place = row.places ?? row.place ?? null;
  return {
    ...row,
    sentiment_bucket: uiBucket(row.bucket),
    created_date: row.created_at,
    place_name: place?.name ?? row.place_name ?? null,
    place_category: place?.category ?? row.place_category ?? null,
    place_neighborhood: place?.neighborhood ?? row.place_neighborhood ?? null,
    place_slug: place?.slug ?? row.place_slug ?? null,
    place_hero_image_url: place?.hero_image_url ?? null,
    // The map plots visited pins straight off the visit, without loading places.
    place_latitude: place?.lat ?? null,
    place_longitude: place?.lng ?? null,
    place_borough: place ? (BOROUGH_LABELS[place.borough] ?? place.borough) : null,
    photos: (row.visit_photos ?? [])
      .slice()
      .sort((first, second) => first.sort_order - second.sort_order)
      .map((photo) => storageUrl("visit-photos", photo.storage_path, 1200))
      .filter(Boolean),
  };
}

export function toProfile(row) {
  if (!row) return null;
  return {
    ...row,
    full_name: row.display_name,
    avatar: row.avatar_url,
    home_latitude: row.home_lat ?? null,
    home_longitude: row.home_lng ?? null,
    home_radius_miles: row.home_radius_miles ?? 2,
    created_date: row.created_at,
  };
}

export function toWantToGo(row) {
  if (!row) return null;
  return { ...row, created_date: row.created_at };
}

export function toComment(row) {
  if (!row) return null;
  return {
    ...row,
    text: row.body,
    created_date: row.created_at,
    visit_id: row.visit_id ?? null,
  };
}

export function toLike(row) {
  if (!row) return null;
  return { ...row, created_date: row.created_at, visit_id: row.visit_id ?? null };
}

export function toFollow(row) {
  if (!row) return null;
  return {
    ...row,
    // The screens call the other side of the edge `following_id`.
    following_id: row.followee_id,
    id: `${row.follower_id}:${row.followee_id}`,
    created_date: row.created_at,
  };
}

/**
 * Base44 order strings are a field name, optionally prefixed with "-" for
 * descending. Map them onto the equivalent database column.
 */
const COLUMN_ALIASES = {
  created_date: "created_at",
  latitude: "lat",
  longitude: "lng",
  description: "short_description",
  price_level: "price_tier",
  sentiment_bucket: "bucket",
  full_name: "display_name",
  text: "body",
  following_id: "followee_id",
};

/** Per-column value translation applied to filters before they reach Postgres. */
const VALUE_ENCODERS = {
  borough: boroughKey,
  bucket: dbBucket,
};

export function applyOrder(query, order, fallback) {
  const spec = order ?? fallback;
  if (!spec) return query;
  const descending = spec.startsWith("-");
  const field = descending ? spec.slice(1) : spec;
  return query.order(COLUMN_ALIASES[field] ?? field, { ascending: !descending });
}

export function applyFilter(query, criteria) {
  let result = query;
  for (const [field, value] of Object.entries(criteria ?? {})) {
    const column = COLUMN_ALIASES[field] ?? field;
    const encode = VALUE_ENCODERS[column] ?? ((item) => item);
    result = Array.isArray(value)
      ? result.in(column, value.map(encode))
      : result.eq(column, encode(value));
  }
  return result;
}
