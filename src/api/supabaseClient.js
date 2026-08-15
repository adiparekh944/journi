import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. " +
      "Copy .env.example to .env.local and fill both in.",
  );
}

/** The single Supabase client for the browser. Never give this a service key. */
export const supabase = createClient(url, anonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: "journi-auth",
  },
});

/** Throw Supabase errors so callers can use ordinary try/catch. */
export function unwrap({ data, error }) {
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

/**
 * Build a public URL for a stored object, with the Supabase image transform
 * parameters the specification asks for in Part 13.
 */
export function storageUrl(bucket, path, width) {
  if (!path) return null;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  if (!data?.publicUrl) return null;
  return width ? `${data.publicUrl}?width=${width}&quality=75` : data.publicUrl;
}
