import { useCallback, useEffect, useState } from "react";

import { base44 } from "@/api/base44Client";
import { supabase } from "@/api/supabaseClient";
import { useAuth } from "@/lib/AuthContext";

/**
 * Notifications are derived, not stored.
 *
 * Part 18 of the specification puts push notifications out of scope for v1, so
 * there is no notifications table. Everything a user would want to be told
 * about already exists as a row: a like or comment on one of their posts, a new
 * follower, a badge they earned. This reads those back as an activity inbox.
 *
 * Read state is per-device and lives in localStorage, keyed by user, because
 * there is no server-side column to persist it in.
 */

const SEEN_KEY = "journi:notifications:last-seen";
const PAGE_SIZE = 40;

function lastSeenAt(userId) {
  try {
    return window.localStorage.getItem(`${SEEN_KEY}:${userId}`) ?? null;
  } catch {
    return null;
  }
}

function writeLastSeen(userId, value) {
  try {
    window.localStorage.setItem(`${SEEN_KEY}:${userId}`, value);
  } catch {
    // A private-mode browser without storage is not worth failing over.
  }
}

async function loadActivity(userId) {
  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .select("id, place_id, visit_id, kind")
    .eq("user_id", userId);
  if (postsError) throw new Error(postsError.message);

  const postIds = (posts ?? []).map((post) => post.id);
  const placeIds = (posts ?? []).map((post) => post.place_id).filter(Boolean);

  const [likes, comments, followers, badges, places] = await Promise.all([
    postIds.length
      ? supabase
          .from("post_likes")
          .select("post_id, user_id, created_at")
          .in("post_id", postIds)
          .neq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(PAGE_SIZE)
      : { data: [], error: null },
    postIds.length
      ? supabase
          .from("comments")
          .select("id, post_id, user_id, body, created_at")
          .in("post_id", postIds)
          .neq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(PAGE_SIZE)
      : { data: [], error: null },
    supabase
      .from("follows")
      .select("follower_id, status, created_at")
      .eq("followee_id", userId)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE),
    supabase
      .from("user_badges")
      .select("badge_key, earned_at, badges(name, description)")
      .eq("user_id", userId)
      .order("earned_at", { ascending: false })
      .limit(PAGE_SIZE),
    placeIds.length
      ? supabase.from("places").select("id, name").in("id", placeIds)
      : { data: [], error: null },
  ]);

  const actorIds = [
    ...new Set([
      ...(likes.data ?? []).map((row) => row.user_id),
      ...(comments.data ?? []).map((row) => row.user_id),
      ...(followers.data ?? []).map((row) => row.follower_id),
    ]),
  ];
  const profiles = actorIds.length
    ? await base44.entities.User.filter({ id: actorIds }, "-created_date", 200)
    : [];

  const nameById = new Map(profiles.map((profile) => [profile.id, profile.full_name]));
  const placeById = new Map((places.data ?? []).map((place) => [place.id, place.name]));
  const placeByPost = new Map((posts ?? []).map((post) => [post.id, post.place_id]));

  const items = [];

  for (const row of likes.data ?? []) {
    items.push({
      id: `like:${row.post_id}:${row.user_id}`,
      kind: "like",
      actor: nameById.get(row.user_id) ?? "Someone",
      place: placeById.get(placeByPost.get(row.post_id)) ?? null,
      body: null,
      createdAt: row.created_at,
    });
  }

  for (const row of comments.data ?? []) {
    items.push({
      id: `comment:${row.id}`,
      kind: "comment",
      actor: nameById.get(row.user_id) ?? "Someone",
      place: placeById.get(placeByPost.get(row.post_id)) ?? null,
      body: row.body,
      createdAt: row.created_at,
    });
  }

  for (const row of followers.data ?? []) {
    items.push({
      id: `follow:${row.follower_id}`,
      kind: row.status === "pending" ? "follow_request" : "follow",
      actor: nameById.get(row.follower_id) ?? "Someone",
      place: null,
      body: null,
      createdAt: row.created_at,
    });
  }

  for (const row of badges.data ?? []) {
    items.push({
      id: `badge:${row.badge_key}`,
      kind: "badge",
      actor: null,
      place: null,
      body: row.badges?.description ?? null,
      title: row.badges?.name ?? row.badge_key,
      createdAt: row.earned_at,
    });
  }

  return items
    .sort((first, second) => (first.createdAt < second.createdAt ? 1 : -1))
    .slice(0, PAGE_SIZE);
}

export function useNotifications() {
  const { user, isAuthenticated } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastSeen, setLastSeen] = useState(null);

  const reload = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      setItems(await loadActivity(user.id));
      setLastSeen(lastSeenAt(user.id));
    } catch (error) {
      console.error("notifications failed to load", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isAuthenticated && user?.id) void reload();
    else {
      setItems([]);
      setLoading(false);
    }
  }, [isAuthenticated, user?.id, reload]);

  const unreadCount = items.filter(
    (item) => !lastSeen || item.createdAt > lastSeen,
  ).length;

  const markAllRead = useCallback(() => {
    if (!user?.id) return;
    const stamp = new Date().toISOString();
    writeLastSeen(user.id, stamp);
    setLastSeen(stamp);
  }, [user?.id]);

  const isUnread = useCallback(
    (item) => !lastSeen || item.createdAt > lastSeen,
    [lastSeen],
  );

  return { items, loading, unreadCount, markAllRead, isUnread, reload };
}
