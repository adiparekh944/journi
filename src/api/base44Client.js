/**
 * Supabase-backed implementation of the client surface the Base44 screens call.
 *
 * ADR-002 keeps Base44 as the host and build tool while Supabase stays the data
 * authority. The screens were written against `base44.entities.*`, so rather
 * than rewrite every page, this module keeps that shape and routes each call to
 * Postgres — through the transactional RPCs where the specification requires
 * them (log_visit, delete_visit_and_rescore, search_all, map_pins, feed_page),
 * never by mutating ranked rows from the browser.
 */

import {
  PLACE_COLUMNS,
  applyFilter,
  applyOrder,
  dbBucket,
  toComment,
  toFollow,
  toLike,
  toPlace,
  toProfile,
  toVisit,
  toWantToGo,
} from "./adapters";
import { supabase, unwrap } from "./supabaseClient";

// lat, lng and borough are required: the map plots visited pins straight off
// the visit without loading the places table separately.
const VISIT_WITH_PLACE =
  "*, places(id, slug, name, category, neighborhood, borough, lat, lng, " +
  "hero_image_url), visit_photos(storage_path, sort_order)";

const DEFAULT_LIMIT = 500;

async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id ?? null;
}

/** Resolve the feed post that belongs to a visit, creating nothing. */
async function postIdForVisit(visitId) {
  const row = unwrap(
    await supabase.from("posts").select("id").eq("visit_id", visitId).maybeSingle(),
  );
  return row?.id ?? null;
}

/**
 * Translate the rating form's field names onto the schema's.
 *
 * The screens were written with their own vocabulary (`date_visited`, `paid`,
 * `worth_it_rating`, `duration`). Passing those straight through silently drops
 * every one of them, so the date, payment, value rating and time spent never
 * reached the database.
 */
function visitPayload(source, { partial = false } = {}) {
  const mapping = {
    note: ["note"],
    visited_on: ["visited_on", "date_visited"],
    was_paid: ["was_paid", "paid"],
    amount_paid_usd: ["amount_paid_usd", "amount_paid"],
    value_rating: ["value_rating", "worth_it_rating"],
    crowd_experienced: ["crowd_experienced", "crowd_level"],
    time_spent_minutes: ["time_spent_minutes", "duration"],
    companion: ["companion", "companions"],
    would_return: ["would_return"],
  };

  const payload = {};
  for (const [column, aliases] of Object.entries(mapping)) {
    const key = aliases.find((alias) => alias in (source ?? {}));
    if (key === undefined) {
      if (!partial) payload[column] = null;
      continue;
    }
    payload[column] = normalizeVisitField(column, source[key]);
  }

  // was_paid is not nullable; a create must send a concrete boolean.
  if (!partial) payload.was_paid = Boolean(payload.was_paid);
  return payload;
}

function normalizeVisitField(column, value) {
  if (value === "" || value === undefined) return null;
  if (column === "companion" && Array.isArray(value)) return value[0] ?? null;
  if (
    ["amount_paid_usd", "value_rating", "crowd_experienced", "time_spent_minutes"]
      .includes(column)
  ) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }
  return value;
}

/**
 * Write visit_photos rows for files already uploaded to the bucket.
 *
 * The schema caps a visit at six photos with a trigger, so the list is trimmed
 * here rather than letting the seventh insert raise.
 */
async function attachPhotos(visit, photos) {
  const userId = await currentUserId();
  const rows = photos
    .slice(0, 6)
    .map((photo, index) => {
      const path = typeof photo === "string" ? storagePathFromUrl(photo) : photo.storage_path;
      if (!path) return null;
      return {
        visit_id: visit.id,
        user_id: userId,
        place_id: visit.place_id,
        storage_path: path,
        width: photo.width ?? 1200,
        height: photo.height ?? 900,
        sort_order: index,
      };
    })
    .filter(Boolean);

  if (rows.length === 0) return;
  unwrap(await supabase.from("visit_photos").insert(rows));
}

/** Recover the object path from a public storage URL. */
function storagePathFromUrl(url) {
  const marker = "/visit-photos/";
  const index = url.indexOf(marker);
  return index === -1 ? null : url.slice(index + marker.length).split("?")[0];
}

/**
 * Make the stored photos for a visit match the list the user is looking at.
 *
 * Removing a photo has to delete the row and the object: leaving the file in
 * the bucket orphans it forever, and leaving the row means the photo comes
 * straight back on the next load.
 */
async function syncPhotos(visitId, photos) {
  const userId = await currentUserId();
  const wanted = photos
    .slice(0, 6)
    .map((photo) =>
      typeof photo === "string" ? storagePathFromUrl(photo) : photo?.storage_path,
    )
    .filter(Boolean);

  // check_photo_limit() requires the row's place to match the visit's.
  const visitRow = unwrap(
    await supabase.from("visits").select("place_id").eq("id", visitId).single(),
  );

  const existing = unwrap(
    await supabase
      .from("visit_photos")
      .select("id, storage_path")
      .eq("visit_id", visitId),
  );

  const keep = new Set(wanted);
  const removed = (existing ?? []).filter((row) => !keep.has(row.storage_path));
  if (removed.length > 0) {
    unwrap(
      await supabase
        .from("visit_photos")
        .delete()
        .in("id", removed.map((row) => row.id)),
    );
    await removeStoredPhotos(removed.map((row) => row.storage_path));
  }

  const present = new Set((existing ?? []).map((row) => row.storage_path));
  const added = wanted
    .map((path, index) => ({ path, index }))
    .filter(({ path }) => !present.has(path));
  if (added.length > 0) {
    unwrap(
      await supabase.from("visit_photos").insert(
        added.map(({ path, index }) => ({
          visit_id: visitId,
          user_id: userId,
          place_id: visitRow.place_id,
          storage_path: path,
          width: 1200,
          height: 900,
          sort_order: index,
        })),
      ),
    );
  }

  // Keep the display order in step with the list.
  for (const [index, path] of wanted.entries()) {
    await supabase
      .from("visit_photos")
      .update({ sort_order: index })
      .eq("visit_id", visitId)
      .eq("storage_path", path);
  }
}

/** Delete objects from the visit-photos bucket, ignoring already-gone files. */
async function removeStoredPhotos(paths) {
  if (!paths.length) return;
  const { error } = await supabase.storage.from("visit-photos").remove(paths);
  if (error) {
    console.warn("Could not remove photo files:", error.message);
  }
}

const Place = {
  async list(order = "-created_date", limit = DEFAULT_LIMIT) {
    let query = supabase.from("places").select(PLACE_COLUMNS).limit(limit);
    query = applyOrder(query, order, "-created_at");
    return (unwrap(await query) ?? []).map(toPlace);
  },
  async get(id) {
    const column = /^[0-9a-f-]{36}$/i.test(id) ? "id" : "slug";
    return toPlace(
      unwrap(
        await supabase.from("places").select(PLACE_COLUMNS).eq(column, id).maybeSingle(),
      ),
    );
  },
  async filter(criteria, order = "-created_date", limit = DEFAULT_LIMIT) {
    let query = supabase.from("places").select(PLACE_COLUMNS).limit(limit);
    query = applyFilter(query, criteria);
    query = applyOrder(query, order, "-created_at");
    return (unwrap(await query) ?? []).map(toPlace);
  },
};

const Visit = {
  async filter(criteria, order = "-created_date", limit = DEFAULT_LIMIT) {
    let query = supabase.from("visits").select(VISIT_WITH_PLACE).limit(limit);
    query = applyFilter(query, criteria);
    query = applyOrder(query, order, "-created_at");
    return (unwrap(await query) ?? []).map(toVisit);
  },
  async get(id) {
    return toVisit(
      unwrap(
        await supabase.from("visits").select(VISIT_WITH_PLACE).eq("id", id).maybeSingle(),
      ),
    );
  },
  /**
   * Ranked inserts go through log_visit so the position shift, the rescore and
   * the badge pass all happen in one transaction (specification Part 5.4).
   */
  async create(visit) {
    const created = unwrap(
      await supabase.rpc("log_visit", {
        p_place_id: visit.place_id,
        p_bucket: dbBucket(visit.sentiment_bucket ?? visit.bucket),
        p_position: visit.rank_position ?? 0,
        p_payload: visitPayload(visit),
      }),
    );
    const stored = toVisit(created);
    // Photos are uploaded to storage before the visit exists, so the rows that
    // point at them can only be written now that we have a visit id.
    if (Array.isArray(visit.photos) && visit.photos.length > 0) {
      await attachPhotos(stored, visit.photos);
      return Visit.get(stored.id);
    }
    return stored;
  },
  /** Metadata only. Scores are derived from rank and cannot be written. */
  async update(id, patch) {
    if (Array.isArray(patch.photos)) {
      await syncPhotos(id, patch.photos);
    }
    const payload = visitPayload(patch, { partial: true });
    return toVisit(
      unwrap(
        await supabase.rpc("edit_visit_details", {
          p_visit_id: id,
          p_payload: payload,
        }),
      ),
    );
  },
  async delete(id) {
    unwrap(await supabase.rpc("delete_visit_and_rescore", { p_visit_id: id }));
    return { id };
  },
  /**
   * Scores are a pure function of rank position, maintained by rescore_bucket.
   * The screens call this to persist their own recomputed scores; accepting it
   * silently would let the client fight the database, so it is a no-op.
   */
  async bulkUpdate() {
    return [];
  },
};

const WantToGo = {
  async filter(criteria, order = "-created_date", limit = DEFAULT_LIMIT) {
    let query = supabase.from("want_to_go").select("*").limit(limit);
    query = applyFilter(query, criteria);
    query = applyOrder(query, order, "-created_at");
    return (unwrap(await query) ?? []).map(toWantToGo);
  },
  async create(row) {
    const userId = row.user_id ?? (await currentUserId());
    return toWantToGo(
      unwrap(
        await supabase
          .from("want_to_go")
          .insert({
            user_id: userId,
            place_id: row.place_id,
            source: row.source ?? "manual",
            source_user_id: row.source_user_id ?? null,
          })
          .select()
          .single(),
      ),
    );
  },
  async delete(id) {
    unwrap(await supabase.from("want_to_go").delete().eq("id", id));
    return { id };
  },
};

const Follow = {
  async filter(criteria, order = "-created_date", limit = DEFAULT_LIMIT) {
    let query = supabase.from("follows").select("*").limit(limit);
    query = applyFilter(query, criteria);
    query = applyOrder(query, order, "-created_at");
    return (unwrap(await query) ?? []).map(toFollow);
  },
  async create(row) {
    const followerId = row.follower_id ?? (await currentUserId());
    // The trigger decides pending vs accepted from the target's privacy, so any
    // status the caller supplies is ignored on purpose.
    return toFollow(
      unwrap(
        await supabase
          .from("follows")
          .insert({
            follower_id: followerId,
            followee_id: row.followee_id ?? row.following_id,
          })
          .select()
          .single(),
      ),
    );
  },
  async delete(id) {
    const [followerId, followeeId] = String(id).split(":");
    unwrap(
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", followerId)
        .eq("followee_id", followeeId),
    );
    return { id };
  },
};

/**
 * Likes and comments hang off posts in the schema, but the screens address them
 * by visit. Translate in both directions.
 */
const Like = {
  async filter(criteria, order = "-created_date", limit = DEFAULT_LIMIT) {
    const postId = criteria.visit_id
      ? await postIdForVisit(criteria.visit_id)
      : criteria.post_id;
    if (!postId) return [];
    let query = supabase.from("post_likes").select("*").eq("post_id", postId).limit(limit);
    if (criteria.user_id) query = query.eq("user_id", criteria.user_id);
    query = applyOrder(query, order, "-created_at");
    return (unwrap(await query) ?? []).map((row) =>
      toLike({ ...row, id: `${row.post_id}:${row.user_id}`, visit_id: criteria.visit_id }),
    );
  },
  async create(row) {
    const userId = row.user_id ?? (await currentUserId());
    const postId = row.post_id ?? (await postIdForVisit(row.visit_id));
    if (!postId) throw new Error("That visit has no post to like.");
    const created = unwrap(
      await supabase
        .from("post_likes")
        .insert({ post_id: postId, user_id: userId })
        .select()
        .single(),
    );
    return toLike({ ...created, id: `${postId}:${userId}`, visit_id: row.visit_id });
  },
  async delete(id) {
    const [postId, userId] = String(id).split(":");
    unwrap(
      await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", userId),
    );
    return { id };
  },
};

const Comment = {
  async filter(criteria, order = "created_date", limit = DEFAULT_LIMIT) {
    const postId = criteria.visit_id
      ? await postIdForVisit(criteria.visit_id)
      : criteria.post_id;
    if (!postId) return [];
    let query = supabase.from("comments").select("*").eq("post_id", postId).limit(limit);
    query = applyOrder(query, order, "created_at");
    return (unwrap(await query) ?? []).map((row) =>
      toComment({ ...row, visit_id: criteria.visit_id }),
    );
  },
  async create(row) {
    const userId = row.user_id ?? (await currentUserId());
    const postId = row.post_id ?? (await postIdForVisit(row.visit_id));
    if (!postId) throw new Error("That visit has no post to comment on.");
    const created = unwrap(
      await supabase
        .from("comments")
        .insert({ post_id: postId, user_id: userId, body: row.text ?? row.body })
        .select()
        .single(),
    );
    return toComment({ ...created, visit_id: row.visit_id });
  },
  async delete(id) {
    unwrap(await supabase.from("comments").delete().eq("id", id));
    return { id };
  },
};

const User = {
  async filter(criteria, order = "-created_date", limit = DEFAULT_LIMIT) {
    let query = supabase.from("profiles").select("*").limit(limit);
    query = applyFilter(query, criteria);
    query = applyOrder(query, order, "-created_at");
    return (unwrap(await query) ?? []).map(toProfile);
  },
  async get(id) {
    return toProfile(
      unwrap(await supabase.from("profiles").select("*").eq("id", id).maybeSingle()),
    );
  },
  async list(order = "-created_date", limit = DEFAULT_LIMIT) {
    return User.filter({}, order, limit);
  },
};

/** Session user merged with the profile row the screens read names off. */
async function currentAccount() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return null;
  const profile = unwrap(
    await supabase.from("profiles").select("*").eq("id", data.user.id).maybeSingle(),
  );
  return {
    ...(toProfile(profile) ?? {}),
    id: data.user.id,
    email: data.user.email,
    full_name:
      profile?.display_name ?? data.user.user_metadata?.full_name ?? data.user.email,
  };
}

const auth = {
  me: currentAccount,
  async isAuthenticated() {
    const { data } = await supabase.auth.getSession();
    return Boolean(data?.session);
  },
  async loginViaEmailPassword(email, password) {
    const data = unwrap(
      await supabase.auth.signInWithPassword({ email, password }),
    );
    return data.user;
  },
  /**
   * @param {{email?: string, password?: string, full_name?: string}} [details]
   */
  async register(details = {}) {
    const { email, password, full_name: fullName } = details;
    const data = unwrap(
      await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      }),
    );
    return data.user;
  },
  async loginWithProvider(provider, returnTo) {
    return unwrap(
      await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: returnTo ?? window.location.origin },
      }),
    );
  },
  async logout(returnTo) {
    await supabase.auth.signOut();
    if (returnTo) window.location.assign(returnTo);
  },
  redirectToLogin(returnTo) {
    const target = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : "";
    window.location.assign(`/login${target}`);
  },
  async resetPasswordRequest(email) {
    return unwrap(
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      }),
    );
  },
  async resetPassword(password) {
    return unwrap(await supabase.auth.updateUser({ password }));
  },
  async verifyOtp(email, token, type = "email") {
    return unwrap(await supabase.auth.verifyOtp({ email, token, type }));
  },
  async resendOtp(email) {
    return unwrap(await supabase.auth.resend({ type: "signup", email }));
  },
  async setToken(accessToken, refreshToken) {
    return unwrap(
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      }),
    );
  },
  async updateMe(patch) {
    const userId = await currentUserId();
    if (!userId) throw new Error("Sign in to update your profile.");
    const payload = {};
    if ("full_name" in patch) payload.display_name = patch.full_name;
    for (const field of ["username", "bio", "home_city", "avatar_url", "is_private"]) {
      if (field in patch) payload[field] = patch[field];
    }
    if ("home_latitude" in patch) payload.home_lat = patch.home_latitude;
    if ("home_longitude" in patch) payload.home_lng = patch.home_longitude;
    if ("home_radius_miles" in patch) payload.home_radius_miles = patch.home_radius_miles;
    return toProfile(
      unwrap(
        await supabase
          .from("profiles")
          .update(payload)
          .eq("id", userId)
          .select()
          .single(),
      ),
    );
  },
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  },
};

/** Photo uploads land in the visit-photos bucket under {user_id}/... */
const integrations = {
  Core: {
    /** @param {{file: File, visitId?: string}} options */
    async UploadFile(options) {
      const { file, visitId } = options;
      const userId = await currentUserId();
      if (!userId) throw new Error("Sign in to upload photos.");
      const extension = (file.name?.split(".").pop() ?? "webp").toLowerCase();
      const path = `${userId}/${visitId ?? "unfiled"}/${crypto.randomUUID()}.${extension}`;
      unwrap(
        await supabase.storage.from("visit-photos").upload(path, file, {
          cacheControl: "31536000",
          contentType: file.type || "image/webp",
        }),
      );
      const { data } = supabase.storage.from("visit-photos").getPublicUrl(path);
      return { file_url: data.publicUrl, storage_path: path };
    },
  },
};

/** The specification's RPCs and Edge Functions, for screens that want them. */
const rpc = {
  search: (query, limit = 20) =>
    supabase.rpc("search_all", { p_query: query, p_limit: limit }).then(unwrap),
  mapPins: (userId) => supabase.rpc("map_pins", { p_user: userId }).then(unwrap),
  feedPage: (userId, before, limit = 20) =>
    supabase
      .rpc("feed_page", {
        p_user: userId,
        p_before: before ?? new Date().toISOString(),
        p_limit: limit,
      })
      .then(unwrap),
  placeBySlug: (slug, referrer = null) =>
    supabase
      .rpc("public_place", { p_slug: slug, p_ref_username: referrer })
      .then(unwrap),
  profileSummary: (username) =>
    supabase.rpc("profile_summary", { p_username: username }).then(unwrap),
  currentStreak: (userId) =>
    supabase.rpc("current_streak", { p_user: userId }).then(unwrap),
  recommendations: () =>
    supabase.functions.invoke("recommend", { body: {} }).then(unwrap),
  evaluateBadges: () =>
    supabase.functions.invoke("evaluate-badges", { body: {} }).then(unwrap),
  refreshTasteVector: () =>
    supabase.functions.invoke("taste-vector-refresh", { body: {} }).then(unwrap),
  deleteVisit: (visitId) =>
    supabase.functions.invoke("delete-visit", { body: { visit_id: visitId } }).then(unwrap),
};

export const base44 = {
  entities: { Place, Visit, WantToGo, Follow, Like, Comment, User },
  storage: { removePhotos: removeStoredPhotos, pathFromUrl: storagePathFromUrl },
  auth,
  integrations,
  rpc,
};

export { supabase };
export default base44;
