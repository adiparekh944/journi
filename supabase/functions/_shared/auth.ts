import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

import { environmentValue } from "./runtime.ts";

export type AuthenticatedContext = {
  adminClient: SupabaseClient;
  user: User;
  userClient: SupabaseClient;
};

function bearerToken(request: Request): string {
  const authorization = request.headers.get("authorization") ?? "";
  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    throw new Error("Authentication is required");
  }
  return token;
}

export async function authenticateRequest(
  request: Request,
): Promise<AuthenticatedContext> {
  const supabaseUrl = environmentValue("SUPABASE_URL");
  const anonKey = environmentValue("SUPABASE_ANON_KEY");
  const serviceRoleKey = environmentValue("SUPABASE_SERVICE_ROLE_KEY");
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const token = bearerToken(request);
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { authorization: `Bearer ${token}` } },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const { data, error } = await adminClient.auth.getUser(token);

  if (error) {
    throw new Error("Authentication is required");
  }
  return { adminClient, user: data.user, userClient };
}
